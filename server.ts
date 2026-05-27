import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini API Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// System instructions for the 3D Print Card Designer
const systemInstruction = `你是一个专业的 3D 打印卡牌设计助手 (3D Printable Card Designer)。
你的任务是通过与用户的交谈，设计和编辑适合 3D 打印的卡牌模型。

你能够通过输出结构化的 JSON 来控制卡牌的设计参数（包括底座形状、高度、印刷模式、颜色、文字内容和参数、以及纯矢量闭合的 SVG 轮廓图案）。

【重要规则】:
1. 底座形状 (baseShape) 决定卡牌外圈，支持: "rectangle" (矩形), "rounded_rectangle" (圆角矩形), "circle" (圆形), "triangle" (三角形), "hexagon" (六边形), "star" (五角星), "shield" (盾牌)。
2. 底座高度 (baseHeight) 是 N 毫米，默认通常在 3mm 左右，用户可以调节。
3. 文本 (text) 必须由程序可配置，支持中文和英文。
4. 结构类型 (structureType):
   - "relief" (浮雕模式): 外圈有突出的边框。卡牌内部凹陷。文字或图案突出于内部表面，但整体高度不超过边框（通常文字/图案高度为2mm，正好与外圈边框齐平或略低）。
   - "flat" (平面模式): 表面完全是平的。底座、文字和图案高度都是 N，通过颜色对比来区分区域（适合多色 3D 打印机，如拓竹竹库 AMS）。
5. 图案的 SVG 路径：
   - 图案必须是由在 0 至 100 范围的 viewBox 中绘制的**完全闭合路径**（以 Z 或 z 结尾）。
   - 不能使用 open line, 不能使用非闭合的 <line> 或 <polyline>。必须是可以填充的闭合几何形状。
   - 图案可以包含多个独立的闭合路径 (svgPaths 数组)，例如笑脸中的眼睛和嘴巴是两个独立的闭合 path。
   - 例如心形: "M 50,25 C 50,25 35,0 15,15 C -5,30 10,65 50,90 C 90,65 105,30 85,15 C 65,0 50,25 50,25 Z"
   - 例如圆形组合: "M 30,35 A 8,8 0 1,1 30,34.9 Z M 70,35 A 8,8 0 1,1 70,34.9 Z"。
6. 支持进行连续对话和修改。当用户提出反馈，比如 "换成绿色的底座"、"文字加粗一点" 或 "帮我画一只猫咪图案"，你需要：
   - 保留未被修改的参数。
   - 针对当前请求，生动、精准地绘制或修改 SVG 闭合路径。
   - 在 reply 中，以友好详实的中文回复用户，并解释你的设计含义、可用于Tinkercad和3D打印。

请每次都严格输出符合要求的 JSON 格式。`;

// Endpoint: AI Chat and State update
app.post("/api/chat", async (req, res) => {
  if (!ai) {
    return res.status(500).json({
      error: "Gemini API 密钥未配置。请在 Settings > Secrets 面板添加 GEMINI_API_KEY。",
    });
  }

  const { messages, currentState } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "参数错误: messages 缺失或非数组" });
  }

  try {
    // Construct the context prompt
    const contextPrompt = `
当前的卡牌 3D 控制状态 (currentState) 如下:
${JSON.stringify(currentState, null, 2)}

下面是用户与您的对话记录，请根据最新的一条用户消息做出响应，更新状态：
${messages
  .map((m: any) => `${m.role === "user" ? "用户" : "助手"}: ${m.content}`)
  .join("\n")}

请结合对话，更新卡牌模型的 modelState 并生成 reply 回复。如果你新设计或修改了图案，请编写全新的闭合 SVG 路径 (由 100x100 的闭合 path 组成，必须以 Z 字符闭合)。
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contextPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "对用户的亲切中文回复，详细介绍当前的设计更新和如何在 Tinkercad 中使用。",
            },
            modelState: {
              type: Type.OBJECT,
              description: "更新后的卡牌 3D 渲染和打印数据结构",
              properties: {
                baseShape: {
                  type: Type.STRING,
                  enum: [
                    "rectangle",
                    "rounded_rectangle",
                    "circle",
                    "triangle",
                    "hexagon",
                    "star",
                    "shield",
                  ],
                  description: "底座形状",
                },
                baseHeight: {
                  type: Type.NUMBER,
                  description: "底座高度 N (mm)",
                },
                structureType: {
                  type: Type.STRING,
                  enum: ["relief", "flat"],
                  description: "浮雕或平面结构",
                },
                baseColor: {
                  type: Type.STRING,
                  description: "底座颜色（十六进制十六进制）",
                },
                patternColor: {
                  type: Type.STRING,
                  description: "图案/文字打印颜色（十六进制）",
                },
                text: {
                  type: Type.STRING,
                  description: "文本内容",
                },
                textColor: {
                  type: Type.STRING,
                  description: "文本颜色（十六进制）",
                },
                textParams: {
                  type: Type.OBJECT,
                  description: "文本细节参数",
                  properties: {
                    fontSize: {
                      type: Type.NUMBER,
                      description: "文字大小比例 (10 - 50)",
                    },
                    fontWeight: {
                      type: Type.STRING,
                      enum: ["normal", "bold"],
                      description: "粗细",
                    },
                    posX: {
                      type: Type.NUMBER,
                      description: "文字横向偏移 (-50 到 50，默认 0)",
                    },
                    posY: {
                      type: Type.NUMBER,
                      description: "文字纵向偏移 (-50 到 50，默认 25，位于下方)",
                    },
                  },
                },
                svgPrompt: {
                  type: Type.STRING,
                  description: "对新生成或编辑的图案设计的提示词描述",
                },
                svgPaths: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    "拼装此图案所需的 1 个或多个闭合路径(d属性值)。必须由 viewBox=0 0 100 100 的闭合轮廓拼装而成(比如以Z/z结尾)。如果是多眼多口，请拆分为不同路径。千万不要带非闭合线。",
                },
              },
            },
          },
          required: ["reply", "modelState"],
        },
      },
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return res.json(data);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      error: `AI 交互失败: ${error?.message || "服务器网络故障"}`,
    });
  }
});

// Serve assets and static files in dev and prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
