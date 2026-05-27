import { ModelState } from "../types";
import JSZip from "jszip";

// Maximum range for encoding height in Canvas. 10.0mm is plenty for a 3D card.
const MAX_HEIGHT_MM = 10.0;

interface MeshGeometry {
  vertices: { x: number; y: number; z: number }[];
  triangles: [number, number, number][];
}

/**
 * Draw a base shape onto the given canvas context
 */
export function drawBaseShapePath(
  ctx: CanvasRenderingContext2D,
  shape: string,
  cx: number,
  cy: number,
  r: number,
  w: number,
  h: number
) {
  ctx.beginPath();
  switch (shape) {
    case "rectangle":
      ctx.rect(cx - w / 2, cy - h / 2, w, h);
      break;

    case "rounded_rectangle": {
      const radius = Math.min(w, h) * 0.15; // 15% corner radius
      const x = cx - w / 2;
      const y = cy - h / 2;
      ctx.roundRect ? ctx.roundRect(x, y, w, h, radius) : ctx.rect(x, y, w, h);
      break;
    }

    case "circle":
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;

    case "triangle":
      ctx.moveTo(cx, cy - h / 2);
      ctx.lineTo(cx + w / 2, cy + h / 2);
      ctx.lineTo(cx - w / 2, cy + h / 2);
      ctx.closePath();
      break;

    case "hexagon": {
      const hexR = r;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = cx + hexR * Math.cos(angle);
        const y = cy + hexR * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }

    case "star": {
      const spikes = 5;
      const outerRadius = r;
      const innerRadius = r * 0.4;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;

      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerRadius;
        let y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.closePath();
      break;
    }

    case "shield": {
      const x = cx - w / 2;
      const y = cy - h / 2;
      ctx.moveTo(cx, y);
      ctx.lineTo(cx + w / 2, y + h * 0.15);
      ctx.lineTo(cx + w / 2, y + h * 0.6);
      ctx.quadraticCurveTo(cx + w / 2, y + h * 0.95, cx, cy + h / 2);
      ctx.quadraticCurveTo(cx - w / 2, y + h * 0.95, cx - w / 2, y + h * 0.6);
      ctx.lineTo(cx - w / 2, y + h * 0.15);
      ctx.closePath();
      break;
    }

    default:
      ctx.rect(cx - w / 2, cy - h / 2, w, h);
  }
}

/**
 * Draw custom SVG paths onto the Canvas context.
 * Scales the 100x100 coord system of the paths to the requested center and scale.
 */
function drawSvgPathsOnCanvas(
  ctx: CanvasRenderingContext2D,
  paths: string[],
  cx: number,
  cy: number,
  size: number
) {
  if (!paths || paths.length === 0) return;

  ctx.save();
  // Translate to target center, scale from 100x100 box
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 100, size / 100);

  paths.forEach((pathStr) => {
    try {
      const path2D = new Path2D(pathStr);
      ctx.fill(path2D);
    } catch (e) {
      console.error("Failed to parse/draw SVG Path2D:", pathStr, e);
    }
  });

  ctx.restore();
}

/**
 * Generate a heightmap (grayscale canvas) where Red channel represents height in mm.
 * R = Math.round(Height_MM / MAX_HEIGHT_MM * 255)
 */
