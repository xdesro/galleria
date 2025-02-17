export default function () {
  let lastSelection = null;

  const selection = figma.currentPage.selection;
  lastSelection = selection;

  if (selection.length === 0) {
    figma.notify("Please select at least one rectangle");
    figma.closePlugin();
  }

  const node = selection[0] as RectangleNode | VectorNode;

  if (node.type !== "RECTANGLE" && node.type !== "VECTOR") {
    figma.notify("Please select a rectangle");
    figma.closePlugin();
  }
  figma.showUI(__html__, {
    width: 1200,
    height: node.height,
    themeColors: true,
  });

  const fills = node.fills as ReadonlyArray<Paint>;

  if (!Array.isArray(fills)) {
    figma.notify("Selected rectangle has no fills");
    figma.closePlugin();
  }

  const imageFill = fills.find(
    (fill): fill is ImagePaint => fill.type === "IMAGE"
  );

  if (!imageFill || !imageFill.imageHash) {
    figma.notify("No valid image fill found");
    figma.closePlugin();
  }
  const image = imageFill?.imageHash
    ? figma.getImageByHash(imageFill.imageHash)
    : null;
  if (!image) {
    figma.notify("Failed to load image");
    figma.closePlugin();
  }

  image &&
    image
      .getBytesAsync()
      .then((bytes) => {
        figma.ui.postMessage({ type: "IMAGE_DATA", bytes });
      })
      .catch((error) => {
        figma.notify("Failed to process image bytes");
        console.error(error);
        figma.closePlugin();
      });

  figma.ui.onmessage = async (msg) => {
    if (msg.type === "send-image") {
      try {
        const imageBytes = new Uint8Array(msg.imageData);
        const image = figma.createImage(imageBytes);
        figma.ui.postMessage({ type: "LOADING_STATE", loading: true });

        let rect = selection[0] as RectangleNode | VectorNode;
        if (!msg.replace) {
          rect = figma.createRectangle();
        }
        rect.resize(msg.width, msg.height);
        rect.fills = [
          {
            type: "IMAGE",
            imageHash: image.hash,
            scaleMode: "FILL",
          },
        ];
        if (!msg.replace) {
          rect.x = lastSelection[0].x + lastSelection[0].width + 24;
          rect.y = lastSelection[0].y;
          figma.currentPage.appendChild(rect);
        }
        figma.viewport.scrollAndZoomIntoView([rect]);
        figma.ui.postMessage({ type: "LOADING_STATE", loading: false });
        figma.closePlugin();
      } catch (error) {
        console.error("Error in main:", error);
      }
    }
  };
}
