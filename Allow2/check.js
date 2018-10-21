const async = require('async');
const allow2 = require('allow2');

module.exports = function(RED) {

    function Check(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function(msg) {

            const childId = ( msg.payload && msg.payload.childId ) || config.childId;
            const activities = ( msg.payload && msg.payload.activities ) || config.activities;
            const log = ( msg.payload && msg.payload.log ) || config.log || true;

            const params = {
                userId: config.userId,
                pairId: config.pairId,
                pairToken: config.pairToken,
                deviceToken: config.deviceToken,
                tz: 'Australia/Sydney',                    // note: timezone is crucial to correctly calculate allowed times and day types
                childId: childId,       // MANDATORY!
                activities: [
                    { id: 3, log: true },           // 3 = Gaming
                    { id: 8, log: true }            // 8 = Screen Time
                ],
                log: log				    // note: if set, record the usage (log it) and deduct quota, otherwise it only checks the access is permitted.
            };

            if (!params.childId) {
                // throw an error?
                node.error("hit an error", "Missing ChildId");
                return
            }
            if (!params.userId) {
                // throw an error?
                node.error("hit an error", "Missing PairId");
                return
            }
            if (!params.pairToken) {
                // throw an error?
                node.error("hit an error", "Missing Pair Token");
                return
            }

            console.log("calling allow2 check", params);

            allow2.check(params, function(err, result) {
                console.log('result from Allow2 check:', result);
                node.send([{ payload: result }]);
            });
        });
    }
    RED.nodes.registerType("Allow2Check", Check);
};
