// import App from "./App.js";
import { Homography } from "homography";
import {
  mapRange,
  scaleImageData,
  calculateDestinyFromSource,
  debounce,
} from "./utils";

import "./styles.css";
import Template from "./template.html?raw";

const SAMPLE_CONSTRAINT = [
  [141, 125],
  [777, 152],
  [795, 902],
  [105, 884],
];

(document.querySelector("#app") as HTMLElement).innerHTML = Template;

class Galleria {
  private previewCanvas: HTMLCanvasElement;
  private renderCanvas: HTMLCanvasElement;
  private inputSelector: SVGElement;
  private outputSelector: SVGElement;
  private exportActions: NodeListOf<HTMLButtonElement>;

  private previewContext: CanvasRenderingContext2D;
  private renderContext: CanvasRenderingContext2D;
  private outputSelection: {
    viewBox: number[];
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    rect: DOMRect;
  };

  private homography: Homography;
  private draggingInput: { handle: SVGCircleElement; index: number } | null;
  private draggingOutput: boolean;
  private inputConstraint: number[][];
  private destiny: any;

  constructor({
    previewCanvas,
    renderCanvas,
    inputSelector,
    outputSelector,
    exportActions,
  }: {
    previewCanvas: HTMLCanvasElement;
    renderCanvas: HTMLCanvasElement;
    inputSelector: SVGElement;
    outputSelector: SVGElement;
    exportActions: NodeListOf<HTMLButtonElement>;
  }) {
    this.previewCanvas = previewCanvas;
    this.renderCanvas = renderCanvas;
    this.inputSelector = inputSelector;
    this.outputSelector = outputSelector;
    this.exportActions = exportActions;

    this.previewContext = this.previewCanvas.getContext(
      "2d"
    ) as CanvasRenderingContext2D;
    this.renderContext = this.renderCanvas.getContext(
      "2d"
    ) as CanvasRenderingContext2D;

    this.outputSelection = {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      rect: this.outputSelector.getBoundingClientRect(),
      viewBox: [],
    };

    this.draggingInput = null;
    this.draggingOutput = false;
    this.homography = new Homography();
    this.inputConstraint = [...SAMPLE_CONSTRAINT];
    this.destiny;
  }
  load(img: HTMLImageElement) {
    this.homography = new Homography(
      "auto",
      img.naturalWidth,
      img.naturalHeight
    );

    this.drawInputImageToCanvas(img);
    this.inputConstraint = [
      [100, 100],
      [this.previewCanvas.width - 100, 100],
      [this.previewCanvas.width - 100, this.previewCanvas.height - 100],
      [100, this.previewCanvas.height - 100],
    ];
    this.destiny = calculateDestinyFromSource(this.inputConstraint);

    this.homography.setSourcePoints(this.inputConstraint);
    this.homography.setDestinyPoints(this.destiny);
    this.inputSelector.setAttribute(
      "viewBox",
      `0 0 ${this.previewCanvas.width} ${this.previewCanvas.height}`
    );
    this.outputSelector.setAttribute(
      "viewBox",
      `0 0 ${this.previewCanvas.width} ${this.previewCanvas.height}`
    );
    this.outputSelection.viewBox = [
      0,
      0,
      this.previewCanvas.width,
      this.previewCanvas.height,
    ];

    this.createHandles();
    this.drawInputSelection();
    this.addListeners();
  }
  drawInputImageToCanvas(img: HTMLImageElement) {
    const { naturalWidth, naturalHeight } = img;
    const aspect = naturalHeight / naturalWidth;
    this.previewCanvas.width = this.renderCanvas.width =
      this.previewCanvas.width * 3;
    this.previewCanvas.height = this.renderCanvas.height =
      this.previewCanvas.width * aspect;

    this.previewContext.drawImage(
      img,
      0,
      0,
      this.previewCanvas.width,
      this.previewCanvas.height
    );

    this.homography.setImage(img);
    this.updateRender();
  }
  createHandles() {
    const handles = document.querySelectorAll(".handle");
    handles.forEach((handle) => handle.remove());

    this.inputConstraint.forEach(([x, y], i) => {
      const handle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      handle.classList.add("handle");
      handle.setAttribute("cx", `${x}`);
      handle.setAttribute("cy", `${y}`);
      handle.setAttribute("r", `${8}`);
      handle.setAttribute("fill", "white");
      handle.addEventListener("mousedown", (e) => {
        this.draggingInput = { handle, index: i };
        this.inputSelector.classList.add("dragging");
        e.preventDefault();
      });
      (
        this.inputSelector.querySelector(".selection__controls") as SVGElement
      ).appendChild(handle);
    });
  }
  drawInputSelection() {
    const { inputConstraint } = this;
    const path = `M ${inputConstraint[0][0]} ${inputConstraint[0][1]} 
                    L ${inputConstraint[1][0]} ${inputConstraint[1][1]} 
                    L ${inputConstraint[2][0]} ${inputConstraint[2][1]} 
                    L ${inputConstraint[3][0]} ${inputConstraint[3][1]} Z`;

    const oldPath = this.inputSelector.querySelector("path");
    if (oldPath) oldPath.remove();

    const newPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    this.inputSelector.style.setProperty("mix-blend-mode", "difference");
    newPath.setAttribute("d", path);
    newPath.setAttribute("stroke", "white");
    newPath.setAttribute("stroke-width", "2");
    newPath.setAttribute("fill", "none");
    (
      this.inputSelector.querySelector(".selection__path") as SVGElement
    ).appendChild(newPath);

    // resetOuputSelection();
    // drawOutputSelection();
  }
  drawOutputSelection() {
    const { outputSelection } = this;
    const path = `M ${outputSelection.startX} ${outputSelection.startY} 
                    L ${outputSelection.endX} ${outputSelection.startY} 
                    L ${outputSelection.endX} ${outputSelection.endY} 
                    L ${outputSelection.startX} ${outputSelection.endY} Z`;

    const oldPath = this.outputSelector.querySelector("path");
    if (oldPath) oldPath.remove();

    const newPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    this.outputSelector.style.setProperty("mix-blend-mode", "difference");
    newPath.setAttribute("d", path);
    newPath.setAttribute("stroke", "white");
    newPath.setAttribute("stroke-width", "2");
    newPath.setAttribute("fill", "none");
    (
      this.outputSelector.querySelector(".selection__path") as SVGElement
    ).appendChild(newPath);
  }
  resetOuputSelection() {
    Object.assign(this.outputSelection, {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
    });
  }
  updateRender() {
    this.destiny = calculateDestinyFromSource(this.inputConstraint);
    this.homography.setSourcePoints(this.inputConstraint);
    this.homography.setDestinyPoints(this.destiny);
    const warpedImg = this.homography.warp();
    this.renderContext.clearRect(
      0,
      0,
      this.renderCanvas.width,
      this.renderCanvas.height
    );
    // renderContext.putImageData(warpedImg, 0, 0);
    this.renderContext.putImageData(
      scaleImageData(
        warpedImg,
        this.renderCanvas.width,
        this.renderCanvas.height
      ),
      0,
      0
    );
  }
  addListeners() {
    document.addEventListener("mousemove", (e) => {
      if (!this.draggingInput) return;

      if (this.draggingInput) {
        const rect = this.previewCanvas.getBoundingClientRect();
        const viewBox = this.inputSelector.getAttribute("viewBox") || `0 0 0 0`;
        const selectionBoxVals = viewBox.split(" ").map((str) => parseInt(str));
        const selectionBoxMaxX = selectionBoxVals[2];
        const selectionBoxMaxY = selectionBoxVals[3];
        const x = mapRange(
          e.clientX - rect.left,
          0,
          rect.width,
          0,
          selectionBoxMaxX
        );
        const y = mapRange(
          e.clientY - rect.top,
          0,
          rect.height,
          0,
          selectionBoxMaxY
        );
        this.inputConstraint[this.draggingInput.index] = [x, y];

        this.draggingInput.handle.setAttribute("cx", x);
        this.draggingInput.handle.setAttribute("cy", y);

        this.drawInputSelection();
        debounce(this.updateRender(), 50);
      }
    });
    document.addEventListener("mouseup", () => {
      this.draggingInput = null;
      this.draggingOutput = false;
      this.inputSelector.classList.remove("dragging");
      this.outputSelector.classList.remove("dragging");
    });

    this.renderCanvas.addEventListener("mousedown", (e) => {
      this.draggingOutput = true;
      this.outputSelector.classList.add("dragging");

      this.outputSelection.rect = this.renderCanvas.getBoundingClientRect();
      this.outputSelection.startX = mapRange(
        e.layerX,
        0,
        this.outputSelection.rect.width,
        0,
        this.outputSelection.viewBox[2]
      );

      this.outputSelection.startY = mapRange(
        e.layerY,
        0,
        this.outputSelection.rect.height,
        0,
        this.outputSelection.viewBox[3]
      );
    });
    this.renderCanvas.addEventListener("mousemove", (e) => {
      if (this.draggingOutput) {
        this.outputSelection.endX = mapRange(
          e.layerX,
          0,
          this.outputSelection.rect.width,
          0,
          this.outputSelection.viewBox[2]
        );

        this.outputSelection.endY = mapRange(
          e.layerY,
          0,
          this.outputSelection.rect.height,
          0,
          this.outputSelection.viewBox[3]
        );
      }
      this.drawOutputSelection();
    });
    this.exportActions.forEach((action) => {
      action.addEventListener("click", async (e) => {
        console.log(action.dataset);
        const clipboardCanvas = document.createElement("canvas");
        const clipboardCtx = clipboardCanvas.getContext("2d", {
          willReadFrequently: true,
        }) as CanvasRenderingContext2D;
        let data;
        const { outputSelection } = this;
        if (outputSelection.endX > 0) {
          data = this.renderContext.getImageData(
            outputSelection.startX,
            outputSelection.startY,
            outputSelection.endX - outputSelection.startX,
            outputSelection.endY - outputSelection.startY
          );
        } else {
          data = this.renderContext.getImageData(
            0,
            0,
            this.renderCanvas.width,
            this.renderCanvas.height
          );
        }
        clipboardCanvas.width = data.width;
        clipboardCanvas.height = data.height;
        clipboardCtx.putImageData(data, 0, 0);
        clipboardCanvas.toBlob(async (blob) => {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            parent.postMessage(
              {
                pluginMessage: {
                  type: "send-image",
                  imageData: Array.from(uint8Array),
                  width: clipboardCanvas.width,
                  height: clipboardCanvas.height,
                  replace: action.dataset.action === "replace",
                },
              },
              "*"
            );
            console.log("Message posted");
          } catch (err) {
            console.error("Error in blob processing:", err);
          }
        }, "image/png");
      });
    });
  }
}

const galleria = new Galleria({
  previewCanvas: document.querySelector(".preview") as HTMLCanvasElement,
  renderCanvas: document.querySelector(".render") as HTMLCanvasElement,
  inputSelector: document.querySelector(".selection--input") as SVGElement,
  outputSelector: document.querySelector(".selection--output") as SVGElement,
  exportActions: document.querySelectorAll(
    ".footer__action"
  ) as NodeListOf<HTMLButtonElement>,
});

const baseImg = new Image();
baseImg.onload = () => {
  galleria.load(baseImg);
};

window.onmessage = (event) => {
  const { type, bytes } = event.data.pluginMessage;

  if (type === "IMAGE_DATA") {
    // console.log("Received image bytes:", bytes);
    const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    baseImg.src = url;
  }
};