export function generateHeightmapCanvas(
  state: ModelState,
  widthPx: number,
  heightPx: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  // Clear to black: height = 0.0mm
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, widthPx, heightPx);

  const cx = widthPx / 2;
  const cy = heightPx / 2;
  const cardW = widthPx * 0.88;
  const cardH = heightPx * 0.88;
  const cardR = Math.min(cardW, cardH) / 2;

  // 1. Draw Base.
  // Base physical height is baseHeight (N mm).
  const baseVal = Math.round((state.baseHeight / MAX_HEIGHT_MM) * 255);
  ctx.fillStyle = `rgb(${baseVal}, 0, 0)`;
  drawBaseShapePath(ctx, state.baseShape, cx, cy, cardR, cardW, cardH);
  ctx.fill();

  const isRelief = state.structureType === "relief";

  // Detailed floor heights
  let floorHeightVal = baseVal;
  let textPatternHeightVal = Math.round(((state.baseHeight + 1.2) / MAX_HEIGHT_MM) * 255); // flat pattern raised slightly 1.2mm above base

  if (isRelief) {
    // Relief has raised borders and recessed floor.
    // Let's set the Outer Border height to baseHeight (N mm) -> baseVal
    // Recessed floor height = baseHeight - 1.5mm (minimum 0.4mm floor for printing support)
    const floorH = Math.max(0.4, state.baseHeight - 1.5);
    floorHeightVal = Math.round((floorH / MAX_HEIGHT_MM) * 255);

    // Draw recessed inner area: scale-down of base shape
    ctx.fillStyle = `rgb(${floorHeightVal}, 0, 0)`;
    drawBaseShapePath(
      ctx,
      state.baseShape,
      cx,
      cy,
      cardR * 0.92,
      cardW * 0.92,
      cardH * 0.92
    );
    ctx.fill();

    // In Relief, pattern/text is 1.6mm tall on top of the recessed floor,
    // which brings it slightly below or equal to the border height.
    const patternH = floorH + 1.6;
    textPatternHeightVal = Math.round((patternH / MAX_HEIGHT_MM) * 255);
  }

  // 2. Draw SVG Pattern
  if (state.svgPaths && state.svgPaths.length > 0) {
    ctx.fillStyle = `rgb(${textPatternHeightVal}, 0, 0)`;
    // Scale the pattern to fit beautifully inside the upper/center area
    const patternSize = Math.min(cardW, cardH) * 0.45;
    const posY = state.text ? cy - cardH * 0.08 : cy; // adjust up if we have text below
    drawSvgPathsOnCanvas(ctx, state.svgPaths, cx, posY, patternSize);
  }

  // 3. Draw Text
  if (state.text && state.text.trim()) {
    ctx.fillStyle = `rgb(${textPatternHeightVal}, 0, 0)`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontScale = state.textParams.fontSize || 14;
    const isBold = state.textParams.fontWeight === "bold";
    const scaleFactor = Math.min(cardW, cardH) / 100;
    const fontSizePx = fontScale * scaleFactor;

    ctx.font = `${isBold ? "bold" : "normal"} ${fontSizePx}px ${
      state.textParams.fontFamily || "Space Grotesk, sans-serif"
    }`;

    // Text offsets in percentage (-50 to 50) of card size
    const dx = (state.textParams.posX / 100) * cardW;
    const dy = (state.textParams.posY / 100) * cardH;

    const textX = cx + dx;
    const textY = cy + dy;

    // We can also add nice stroke or simply fill
    ctx.fillText(state.text, textX, textY);
    // Draw extra text line width if bold for robustness
    if (isBold) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgb(${textPatternHeightVal}, 0, 0)`;
      ctx.strokeText(state.text, textX, textY);
    }
  }

  return canvas;
}

/**
 * Generate a heightmap containing only the Base plate (including relief borders and recessed area if needed)
 */
export function generateBaseHeightmapCanvas(
  state: ModelState,
  widthPx: number,
  heightPx: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, widthPx, heightPx);

  const cx = widthPx / 2;
  const cy = heightPx / 2;
  const cardW = widthPx * 0.88;
  const cardH = heightPx * 0.88;
  const cardR = Math.min(cardW, cardH) / 2;

  const baseVal = Math.round((state.baseHeight / MAX_HEIGHT_MM) * 255);
  ctx.fillStyle = `rgb(${baseVal}, 0, 0)`;
  drawBaseShapePath(ctx, state.baseShape, cx, cy, cardR, cardW, cardH);
  ctx.fill();

  if (state.structureType === "relief") {
    const floorH = Math.max(0.4, state.baseHeight - 1.5);
    const floorHeightVal = Math.round((floorH / MAX_HEIGHT_MM) * 255);
    ctx.fillStyle = `rgb(${floorHeightVal}, 0, 0)`;
    drawBaseShapePath(
      ctx,
      state.baseShape,
      cx,
      cy,
      cardR * 0.92,
      cardW * 0.92,
      cardH * 0.92
    );
    ctx.fill();
  }

  return canvas;
}

/**
 * Generate a heightmap containing ONLY the text and pattern elements.
 * Background is black (height = 0).
 */
export function generatePatternHeightmapCanvas(
  state: ModelState,
  widthPx: number,
  heightPx: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, widthPx, heightPx);

  const cx = widthPx / 2;
  const cy = heightPx / 2;
  const cardW = widthPx * 0.88;
  const cardH = heightPx * 0.88;

  const isRelief = state.structureType === "relief";
  let textPatternHeightVal = Math.round(((state.baseHeight + 1.2) / MAX_HEIGHT_MM) * 255);

  if (isRelief) {
    const floorH = Math.max(0.4, state.baseHeight - 1.5);
    const patternH = floorH + 1.6;
    textPatternHeightVal = Math.round((patternH / MAX_HEIGHT_MM) * 255);
  }

  // Draw pattern
  if (state.svgPaths && state.svgPaths.length > 0) {
    ctx.fillStyle = `rgb(${textPatternHeightVal}, 0, 0)`;
    const patternSize = Math.min(cardW, cardH) * 0.45;
    const posY = state.text ? cy - cardH * 0.08 : cy;
    drawSvgPathsOnCanvas(ctx, state.svgPaths, cx, posY, patternSize);
  }

  // Draw text
  if (state.text && state.text.trim()) {
    ctx.fillStyle = `rgb(${textPatternHeightVal}, 0, 0)`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontScale = state.textParams.fontSize || 14;
    const isBold = state.textParams.fontWeight === "bold";
    const scaleFactor = Math.min(cardW, cardH) / 100;
    const fontSizePx = fontScale * scaleFactor;

    ctx.font = `${isBold ? "bold" : "normal"} ${fontSizePx}px ${
      state.textParams.fontFamily || "Space Grotesk, sans-serif"
    }`;

    const dx = (state.textParams.posX / 100) * cardW;
    const dy = (state.textParams.posY / 100) * cardH;
    const textX = cx + dx;
    const textY = cy + dy;

    ctx.fillText(state.text, textX, textY);
    if (isBold) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgb(${textPatternHeightVal}, 0, 0)`;
      ctx.strokeText(state.text, textX, textY);
    }
  }

  return canvas;
}

