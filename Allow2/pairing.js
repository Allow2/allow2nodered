/**
 * @module Allow2Pairing
 * @description Implementation of the `pairing` node
 */

'use strict';

const fs = require('fs');
const path = require('path');
const async = require('async');
const allow2 = require('allow2');

module.exports = function(RED) {

    //
    // set up persistence
    //
    const installDir = (RED.settings.available() && RED.settings.userDir) || process.env.NODE_RED_HOME || ".";
    var persist = {};
    const allow2Dir = path.join(installDir, 'allow2');
    try {
        fs.mkdirSync(allow2Dir);
    } catch (err) {
        if (err.code !== 'EEXIST') throw err
    }
    const persistFile = path.join(allow2Dir, 'persist.json');
    try {
        const rawData = fs.readFileSync(persistFile);
        persist = JSON.parse(rawData);
    } catch (err) {
        console.log('cannot read Allow2 persistence file', persistFile);
        persist = {}; // default blank state
    }

    //
    // use global persistence to record allow2 auth config node state
    //
    RED.httpAdmin.get("/allow2/paired/:id", RED.auth.needsPermission('Allow2Pairing.read'), function(req, res) {
        const nodeId = req.params.id.replace(/\./g, '_');
        //console.log('checking', req.params.id, nodeId);
        const pairing = (persist.pairings && persist.pairings[nodeId]) || "{ paired: false }";
        res.json(pairing);
    });

    RED.httpAdmin.post("/allow2/paired", RED.auth.needsPermission('Allow2Pairing.write'), function(req, res) {
        //console.log(req.body);
        const nodeId = req.body.id.replace(/\./g, '_');
        //console.log('pairing', nodeId, req.body);
        updatePairing(nodeId, {
            paired:     true,
            children:   req.body.children,
            userId:      req.body.userId,
            pairId:      req.body.pairId,
            token:      req.body.token
        }, function(err) {
            if (err) {
                return res.status(500).json({ status: 'error', message: err.message });
            }
        });
        res.status(200).json({ status: 'success' });
    });

    var currentNodes = new Set();

    RED.events.on("nodes-starting",function() {
        console.log("Nodes starting");
        currentNodes = new Set();
    });

    RED.events.on("nodes-started",function() {
        console.log("All nodes have started", currentNodes);
        const oldKeys = Object.keys(persist);
        const originalCount = oldKeys.length;
        oldKeys.forEach(function(key) {
            if (!currentNodes.includes(key)) {
                delete persist[key];
            }
        });
        currentNodes = new Set();
        if (originalCount != Object.keys(filtered).length) {
            // we've lost one or more nodes, persist the new trimmed set
            const data = JSON.stringify(persist);
            //console.log("persistence", persist);
            fs.writeFile(persistFile, data, 'utf8', function(err) {
                // nop
                console.log('trimmed', persist);
            });
        }
    });

    function updatePairing(nodeId, nodeData, callback) {
        if (!nodeData || (nodeData.paired && !nodeData.children)) {
            console.log('invalid child structure', nodeData);
            return callback(new Error('invalid child structure'));
        }
        persist.pairings = persist.pairings || {};
        persist.pairings[nodeId] = nodeData;
        // pre-sort the children
        if (nodeData.paired) {
            persist.pairings[nodeId].children = nodeData.children && nodeData.children.sort(function (a, b) {
                    return (a.name || '').localeCompare(b.name || '')
                });
        } else {
            delete persist.pairings[nodeId].children;
            delete persist.pairings[nodeId].token;
        }
        const data = JSON.stringify(persist);
        //console.log("persistence", persist);
        fs.writeFile(persistFile, data, 'utf8', callback);
    }

    function Pairing(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        const nodeId = node.id.replace(/\./g, '_');
        currentNodes && currentNodes.add(nodeId);

        const userId = this.credentials.userId;
        const pairId = this.credentials.pairId;
        const pairToken = this.credentials.pairToken;

        var pairing = (persist.pairings && persist.pairings[nodeId]) || "{ paired: false }";
        if (!pairing) {
            node.status({fill: "red", shape: "dot", text: "not paired"});
        }

        node.check = function (params, callback) {
            // make sure our pairing info is current
            pairing = (persist.pairings && persist.pairings[nodeId]) || "{ paired: false }";

            if (!pairing || !pairing.paired || !pairToken) {
                return callback(new Error("Not Paired"));
            }
            if (pairing.token != pairToken) {
                return callback(new Error("Pairing Mismatch (Need to Deploy?)"));
            }
            var params = Object.assign(params, {
                userId: parseInt(userId),
                pairId: parseInt(pairId),
                pairToken: pairToken,
                deviceToken: config.deviceToken || 'B0hNax6VCFi9vphu'
            });

            console.log('checking', params);

            allow2.check(params, callback);
            // function(err, result) {
            //     console.log('result from Allow2 check:', err, result);
            //     callback(err, result);
            // });
        };

        node.invalidatePairing = function (callback) {
            updatePairing(nodeId, {
                paired: false
            }, callback);
        };

        node.updateChildren = function (children) {
            // make sure our pairing info is current
            var pairing = (persist.pairings && persist.pairings[nodeId]) || "{ paired: false }";
            pairing.children = children;
            updatePairing(nodeId, pairing);
        };
    }

    RED.nodes.registerType("Allow2Pairing", Pairing, {
        credentials: {
            userId: { type:"password" },
            pairId: { type:"password" },
            pairToken: { type:"password" }
        }
    });
};
