import runAddonUserscripts from "./run-userscript.js";
import Localization from "./l10n.js";

window.scratchAddons = {};
scratchAddons.classNames = { loaded: false };
scratchAddons.eventTargets = {
  auth: [],
  settings: [],
  tab: [],
  self: [],
};

const pendingPromises = {};
pendingPromises.msgCount = [];

const page = {
  _globalState: null,
  get globalState() {
    return this._globalState;
  },
  set globalState(val) {
    this._globalState = scratchAddons.globalState = val;
  },

  l10njson: null, // Only set once
  addonsWithUserscripts: null, // Only set once

  _dataReady: false,
  get dataReady() {
    return this._dataReady;
  },
  set dataReady(val) {
    this._dataReady = val;
    onDataReady(); // Assume set to true
  },

  runAddonUserscripts, // Gets called by cs.js when addon enabled late

  fireEvent(info) {
    if (info.addonId) {
      if (info.name === "disabled") {
        document.documentElement.style.setProperty(
          `--${info.addonId.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}-_displayNoneWhileDisabledValue`,
          "none"
        );
      } else if (info.name === "reenabled") {
        document.documentElement.style.removeProperty(
          `--${info.addonId.replace(/-([a-z])/g, (g) => g[1].toUpperCase())}-_displayNoneWhileDisabledValue`
        );
      }

      // Addon specific events, like settings change and self disabled
      const eventTarget = scratchAddons.eventTargets[info.target].find(
        (eventTarget) => eventTarget._addonId === info.addonId
      );
      if (eventTarget) eventTarget.dispatchEvent(new CustomEvent(info.name));
    } else {
      // Global events, like auth change
      scratchAddons.eventTargets[info.target].forEach((eventTarget) =>
        eventTarget.dispatchEvent(new CustomEvent(info.name))
      );
    }
  },
  setMsgCount({ count }) {
    pendingPromises.msgCount.forEach((promiseResolver) => promiseResolver(count));
    pendingPromises.msgCount = [];
  },
};
window.page = page;

class SharedObserver {
  constructor() {
    this.inactive = true;
    this.pending = new Set();
    this.observer = new MutationObserver((mutation, observer) => {
      for (const item of this.pending) {
        if (item.condition && !item.condition()) continue;
        for (const match of document.querySelectorAll(item.query)) {
          if (item.seen) {
            if (item.seen.has(match)) continue;
            item.seen.add(match);
          }
          this.pending.delete(item);
          item.resolve(match);
          break;
        }
      }
      if (this.pending.size === 0) {
        this.inactive = true;
        this.observer.disconnect();
      }
    });
  }

  /**
   * Watches an element.
   * @param {object} opts - options
   * @param {string} opts.query - query.
   * @param {WeakSet=} opts.seen - a WeakSet that tracks whether an element has already been seen.
   * @param {function=} opts.condition - a function that returns whether to resolve the selector or not.
   * @returns {Promise<Node>} Promise that is resolved with modified element.
   */
  watch(opts) {
    if (this.inactive) {
      this.inactive = false;
      this.observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
      });
    }
    return new Promise((resolve) =>
      this.pending.add({
        resolve,
        ...opts,
      })
    );
  }
}

function onDataReady() {
  const addons = page.addonsWithUserscripts;

  scratchAddons.l10n = new Localization(page.l10njson);

  scratchAddons.methods = {};
  scratchAddons.methods.getMsgCount = () => {
    if (!pendingPromises.msgCount.length) _cs_.requestMsgCount();
    let promiseResolver;
    const promise = new Promise((resolve) => (promiseResolver = resolve));
    pendingPromises.msgCount.push(promiseResolver);
    return promise;
  };
  scratchAddons.methods.copyImage = async (dataURL) => {
    return _cs_.copyImage(dataURL);
  };

  scratchAddons.sharedObserver = new SharedObserver();

  const runUserscripts = () => {
    for (const addon of addons) {
      if (addon.scripts.length) runAddonUserscripts(addon);
    }
  };

  // Note: we currently load userscripts and locales after head loaded
  // We could do that before head loaded just fine, as long as we don't
  // actually *run* the addons before document.head is defined.
  if (document.head) runUserscripts();
  else {
    const observer = new MutationObserver(() => {
      if (document.head) {
        runUserscripts();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true });
  }
}

function bodyIsEditorClassCheck() {
  document.body.classList.add("sa-body-editor");
}
if (!document.body) document.addEventListener("DOMContentLoaded", bodyIsEditorClassCheck);
else bodyIsEditorClassCheck();

const originalReplaceState = history.replaceState;
history.replaceState = function () {
  const oldUrl = location.href;
  const newUrl = new URL(arguments[2], document.baseURI).href;
  const returnValue = originalReplaceState.apply(history, arguments);
  _cs_.url = newUrl;
  for (const eventTarget of scratchAddons.eventTargets.tab) {
    eventTarget.dispatchEvent(new CustomEvent("urlChange", { detail: { oldUrl, newUrl } }));
  }
  bodyIsEditorClassCheck();
  return returnValue;
};

const originalPushState = history.pushState;
history.pushState = function () {
  const oldUrl = location.href;
  const newUrl = new URL(arguments[2], document.baseURI).href;
  const returnValue = originalPushState.apply(history, arguments);
  _cs_.url = newUrl;
  for (const eventTarget of scratchAddons.eventTargets.tab) {
    eventTarget.dispatchEvent(new CustomEvent("urlChange", { detail: { oldUrl, newUrl } }));
  }
  bodyIsEditorClassCheck();
  return returnValue;
};

function loadClasses() {
  scratchAddons.classNames.arr = [
    ...new Set(
      [...document.styleSheets]
        .filter(
          (styleSheet) =>
            !(
              styleSheet.ownerNode.textContent.startsWith(
                "/* DO NOT EDIT\n@todo This file is copied from GUI and should be pulled out into a shared library."
              ) &&
              (styleSheet.ownerNode.textContent.includes("input_input-form") ||
                styleSheet.ownerNode.textContent.includes("label_input-group_"))
            )
        )
        .map((e) => {
          try {
            return [...e.cssRules];
          } catch (e) {
            return [];
          }
        })
        .flat()
        .map((e) => e.selectorText)
        .filter((e) => e)
        .map((e) => e.match(/(([\w-]+?)_([\w-]+)_([\w\d-]+))/g))
        .filter((e) => e)
        .flat()
    ),
  ];
  scratchAddons.classNames.loaded = true;

  const fixPlaceHolderClasses = () =>
    document.querySelectorAll("[class*='scratchAddonsScratchClass/']").forEach((el) => {
      [...el.classList]
        .filter((className) => className.startsWith("scratchAddonsScratchClass"))
        .map((className) => className.substring(className.indexOf("/") + 1))
        .forEach((classNameToFind) =>
          el.classList.replace(
            `scratchAddonsScratchClass/${classNameToFind}`,
            scratchAddons.classNames.arr.find(
              (className) =>
                className.startsWith(classNameToFind + "_") && className.length === classNameToFind.length + 6
            ) || `scratchAddonsScratchClass/${classNameToFind}`
          )
        );
    });

  fixPlaceHolderClasses();
  new MutationObserver(() => fixPlaceHolderClasses()).observe(document.documentElement, {
    attributes: false,
    childList: true,
    subtree: true,
  });
}

if (document.readyState !== "loading") {
  loadClasses();
} else {
  window.addEventListener("DOMContentLoaded", loadClasses, { once: true });
}
