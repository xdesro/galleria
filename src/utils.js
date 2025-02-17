export const mapRange = (value, oldMin, oldMax, newMin, newMax) =>
  ((value - oldMin) / (oldMax - oldMin)) * (newMax - newMin) + newMin;

export const debounce = (fn, timeout) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, timeout);
  };
};

export const scaleImageData = (imageData, width, height) => {
  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  const ctx = offscreenCanvas.getContext("2d");

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCanvas.getContext("2d").putImageData(imageData, 0, 0);

  ctx.drawImage(tempCanvas, 0, 0, width, height);
  const tempData = ctx.getImageData(0, 0, width, height);
  tempCanvas.remove();

  return tempData;
};

export const calculateDestinyFromSource = (sourcePoints) => {
  const width =
    Math.max(...sourcePoints.map((p) => p[0])) -
    Math.min(...sourcePoints.map((p) => p[0]));
  const height =
    Math.max(...sourcePoints.map((p) => p[1])) -
    Math.min(...sourcePoints.map((p) => p[1]));

  return [
    [0, 0],
    [width, 0],
    [width, height],
    [0, height],
  ];
};
