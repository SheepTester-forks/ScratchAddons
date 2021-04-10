export default async function ({ addon, global, console }) {
  const DRAG_AREA_CLASS = "sa-drag-area";
  const DRAG_OVER_CLASS = "sa-dragged-over";

  function droppable(dropArea, onDrop, allowDrop = () => true) {
    dropArea.classList.add(DRAG_AREA_CLASS);
    dropArea.addEventListener("drop", (e) => {
      if (e.dataTransfer.types.includes("Files") && allowDrop()) {
        if (e.dataTransfer.files.length > 0) {
          onDrop(e.dataTransfer.files);
        }
        e.preventDefault();
      }
      dropArea.classList.remove(DRAG_OVER_CLASS);
    });
    dropArea.addEventListener("dragover", (e) => {
      // Ignore dragged text, for example
      if (!e.dataTransfer.types.includes("Files") || !allowDrop()) {
        return;
      }
      dropArea.classList.add(DRAG_OVER_CLASS);
      e.preventDefault();
    });
    dropArea.addEventListener("dragleave", () => {
      dropArea.classList.remove(DRAG_OVER_CLASS);
    });
  }

  async function foreverDroppable(dropAreaSelector, fileInputSelector) {
    while (true) {
      const dropArea = await addon.tab.waitForElement(dropAreaSelector, { markAsSeen: true });
      const fileInput = await addon.tab.waitForElement(fileInputSelector, {
        markAsSeen: true,
      });
      droppable(dropArea, (files) => {
        fileInput.files = files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
  }

  // Sprite selector
  foreverDroppable(
    'div[class*="sprite-selector_sprite-selector"]',
    'div[class*="sprite-selector_sprite-selector"] input[class*="action-menu_file-input"]'
  );

  // Stage selector
  foreverDroppable(
    'div[class*="stage-selector_stage-selector"]',
    'div[class*="stage-selector_stage-selector"] input[class*="action-menu_file-input"]'
  );

  // Costume/sound asset list
  foreverDroppable(
    'div[class*="selector_wrapper"]',
    'div[class*="selector_wrapper"] input[class*="action-menu_file-input"]'
  );

  const {
    traps: { vm },
    redux,
  } = addon.tab;
  async function listMonitorsDroppable() {
    while (true) {
      const listMonitor = await addon.tab.waitForElement('div[class*="monitor_list-monitor"]', { markAsSeen: true });
      const monitorName = listMonitor.querySelector('div[class*="monitor_list-header"]').textContent;
      const monitor = redux.state.scratchGui.monitors.valueSeq().find((monitor) => {
        if (!monitor.visible || monitor.opcode !== "data_listcontents") return false;
        const label = monitor.spriteName ? `${monitor.spriteName}: ${monitor.params.LIST}` : monitor.params.LIST;
        return label === monitorName;
      });
      const target = monitor.targetId ? vm.runtime.getTargetById(monitor.targetId) : vm.runtime.getTargetForStage();
      const variable = target.variables[monitor.id];
      const canDrop = () => {
        // Don't show drop indicator if in fullscreen/player mode
        return !listMonitor.closest('div[class*="stage_full-screen"], .guiPlayer');
      };
      const handleDrop = async (files) => {
        variable.value = (await Promise.all(Array.from(files, (file) => file.text()))).join("\n").split(/\r?\n/);
      };
      droppable(listMonitor, handleDrop, canDrop);
    }
  }
  listMonitorsDroppable();

  // For setting .value and letting React know about it
  // https://stackoverflow.com/a/60378508
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  async function askAnswerDroppable() {
    while (true) {
      const answerField = await addon.tab.waitForElement(
        'div[class*="question_question-input"] > input[class*="input_input-form_l9eYg"]',
        { markAsSeen: true }
      );
      droppable(answerField, async (files) => {
        const text = (await Promise.all(Array.from(files, (file) => file.text())))
          .join("")
          // Match pasting behaviour: remove all newline characters at the end
          .replace(/[\r\n]+$/, "")
          .replace(/\r?\n|\r/g, " ");
        const selectionStart = answerField.selectionStart;
        nativeInputValueSetter.call(
          answerField,
          answerField.value.slice(0, selectionStart) + text + answerField.value.slice(answerField.selectionEnd)
        );
        answerField.dispatchEvent(new Event("change", { bubbles: true }));
        answerField.setSelectionRange(selectionStart, selectionStart + text.length);
      });
    }
  }
  askAnswerDroppable();
}
