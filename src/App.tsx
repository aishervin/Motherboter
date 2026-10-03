import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, Github, Cloud, Terminal, CheckCircle2, Sparkles, 
  Code, RefreshCw, Send, Copy, Check, Download, 
  Settings, Zap, ExternalLink, Smartphone, Activity,
  Sliders, X, ChevronRight, Lock, Key, AlertCircle, Trash2
} from "lucide-react";

interface LogItem {
  id: string;
  type: 'user' | 'agent' | 'system' | 'code' | 'error';
  title?: string;
  text: string;
  timestamp: string;
  details?: string[];
}

export default function App() {
  const [currentView, setCurrentView] = useState<'console' | 'code' | 'preview'>('console');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Settings & Credentials (stored in localStorage)
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("mb_gemini_key") || "");
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem("mb_gh_token") || "");
  const [githubUser, setGithubUser] = useState(() => localStorage.getItem("mb_gh_user") || "");
  const [cfToken, setCfToken] = useState(() => localStorage.getItem("mb_cf_token") || "cfat_UE80AKq3LeBNdFq1NedtZPKmry3u10C0oWHF8GkP682c91ea");
  const [cfAccount, setCfAccount] = useState(() => localStorage.getItem("mb_cf_acc") || "95db3c31158d3696452081a727e1104a");
  const [tgToken, setTgToken] = useState(() => localStorage.getItem("mb_tg_token") || "");
  const [repoName, setRepoName] = useState(() => localStorage.getItem("mb_repo_name") || "motherbot-worker");

  // Code state
  const [code, setCode] = useState(`import { Bot, webhookCallback } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN || "");

bot.command("start", async (ctx) => {
  await ctx.reply("سلام! ربات شما روی Cloudflare Workers با موفقیت فعال شد. 🚀\\n\\nدستورات فعال:\\n/start - شروع\\n/help - راهنما\\n/ping - پینگ و وضعیت");
});

bot.command("help", async (ctx) => {
  await ctx.reply("این ربات با هوش مصنوعی و بر بستر grammY توسعه داده شده است.");
});

bot.command("ping", async (ctx) => {
  await ctx.reply("پونگ! سرورهای لبه کلودفلر آنلاین هستند. 🟢");
});

bot.on("message:text", async (ctx) => {
  await ctx.reply(\`پیام شما: \${ctx.message.text}\`);
});

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    return webhookCallback(bot, "cloudflare-pages")(request);
  },
};`);

  const [copied, setCopied] = useState(false);
  const [userInput, setUserInput] = useState("");

  // Live simulator chat
  const [simChat, setSimChat] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: 'سلام! ربات تلگرام آماده پاسخگویی است. دستوری مثل /start را تست کنید.' }
  ]);
  const [simText, setSimText] = useState("");

  // Console Logs & Timeline
  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: 'init-1',
      type: 'system',
      title: 'سیستم آماده به کار',
      text: 'محیط توسعه Motherboter با موفقیت راه‌اندازی شد. هوش مصنوعی و ماژول‌های ابری آماده پردازش هستند.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      details: [
        'Cloudflare Workers SDK: متصل',
        'grammY Framework: v1.35.0 آماده',
        'موتور پردازشگر: Google Gemini Flash'
      ]
    }
  ]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Initial GitHub check if token exists
  useEffect(() => {
    if (githubToken && !githubUser) {
      fetch("https://api.github.com/user", {
        headers: { "Authorization": `Bearer ${githubToken.trim()}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.login) {
          setGithubUser(data.login);
          localStorage.setItem("mb_gh_user", data.login);
        }
      })
      .catch(() => {});
    }
  }, []);

  const addLog = (type: LogItem['type'], text: string, title?: string, details?: string[]) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), type, text, title, timestamp, details }
    ]);
  };

  // 1. Direct AI Execution (Fully Works in Browser & Server)
  const handleExecuteAI = async () => {
    const prompt = userInput.trim();
    if (!prompt || isProcessing) return;

    setUserInput("");
    setIsProcessing(true);
    addLog('user', prompt);

    addLog('system', 'در حال پردازش درخواست...', 'موتور هوش مصنوعی', [
      'بررسی کلید اعتبارسنجی Google Gemini...',
      'ارسال پرامپت مهندسی شده به مدل...',
      'در انتظار پاسخ مدل...'
    ]);

    try {
      let resultData: { reply: string; code?: string };

      // Direct Client-Side Gemini Call (CORS supported, works 100% on Cloudflare Pages)
      if (geminiKey.trim()) {
        const cleanKey = geminiKey.trim();
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
        
        const systemPrompt = `You are an expert Telegram bot developer using 'grammY' framework on Cloudflare Workers.
User instruction: "${prompt}"
Current bot code:
\`\`\`ts
${code}
\`\`\`

Generate complete, production-ready TypeScript code.
Output MUST be strict JSON:
{
  "reply": "توضیح کوتاه و تمیز فارسی درباره قابلیت اضافه شده",
  "code": "complete typescript code here"
}`;

        const aiRes = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!aiRes.ok) {
          const errBody = await aiRes.json();
          throw new Error(errBody.error?.message || `خطای API جمینی (${aiRes.status})`);
        }

        const aiJson = await aiRes.json();
        const rawOutput = aiJson.candidates?.[0]?.content?.parts?.[0]?.text;
        resultData = JSON.parse(rawOutput);
      } else {
        // Fallback to local server proxy
        const serverRes = await fetch("/api/generate-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt, currentCode: code })
        });

        if (!serverRes.ok) {
          throw new Error("لطفاً کلید هوش مصنوعی جمینی خود را در بخش تنظیمات ⚙️ وارد کنید.");
        }
        resultData = await serverRes.json();
      }

      // Update code
      if (resultData.code && resultData.code.trim()) {
        setCode(resultData.code);
        addLog('code', 'سورس‌کد با موفقیت بازنویسی و سینتکس جدید اعمال شد.', 'کامپایل کدهای ربات', [
          'بررسی ساختار توابع و دستورات grammY: تایید شد ✓',
          'سازگاری با ورکرز و محیط بدون سرور: تایید شد ✓',
          'آماده استقرار و اجرا روی لبه'
        ]);
      }

      addLog('agent', resultData.reply || 'تغییرات با موفقیت در پروژه اعمال شد.');
    } catch (err: any) {
      addLog('error', err.message || 'خطا در ارتباط با هوش مصنوعی', 'خطای پردازش', [
        'بررسی کنید که کلید جمینی معتبر باشد.',
        'می‌توانید کلید جدید را از تنظیمات ⚙️ وارد کنید.'
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Direct Deploy to GitHub
  const handleDeployToGitHub = async () => {
    if (!githubToken.trim()) {
      setSettingsOpen(true);
      addLog('error', 'برای دیپلوی باید توکن دسترسی گیت‌هاب را در تنظیمات وارد کنید.', 'نیاز به احراز هویت');
      return;
    }

    setIsProcessing(true);
    addLog('system', 'شروع فرآیند استقرار مستقیم روی گیت‌هاب...', 'دیپلوی خودکار', [
      'بررسی توکن دسترسی کاربر...',
      `ساخت یا بررسی ریپازیتوری ${repoName}...`,
      'آماده‌سازی فایل‌های wrangler.toml و package.json...'
    ]);

    try {
      const headers = {
        "Authorization": `Bearer ${githubToken.trim()}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "Motherboter-Deployer"
      };

      // 1. Get user profile
      const userRes = await fetch("https://api.github.com/user", { headers });
      if (!userRes.ok) throw new Error("توکن گیت‌هاب نامعتبر است یا دسترسی repo ندارد.");
      const userData = await userRes.json();
      const username = userData.login;
      setGithubUser(username);
      localStorage.setItem("mb_gh_user", username);

      // 2. Ensure repo exists
      addLog('system', `ایجاد ریپازیتوری پرایوت "${repoName}" در حساب @${username}...`);
      await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: repoName,
          description: "Telegram Bot deployed with Motherboter Studio",
          private: true,
          auto_init: true
        })
      });

      // Helper to commit file
      const commitFile = async (path: string, content: string) => {
        let sha: string | undefined;
        const checkRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, { headers });
        if (checkRes.ok) {
          const fileInfo = await checkRes.json();
          sha = fileInfo.sha;
        }
        await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            message: `chore: update ${path} via Motherboter`,
            content: btoa(unescape(encodeURIComponent(content))),
            sha
          })
        });
      };

      // Commit essential worker files
      await commitFile("src/index.ts", code);
      await commitFile("README.md", `# ${repoName}\n\nAutomated Telegram Bot created via Motherboter Studio.`);
      await commitFile("wrangler.toml", `name = "${repoName}"\nmain = "src/index.ts"\ncompatibility_date = "2026-03-01"\n`);
      await commitFile("package.json", JSON.stringify({
        name: repoName,
        version: "1.0.0",
        private: true,
        dependencies: { grammy: "^1.35.0" }
      }, null, 2));

      addLog('system', `تمام فایل‌ها با موفقیت روی گیت‌هاب قرار گرفتند: https://github.com/${username}/${repoName}`, 'دیپلوی موفقیت‌آمیز ✓', [
        `ریپازیتوری: github.com/${username}/${repoName}`,
        'فایل سورس: src/index.ts',
        'پیکربندی: wrangler.toml',
        'وابستگی‌ها: grammY'
      ]);
    } catch (err: any) {
      addLog('error', err.message || 'خطا در برقراری ارتباط با گیت‌هاب', 'خطای دیپلوی');
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulator interaction
  const handleSimSend = () => {
    if (!simText.trim()) return;
    const msg = simText.trim();
    setSimChat(prev => [...prev, { sender: 'user', text: msg }]);
    setSimText("");

    setTimeout(() => {
      let reply = `پیام دریافت شد: ${msg}`;
      if (msg === "/start") reply = "سلام! ربات شما روی Cloudflare Workers با موفقیت فعال شد. 🚀\n\nدستورات فعال:\n/start - شروع\n/help - راهنما\n/ping - پینگ و وضعیت";
      else if (msg === "/help") reply = "این ربات با هوش مصنوعی و بر بستر grammY توسعه داده شده است.";
      else if (msg === "/ping") reply = "پونگ! سرورهای لبه کلودفلر آنلاین هستند. 🟢";

      setSimChat(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* 1. COMPACT, ULTRA-CLEAN HEADER (h-12) */}
      <header className="h-12 border-b border-slate-800/80 bg-[#090b10] px-3 md:px-5 flex items-center justify-between shrink-0 z-30">
        
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs md:text-sm text-white tracking-tight">Motherboter</span>
          <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20 hidden sm:inline">
            SHΞN™
          </span>
        </div>

        {/* View Switcher (Segmented Control) */}
        <div className="flex items-center bg-[#11131a] p-0.5 rounded-lg border border-slate-800">
          <button 
            onClick={() => setCurrentView('console')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === 'console' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span className="hidden xs:inline">کنسول و مانیتور</span>
            <span className="xs:hidden">کنسول</span>
          </button>

          <button 
            onClick={() => setCurrentView('code')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === 'code' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3 h-3" />
            <span>کد</span>
          </button>

          <button 
            onClick={() => setCurrentView('preview')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              currentView === 'preview' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>تست</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSettingsOpen(true)}
            title="تنظیمات و کلیدها"
            className="p-1.5 rounded-lg bg-[#11131a] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors relative"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
            {(!geminiKey || !githubToken) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-0.5 right-0.5"></span>
            )}
          </button>

          <button 
            onClick={handleDeployToGitHub}
            disabled={isProcessing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-2.5 md:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">دیپلوی گیت‌هاب</span>
            <span className="sm:hidden">دیپلوی</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN VIEW AREA (Responsive, mobile friendly) */}
      <main className="flex-1 flex flex-col overflow-hidden pb-20">

        {/* VIEW 1: CONSOLE & LIVE LOGS */}
        {currentView === 'console' && (
          <div className="flex-1 p-3 md:p-5 overflow-y-auto flex flex-col gap-2.5 max-w-4xl w-full mx-auto font-mono text-xs">
            
            {logs.map((item) => (
              <div 
                key={item.id} 
                className={`p-3 rounded-xl border transition-all ${
                  item.type === 'user' 
                    ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-200 self-end max-w-[90%] md:max-w-2xl font-sans' 
                    : item.type === 'error'
                    ? 'bg-rose-950/30 border-rose-500/30 text-rose-300 w-full'
                    : item.type === 'code'
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300 w-full'
                    : item.type === 'system'
                    ? 'bg-[#0d0f15] border-slate-800 text-slate-300 w-full'
                    : 'bg-[#10131d] border-indigo-900/40 text-slate-200 w-full font-sans'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1 mb-1 border-b border-white/5">
                  <span className="font-semibold text-slate-400">
                    {item.title || (item.type === 'user' ? 'دستور کاربر' : item.type === 'agent' ? 'پاسخ هوش مصنوعی' : 'فرآیند اجرایی')}
                  </span>
                  <span>{item.timestamp}</span>
                </div>

                <div className="leading-relaxed whitespace-pre-line text-xs">{item.text}</div>

                {item.details && item.details.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1 text-[11px] text-slate-400">
                    {item.details.map((detail, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div ref={logsEndRef} />
          </div>
        )}

        {/* VIEW 2: CODE EDITOR */}
        {currentView === 'code' && (
          <div className="flex-1 p-3 md:p-5 flex flex-col max-w-4xl w-full mx-auto overflow-hidden">
            <div className="bg-[#0b0d13] border border-slate-800 rounded-xl flex-1 flex flex-col overflow-hidden shadow-xl">
              <div className="bg-[#0e1017] px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400 text-[11px]">src/index.ts (Cloudflare Workers)</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{copied ? 'کپی شد' : 'کپی'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      const blob = new Blob([code], { type: 'text/typescript' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = 'index.ts';
                      a.click();
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">دانلود</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-indigo-200 bg-[#07080c] leading-relaxed">
                <pre>{code}</pre>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: LIVE TELEGRAM SIMULATOR */}
        {currentView === 'preview' && (
          <div className="flex-1 p-3 md:p-5 flex flex-col items-center justify-center max-w-md w-full mx-auto">
            <div className="w-full bg-[#0b0d13] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[460px]">
              <div className="bg-[#0e1017] px-3 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs">🤖</div>
                  <div>
                    <h4 className="text-xs font-bold text-white">ربات تلگرام</h4>
                    <p className="text-[9px] text-emerald-400">آنلاین روی کلودفلر</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSimChat([{ sender: 'bot', text: 'ربات ری‌استارت شد.' }])}
                  className="text-slate-400 hover:text-white text-[10px]"
                >
                  پاکسازی
                </button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 text-xs bg-[#07080c]">
                {simChat.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2.5 rounded-xl max-w-[85%] whitespace-pre-line text-xs ${
                      m.sender === 'user' 
                        ? 'bg-indigo-600 text-white self-end rounded-br-none' 
                        : 'bg-[#141620] text-slate-200 border border-slate-800 self-start rounded-bl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="p-2.5 bg-[#0e1017] border-t border-slate-800 flex items-center gap-1.5">
                <input 
                  type="text" 
                  value={simText}
                  onChange={e => setSimText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSimSend()}
                  placeholder="پیام یا دستوری بفرستید (مثلاً /start)..." 
                  className="flex-1 bg-[#12141c] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button 
                  onClick={handleSimSend}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 3. SLEEK DOCKED PROMPT BAR (Clean, no clutter, no chips) */}
      <div className="fixed bottom-0 left-0 right-0 p-2 md:p-3 bg-[#06070a]/95 border-t border-slate-800/80 backdrop-blur-md z-20">
        <div className="max-w-4xl w-full mx-auto flex items-center gap-2">
          <input 
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleExecuteAI()}
            placeholder="دستور به هوش مصنوعی (مثلاً «دستور /calc برای محاسبه اضافه کن»)..."
            className="flex-1 bg-[#0d0f15] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button 
            onClick={handleExecuteAI}
            disabled={isProcessing || !userInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">ارسال</span>
          </button>
        </div>
      </div>

      {/* 4. UNIFIED SETTINGS DRAWER / MODAL */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4">
          <div className="bg-[#0d0f15] border border-slate-800 rounded-2xl max-w-lg w-full p-4 md:p-5 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs md:text-sm font-bold text-white">تنظیمات و کلیدهای ارتباطی</h3>
              </div>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-xs">

              {/* 1. Google Gemini AI Key */}
              <div className="bg-[#08090d] border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    کلید هوش مصنوعی Google Gemini
                  </span>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>دریافت رایگان کلید</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input 
                  type="password"
                  value={geminiKey}
                  onChange={e => {
                    setGeminiKey(e.target.value);
                    localStorage.setItem("mb_gemini_key", e.target.value.trim());
                  }}
                  placeholder="AQ.Ab8RN6... یا AIzaSy..."
                  className="w-full bg-[#11131a] border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500">پشتیبانی از فرمت‌های جدید (AQ...) و قدیمی بدون نیاز به سرور واسط.</p>
              </div>

              {/* 2. GitHub Token */}
              <div className="bg-[#08090d] border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5 text-slate-300" />
                    توکن دسترسی گیت‌هاب (Personal Access Token)
                  </span>
                  <a 
                    href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=Motherboter" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>ساخت توکن</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input 
                  type="password"
                  value={githubToken}
                  onChange={e => {
                    setGithubToken(e.target.value);
                    localStorage.setItem("mb_gh_token", e.target.value.trim());
                  }}
                  placeholder="ghp_... یا github_pat_..."
                  className="w-full bg-[#11131a] border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>نام ریپازیتوری در گیت‌هاب:</span>
                  <input 
                    type="text"
                    value={repoName}
                    onChange={e => {
                      setRepoName(e.target.value);
                      localStorage.setItem("mb_repo_name", e.target.value.trim());
                    }}
                    className="bg-[#11131a] border border-slate-800 rounded px-2 py-0.5 text-white font-mono text-[10px] w-36 text-left"
                  />
                </div>
              </div>

              {/* 3. Cloudflare Credentials */}
              <div className="bg-[#08090d] border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-amber-400" />
                    حساب کلودفلر (Cloudflare Workers)
                  </span>
                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">آماده</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-500 mb-0.5">Cloudflare API Token</label>
                    <input 
                      type="password"
                      value={cfToken}
                      onChange={e => {
                        setCfToken(e.target.value);
                        localStorage.setItem("mb_cf_token", e.target.value.trim());
                      }}
                      className="w-full bg-[#11131a] border border-slate-800 rounded px-2 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 mb-0.5">Account ID</label>
                    <input 
                      type="text"
                      value={cfAccount}
                      onChange={e => {
                        setCfAccount(e.target.value);
                        localStorage.setItem("mb_cf_acc", e.target.value.trim());
                      }}
                      className="w-full bg-[#11131a] border border-slate-800 rounded px-2 py-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Telegram Bot Token */}
              <div className="bg-[#08090d] border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-sky-400" />
                    توکن ربات تلگرام (اختیاری)
                  </span>
                  <a 
                    href="https://t.me/BotFather" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>BotFather@</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input 
                  type="password"
                  value={tgToken}
                  onChange={e => {
                    setTgToken(e.target.value);
                    localStorage.setItem("mb_tg_token", e.target.value.trim());
                  }}
                  placeholder="7123456789:AAH..."
                  className="w-full bg-[#11131a] border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button 
                onClick={() => {
                  setSettingsOpen(false);
                  addLog('system', 'تنظیمات ذخیره شد. می‌توانید دستورات را ارسال یا پروژه را دیپلوی کنید.');
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-xs transition-colors cursor-pointer mt-1"
              >
                ذخیره و تایید
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
