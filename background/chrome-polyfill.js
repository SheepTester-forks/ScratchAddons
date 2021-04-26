// Hacky "polyfill" for chrome.runtime
const messageOptions = {
    name: 'background',
    frame: window.parent,
    verbose: false
};
if (typeof chrome === 'undefined') {
    window.chrome = {};
}
if (!chrome.runtime) {
    chrome.runtime = {};
}
const responseSentListeners = {};
let id = 0;
chrome.runtime.sendMessage = async (message, onResponseSent) => {
    await messageOptions.ready;
    const responseId = ++id;
    const msg = {
        message,
        responseId,
        pleaseRespondToMe: true
    };
    if (messageOptions.verbose) {
        console.log(`%c[${messageOptions.name}] 📢`, 'font-weight: bold; color: cyan', msg, responseId);
    }
    messageOptions.frame.postMessage(msg, location.origin);
    if (onResponseSent) {
        responseSentListeners[responseId] = onResponseSent;
    }
};
const listeners = new Set();
chrome.runtime.onMessage = {
    addListener: (listener) => {
        listeners.add(listener);
    }
};
window.addEventListener('message', e => {
    if (messageOptions.verbose) {
        console.log(`%c[${messageOptions.name}] 👂`, 'font-weight: bold; color: cyan', e.data, e.origin);
    }
    if (e.origin === location.origin) {
        const { message, responseId, pleaseRespondToMe } = e.data;
        if (pleaseRespondToMe) {
            const sender = { tab: {} };
            for (const listener of listeners) {
                listener(message, sender, response => {
                    messageOptions.frame.postMessage({
                        message: response,
                        responseId,
                        pleaseRespondToMe: false
                    }, location.origin);
                });
            }
        } else if (responseSentListeners[responseId]) {
            responseSentListeners[responseId](message);
            delete responseSentListeners[responseId]
        }
    }
});
