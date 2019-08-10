
const timers = (msg.payload && 
    msg.payload.response &&
    msg.payload.response.timers) || [];
const relevantTimers = timers.filter(function(timer) {
    return timer.ActivityId === 2;
})
if (!timers) {
    return;
}
const running = relevantTimers.reduce(function(memo, timer) {
    return memo || timer.running;
}, false);

msg.payload = running;
if (running) return [msg, null];
return [null, msg];
