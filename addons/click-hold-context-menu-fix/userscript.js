export default async function ({ addon, global, console }) {
  window.addon = addon;

  let leftMouseDown = false;
  let rightMouseDown = false;
  // Touch and pen trigger mousedown and mouseup in quick succession, so
  // `leftMouseDown` won't be set to true long enough for them.
  document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      leftMouseDown = true;
    } else if (e.button === 2) {
      rightMouseDown = true;
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      leftMouseDown = false;
    } else if (e.button === 2) {
      rightMouseDown = false;
    }
  });
  // click is fired after mouseup
  document.addEventListener('click', (e) => {
    if (e.button === 0 && !rightMouseDown) {
      window.requestAnimationFrame(() => {
        leftMouseDown = true
        window.requestAnimationFrame(() => {
          // In the second animation frame after the click, this is when Scratch
          // unhides the context menu for some reason:
          // 0. click event handler
          //    [animation frame]
          // 1. first animation frame callback
          //    [animation frame]
          // 2. Scratch unhides the context menu
          //    second animation frame callback
          leftMouseDown = false
        })
      })
    }
  });

  while (true) {
    const menu = await addon.tab.waitForElement(`nav[class*="context-menu_context-menu"]`, { markAsSeen: true });
    const observer = new MutationObserver(() => {
      if (menu.style.opacity === "1") {
        // Right clicking whilst left clicking should still open the context
        // menu
        if (leftMouseDown && !rightMouseDown) {
          menu.style.opacity = 0;
          menu.style.pointerEvents = "none";
        }
      }
    });
    observer.observe(menu, {
      attributes: true,
      attributeFilter: ['style']
    });
  }
}
