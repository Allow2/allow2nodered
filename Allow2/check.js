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

        this.check = function(msg) {

            var node = this;

            var params = {
                tz: config.timezone,             // note: timezone is crucial to correctly calculate allowed times and day types
                childId: node.childId,                   // MANDATORY!
                activities: node.activities,
                //     [
                //     {id: 3, log: true},           // 3 = Gaming
                //     {id: 8, log: true}            // 8 = Screen Time
                // ],
                log: node.log				    // note: if set, record the usage (log it) and deduct quota, otherwise it only checks the access is permitted.
            };

            if (!params.childId) {
                // throw an error?
                node.error("hit an error", "Missing ChildId");
                node.status({ fill:"grey", shape:"ring", text: "Missing ChildId"  });
                return
            }

            //node.debug("calling allow2 check", params);
            node.status({ fill:"yellow", shape:"ring", text:"checking" });

            var childId = this.childId;

            node._pairing.check(params, function (err, result) {
                if (err) {
                    node.error('check failure', err.message);
                    node.status({ fill:"grey", shape:"ring", text:"error" });
                    return
                }
                if (!result.activities || !result.dayTypes || !result.children) {
                    node.error('check failure', 'invalid response from Allow2');
                    node.status({ fill:"grey", shape:"ring", text:"error" });
                    return
                }
                var child = result.children.reduce(function(memo, child) {
                    return child.id == childId ? child : memo;
                });
                if (!child) {
                    node.error('check failure', 'unknown child');
                    node.status({ fill:"grey", shape:"ring", text:"error" });
                    return
                }
                msg.payload.childId = childId;
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

        var node = this;

        if (node._pairing) {
            node.on('input', function (msg) {

                node.childId = (msg.payload && msg.payload.childId) || node.childId || config.childId;
                node.activities = (msg.payload && msg.payload.activities) || node.activities || config.activities;
                node.log = (msg.payload && msg.payload.log) || node.log || config.log;

                if (msg.payload.timer) {
                    if (msg.payload.timer == "off") {
                        if (node.runningTimer) {
                            clearInterval(node.runningTimer);
                        }
                        node.runningTimer = null;
                        return
                    }
                    if (!node.runningTimer) {
                        node.runningTimer = setInterval(this.check.bind(node), 10000, msg);     // do every 10 seconds, but also fall through to do immediately
                    }
                }
                node.check.bind(node)(msg)

            });
        } else {
            node.error('Missing pairing configuration');
        }
    }

    RED.nodes.registerType("Allow2Check", Check);
};