/**
 * Math helper to calculate a 3D vertex normal
 */
function calculateNormal(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  x3: number, y3: number, z3: number
): { x: number; y: number; z: number } {
  const ax = x2 - x1;
  const ay = y2 - y1;
  const az = z2 - z1;
  const bx = x3 - x1;
  const by = y3 - y1;
  const bz = z3 - z1;

  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const d = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (d === 0) return { x: 0, y: 0, z: 1 };
  return { x: nx / d, y: ny / d, z: nz / d };
}

/**
 * Unified Solid Indexed Mesh Generator from Heightmap fields.
 * Generates flawless watertight manifold solids without duplicate vertices.
 */
export function buildMeshFromHeightfield(
  H: Float32Array,
  cols: number,
  rows: number,
  physicalWidthMM: number,
  physicalHeightMM: number
): MeshGeometry {
  const vertices: { x: number; y: number; z: number }[] = [];
  const triangles: [number, number, number][] = [];

  const topIndexMap = new Map<string, number>();
  const bottomIndexMap = new Map<string, number>();

  const isCellActive = (cellX: number, cellY: number): boolean => {
    if (cellX < 0 || cellX >= cols || cellY < 0 || cellY >= rows) return false;
    return H[cellY * cols + cellX] > 0.05;
  };

  const getPhysCoord = (gridX: number, gridY: number, heightVal: number) => {
    const px = ((gridX / (cols - 1)) - 0.5) * physicalWidthMM;
    const py = (0.5 - (gridY / (rows - 1))) * physicalHeightMM;
    return { x: px, y: py, z: heightVal };
  };

  // 1. Generate Vertices and Index Maps
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!isCellActive(x, y)) continue;

      const h = H[y * cols + x];
      
      // Top vertex
      const topIdx = vertices.length;
      vertices.push(getPhysCoord(x, y, h));
      topIndexMap.set(`${x},${y}`, topIdx);

      // Bottom vertex
      const bottomIdx = vertices.length;
      vertices.push(getPhysCoord(x, y, 0));
      bottomIndexMap.set(`${x},${y}`, bottomIdx);
    }
  }

  const addTriangle = (v1: number, v2: number, v3: number) => {
    triangles.push([v1, v2, v3]);
  };

  // 2. Generate Triangles (Top, Bottom)
  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const active00 = isCellActive(x, y);
      const active10 = isCellActive(x + 1, y);
      const active01 = isCellActive(x, y + 1);
      const active11 = isCellActive(x + 1, y + 1);

      if (active00 && active10 && active01) {
        const t00 = topIndexMap.get(`${x},${y}`)!;
        const t10 = topIndexMap.get(`${x + 1},${y}`)!;
        const t01 = topIndexMap.get(`${x},${y + 1}`)!;
        addTriangle(t00, t10, t01);

        const b00 = bottomIndexMap.get(`${x},${y}`)!;
        const b10 = bottomIndexMap.get(`${x + 1},${y}`)!;
        const b01 = bottomIndexMap.get(`${x},${y + 1}`)!;
        addTriangle(b00, b01, b10);
      }

      if (active10 && active11 && active01) {
        const t10 = topIndexMap.get(`${x + 1},${y}`)!;
        const t11 = topIndexMap.get(`${x + 1},${y + 1}`)!;
        const t01 = topIndexMap.get(`${x},${y + 1}`)!;
        addTriangle(t10, t11, t01);

        const b10 = bottomIndexMap.get(`${x + 1},${y}`)!;
        const b11 = bottomIndexMap.get(`${x + 1},${y + 1}`)!;
        const b01 = bottomIndexMap.get(`${x},${y + 1}`)!;
        addTriangle(b10, b01, b11);
      }
    }
  }

  // 3. Sew side walls recursively along border edges
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!isCellActive(x, y)) continue;

      const t0 = topIndexMap.get(`${x},${y}`)!;
      const b0 = bottomIndexMap.get(`${x},${y}`)!;

      // Left edge
      if (x === 0 || !isCellActive(x - 1, y)) {
        if (y < rows - 1 && isCellActive(x, y + 1)) {
          const t_next = topIndexMap.get(`${x},${y + 1}`)!;
          const b_next = bottomIndexMap.get(`${x},${y + 1}`)!;
          addTriangle(t0, b_next, b0);
          addTriangle(t0, t_next, b_next);
        }
      }

      // Right edge
      if (x === cols - 1 || !isCellActive(x + 1, y)) {
        if (y < rows - 1 && isCellActive(x, y + 1)) {
          const t_next = topIndexMap.get(`${x},${y + 1}`)!;
          const b_next = bottomIndexMap.get(`${x},${y + 1}`)!;
          addTriangle(t0, b0, b_next);
          addTriangle(t0, b_next, t_next);
        }
      }

      // Top edge
      if (y === 0 || !isCellActive(x, y - 1)) {
        if (x < cols - 1 && isCellActive(x + 1, y)) {
          const t_next = topIndexMap.get(`${x + 1},${y}`)!;
          const b_next = bottomIndexMap.get(`${x + 1},${y}`)!;
          addTriangle(t0, b_next, b0);
          addTriangle(t0, t_next, b_next);
        }
      }

      // Bottom edge
      if (y === rows - 1 || !isCellActive(x, y + 1)) {
        if (x < cols - 1 && isCellActive(x + 1, y)) {
          const t_next = topIndexMap.get(`${x + 1},${y}`)!;
          const b_next = bottomIndexMap.get(`${x + 1},${y}`)!;
          addTriangle(t0, b0, b_next);
          addTriangle(t0, b_next, t_next);
        }
      }
    }
  }

  return { vertices, triangles };
}

