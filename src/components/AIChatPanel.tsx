import React, { useState, useRef, useEffect } from "react";
import { Message, ModelState } from "../types";
import { Send, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

interface AIChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onSelectSuggestedPrompt: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  "画一个圆嘴大眼的小猫图案，底座设为圆角矩形",
  "帮我做一个科幻游戏极客专用的六边形荣誉代币",
  "设计粉色圆角钥匙扣卡牌，图案是精美的爱心，文字印‘SWEET’",
  "把模型高度增加到 5mm，整体转换为浮雕模式",
  "把底座改成五角星形，文字设为‘WINNER’并放低一点",
];

// Cycles through realistic 3D printer prep step notifications for an immersive maker vibe!
const LOADING_STEPS = [
  "正在加热热端 3D 喷嘴 (Heating Extruder)...",
  "正在对卡牌进行 3D 床调平 (Auto-bed leveling)...",
  "正在加载多色耗材并吐出废料 (Purging prime tower)...",
  "AI 正在规划连续闭合 SVG 边界 (Compiling water-tight path)...",
  "正在编译生成 STL 实体模型网格 (Solidifying STL mesh)...",
];

export default function AIChatPanel({
  messages,
  onSendMessage,
  isLoading,
  onSelectSuggestedPrompt,
}: AIChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText("");
  };

  // Cycle loading steps when working
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStepIdx(0);
      timer = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Quick helper to render basic markdown bold/lists safely without bloat
  const renderMessageContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, i) => {
      // Bold text mapping **bold** or __bold__
      let rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-400 font-bold">$1</strong>');
      
      // Inline code blocks `code`
      rendered = rendered.replace(/`(.*?)`/g, '<code class="bg-slate-900 border border-slate-705 text-amber-400 px-1 py-0.5 rounded font-mono text-[11px]">$1</code>');

      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const itemContent = line.trim().substring(2);
        return (
          <li key={i} className="list-disc list-inside ml-2 my-1 text-slate-300 antialiased" dangerouslySetInnerHTML={{ __html: rendered.substring(2) }} />
        );
      }

      return (
        <p key={i} className="my-1.5 leading-relaxed text-slate-300 antialiased" dangerouslySetInnerHTML={{ __html: rendered }} />
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl" id="chat-panel">
      {/* Panel Greeting Title */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
        <div>
          <h2 className="font-bold text-slate-100 text-sm font-sans">
            AI 3D 打印卡牌对话设计工具
          </h2>
          <p className="text-[10px] text-slate-400 font-sans">
            随时输入您的想法，我会帮您绘制闭合 SVG、编写文字并自动导出 STL
          </p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/40 min-h-[300px]">
        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex flex-col max-w-[85%] ${isUser ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              {/* Sender Tag */}
              <span className="text-[10px] text-slate-500 font-mono mb-1 px-1">
                {isUser ? "ME" : "AI DESIGNER"} • {message.timestamp}
              </span>

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl text-xs flex flex-col gap-1 border shadow ${
                  isUser
                    ? "bg-slate-800 border-slate-700 text-slate-100 rounded-tr-none"
                    : "bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none"
                }`}
              >
                <div className="space-y-1">{renderMessageContent(message.content)}</div>
              </div>
            </div>
          );
        })}

        {/* Floating Print Loader */}
        {isLoading && (
          <div className="flex flex-col max-w-[85%] mr-auto items-start animate-pulse">
            <span className="text-[10px] text-slate-500 font-mono mb-1 px-1">
              AI DESIGNER • SYSTEM
            </span>
            <div className="p-4 rounded-2xl text-xs bg-slate-900 border border-emerald-900/40 text-slate-200 rounded-tl-none flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-slate-200 font-sans">智能切片引擎加载中...</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {LOADING_STEPS[loadingStepIdx]}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom anchor for scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested suggestions pill row */}
      <div className="px-4 py-2 bg-slate-950/20 border-t border-slate-800 flex flex-col gap-1.5">
        <span className="text-[10px] text-slate-500 font-semibold tracking-wider font-mono">
          设计建议指令 (Quick Prompts)
        </span>
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scroll-smooth custom-scrollbar-hide">
          {SUGGESTED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSelectSuggestedPrompt(prompt)}
              className="text-[10px] whitespace-nowrap bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 px-2.5 py-1.5 rounded-full transition-all text-left font-sans cursor-pointer shrink-0"
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Submit form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isLoading ? "正在编译 3D 浮雕，请稍等..." : "对 AI 说：底座改成六边形，加一个剑和一个桃心..."}
          className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500/80 rounded-xl p-3 text-slate-200 placeholder-slate-500 text-xs focus:outline-none transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className="bg-emerald-500 text-slate-950 font-bold p-3 rounded-xl hover:bg-emerald-400 disabled:bg-slate-850 disabled:text-slate-650 transition-all flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
