export default function ({ addon, global, console }) {
  const ALLOWED_MENU = 'sa-allowed-context-menu';

  let leftMouseDown = false;
  let rightMouseDown = false;
  // Touch and pen trigger mousedown and mouseup in quick succession, so
  // `leftMouseDown` won't be set to true long enough for them.
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      leftMouseDown = true;
    } else if (e.button === 2) {
      rightMouseDown = true;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      leftMouseDown = false;
    } else if (e.button === 2) {
      rightMouseDown = false;
    }
  });

  window.addon = addon;
  (async () => {
    // Check for open menus and close them if the user's left mouse button is
    // held down.
    while (true) {
      const menu = await addon.tab.waitForElement(`nav[class*="context-menu_context-menu"][style*="opacity: 1;"]:not(.${ALLOWED_MENU})`);
      console.log(menu, leftMouseDown, rightMouseDown)
      // Right clicking whilst left clicking should still open the context menu
      if (leftMouseDown && !rightMouseDown) {
        menu.style.opacity = 0;
        menu.style.pointerEvents = "none";
      } else {
        menu.classList.add(ALLOWED_MENU);
      }
    }
  })();

  (async () => {
    // Unmark closed menus that had been allowed to be open so that they can be
    // re-detected in the future.
    while (true) {
      const menu = await addon.tab.waitForElement(`nav[class*="context-menu_context-menu"][style*="opacity: 0;"].${ALLOWED_MENU}`);
      menu.classList.remove(ALLOWED_MENU);
    }
  })();
}
