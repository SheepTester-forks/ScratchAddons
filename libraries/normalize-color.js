export const getHexRegex = (alpha = false) => alpha ? /^#?([0-9a-fA-F]{3}){1,2}$/g : /^#?([0-9a-fA-F]{3,4}){1,2}$/g;

export const normalizeHex = (input, alpha = false) => {
  let hex = String(input);
  if (!getHexRegex(alpha).test(hex)) return "#000000";
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (hex.length === 4) {
    const [_, r, g, b] = hex;
    hex = `#${r}${r}${g}${g}${b}${b}`;
  } else if (alpha && hex.length === 5) {
    const [_, r, g, b, a] = hex;
    hex = `#${r}${r}${g}${g}${b}${b}${a}${a}`;
  }
  return hex.toLowerCase();
}

let dummy;

export const cssColorToHex = (input, alpha = false) => {
  if (!dummy) {
    dummy = document.createElement('span');
    // The dummy element need not be visible for window.getComputedStyle to work
    document.head.appendChild(dummy);
  }
  // An invalid color will default to black
  dummy.style.color = 'black';
  dummy.style.color = input;
  // The browser will normalize the color to rgb(...) or rgba(...); this seems
  // to be according to the spec:
  // https://test.csswg.org/harness/test/css-color-3_dev/single/color-valid/format/html4/
  const rgbColor = window.getComputedStyle(dummy).color;
  // The alpha channel is between 0 and 1, so it needs to be multiplied by 255
  // then rounded (matches browser behavior)
  const channels = rgbColor.match(/\d+(\.\d+)?/g)
    .map((n, i) => Math.round(i === 3 ? n * 255 : n).toString(16).padStart(2, '0'));
  if (!alpha && channels.length > 3) {
    return '#' + channels.slice(0, 3).join('');
  }
  return '#' + channels.join('');
};