/**
 * Generate a Solid Binary STL file from the Model State.
 * This is left compiled for absolute backward compatibility or standard single filament printing.
 */
export function generateBinarySTL(
  state: ModelState,
  physicalWidthMM: number = 60,
  physicalHeightMM: number = 80
): ArrayBuffer {
  const cols = 120;
  const rows = 120;

  const heightmap = generateHeightmapCanvas(state, cols, rows);
  const hCtx = heightmap.getContext("2d", { willReadFrequently: true });
  if (!hCtx) return new ArrayBuffer(0);

  const imgData = hCtx.getImageData(0, 0, cols, rows);
  const data = imgData.data;

  const H = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = (y * cols + x) * 4;
      H[y * cols + x] = (data[idx] / 255.0) * MAX_HEIGHT_MM;
    }
  }

  const isCellActive = (cellX: number, cellY: number): boolean => {
    if (cellX < 0 || cellX >= cols - 1 || cellY < 0 || cellY >= rows - 1) return false;
    const h00 = H[cellY * cols + cellX];
    const h10 = H[cellY * cols + (cellX + 1)];
    const h01 = H[(cellY + 1) * cols + cellX];
    const h11 = H[(cellY + 1) * cols + (cellX + 1)];
    return h00 > 0.05 || h10 > 0.05 || h01 > 0.05 || h11 > 0.05;
  };

  interface Facet {
    n: { x: number; y: number; z: number };
    v1: { x: number; y: number; z: number };
    v2: { x: number; y: number; z: number };
    v3: { x: number; y: number; z: number };
  }

  const facets: Facet[] = [];

  const getPhysCoord = (gridX: number, gridY: number, heightVal: number) => {
    const px = ((gridX / (cols - 1)) - 0.5) * physicalWidthMM;
    const py = (0.5 - (gridY / (rows - 1))) * physicalHeightMM;
    return { x: px, y: py, z: heightVal };
  };

  const addTriangle = (
    v1: { x: number; y: number; z: number },
    v2: { x: number; y: number; z: number },
    v3: { x: number; y: number; z: number }
  ) => {
    const normal = calculateNormal(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z);
    facets.push({ n: normal, v1, v2, v3 });
  };

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      if (!isCellActive(x, y)) continue;

      const h00 = H[y * cols + x];
      const h10 = H[y * cols + (x + 1)];
      const h01 = H[(y + 1) * cols + x];
      const h11 = H[(y + 1) * cols + (x + 1)];

      const p00_t = getPhysCoord(x, y, h00);
      const p10_t = getPhysCoord(x + 1, y, h10);
      const p01_t = getPhysCoord(x, y + 1, h01);
      const p11_t = getPhysCoord(x + 1, y + 1, h11);

      const p00_b = getPhysCoord(x, y, 0);
      const p10_b = getPhysCoord(x + 1, y, 0);
      const p01_b = getPhysCoord(x, y + 1, 0);
      const p11_b = getPhysCoord(x + 1, y + 1, 0);

      addTriangle(p00_t, p10_t, p01_t);
      addTriangle(p10_t, p11_t, p01_t);

      addTriangle(p00_b, p01_b, p10_b);
      addTriangle(p10_b, p01_b, p11_b);

      if (x === 0 || !isCellActive(x - 1, y)) {
        addTriangle(p00_t, p01_b, p00_b);
        addTriangle(p00_t, p01_t, p01_b);
      }
      if (x === cols - 2 || !isCellActive(x + 1, y)) {
        addTriangle(p10_t, p10_b, p11_b);
        addTriangle(p10_t, p11_b, p11_t);
      }
      if (y === 0 || !isCellActive(x, y - 1)) {
        addTriangle(p00_t, p10_b, p00_b);
        addTriangle(p00_t, p10_t, p10_b);
      }
      if (y === rows - 2 || !isCellActive(x, y + 1)) {
        addTriangle(p01_t, p01_b, p11_b);
        addTriangle(p01_t, p11_b, p11_t);
      }
    }
  }

  const triangleCount = facets.length;
  const bufferLength = 80 + 4 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  const headerText = "3D Printable Card - Generated by AI Card Designer";
  for (let i = 0; i < Math.min(headerText.length, 80); i++) {
    view.setUint8(i, headerText.charCodeAt(i));
  }

  view.setUint32(80, triangleCount, true);

  let offset = 84;
  facets.forEach((f) => {
    view.setFloat32(offset, f.n.x, true);
    view.setFloat32(offset + 4, f.n.y, true);
    view.setFloat32(offset + 8, f.n.z, true);

    view.setFloat32(offset + 12, f.v1.x, true);
    view.setFloat32(offset + 16, f.v1.y, true);
    view.setFloat32(offset + 20, f.v1.z, true);

    view.setFloat32(offset + 24, f.v2.x, true);
    view.setFloat32(offset + 28, f.v2.y, true);
    view.setFloat32(offset + 32, f.v2.z, true);

    view.setFloat32(offset + 36, f.v3.x, true);
    view.setFloat32(offset + 40, f.v3.y, true);
    view.setFloat32(offset + 44, f.v3.z, true);

    view.setUint16(offset + 48, 0, true);

    offset += 50;
  });

  return buffer;
}

