import { CardTemplate } from "./types";

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: "lucky-smiley",
    name: "Lucky Smiley Token",
    zhName: "幸运笑脸徽章",
    description: "经典圆形双色代币模版。平刷多色印花，适合制作桌游棋子或个性代币。",
    state: {
      baseShape: "circle",
      baseHeight: 3,
      structureType: "flat",
      baseColor: "#10b981", // Emerald green
      patternColor: "#fbbf24", // Yellow smiley face
      text: "LUCKY",
      textColor: "#ffffff",
      textParams: {
        fontSize: 16,
        fontWeight: "bold",
        posX: 0,
        posY: 22,
        fontFamily: "Space Grotesk",
      },
      svgPrompt: "A classic smiling face with round eyes and a wide happy curved mouth",
      svgPaths: [
        // Left eye
        "M 35,35 A 5,5 0 1,1 35,34.9 Z",
        // Right eye
        "M 65,35 A 5,5 0 1,1 65,34.9 Z",
        // Smile
        "M 30,55 Q 50,75 70,55 Q 50,65 30,55 Z",
      ],
    },
  },
  {
    id: "challenger-card",
    name: "Challenger Shield Card",
    zhName: "王者决斗浮雕卡",
    description: "高级非对称盾牌浮雕卡。包含坚固的外边框，文字和图案凹陷突出，质感饱满。",
    state: {
      baseShape: "shield",
      baseHeight: 4,
      structureType: "relief",
      baseColor: "#1e293b", // Deep slate grey
      patternColor: "#e2e8f0", // Silver relief patterns
      text: "APEX",
      textColor: "#f59e0b", // Amber accent text
      textParams: {
        fontSize: 18,
        fontWeight: "bold",
        posX: 0,
        posY: 30,
        fontFamily: "sans-serif",
      },
      svgPrompt: "A sharp medieval battle sword in a vertical position",
      svgPaths: [
        // The sword blade and hilt (shield crest stylized lines)
        "M 47,15 L 53,15 L 53,60 L 47,60 Z", // Blade
        "M 38,55 L 62,55 L 62,58 L 38,58 Z", // Guard
        "M 48,58 L 52,58 L 52,70 L 48,70 Z", // Handle
        "M 46,70 L 54,70 L 54,74 L 46,74 Z", // Pommel
      ],
    },
  },
  {
    id: "love-keychain",
    name: "Love Tag Card",
    zhName: "温馨爱心圆角牌",
    description: "温馨的圆角矩形钥匙吊牌模版。高亮突出桃心图案，非常适合情侣礼物或挂饰打印。",
    state: {
      baseShape: "rounded_rectangle",
      baseHeight: 3.5,
      structureType: "relief",
      baseColor: "#ec4899", // Pastel pink
      patternColor: "#ffffff", // Pure white relief
      text: "FOREVER",
      textColor: "#ffffff",
      textParams: {
        fontSize: 14,
        fontWeight: "bold",
        posX: 0,
        posY: 25,
        fontFamily: "Space Grotesk",
      },
      svgPrompt: "A beautiful stylized closed-path love heart",
      svgPaths: [
        "M 50,28 C 50,28 42,12 25,22 C 8,32 18,58 50,82 C 82,58 92,32 75,22 C 58,12 50,28 50,28 Z",
      ],
    },
  },
  {
    id: "star-token",
    name: "Star Gamer Coin",
    zhName: "星级玩家荣誉代币",
    description: "五角星几何边框卡牌。适合 3D 打印星形荣耀挂件或徽章。",
    state: {
      baseShape: "star",
      baseHeight: 3,
      structureType: "flat",
      baseColor: "#3b82f6", // Royal blue
      patternColor: "#facc15", // Star yellow
      text: "GAMER",
      textColor: "#ffffff",
      textParams: {
        fontSize: 13,
        fontWeight: "bold",
        posX: 0,
        posY: 22,
        fontFamily: "monospace",
      },
      svgPrompt: "A star inside a star or high-speed gaming rocket",
      svgPaths: [
        // Rocket silhouette
        "M 50,20 L 60,40 L 56,42 L 50,28 L 44,42 L 40,40 Z",
        // Flame jets
        "M 46,65 L 54,65 L 50,75 Z",
        // Rocket main body capsule
        "M 44,45 L 56,45 L 53,60 L 47,60 Z",
      ],
    },
  },
];
