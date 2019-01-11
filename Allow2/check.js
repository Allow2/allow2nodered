/**
 * @module Allow2Check
 * @description Implementation of the `check` node
 */

'use strict';

var async = require('async');

module.exports = function(RED) {

    function Check(config) {
        RED.nodes.createNode(this, config);

        this._pairing = RED.nodes.getNode(config.pairing);
        this.runningTimer = null;

        var node = this;

        node.check = function(msg) {

            //node.childId = (msg.payload && msg.payload.childId) || node.childId || config.childId;
            //node.activities = (msg.payload && msg.payload.activities) || node.activities || config.activities;
            //node.log = (msg.payload && msg.payload.log) || node.log || config.log;

            const childId = (msg.payload && msg.payload.childId) || parseInt(config.childId);
            const activities = (msg.payload && msg.payload.activities) || config.activities;
            const log = (msg.payload && msg.payload.log) || config.log;

            var params = {
                tz: config.timezone,             // note: timezone is crucial to correctly calculate allowed times and day types
                childId: childId,                   // MANDATORY!
                activities: activities,
                //     [
                //     {id: 3, log: true},           // 3 = Gaming
                //     {id: 8, log: true}            // 8 = Screen Time
                // ],
                staging: true,
                log: log				    // note: if set, record the usage (log it) and deduct quota, otherwise it only checks the access is permitted.
            };

            console.log('params', params);

            if (!params.childId) {
                // throw an error?
                node.status({ fill: 'grey', shape:'ring', text: 'Missing ChildId' });
                return node.error("hit an error", 'Missing ChildId');
            }

            //node.debug("calling allow2 check", params);
            node.status({ fill:"yellow", shape:"ring", text:"checking" });

            node._pairing.check(params, function (err, result) {
                console.log('check result', result);
                if (!err && !result) {
                    err = new Error('no response from Allow2, contact support');
                }
                if (err) {
                    node.status({ fill:"grey", shape:"ring", text:err.message });
                    return node.error('check failure', err.message);
                }
                if (result.error) {
                    node.status({ fill:"grey", shape:"ring", text: result.error });
                    if (result.error != 'invalid pairToken') {
                        return;
                    }
                    node._pairing.invalidatePairing(config.pairing, { paired: false }, function(err) {
                        // nop
                    });
                    return;
                }
                if (!result.activities || !result.dayTypes || !result.children) {
                    node.error('check failure', 'invalid response from Allow2, contact support');
                    return node.status({ fill:"grey", shape:"ring", text:"error" });
                }
                var child = result.children.reduce(function(memo, child) {
                    return child.id == childId ? child : memo;
                });
                if (!child) {
                    node.error('check failure', 'unknown child');
                    return node.status({ fill:"grey", shape:"ring", text:"error" });
                }

                // it worked, persist the children list in case it changed:
                node._pairing.updateChildren(result.children);

                // now update node status and emit a response message
                msg.payload.childId = parseInt(childId);
                msg.payload.timezone = config.timezone;
                msg.payload.response = result;
                if (result.allowed) {
                    node.status({ fill:"green", shape:"dot", text: result.dayTypes.today.name + " : allowed" });
                } else {
                    if (msg.payload.autostop) {
                        if (node.runningTimer) {
                            clearInterval(node.runningTimer);
                        }
                        node.runningTimer = null;
                    }
                    node.status({ fill:"red", shape:"dot", text: result.dayTypes.today.name + " : not allowed"  });
                }
                node.send( msg );
            });
        };

        if (node._pairing) {
            node.on('input', function (msg) {

                //if (msg.payload.timer) {
                //    if (msg.payload.timer == "off") {
                //        node.childId = (msg.payload && msg.payload.childId) || node.childId || config.childId;
                //        node.activities = (msg.payload && msg.payload.activities) || node.activities || config.activities;
                //        node.log = (msg.payload && msg.payload.log) || node.log || config.log;
                //        if (node.runningTimer) {
                //            clearInterval(node.runningTimer);
                //        }
                //        node.runningTimer = null;
                //        return
                //    }
                //    if (!node.runningTimer) {
                //        node.runningTimer = setInterval(node.check, 10000, msg);     // do every 10 seconds, but also fall through to do immediately
                //    }
                //}
                node.check(msg)

            });
        } else {
            node.error('Missing pairing configuration');
        }
    }

    RED.nodes.registerType("Allow2Check", Check);
};
