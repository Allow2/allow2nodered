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
            children:   req.body.children
        }, function(err) {
            if (err) {
                return res.status(500).json({ status: 'error', message: err.message });
            }
        });
        res.status(200).json({ status: 'success' });
    });

    function updatePairing(nodeId, nodeData, callback) {
        persist.pairings = persist.pairings || {};
        persist.pairings[nodeId] = nodeData;
        const data = JSON.stringify(persist);
        fs.writeFile(persistFile, data, callback);
    }

    function Pairing(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        const nodeId = node.id.replace(/\./g, '_');
        const pairing = (persist.pairings && persist.pairings[nodeId]) || "{ paired: false }";

        const userId = this.credentials.userId;
        const pairId = this.credentials.pairId;
        const pairToken = this.credentials.pairToken;

        if (!pairing) {
            node.status({ fill:"red", shape:"dot", text: "not paired" });
        }

        this.check = function (params, callback) {

            if (!pairing || !pairing.paired || !pairToken) {
                return node.error("hit an error", "Not Paired");
            }
            var params = Object.assign(params, {
                userId: userId,
                pairId: pairId,
                pairToken: pairToken,
                deviceToken: config.deviceToken
            });

            allow2.check(params, callback);
            // function(err, result) {
            //     console.log('result from Allow2 check:', err, result);
            //     callback(err, result);
            // });
        }
    }

    RED.nodes.registerType("Allow2Pairing", Pairing, {
        credentials: {
            userId: { type:"password" },
            pairId: { type:"password" },
            pairToken: { type:"password" }
        }
    });
};
