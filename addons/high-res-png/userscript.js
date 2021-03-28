import { fileToSvg } from "./to-svg.js";

export default function ({ addon, global, console, msg }) {
  const vm = addon.tab.traps.vm;

  // https://github.com/LLK/scratch-gui/blob/develop/src/lib/file-uploader.js
  async function makeCostume(svg, name) {
    const storage = vm.runtime.storage;
    const asset = storage.createAsset(
      storage.AssetType.ImageVector,
      storage.DataFormat.SVG,
      new Uint8Array(await svg.arrayBuffer()),
      null,
      true // generate md5
    );
    return {
      name,
      dataFormat: storage.DataFormat.SVG,
      asset,
      md5: `${asset.assetId}.${storage.DataFormat.SVG}`,
      assetId: asset.assetId,
    };
  }
  async function addCostume(costume) {
    await vm.addCostume(costume.md5, costume, vm.editingTarget.id);
  }
  async function addBackdrop(backdrop) {
    await vm.addBackdrop(backdrop.md5, backdrop);
  }
  async function addSprite(costume) {
    const newSprite = {
      name: costume.name,
      isStage: false,
      x: 0,
      y: 0,
      visible: true,
      size: 100,
      rotationStyle: "all around",
      direction: 90,
      draggable: false,
      currentCostume: 0,
      blocks: {},
      variables: {},
      costumes: [costume],
      sounds: [],
    };
    // Normally Scratch randomizes the sprite position here, but this may not be
    // desired for the seasoned Scratcher
    await vm.addSprite(JSON.stringify(newSprite));
  }

  function createUploadBtn(mode) {
    const icon = Object.assign(document.createElement("img"), {
      className: addon.tab.scratchClass("action-menu_more-icon"),
      draggable: false,
      src: addon.self.dir + "/icon.svg",
    });

    const fileInput = Object.assign(document.createElement("input"), {
      className: addon.tab.scratchClass("action-menu_file-input"),
      accept: ".svg, .png, .bmp, .jpg, .jpeg, .gif",
      multiple: true,
      type: "file",
    });
    fileInput.addEventListener("change", async (e) => {
      // Clone file list in case user changes it while loading
      const files = [...fileInput.files];
      // Allow the user to reselect the same file
      fileInput.value = null;
      if (files.length === 0) return;

      addon.tab.redux.dispatch({
        type: "scratch-gui/alerts/SHOW_ALERT",
        alertId: "importingAsset",
      });
      if (mode === "backdrop") {
        vm.setEditingTarget(addon.tab.redux.state.scratchGui.targets.stage.id);
      }

      for (const file of files) {
        const costume = await makeCostume(await fileToSvg(file), file.name.split(".", 1)[0]);
        if (mode === "costume") {
          await addCostume(costume);
        } else if (mode === "sprite") {
          await addSprite(costume);
        } else {
          await addBackdrop(costume);
        }
      }
      if (mode === "backdrop") {
        // Switch to costumes tab when adding a new backdrop
        addon.tab.redux.dispatch({
          type: "scratch-gui/navigation/ACTIVATE_TAB",
          activeTabIndex: 1,
        });
      }
      addon.tab.redux.dispatch({
        type: "scratch-gui/alerts/CLOSE_ALERT_WITH_ID",
        alertId: "importingAsset",
      });
    });

    const button = Object.assign(document.createElement("button"), {
      className: addon.tab.scratchClass("action-menu_button", "action-menu_more-button"),
      ariaLabel: msg("upload-hd-costume"),
    });
    button.addEventListener("click", (e) => {
      // Scratch also blurs focus on click for action menu items
      button.blur();
      fileInput.click();
      e.stopPropagation();
    });
    button.addEventListener("mouseenter", () => {
      toolTip.classList.add("show");
      const { top, height, left, right } = button.getBoundingClientRect();
      const { height: toolTipHeight, width } = toolTip.getBoundingClientRect();
      toolTip.style.left = (mode === "costume" ? right : left - width) + "px";
      toolTip.style.top = top + (height - toolTipHeight) / 2 + "px";
    });
    button.addEventListener("mouseleave", () => {
      toolTip.classList.remove("show");
    });
    button.append(icon, fileInput);

    const toolTip = Object.assign(document.createElement("div"), {
      className: `__react_component_tooltip place-${
        mode === "costume" ? "right" : "left"
      } type-dark ${addon.tab.scratchClass("action-menu_tooltip")}`,
      textContent: msg("upload-hd-costume"),
    });

    const div = document.createElement("div");
    div.append(button, toolTip);
    return div;
  }

  // Costumes tab
  (async () => {
    while (true) {
      const addCostumeButtons = await addon.tab.waitForElement(
        '#react-tabs-3 div[class*="action-menu_more-buttons_"]',
        {
          markAsSeen: true,
        }
      );
      addCostumeButtons.insertBefore(createUploadBtn("costume"), addCostumeButtons.children[1]);
    }
  })();

  // Sprite list
  (async () => {
    while (true) {
      const addSpriteButtons = await addon.tab.waitForElement(
        'div[class*="sprite-selector_add-button"] div[class*="action-menu_more-buttons_"]',
        {
          markAsSeen: true,
        }
      );
      addSpriteButtons.insertBefore(createUploadBtn("sprite"), addSpriteButtons.firstChild);
    }
  })();

  // Stage selector add backdrop button
  (async () => {
    while (true) {
      const addBackdropButtons = await addon.tab.waitForElement(
        'div[class*="stage-selector_add-button"] div[class*="action-menu_more-buttons_"]',
        {
          markAsSeen: true,
        }
      );
      addBackdropButtons.insertBefore(createUploadBtn("backdrop"), addBackdropButtons.firstChild);
    }
  })();
}
