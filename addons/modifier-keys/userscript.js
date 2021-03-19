export default async function ({ addon, global, console }) {
  const vm = addon.tab.traps.vm;

  const Keyboard = vm.runtime.ioDevices.keyboard.constructor;

  const originalPostData = Keyboard.postData;
  Keyboard.postData = function (data) {
    if (data.key && typeof data.key === 'string' && ) {
      //
    } else {
      originalPostData.apply(this, data);
    }
  };

  window.addon = addon
}
