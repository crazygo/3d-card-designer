import React, { useState } from "react";
import { ModelState, Message, CardTemplate } from "./types";
import { CARD_TEMPLATES } from "./presets";
import Card3DPreview from "./components/Card3DPreview";
import CardConfigurator from "./components/CardConfigurator";
import AIChatPanel from "./components/AIChatPanel";
import {
  Sparkles,
  Layers,
  HelpCircle,
  Cpu,
  Bookmark,
  Printer,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

export default function App() {
  // Use the Lucky Smiley Token as default
  const defaultTemplate = CARD_TEMPLATES[0];
  const [modelState, setModelState] = useState<ModelState>(defaultTemplate.state);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(defaultTemplate.id);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Initialize conversations
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "您好！我是您的 3D 打印卡牌智能设计师。恭喜您来到 3D 压印世界！\n\n您可以选择右边【模板库】快速开始，也可以在此下发 AI 绘图、尺寸调整、配文等设计指令。例如：\n- *“把底座改成五角星形状，改成金黄配色并印上文字 WINNER！”*\n- *“换成粉红色圆角矩形，底座厚度设为 4 毫米，帮我画一个精致的爱心轮廓。”*\n- *“我想要一个浮雕造型，帮我绘制一个 medieval 剑盾图案，配上 APEX 字母。”*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Card dimensions (default 60mm x 80mm)
  const [widthMM, setWidthMM] = useState<number>(60);
  const [heightMM, setHeightMM] = useState<number>(80);

  // Active theme / templates swapper
  const handleSelectTemplate = (template: CardTemplate) => {
    setActiveTemplateId(template.id);
    setModelState(template.state);

    // Append AI notification inside message log
    const systemRep: Message = {
      id: `tpl-${Date.now()}`,
      role: "assistant",
      content: `已为您载入模版 **${template.zhName}**！底座设置为 **${template.state.baseShape}**，高度设为 **${template.state.baseHeight}mm**。现在您可以随时在此下发微调指示，例如“把背景色调绿”、“在图案边缘稍微添加点微调”或者由我来重新生成矢量图标。`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, systemRep]);
  };

  // Dispatch prompt requests to backend
  const handleSendMessage = async (text: string) => {
    // 1. Log the user's message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    setApiError(null);

    try {
      // 2. Query full-stack express backend api
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          currentState: modelState,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "智能设计端连接超时，请检查密钥。");
      }

      const resData = await response.json();

      // 3. Log modelState state feedback and AI response
      if (resData.modelState) {
        setModelState(resData.modelState);
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: resData.reply || "我已按照您的提示修改了 3D 层高和结构参数，请通过右侧的 3D 卡板进行旋转检查。",
        modelState: resData.modelState || modelState,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("AI Generation error:", err);
      // Log connection fallback guidelines cleanly
      setApiError(err.message || "连接服务器时出错。");
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **AI 对话连接受限**：
        \n由于后台尚未连接有效的 **GEMINI_API_KEY**，已为您切换为 **100% 离线自主设计与 3D 导出模式**！
        \n您依然可以通过右侧的面板**手动修改任何参数**，包括底座尺寸、高度（N）、外形、配色、字号、边框和文字排版，并在最后一个Tab里**一键导出 3D 打印 3MF 彩色模型 / STL 单色模型**及 Tinkercad SVG 双层格式。
        \n如果您想体验智能 AI 对话设计、自动绘制完美闭合的多路径 SVG，请在上方左下角 **Settings (设置) > Secrets** 中添加 \`GEMINI_API_KEY\` 后刷新页面重启对话即可！`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="application-root">
      {/* Top Header Menu */}
      <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Printer className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
              3D Printable Card Designer <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest font-bold">V1.5 PRO</span>
            </h1>
            <p className="text-xs text-slate-400">
              通过 AI 极速订制 3D 打印拼色卡牌/徽章模型，支持多层立体 Relief 排版与一键 3MF 彩色分层
            </p>
          </div>
        </div>

        {/* Actions & Info bar */}
        <div className="flex flex-wrap items-center gap-3.5 self-start sm:self-auto">
          {/* Preset templates trigger button */}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-4.5 py-2.5 bg-gradient-to-r from-emerald-505 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg hover:shadow-emerald-500/10 active:scale-95 cursor-pointer"
          >
            <Bookmark className="w-4 h-4 shrink-0" />
            <span>📁 预设设计模板</span>
          </button>

          {/* Info stats bar */}
          <div className="flex items-center gap-4 text-xs text-slate-400 bg-slate-950/60 p-2 rounded-xl border border-slate-800 font-mono">
            <div className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>切片分色格式: </span>
              <span className="text-emerald-400 font-bold">3MF Assembly</span>
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <div className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>网格精细度: </span>
              <span className="text-blue-400 font-bold">120x120 solid</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame: Left (Canvas + Chat), Right (Tabbed Sidebar Configurator) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: 画布 (Interactive 3D Preview) & AI Design Assistant */}
        <div className="lg:col-span-7 flex flex-col gap-5 h-full">
          
          {/* Section 1: The Canvas Viewport */}
          <div className="flex-1 min-h-[420px] lg:min-h-0 flex flex-col">
            <Card3DPreview state={modelState} widthMM={widthMM} heightMM={heightMM} />
          </div>

          {/* Section 2: AI Designer Chat Panel */}
          <div className="h-[430px] flex flex-col">
            <AIChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onSelectSuggestedPrompt={handleSelectSuggestedPrompt}
            />
          </div>
        </div>

        {/* Right Column: 边栏 with Multi-tabs Structure */}
        <div className="lg:col-span-5 flex flex-col h-full gap-5">
          <CardConfigurator
            state={modelState}
            onChange={setModelState}
            widthMM={widthMM}
            heightMM={heightMM}
            onWidthChange={setWidthMM}
            onHeightChange={setHeightMM}
          />
        </div>

      </main>

      {/* Preset template selector popup dialog */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-905 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950/65 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-100">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm tracking-wide font-sans">
                  选择预设设计模板 (Select Preset Template)
                </span>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg text-sm bg-slate-800/40 hover:bg-slate-800 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
              <p className="text-xs text-slate-400 leading-normal">
                请从以下精选的 3D 打印拼色模板库中选择。载入预设将会刷新画布，您可以随时在此基础上二次修改或下发 AI 绘图指令。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-1">
                {CARD_TEMPLATES.map((tpl) => {
                  const isActive = activeTemplateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        handleSelectTemplate(tpl);
                        setIsTemplateModalOpen(false);
                      }}
                      className={`text-left p-4 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden group cursor-pointer ${
                        isActive
                          ? "bg-emerald-500/10 text-slate-100 border-emerald-500/60 shadow-lg"
                          : "bg-slate-950/40 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-850/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`font-bold font-sans text-sm ${isActive ? "text-emerald-400" : "text-slate-200 group-hover:text-emerald-300"}`}>
                          {tpl.zhName}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest font-mono text-slate-500 border border-slate-800 bg-slate-900/40 px-2 py-0.5 rounded font-bold">
                          {tpl.state.baseShape}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 leading-relaxed font-sans flex-1">
                        {tpl.description}
                      </span>
                      {isActive && (
                        <div className="absolute right-0 bottom-0 w-3.5 h-3.5 bg-emerald-400 rounded-tl shadow" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4.5 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer System Status Bar */}
      <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-500 text-[11px] py-4 px-6 flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="font-sans">
          &copy; 2026 3D Printable Card Designer • Powered by Gemini AI, WebGL &amp; 3MF material assembly packagers. All rights reserved.
        </p>
        <div className="flex gap-4 font-mono">
          <span>Supported Outputs: [.3mf, .stl, .svg]</span>
          <span>Mesh Topology: Quad-closed solid manifold layers</span>
        </div>
      </footer>
    </div>
  );
}
