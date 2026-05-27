export type ShapeType =
  | "rectangle"
  | "rounded_rectangle"
  | "circle"
  | "triangle"
  | "hexagon"
  | "star"
  | "shield";

export type StructureType = "relief" | "flat";

export interface TextParams {
  fontSize: number;  // scale factor (e.g., 10 to 50)
  fontWeight: "normal" | "bold";
  posX: number;      // offset percent (-50 to 50)
  posY: number;      // offset percent (-50 to 50)
  fontFamily: string; // e.g. 'sans-serif' or 'monospace' or 'serif'
}

export interface ModelState {
  baseShape: ShapeType;
  baseHeight: number; // N (mm)
  structureType: StructureType;
  baseColor: string;
  patternColor: string;
  text: string;
  textColor: string;
  textParams: TextParams;
  svgPaths: string[];
  svgPrompt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelState?: ModelState;
  timestamp: string;
}

export interface CardTemplate {
  id: string;
  name: string;
  zhName: string;
  description: string;
  state: ModelState;
}
