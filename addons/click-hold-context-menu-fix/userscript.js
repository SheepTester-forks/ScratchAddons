export default async function ({ addon, global, console }) {
  // Threshold of finger movement used to determine when to hide a context menu
  // for a touch user.
  const MIN_DRAG_RADIUS = 15;

  // Keep track of whether the left/right mouse buttons are down
  let leftMouseDown = false;
  let rightMouseDown = false;
  // Touch and pen trigger mousedown and mouseup in quick succession, so
  // `leftMouseDown` won't be set to true long enough for them.
  document.addEventListener("mousedown", (e) => {
    if (e.button === 0) {
      leftMouseDown = true;
    } else if (e.button === 2) {
      rightMouseDown = true;
    }
  });
  document.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      leftMouseDown = false;
    } else if (e.button === 2) {
      rightMouseDown = false;
    }
  });
  // click is fired after mouseup
  document.addEventListener("click", (e) => {
    if (e.button === 0 && !rightMouseDown) {
      window.requestAnimationFrame(() => {
        leftMouseDown = true;
        window.requestAnimationFrame(() => {
          // In the second animation frame after the click, this is when Scratch
          // unhides the context menu for some reason:
          // 0. click event handler
          //    [animation frame]
          // 1. first animation frame callback
          //    [animation frame]
          // 2. Scratch unhides the context menu
          //    second animation frame callback
          leftMouseDown = false;
        });
      });
    }
  });

  // Detect when any pointer (touch, mouse, pen) has moved significantly
  // (chances are, if that's the case, the user isn't intending to press and
  // hold)
  const pointers = {};
  document.addEventListener("pointerdown", (e) => {
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY, moved: false };
  });
  document.addEventListener("pointermove", (e) => {
    if (pointers[e.pointerId]) {
      const { x, y, moved } = pointers[e.pointerId];
      if (!moved && (x - e.clientX) ** 2 + (y - e.clientY) ** 2 > MIN_DRAG_RADIUS * MIN_DRAG_RADIUS) {
        pointers[e.pointerId].moved = true;
        // Hide any context menus that have opened while the user left their
        // finger on the screen.
        for (const menu of document.querySelectorAll('nav[class*="context-menu_context-menu"]')) {
          if (menu.style.opacity === "1") {
            menu.style.opacity = 0;
            menu.style.pointerEvents = "none";
          }
        }
      }
    }
  });
  const handlePointerEnd = (e) => {
    delete pointers[e.pointerId];
  };
  document.addEventListener("pointerup", handlePointerEnd);
  document.addEventListener("pointercancel", handlePointerEnd);

  while (true) {
    const menu = await addon.tab.waitForElement(`nav[class*="context-menu_context-menu"]`, { markAsSeen: true });
    const observer = new MutationObserver(() => {
      if (menu.style.opacity === "1") {
        const anyPointersMoved = Object.values(pointers).find((pointer) => pointer.moved);
        // Right clicking whilst left clicking should still open the context
        // menu
        if ((leftMouseDown && !rightMouseDown) || anyPointersMoved) {
          menu.style.opacity = 0;
          menu.style.pointerEvents = "none";
        }
      }
    });
    observer.observe(menu, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }
}
