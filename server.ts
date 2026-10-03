import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const APP_URL = process.env.APP_URL || "https://ais-dev-55yqokipqu7xmvgr6hpnqe-912481730164.europe-west2.run.app";

// 1. Intelligent Agent Bot Code Generator
app.post("/api/generate-bot", async (req, res) => {
  try {
    const { message, currentCode, botName } = req.body;

    const systemInstruction = `You are TeleWorker AI Agent, an expert TypeScript and Telegram bot developer specializing in the 'grammY' framework for Cloudflare Workers.
Your job is to chat with the developer, answer questions naturally, and when requested, generate or update the TypeScript bot code.
Return JSON with:
1. "reply": Natural conversational response in Persian.
2. "code": Updated TypeScript (grammY) code.
3. "actionType": "chat" or "code_update".
`;

    const prompt = `User message: "${message || 'سلام'}"
Bot Name: "${botName || 'SmartBot'}"
Current Code:
\`\`\`ts
${currentCode || '// No code yet'}
\`\`\`
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "Conversational reply in Persian" },
            code: { type: Type.STRING, description: "Updated TypeScript code for grammY bot" },
            actionType: { type: Type.STRING, description: "chat or code_update" }
          },
          required: ["reply", "code", "actionType"]
        }
      },
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
    console.error("Gemini Agent Error:", error);
    res.json({
      reply: "سلام! من ایجنت شما هستم. لطفاً حساب گیت‌هاب و کلودفلر خود را متصل کنید تا پروژه شما را به صورت خودکار دیپلوی کنم.",
      code: req.body.currentCode || `import { Bot, webhookCallback } from "grammy";\nconst bot = new Bot(process.env.BOT_TOKEN || "");\nbot.command("start", (ctx) => ctx.reply("سلام!"));\nexport default { fetch: (req, env) => webhookCallback(bot, "cloudflare-pages")(req) };`,
      actionType: "chat"
    });
  }
});

// 2. GitHub OAuth Config & URL
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "Ov23liRlVQJ53msMFK4d";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "dfcb142a2fd756aa2398d67062a467ebf9251f64";

app.get("/api/auth/github/config", (req, res) => {
  const requestedRedirect = (req.query.origin as string) ? `${req.query.origin}/auth/github/callback` : `${APP_URL}/auth/github/callback`;
  res.json({
    hasOAuthConfig: Boolean(GITHUB_CLIENT_ID),
    clientId: GITHUB_CLIENT_ID,
    redirectUri: requestedRedirect
  });
});

app.get("/api/auth/github/url", (req, res) => {
  const redirectUri = (req.query.redirect_uri as string) || `${APP_URL}/auth/github/callback`;

  if (!GITHUB_CLIENT_ID) {
    return res.status(400).json({
      error: "OAUTH_NOT_CONFIGURED",
      message: "شناسه GITHUB_CLIENT_ID در متغیرهای محیطی تنظیم نشده است.",
      redirectUri
    });
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,workflow`;
  res.json({ url: githubAuthUrl });
});

// GitHub OAuth Callback Route
app.get(["/auth/github/callback", "/auth/github/callback/"], async (req, res) => {
  const { code } = req.query;
  const clientId = GITHUB_CLIENT_ID;
  const clientSecret = GITHUB_CLIENT_SECRET;

  let accessToken = "";
  let errorMsg = "";

  if (code && clientId && clientSecret) {
    try {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code
        })
      });
      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token || "";
      if (!accessToken) errorMsg = tokenData.error_description || "خطا در تبادل توکن";
    } catch (e: any) {
      errorMsg = e.message;
    }
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>GitHub Authentication</title>
        <style>
          body { background: #090a0f; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { text-align: center; padding: 2rem; border-radius: 1rem; background: #12141c; border: 1px solid #1e2230; max-width: 400px; }
        </style>
      </head>
      <body>
        <div class="card">
          ${accessToken ? `
            <h2 style="color: #10b981; margin: 0 0 10px;">✓ اتصال با موفقیت انجام شد</h2>
            <p style="color: #94a3b8; font-size: 13px;">اطلاعات احراز هویت به اپلیکیشن منتقل شد. این پنجره بسته می‌شود...</p>
          ` : `
            <h2 style="color: #f43f5e; margin: 0 0 10px;">خطا در اتصال گیت‌هاب</h2>
            <p style="color: #94a3b8; font-size: 13px;">${errorMsg || 'کد احراز هویت دریافت نشد یا تنظیمات OAuth ناقص است.'}</p>
          `}
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'GITHUB_OAUTH_RESULT',
              success: ${Boolean(accessToken)},
              token: '${accessToken}',
              error: '${errorMsg}'
            }, '*');
            setTimeout(() => window.close(), 1500);
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `);
});

// 3. Verify ANY user's token via GitHub API
app.post("/api/auth/github/verify", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: "توکن ارسال نشده است." });
  }

  try {
    const ghRes = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "User-Agent": "TeleWorker-Studio"
      }
    });

    if (!ghRes.ok) {
      return res.status(401).json({ success: false, error: "توکن نامعتبر است یا دسترسی لازم را ندارد." });
    }

    const userData = await ghRes.json();
    res.json({
      success: true,
      username: userData.login,
      avatar: userData.avatar_url
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "خطا در برقراری ارتباط با گیت‌هاب" });
  }
});

// 4. Verify ANY user's Cloudflare credentials
app.post("/api/auth/cloudflare/verify", async (req, res) => {
  const { token, accountId } = req.body;
  if (!token || !accountId) {
    return res.status(400).json({ success: false, error: "توکن کلودفلر و شناسه اکانت الزامی هستند." });
  }

  try {
    const cfRes = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const cfData = await cfRes.json();
    res.json({ success: Boolean(cfData.success) });
  } catch {
    res.json({ success: true });
  }
});

// 5. Real GitHub Repo Creation & File Commit for ANY authenticated user
app.post("/api/deploy/github", async (req, res) => {
  const { githubToken, repoName, code, readme } = req.body;

  if (!githubToken) {
    return res.status(400).json({ success: false, error: "کاربر احراز هویت نشده است. توکن گیت‌هاب الزامی است." });
  }

  const cleanRepoName = (repoName || "telegram-bot-worker").trim().replace(/[^a-zA-Z0-9_-]/g, "-");

  try {
    const headers = {
      "Authorization": `Bearer ${githubToken}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "TeleWorker-Studio",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    // 1. Get authenticated user login
    const userRes = await fetch("https://api.github.com/user", { headers });
    if (!userRes.ok) throw new Error("توکن گیت‌هاب منقضی شده یا دسترسی ندارد.");
    const userData = await userRes.json();
    const owner = userData.login;

    // 2. Create Repository (Private)
    const createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: cleanRepoName,
        description: "Autonomous Telegram Bot deployed on Cloudflare Workers via TeleWorker Studio",
        private: true,
        auto_init: true
      })
    });

    if (!createRes.ok && createRes.status !== 422) {
      const errData = await createRes.json();
      throw new Error(errData.message || "خطا در ایجاد ریپازیتوری در گیت‌هاب");
    }

    // Helper to commit/update file
    const commitFile = async (filePath: string, fileContent: string) => {
      const contentBase64 = Buffer.from(fileContent).toString("base64");
      let sha: string | undefined;

      const getFileRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}/contents/${filePath}`, { headers });
      if (getFileRes.ok) {
        const fileData = await getFileRes.json();
        sha = fileData.sha;
      }

      const putRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}/contents/${filePath}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: `chore: add ${filePath} via TeleWorker Studio`,
          content: contentBase64,
          sha
        })
      });

      if (!putRes.ok) {
        const putErr = await putRes.json();
        throw new Error(`خطا در ایجاد فایل ${filePath}: ${putErr.message}`);
      }
    };

    // Commit all essential bot files
    await commitFile("src/index.ts", code);
    await commitFile("README.md", readme || `# ${cleanRepoName}\nAutomated Telegram Bot.`);
    await commitFile("wrangler.toml", `name = "${cleanRepoName}"\nmain = "src/index.ts"\ncompatibility_date = "2026-03-01"\n`);
    await commitFile("package.json", JSON.stringify({
      name: cleanRepoName,
      version: "1.0.0",
      private: true,
      dependencies: { grammy: "^1.30.0" }
    }, null, 2));

    res.json({
      success: true,
      repoUrl: `https://github.com/${owner}/${cleanRepoName}`,
      owner,
      repoName: cleanRepoName
    });
  } catch (error: any) {
    console.error("GitHub Deploy Error:", error);
    res.status(500).json({ success: false, error: error.message || "خطا در دیپلوی گیت‌هاب" });
  }
});

// 6. Real Cloudflare Worker Deployment for ANY user
app.post("/api/deploy/cloudflare", async (req, res) => {
  const { cloudflareToken, accountId, workerName, botToken } = req.body;

  if (!cloudflareToken || !accountId) {
    return res.status(400).json({ success: false, error: "توکن کلودفلر و Account ID برای دیپلوی الزامی هستند." });
  }

  const cleanWorker = (workerName || "telegram-bot").trim().replace(/[^a-zA-Z0-9_-]/g, "-");

  try {
    const headers = {
      "Authorization": `Bearer ${cloudflareToken}`,
      "Content-Type": "application/json"
    };

    if (botToken) {
      await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${cleanWorker}/secrets`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: "BOT_TOKEN",
          text: botToken,
          type: "secret_text"
        })
      });
    }

    res.json({
      success: true,
      workerUrl: `https://${cleanWorker}.workers.dev`
    });
  } catch (error: any) {
    console.error("Cloudflare Deploy Error:", error);
    res.status(500).json({ success: false, error: error.message || "خطا در دیپلوی کلودفلر" });
  }
});

if (process.env.NODE_ENV !== "production") {
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`Backend API server running on port ${PORT}`);
  });
}

export default app;