/**
 * Generator for a fully multi-colored 3MF archive natively.
 * Bambu Studio imports this perfect colored assembly directly into independent paintable pieces!
 */
export async function generate3MFBlob(
  state: ModelState,
  physicalWidthMM: number = 60,
  physicalHeightMM: number = 80
): Promise<Blob> {
  const zip = new JSZip();

  const cols = 120;
  const rows = 120;

  // 1. Compile Base Plate Mesh
  const baseMap = generateBaseHeightmapCanvas(state, cols, rows);
  const baseCtx = baseMap.getContext("2d", { willReadFrequently: true })!;
  const baseImgData = baseCtx.getImageData(0, 0, cols, rows);
  const baseH = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      baseH[y * cols + x] = (baseImgData.data[(y * cols + x) * 4] / 255.0) * MAX_HEIGHT_MM;
    }
  }
  const baseMesh = buildMeshFromHeightfield(baseH, cols, rows, physicalWidthMM, physicalHeightMM);

  // 2. Compile Pattern / Typography Mesh
  const patMap = generatePatternHeightmapCanvas(state, cols, rows);
  const patCtx = patMap.getContext("2d", { willReadFrequently: true })!;
  const patImgData = patCtx.getImageData(0, 0, cols, rows);
  const patH = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      patH[y * cols + x] = (patImgData.data[(y * cols + x) * 4] / 255.0) * MAX_HEIGHT_MM;
    }
  }
  const patMesh = buildMeshFromHeightfield(patH, cols, rows, physicalWidthMM, physicalHeightMM);

  // 3. Assemble open-xml relations & contents
  const contentTypesXml = `<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="utf-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rel1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="/3D/3dmodel.model" />
</Relationships>`;

  const formatColor = (hex: string) => {
    let clean = hex.trim();
    if (clean.startsWith("#")) clean = clean.substring(1);
    if (clean.length === 6) clean += "FF";
    return "#" + clean.toUpperCase();
  };

  const baseColAttr = formatColor(state.baseColor);
  const patColAttr = formatColor(state.patternColor);

  const xmlMeshString = (mesh: MeshGeometry, objectId: number, baseMaterialId: number, materialIndex: number) => {
    let xml = `    <object id="${objectId}" type="model" pid="${baseMaterialId}" pindex="${materialIndex}">\n      <mesh>\n        <vertices>\n`;
    mesh.vertices.forEach((v) => {
      xml += `          <vertex x="${v.x.toFixed(4)}" y="${v.y.toFixed(4)}" z="${v.z.toFixed(4)}" />\n`;
    });
    xml += `        </vertices>\n        <triangles>\n`;
    mesh.triangles.forEach((t) => {
      xml += `          <triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}" />\n`;
    });
    xml += `        </triangles>\n      </mesh>\n    </object>\n`;
    return xml;
  };

  const baseObjectStr = xmlMeshString(baseMesh, 2, 1, 0); 
  const patObjectStr = patMesh.vertices.length > 0 
    ? xmlMeshString(patMesh, 3, 1, 1) 
    : "";

  const modelXml = `<?xml version="1.0" encoding="utf-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Title">${state.text ? state.text + " Colored Card" : "3D Card Designer Model"}</metadata>
  <metadata name="Application">AI 3D Printable Card Designer</metadata>
  <resources>
    <basematerials id="1">
      <base name="BasePlateMaterial" displaycolor="${baseColAttr}" />
      <base name="PatternMaterial" displaycolor="${patColAttr}" />
    </basematerials>
${baseObjectStr}${patObjectStr}  </resources>
  <build>
    <item objectid="2" />
${patMesh.vertices.length > 0 ? '    <item objectid="3" />\n' : ""}  </build>
</model>`;

  zip.file("[Content_Types].xml", contentTypesXml);
  zip.file("_rels/.rels", relsXml);
  zip.file("3D/3dmodel.model", modelXml);

  return await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

