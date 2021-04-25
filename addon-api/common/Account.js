import Listenable from "./Listenable.js";

/**
 * Handles accounts.
 * @extends Listenable
 */
export default class Account extends Listenable {
  constructor() {
    super();
  }
  /**
   * Fetches message count.
   * @returns {Promise<number>} - current message count.
   */
  getMsgCount() {
    return Promise.resolve(0);
  }
  /**
   * Fetches messages.
   * @returns {Promise<object[]>} - current messages.
   */
  getMessages(...args) {
    return Promise.resolve([]);
  }
  /**
   * Clears unread messages.
   * @returns {Promise}
   */
  clearMessages() {
    return Promise.resolve();
  }
}
