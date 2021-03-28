import { fileToSvg } from "./to-svg.js";

export default async function ({ addon, global, console, msg }) {
  const vm = addon.tab.traps.vm;

  async function addSvgCostume(svg, name) {
    // Based on https://github.com/LLK/scratch-gui/blob/c8c99479aaeafdab56d8c3f74b2915b4a223b908/src/containers/costume-tab.jsx#L204-L220
    const storage = vm.runtime.storage;
    const targetId = vm.editingTarget.id;
    const asset = storage.createAsset(
      storage.AssetType.ImageVector,
      storage.DataFormat.SVG,
      new Uint8Array(await svg.arrayBuffer()),
      null,
      true // generate md5
    );
    const costume = {
      name,
      dataFormat: storage.DataFormat.SVG,
      asset,
      md5: `${asset.assetId}.${storage.DataFormat.SVG}`,
      assetId: asset.assetId,
    };
    await vm.addCostume(costume.md5, costume, targetId);
  }

  function createUploadBtn() {
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
    fileInput.addEventListener("change", async () => {
      // Clone file list in case user changes it while loading
      const files = [...fileInput.files];
      // Allow the user to reselect the same file
      fileInput.value = null;
      for (const file of files) {
        await addSvgCostume(await fileToSvg(file), file.name.split(".", 1)[0]);
      }
    });
    const button = Object.assign(document.createElement("button"), {
      className: addon.tab.scratchClass("action-menu_button", "action-menu_more-button"),
      ariaLabel: msg("upload-hd-costume"),
    });
    button.addEventListener("click", () => {
      // Scratch also blurs focus on click for action menu items
      button.blur();
      fileInput.click();
    });
    button.addEventListener("mouseenter", () => {
      toolTip.classList.add("show");
      const { top, height, right } = button.getBoundingClientRect();
      const { height: toolTipHeight } = toolTip.getBoundingClientRect();
      toolTip.style.left = right + "px";
      toolTip.style.top = top + (height - toolTipHeight) / 2 + "px";
    });
    button.addEventListener("mouseleave", () => {
      toolTip.classList.remove("show");
    });
    button.append(icon, fileInput);
    const toolTip = Object.assign(document.createElement("div"), {
      className: `__react_component_tooltip place-right type-dark ${addon.tab.scratchClass("action-menu_tooltip")}`,
      textContent: msg("upload-hd-costume"),
    });
    const div = document.createElement("div");
    div.append(button, toolTip);
    return div;
  }

  while (true) {
    const addCostumeButtons = await addon.tab.waitForElement('#react-tabs-3 div[class*="action-menu_more-buttons_"]', {
      markAsSeen: true,
    });
    addCostumeButtons.insertBefore(createUploadBtn(), addCostumeButtons.children[1]);
  }
}
