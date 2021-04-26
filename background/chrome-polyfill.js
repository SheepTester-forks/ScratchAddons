// Hacky "polyfill" for chrome.* APIs
export default function polyfill (messageOptions) {
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

    chrome.runtime.getManifest = () => {
        return {
          "manifest_version": 2,
          "name": "__MSG_extensionName__",
          "description": "__MSG_extensionDescription__",
          "version": "1.14.0",
          "version_name": "1.14.0-prerelease"
        };
    };

    let i18n;
    Object.defineProperty(chrome, 'i18n', {
        get () {
            if (!i18n) {
                // Unfortunately, chrome.i18n is not async, so neither can this.
                const language = navigator.language.split('-')[0] === 'pt'
                    ? navigator.language.replace('-', '_')
                    : navigator.language.split('-')[0];
                const languages = ['ar', 'cs', 'de', 'en', 'es', 'fr', 'it', 'ja', 'nb', 'nl', 'pl', 'pt_BR', 'pt_PT', 'ro', 'ru', 'sl', 'th', 'tr'];
                const url = new URL(`../_locales/${languages.includes(language) ? language : 'en'}/messages.json`, import.meta.url)
                const request = new XMLHttpRequest();
                request.open('GET', url, false); // Synchronous :(
                request.send(null);
                const parsed = JSON.parse(request.responseText);
                i18n = {
                    getMessage (key) {
                        return parsed[key] ? parsed[key].message : key;
                    }
                };
            }
            return i18n;
        }
    })
}