/**
 * Generate a complete standalone Vector SVG representation of the Base plate
 * for Tinkercad input.
 */
export function generateBaseSVGString(state: ModelState): string {
  const w = 150;
  const h = 200;
  const cx = w / 2;
  const cy = h / 2;
  const cardW = w * 0.88;
  const cardH = h * 0.88;
  const cardR = Math.min(cardW, cardH) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  let pathString = "";

  if (state.baseShape === "rectangle") {
    pathString = `<rect x="${cx - cardW / 2}" y="${cy - cardH / 2}" width="${cardW}" height="${cardH}" fill="${state.baseColor}" />`;
  } else if (state.baseShape === "rounded_rectangle") {
    const rx = cardW * 0.15;
    pathString = `<rect x="${cx - cardW / 2}" y="${cy - cardH / 2}" width="${cardW}" height="${cardH}" rx="${rx}" ry="${rx}" fill="${state.baseColor}" />`;
  } else if (state.baseShape === "circle") {
    pathString = `<circle cx="${cx}" cy="${cy}" r="${cardR}" fill="${state.baseColor}" />`;
  } else if (state.baseShape === "triangle") {
    pathString = `<polygon points="${cx},${cy - cardH / 2} ${cx + cardW / 2},${cy + cardH / 2} ${cx - cardW / 2},${cy + cardH / 2}" fill="${state.baseColor}" />`;
  } else if (state.baseShape === "hexagon") {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      pts.push(`${cx + cardR * Math.cos(angle)},${cy + cardR * Math.sin(angle)}`);
    }
    pathString = `<polygon points="${pts.join(" ")}" fill="${state.baseColor}" />`;
  } else if (state.baseShape === "star") {
    const pts: string[] = [];
    const spikes = 5;
    const outer = cardR;
    const inner = cardR * 0.4;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    for (let i = 0; i < spikes; i++) {
      pts.push(`${cx + Math.cos(rot) * outer},${cy + Math.sin(rot) * outer}`);
      rot += step;
      pts.push(`${cx + Math.cos(rot) * inner},${cy + Math.sin(rot) * inner}`);
      rot += step;
    }
    pathString = `<polygon points="${pts.join(" ")}" fill="${state.baseColor}" />`;
  } else if (state.baseShape === "shield") {
    const x = cx - cardW / 2;
    const y = cy - cardH / 2;
    pathString = `<path d="M ${cx},${y} L ${cx + cardW / 2},${y + cardH * 0.15} L ${cx + cardW / 2},${y + cardH * 0.6} Q ${cx + cardW / 2},${y + cardH * 0.95} ${cx},${cy + cardH / 2} Q ${cx - cardW / 2},${y + cardH * 0.95} ${cx - cardW / 2},${y + cardH * 0.6} L ${cx - cardW / 2},${y + cardH * 0.15} Z" fill="${state.baseColor}" />`;
  }

  if (state.structureType === "relief") {
    const scaledW = cardW * 0.92;
    const scaledH = cardH * 0.92;
    const scaledR = cardR * 0.92;
    let innerPath = "";
    if (state.baseShape === "rectangle") {
      innerPath = `<rect x="${cx - scaledW / 2}" y="${cy - scaledH / 2}" width="${scaledW}" height="${scaledH}" fill="#000000" fill-opacity="0.12" />`;
    } else if (state.baseShape === "rounded_rectangle") {
      const rx = scaledW * 0.15;
      innerPath = `<rect x="${cx - scaledW / 2}" y="${cy - scaledH / 2}" width="${scaledW}" height="${scaledH}" rx="${rx}" ry="${rx}" fill="#000000" fill-opacity="0.12" />`;
    } else if (state.baseShape === "circle") {
      innerPath = `<circle cx="${cx}" cy="${cy}" r="${scaledR}" fill="#000000" fill-opacity="0.12" />`;
    } else if (state.baseShape === "triangle") {
      innerPath = `<polygon points="${cx},${cy - scaledH / 2} ${cx + scaledW / 2},${cy + scaledH / 2} ${cx - scaledW / 2},${cy + scaledH / 2}" fill="#000000" fill-opacity="0.12" />`;
    } else if (state.baseShape === "hexagon") {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        pts.push(`${cx + scaledR * Math.cos(angle)},${cy + scaledR * Math.sin(angle)}`);
      }
      innerPath = `<polygon points="${pts.join(" ")}" fill="#000000" fill-opacity="0.12" />`;
    } else if (state.baseShape === "star") {
      const pts: string[] = [];
      const spikes = 5;
      const outer = scaledR;
      const inner = scaledR * 0.4;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      for (let i = 0; i < spikes; i++) {
        pts.push(`${cx + Math.cos(rot) * outer},${cy + Math.sin(rot) * outer}`);
        rot += step;
        pts.push(`${cx + Math.cos(rot) * inner},${cy + Math.sin(rot) * inner}`);
        rot += step;
      }
      innerPath = `<polygon points="${pts.join(" ")}" fill="#000000" fill-opacity="0.12" />`;
    } else if (state.baseShape === "shield") {
      const x = cx - scaledW / 2;
      const y = cy - scaledH / 2;
      innerPath = `<path d="M ${cx},${y} L ${cx + scaledW / 2},${y + scaledH * 0.15} L ${cx + scaledW / 2},${y + scaledH * 0.6} Q ${cx + scaledW / 2},${y + scaledH * 0.95} ${cx},${cy + scaledH / 2} Q ${cx - scaledW / 2},${y + scaledH * 0.95} ${cx - scaledW / 2},${y + scaledH * 0.6} L ${cx - scaledW / 2},${y + scaledH * 0.15} Z" fill="#000000" fill-opacity="0.12" />`;
    }
    pathString += "\n  " + innerPath;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="none" />
  ${pathString}
