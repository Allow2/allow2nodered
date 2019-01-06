/**
 * @module Allow2Pairing
 * @description Implementation of the `pairing` node
 */

'use strict';

var async = require('async');
var allow2 = require('allow2');

module.exports = function(RED) {

    function Pairing(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        const userId = this.credentials.userId;
        const pairId = this.credentials.pairId;
        const pairToken = this.credentials.pairToken;

        this.check = function (params, callback) {
            var params = Object.assign(params, {
                userId: userId,
                pairId: pairId,
                pairToken: pairToken,
                deviceToken: config.deviceToken
            });

            if (!params.pairToken) {
                // throw an error?
                node.error("hit an error", "Missing PairToken");
                return
            }

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
