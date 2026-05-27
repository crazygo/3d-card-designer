import React, { useState, useRef, useEffect } from "react";
import { ModelState } from "../types";
import { Layers, Rotate3d, Sun, HelpCircle } from "lucide-react";

interface Card3DPreviewProps {
  state: ModelState;
  widthMM: number;
  heightMM: number;
}

export default function Card3DPreview({
  state,
  widthMM,
  heightMM,
}: Card3DPreviewProps) {
  const [rotateX, setRotateX] = useState<number>(25);
  const [rotateY, setRotateY] = useState<number>(-15);
  const [showHeightfield, setShowHeightfield] = useState<boolean>(false);
  const isDragging = useRef<boolean>(false);
  const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse drag handlers for 3D rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    setRotateY((prev) => prev + deltaX * 0.5);
    setRotateX((prev) => Math.max(-50, Math.min(50, prev - deltaY * 0.5)));

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  // Standard template ratios
  const aspectRatio = heightMM / widthMM;
  const cardWidthPx = 240;
  const cardHeightPx = cardWidthPx * aspectRatio;

  // Render geometric borders and shapes for the SVG output.
  const getClipPath = (shape: string) => {
    switch (shape) {
      case "circle":
        return "circle(50% at 50% 50%)";
      case "triangle":
        return "polygon(50% 0%, 100% 100%, 0% 100%)";
      case "hexagon":
        return "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
      case "star":
        return "polygon(50% 0%, 63% 38%, 100% 38%, 70% 59%, 81% 92%, 50% 72%, 19% 92%, 30% 59%, 0% 38%, 37% 38%)";
      case "shield":
        return "polygon(50% 0%, 100% 15%, 100% 60%, 50% 100%, 0% 60%, 0% 15%)";
      case "rounded_rectangle":
        return "none"; // Handled by standard border radius
      default:
        return "none";
    }
  };

  const isRelief = state.structureType === "relief";
  const clip = getClipPath(state.baseShape);
  const isRoundEdge = state.baseShape === "rounded_rectangle";

  // Height helper colors if viewing height field mode
  const getHeightfieldColor = (level: "base" | "floor" | "pattern" | "border") => {
    switch (level) {
      case "border":
        return "#ffffff"; // highest
      case "pattern":
        return "#cccccc"; // patterns raised
      case "base":
        return "#999999"; // standard base
      case "floor":
        return "#555555"; // recessed floor
    }
  };

  // 3D layers translateZ factors
  const baseExtrusionZ = state.baseHeight * 3.5; // Scale mm height visually
  const reliefFloorOffsetZ = -4; // Recess details back into layer
  const patternExtrusionZ = isRelief ? 4.5 : 2; // Patterns float on top of base or relative floor

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl" id="card-preview-panel">
      {/* Panel header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rotate3d className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm text-slate-100 font-sans">
            3D 压印模型实时预览 (拖拽旋转)
          </span>
        </div>
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg">
          <button
            onClick={() => setShowHeightfield(false)}
            className={`px-2 py-1 text-xs rounded-md transition-all flex items-center gap-1 font-medium ${
              !showHeightfield
                ? "bg-emerald-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            颜色效果
          </button>
          <button
            onClick={() => setShowHeightfield(true)}
            className={`px-2 py-1 text-xs rounded-md transition-all flex items-center gap-1 font-medium ${
              showHeightfield
                ? "bg-emerald-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            打印高程图
          </button>
        </div>
      </div>

      {/* Model Canvas Wrapper */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="flex-1 min-h-[380px] flex items-center justify-center relative cursor-grab active:cursor-grabbing select-none bg-slate-950 overflow-hidden"
        style={{ perspective: "1000px" }}
      >
        {/* Lights / Ambient gradients */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        {/* 3D Scene Node */}
        <div
          className="relative transition-transform duration-75"
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            style: "preserve-3d",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Stacked 3D layers to simulate thickness */}
          <div
            className="relative shadow-2xl transition-all"
            style={{
              width: `${cardWidthPx}px`,
              height: `${cardHeightPx}px`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* 1. Base Plate Background & Multiple shadow extrusions for depth */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 transition-colors pointer-events-none"
                style={{
                  clipPath: clip,
                  borderRadius: isRoundEdge ? "16px" : "0",
                  backgroundColor: showHeightfield
                    ? getHeightfieldColor("base")
                    : state.baseColor,
                  transform: `translateZ(${-i * 1.5}px)`,
                  opacity: 1 - i * 0.15,
                  filter: `brightness(${100 - i * 12}%)`,
                  border: i === 0 && isRelief ? "1px solid rgba(255,255,255,0.12)" : "none",
                }}
              />
            ))}

            {/* 2. Relief Border Layer (Outer Rim) */}
            {isRelief && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  clipPath: clip,
                  borderRadius: isRoundEdge ? "16px" : "0",
                  backgroundColor: "transparent",
                  border: `6px solid ${
                    showHeightfield ? getHeightfieldColor("border") : state.baseColor
                  }`,
                  transform: `translateZ(${baseExtrusionZ * 0.4}px)`,
                  transformStyle: "preserve-3d",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                }}
              />
            )}

            {/* 3. Recessed Floor Layer (Inset) */}
            <div
              className="absolute inset-[3%] pointer-events-none transition-colors border-dashed"
              style={{
                clipPath: clip,
                borderRadius: isRoundEdge ? "12px" : "0",
                backgroundColor: showHeightfield
                  ? getHeightfieldColor(isRelief ? "floor" : "base")
                  : state.baseColor,
                transform: `translateZ(${isRelief ? reliefFloorOffsetZ : 1}px)`,
                filter: isRelief ? "brightness(88%)" : "none",
                transformStyle: "preserve-3d",
              }}
            >
              {/* Inner ambient shadow if relief */}
              {isRelief && (
                <div className="absolute inset-0 bg-black/15 rounded-lg inset-shadow pointer-events-none" />
              )}

              {/* 4. Pattern Design Container */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{
                  transform: `translateZ(${patternExtrusionZ}px)`,
                  transformStyle: "preserve-3d",
                }}
              >
                {/* SVG Paths Pattern View */}
                {state.svgPaths && state.svgPaths.length > 0 && (
                  <svg
                    viewBox="0 0 100 100"
                    className="w-[45%] h-[45%] filter transition-all drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                    style={{
                      transform: state.text ? "translateY(-10px)" : "none",
                      color: showHeightfield
                        ? getHeightfieldColor("pattern")
                        : state.patternColor,
                    }}
                  >
                    {state.svgPaths.map((p, index) => (
                      <path
                        key={index}
                        d={p}
                        fill="currentColor"
                        className="transition-all duration-300"
                      />
                    ))}
                  </svg>
                )}

                {/* Typography layer */}
                {state.text && state.text.trim() && (
                  <div
                    className="absolute text-center select-none font-sans filter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.5)] transition-all font-bold"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: `translate(-50%, -50%) translate(${state.textParams.posX}%, ${state.textParams.posY}%)`,
                      color: showHeightfield
                        ? getHeightfieldColor("pattern")
                        : state.textColor || state.patternColor,
                      fontSize: `${state.textParams.fontSize * 1.5}px`,
                      fontWeight: state.textParams.fontWeight,
                      fontFamily: state.textParams.fontFamily || "Space Grotesk, sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {state.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Height Explanations / Tech Data */}
      <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-xs font-mono text-slate-400 space-y-2">
        <div className="flex justify-between text-slate-300 border-b border-slate-800/60 pb-1.5 font-sans font-medium">
          <span>模型特征数据 (3D Data)</span>
          <span className="text-emerald-400">已就绪 (Compliant)</span>
        </div>
        <div className="grid grid-cols-2 gap-y-1 text-slate-400">
          <div>底座几何形状: <span className="text-emerald-400 font-semibold">{state.baseShape}</span></div>
          <div>多色印刷层: <span className="text-emerald-400 font-semibold">{state.structureType === "flat" ? "双色平面" : "浮雕凹槽"}</span></div>
          <div>物理厚度 (N): <span className="text-emerald-400 font-semibold">{state.baseHeight} mm</span></div>
          <div>边框/压痕高度: <span className="text-emerald-400 font-semibold">{isRelief ? "1.6" : "0.0"} mm</span></div>
          <div>图案突出度: <span className="text-emerald-400 font-semibold">2.0 mm</span></div>
          <div>字号比例: <span className="text-emerald-400 font-semibold">{state.textParams.fontSize} px</span></div>
        </div>
        <div className="pt-2 flex items-center gap-1.5 text-slate-500 text-[10px] font-sans">
          <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
          <span>点击上方“打印高程图”可按灰度值预览高度（白色为顶层，黑色为底层）</span>
        </div>
      </div>
    </div>
  );
}