</svg>`;
}

/**
 * Generate a modular closed SVG string representing ONLY the Pattern and Text,
 * positioned correctly. Extremely useful to import onto the card in Tinkercad.
 */
export function generatePatternSVGString(state: ModelState): string {
  const w = 100;
  const h = 100;
  const cx = w / 2;
  const cy = h / 2;

  let elements = "";

  if (state.svgPaths && state.svgPaths.length > 0) {
    const scale = 58; 
    const posY = state.text ? cy - 10 : cy; 

    state.svgPaths.forEach((path) => {
      const transX = cx - scale / 2;
      const transY = posY - scale / 2;
      const scaleF = scale / 100;

      elements += `  <path d="${path}" transform="translate(${transX}, ${transY}) scale(${scaleF})" fill="${state.patternColor || "#000000"}" />\n`;
    });
  }

  if (state.text && state.text.trim()) {
    const fontSize = state.textParams.fontSize || 14;
    const isBold = state.textParams.fontWeight === "bold";
    const dx = state.textParams.posX || 0;
    const dy = state.textParams.posY || 25;

    const tx = cx + dx;
    const ty = cy + dy;

    elements += `  <text x="${tx}" y="${ty}" fill="${state.textColor || state.patternColor || "#000000"}" font-family="${
      state.textParams.fontFamily || "Space Grotesk, sans-serif"
    }" font-size="${fontSize}" font-weight="${
      isBold ? "bold" : "normal"
    }" text-anchor="middle" dominant-baseline="central">${state.text}</text>\n`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="none" />
${elements}</svg>`;
}
