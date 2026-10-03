import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { config } from "dotenv";

config();

const app = express();
app.use(express.json());

const SYSTEM_INSTRUCTION = `You are Motherboter AI Agent, an autonomous Telegram Bot engineer and Cloudflare Workers edge specialist.
You communicate naturally in fluent Persian.
When the user asks you to build, modify, or test a Telegram bot, you guide them step by step, write production-ready TypeScript code using the 'grammY' framework, run simulated terminal operations, provide a live Telegram simulator, and provide deployment actions.

You MUST respond strictly with a valid JSON object matching this structure:
{
  "message": "پاسخ رسا و حرفه‌ای به فارسی برای کاربر",
  "blocks": [
    // Include relevant blocks dynamically based on user needs:
    // { "type": "terminal", "title": "کامپایل و بیلد", "command": "npx wrangler check", "logs": ["بررسی پکیج‌ها...", "تایید تایپ‌اسکریپت ✓"] }
    // { "type": "code", "filename": "src/index.ts", "code": "/* کامل سورس کد grammY */" }
    // { "type": "simulator", "botName": "نام ربات", "welcome": "پیام پیش‌فرض ربات در شبیه‌ساز" }
    // { "type": "deploy", "repoName": "motherbot-worker", "summary": "خلاصه تغییرات آماده دیپلوی" }
  ]
}
`;

// 1. Autonomous Agent Endpoint
app.post("/api/generate-bot", async (req, res) => {
  try {
    const { message, currentCode, geminiApiKey } = req.body;
    const activeKey = geminiApiKey || process.env.GEMINI_API_KEY;

    if (!activeKey) {
      return res.status(400).json({ error: "Gemini API Key is required" });
    }

    const aiInstance = new GoogleGenAI({
      apiKey: activeKey,
      httpOptions: {
        headers: { "User-Agent": "Motherboter-Agent" }
      }
    });

    const prompt = `User Message: "${message || 'سلام'}"
Current Bot Code:
\`\`\`ts
${currentCode || '// No code yet'}
\`\`\`
`;

    const response = await aiInstance.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(clean);
    }

    res.json(parsed);
  } catch (error: any) {
    console.error("Agent error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Health & Status
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", name: "Motherboter Agent Server" });
});

export default app;
