import React, { useState } from "react";
import { ModelState, ShapeType, StructureType } from "../types";
import {
  generateBinarySTL,
  generate3MFBlob,
  generateBaseSVGString,
  generatePatternSVGString,
} from "../utils/stlGenerator";
import {
  Settings,
  Download,
  Box,
  Palette,
  Type as FontIcon,
  Layers,
  Sparkles,
  Info,
  Printer,
  FileCode,
  CheckCircle,
} from "lucide-react";

interface CardConfiguratorProps {
  state: ModelState;
  onChange: (newState: ModelState) => void;
  widthMM: number;
  heightMM: number;
  onWidthChange: (w: number) => void;
  onHeightChange: (h: number) => void;
}

const SHAPES: { key: ShapeType; label: string }[] = [
  { key: "rectangle", label: "直角矩形" },
  { key: "rounded_rectangle", label: "圆角矩形" },
  { key: "circle", label: "圆形徽章" },
  { key: "triangle", label: "三角胸牌" },
  { key: "hexagon", label: "六边形币" },
  { key: "star", label: "五角星牌" },
  { key: "shield", label: "骑士盾牌" },
];

export default function CardConfigurator({
  state,
  onChange,
  widthMM,
  heightMM,
  onWidthChange,
  onHeightChange,
}: CardConfiguratorProps) {
  const [activeTab, setActiveTab] = useState<"base" | "design" | "export">("base");
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Update single fields in state
  const updateState = (fields: Partial<ModelState>) => {
    onChange({
      ...state,
      ...fields,
    });
  };

  const updateTextParams = (fields: Partial<typeof state.textParams>) => {
    onChange({
      ...state,
      textParams: {
        ...state.textParams,
        ...fields,
      },
    });
  };

  // 1. Download Multishape 3MF File
  const handleDownload3MF = async () => {
    setIsExporting("3mf");
    try {
      const blob = await generate3MFBlob(state, widthMM, heightMM);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `${state.text ? state.text.toLowerCase().replace(/[^a-z0-9]/g, "_") : "card"}_multicolor.3mf`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("3MF export failed:", e);
      alert("3MF 拼色文件导出失败，请检查浏览器兼容或依赖。");
    } finally {
      setIsExporting(null);
    }
  };

  // 2. Download Binary STL Model
  const handleDownloadSTL = () => {
    setIsExporting("stl");
    try {
      const buffer = generateBinarySTL(state, widthMM, heightMM);
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `${state.text ? state.text.toLowerCase().replace(/[^a-z0-9]/g, "_") : "card"}_model.stl`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("STL export failed:", e);
      alert("STL 导出失败，请检查模型参数是或生成路径是否正常。");
    } finally {
      setIsExporting(null);
    }
  };

  // 3. Download Base SVG string
  const handleDownloadBaseSVG = () => {
    const svgStr = generateBaseSVGString(state);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tinkercad_card_base.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 4. Download Pattern SVG string
  const handleDownloadPatternSVG = () => {
    const svgStr = generatePatternSVGString(state);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tinkercad_card_pattern.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full" id="card-configurator-panel">
      {/* Top Sidebar Header */}
      <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2">
        <Settings className="w-4.5 h-4.5 text-emerald-400" />
        <span className="font-bold text-xs uppercase tracking-wider text-slate-200 font-sans">
          参数微调与控制面板 (Designer Console)
        </span>
      </div>

      {/* Sidebar Navigation Tabs - 3 Tab layout */}
      <div className="bg-slate-950/20 border-b border-slate-800 grid grid-cols-3 p-1">
        <button
          onClick={() => setActiveTab("base")}
          className={`py-2.5 px-1 text-[11px] font-semibold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
            activeTab === "base"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold"
              : "text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          <Box className="w-4 h-4" />
          <span>底座底盘</span>
        </button>

        <button
          onClick={() => setActiveTab("design")}
          className={`py-2.5 px-1 text-[11px] font-semibold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
            activeTab === "design"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold"
              : "text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          <FontIcon className="w-4 h-4" />
          <span>图案文字</span>
        </button>

        <button
          onClick={() => setActiveTab("export")}
          className={`py-2.5 px-1 text-[11px] font-semibold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all ${
            activeTab === "export"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold"
              : "text-slate-400 hover:text-slate-200 border border-transparent"
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>文件导出</span>
        </button>
      </div>

      {/* Tab Pages Scrollable Container */}
      <div className="flex-1 p-5 overflow-y-auto max-h-[500px] custom-scrollbar space-y-5">
        {/* ====================================
            TAB 1: BASEPLATE CHASSIS
           ==================================== */}
        {activeTab === "base" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Shapes selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-bold tracking-wider">
                <Box className="w-4 h-4 text-emerald-400" />
                <span>1. 底盘外观形状轮廓</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SHAPES.map((shape) => (
                  <button
                    key={shape.key}
                    onClick={() => updateState({ baseShape: shape.key })}
                    className={`text-left p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      state.baseShape === shape.key
                        ? "bg-slate-800 text-emerald-400 border-emerald-500/50 shadow"
                        : "bg-slate-950/40 text-slate-300 border-slate-850 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    {shape.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Geometric size parameters */}
            <div className="space-y-3">
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider block">
                2. 毫米级立体尺寸
              </span>

              <div className="space-y-3.5 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60 text-xs">
                {/* Base Height Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">底座厚度 (Height)</span>
                    <span className="text-emerald-400 font-bold">{state.baseHeight} mm</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    step="0.5"
                    value={state.baseHeight}
                    onChange={(e) => updateState({ baseHeight: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Scale Width Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">最大宽度 (Width)</span>
                    <span className="text-emerald-400 font-bold">{widthMM} mm</span>
                  </div>
                  <input
                    type="range"
                    min="35"
                    max="90"
                    step="1"
                    value={widthMM}
                    onChange={(e) => onWidthChange(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Scale Height Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">最大长度 (Length)</span>
                    <span className="text-emerald-400 font-bold">{heightMM} mm</span>
                  </div>
                  <input
                    type="range"
                    min="45"
                    max="120"
                    step="1"
                    value={heightMM}
                    onChange={(e) => onHeightChange(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Carving style selection (relief vs flat) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-bold tracking-wider">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>3. 立体结构雕刻工艺</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateState({ structureType: "relief" })}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    state.structureType === "relief"
                      ? "bg-slate-800 text-emerald-400 border-emerald-500/50"
                      : "bg-slate-950/40 text-slate-400 border-slate-850 hover:text-slate-300"
                  }`}
                >
                  3D 浮雕压印凹陷
                </button>
                <button
                  onClick={() => updateState({ structureType: "flat" })}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    state.structureType === "flat"
                      ? "bg-slate-800 text-emerald-400 border-emerald-500/50"
                      : "bg-slate-950/40 text-slate-400 border-slate-850 hover:text-slate-300"
                  }`}
                >
                  共面双色印花
                </button>
              </div>
            </div>

            {/* Base Color Picker */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-bold tracking-wider">
                <Palette className="w-4 h-4 text-emerald-400" />
                <span>4. 底座主体材质颜色 (Base Color)</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60 text-xs">
                <input
                  type="color"
                  value={state.baseColor}
                  onChange={(e) => updateState({ baseColor: e.target.value })}
                  className="w-11 h-11 rounded-lg border border-slate-800 bg-transparent cursor-pointer"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 font-mono text-[11px] uppercase">{state.baseColor}</span>
                  <span className="text-[10px] text-slate-500 leading-normal">点击左侧方块可实时切换底盘的 3D 实色</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================
            TAB 2: GRAPHICS & TYPOGRAPHY
           ==================================== */}
        {activeTab === "design" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Print typography block */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-bold tracking-wider">
                <FontIcon className="w-4 h-4 text-emerald-400" />
                <span>1. 立体浮雕文字内容及控制</span>
              </div>

              <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60 text-xs">
                <div className="flex flex-col gap-1.5">
                  <span className="text-slate-400 font-mono">卡牌印花文字内容</span>
                  <input
                    type="text"
                    placeholder="请输入想要立体凸浮印字的英文（如: APEX）"
                    value={state.text}
                    onChange={(e) => updateState({ text: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-lg p-2.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {state.text && (
                  <>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Font Size */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>字号占比</span>
                          <span className="text-emerald-400">{state.textParams.fontSize}</span>
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="32"
                          step="1"
                          value={state.textParams.fontSize}
                          onChange={(e) => updateTextParams({ fontSize: parseInt(e.target.value) })}
                          className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg"
                        />
                      </div>

                      {/* Font Weight */}
                      <div className="space-y-1">
                        <span className="text-slate-400">字体偏好</span>
                        <select
                          value={state.textParams.fontWeight}
                          onChange={(e) =>
                            updateTextParams({ fontWeight: e.target.value as "normal" | "bold" })
                          }
                          className="w-full bg-slate-900 border border-slate-700/60 rounded-md p-1.5 text-slate-300 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                        >
                          <option value="normal">标准 (Normal)</option>
                          <option value="bold">粗体 (Bold)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Position X Offset */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>X 轴位移</span>
                          <span className="text-emerald-400">{state.textParams.posX}%</span>
                        </div>
                        <input
                          type="range"
                          min="-45"
                          max="45"
                          step="1"
                          value={state.textParams.posX}
                          onChange={(e) => updateTextParams({ posX: parseInt(e.target.value) })}
                          className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg"
                        />
                      </div>

                      {/* Position Y Offset */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-400">
                          <span>Y 轴位移</span>
                          <span className="text-emerald-400">{state.textParams.posY}%</span>
                        </div>
                        <input
                          type="range"
                          min="-45"
                          max="45"
                          step="1"
                          value={state.textParams.posY}
                          onChange={(e) => updateTextParams({ posY: parseInt(e.target.value) })}
                          className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Pattern Colors Palette Block */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-bold tracking-wider">
                <Palette className="w-4 h-4 text-emerald-400" />
                <span>2. 图案印花与文字颜色 (Pattern & Text Colors)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60 text-xs text-slate-300">
                {/* Pattern Color Picker */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-slate-400">图案图形材质色</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={state.patternColor}
                      onChange={(e) => updateState({ patternColor: e.target.value })}
                      className="w-9 h-9 rounded border border-slate-800 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-slate-400 uppercase">{state.patternColor}</span>
                  </div>
                </div>

                {/* Text Color Picker */}
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-slate-400">文字浮雕材质色</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={state.textColor || state.patternColor}
                      onChange={(e) => updateState({ textColor: e.target.value })}
                      className="w-9 h-9 rounded border border-slate-800 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-slate-400 uppercase">{state.textColor || state.patternColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================
            TAB 3: EXPORTS / DOWNLOADS & HELP
           ==================================== */}
        {activeTab === "export" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-bold tracking-wider">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>编译生成与导出设计 (Exports)</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              STL 导出的所有几何都是单独合并的实体；如果您是拓竹多色打印用户，我们强烈建议您选择导出 <b>3MF 彩色独立结构格式</b>。
            </p>

            {/* Core Export Actions */}
            <div className="space-y-2.5 pt-1">
              {/* RECOMMENDED COLOR 3MF EXPORTER */}
              <button
                onClick={handleDownload3MF}
                disabled={isExporting !== null}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-lg text-slate-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
              >
                <Layers className="w-4 h-4" />
                <span>
                  {isExporting === "3mf" ? "正在压印色彩 3MF 结构..." : "下载多色彩色 3MF 模型 (推荐拓竹)"}
                </span>
              </button>

              {/* STANDARD SINGLE COLOR STL */}
              <button
                onClick={handleDownloadSTL}
                disabled={isExporting !== null}
                className="w-full bg-slate-800 hover:bg-slate-705 text-slate-100 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer text-xs border border-slate-700/60"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isExporting === "stl" ? "正在编织 solid 网格..." : "下载单色 STL 实体模型"}
                </span>
              </button>
            </div>

            {/* Tinkercad dual-svg export section */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold tracking-wide uppercase">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>Tinkercad 极客专用双闭合矢量 SVG 导出</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadBaseSVG}
                  className="py-2.5 px-3 text-[11px] bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-300 font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  底盘外廓 SVG
                </button>
                <button
                  onClick={handleDownloadPatternSVG}
                  className="py-2.5 px-3 text-[11px] bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-300 font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  图案文字 SVG
                </button>
              </div>
            </div>

            {/* Bambu Slicer user manual */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-300 font-bold font-sans text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Bambu Studio 智能多色贴边切片教程:</span>
              </div>
              <ul className="list-decimal list-inside text-[11px] text-slate-400 space-y-1.5 pl-0.5 font-sans">
                <li>
                  下载本站生成的 <b className="text-slate-200">.3mf 彩色复合格式</b>。
                </li>
                <li>
                  将 3MF 拖入 <b>Bambu Studio</b> 切片软件，该文件已被封装为【底盘对象】与【图案文字对象】。
                </li>
                <li>
                  在左侧<b>【对象】页面</b>（Object List）中选择对应的子部分，在右边可一键为其指定 Filament 1 或 Filament 2，免去手动上色的痛苦！
                </li>
                <li>
                  如果使用 <b>Tinkercad</b> 自定义，分别导入底座和图案两个 SVG，对齐即可，几何零缝隙。
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer System Data */}
      <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center gap-3">
        <Info className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-[10px] text-slate-400 font-sans leading-normal">
          所有的闭合 SVG 及立体 STL 网格都在本地浏览器引擎中并行编译生成，不经过任何云端处理，保护几何设计隐私。
        </span>
      </div>
    </div>
  );
}
