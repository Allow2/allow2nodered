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

        this.check = function (params, callback) {
            var params = Object.assign(params, {
                userId: config.userId,
                pairId: config.pairId,
                pairToken: config.pairToken,
                deviceToken: config.deviceToken
            });

            if (!params.userId) {
                // throw an error?
                node.error("hit an error", "Missing UserId");
                return
            }
            if (!params.pairToken) {
                // throw an error?
                node.error("hit an error", "Missing Pair Token");
                return
            }

            allow2.check(params, callback);
            // function(err, result) {
            //     console.log('result from Allow2 check:', err, result);
            //     callback(err, result);
            // });
        }
    }

    RED.nodes.registerType("Allow2Pairing", Pairing);
};
