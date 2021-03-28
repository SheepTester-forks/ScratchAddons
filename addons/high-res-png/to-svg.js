function svgify({ url, width, height, scale = 1 }) {
  return new Blob(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${
        width * scale
      }" height="${height * scale}" viewBox="0 0 ${width * scale} ${
        height * scale
      }"><image x="0" y="0" width="${width}" height="${height}" transform="scale(${scale}, ${scale})" xlink:href="${url}" /></svg>`,
    ],
    { type: "image/svg+xml" }
  );
}

function dataUrlify(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve(reader.result);
    });
    reader.addEventListener("error", () => {
      reject(reader.error);
    });
    reader.readAsDataURL(blob);
  });
}

function getImageSize(blob) {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    const url = URL.createObjectURL(blob);
    image.addEventListener("load", () => {
      resolve({ width: image.width, height: image.height });
      URL.revokeObjectURL(url);
    });
    image.addEventListener("error", () => {
      reject(new TypeError("Image failed to load. (This might mean the image is invalid.)"));
    });
    image.src = url;
  });
}

const MAX_WIDTH = 480;
const MAX_HEIGHT = 360;

export async function fileToSvg(file) {
  const { width, height } = await getImageSize(file);
  const url = await dataUrlify(file);
  let scale = 1;
  if (width > MAX_WIDTH) {
    scale = MAX_WIDTH / width;
  }
  if (scale * height > MAX_HEIGHT) {
    scale *= MAX_HEIGHT / (scale * height);
  }
  return svgify({
    url,
    width: width,
    height: height,
    scale,
  });
}
