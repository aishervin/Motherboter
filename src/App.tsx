import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, Github, Terminal, Code, RefreshCw, Send, Copy, Check, 
  Download, Settings, Zap, Smartphone, X, ExternalLink, Play, CheckCircle
} from "lucide-react";

const GITHUB_CLIENT_ID = "Ov23liRlVQJ53msMFK4d";

interface LogMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  time: string;
}

export default function App() {
  const [tab, setTab] = useState<'console' | 'code' | 'preview'>('console');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Credentials
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("mb_gemini_key") || "");
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem("mb_gh_token") || "");
  const [githubUser, setGithubUser] = useState(() => localStorage.getItem("mb_gh_user") || "");
  const [cfToken, setCfToken] = useState(() => localStorage.getItem("mb_cf_token") || "cfat_UE80AKq3LeBNdFq1NedtZPKmry3u10C0oWHF8GkP682c91ea");
  const [cfAccount, setCfAccount] = useState(() => localStorage.getItem("mb_cf_acc") || "95db3c31158d3696452081a727e1104a");
  const [tgToken, setTgToken] = useState(() => localStorage.getItem("mb_tg_token") || "");
  const [repoName, setRepoName] = useState(() => localStorage.getItem("mb_repo_name") || "motherbot-worker");

  // Code
  const [code, setCode] = useState(`import { Bot, webhookCallback } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN || "");

bot.command("start", async (ctx) => {
  await ctx.reply("سلام! ربات تلگرام شما فعال است.\\n\\nدستورات:\\n/start - شروع\\n/help - راهنما");
});

bot.command("help", async (ctx) => {
  await ctx.reply("راهنمای ربات:\\nاین ربات روی Cloudflare Workers مستقر شده است.");
});

bot.on("message:text", async (ctx) => {
  await ctx.reply(\`پیام شما دریافت شد: \${ctx.message.text}\`);
});

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    return webhookCallback(bot, "cloudflare-pages")(request);
  },
};`);

  const [copied, setCopied] = useState(false);
  const [prompt, setPrompt] = useState("");

  // Logs
  const [logs, setLogs] = useState<LogMessage[]>([
    {
      id: '1',
      sender: 'system',
      text: 'محیط توسعه آماده است. دستور ساخت یا تغییر ربات را بنویسید.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Simulator
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: 'سلام! ربات تلگرام شما فعال است.\n\nدستورات:\n/start - شروع\n/help - راهنما' }
  ]);
  const [simInput, setSimInput] = useState("");

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle GitHub OAuth callback code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      addLog('system', 'کد گیت‌هاب دریافت شد. در حال اتصال...');
    }

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

  const addLog = (sender: LogMessage['sender'], text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), sender, text, time }]);
  };

  // Direct 1-Click GitHub OAuth
  const handleGithubOAuth = () => {
    const redirectUri = window.location.origin + window.location.pathname;
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,workflow`;
  };

  // Execute AI Request
  const handleSendPrompt = async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    setPrompt("");
    setLoading(true);
    addLog('user', text);
    addLog('system', 'در حال پردازش با هوش مصنوعی...');

    try {
      let resultData: { reply: string; code?: string };

      if (geminiKey.trim()) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey.trim()}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expert Telegram bot developer using 'grammY' framework on Cloudflare Workers.
User instruction: "${text}"
Current bot code:
\`\`\`ts
${code}
\`\`\`

Respond ONLY with valid JSON:
{
  "reply": "توضیح کوتاه تغییرات",
  "code": "/* کامل سورس کد تایپ‌اسکریپت */"
}`
              }]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "خطا در ارتباط با هوش مصنوعی");
        }

        const data = await res.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
        resultData = JSON.parse(raw);
      } else {
        const res = await fetch("/api/generate-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, currentCode: code })
        });
        if (!res.ok) throw new Error("کلید جمینی را در بخش تنظیمات وارد کنید.");
        resultData = await res.json();
      }

      if (resultData.code) {
        setCode(resultData.code);
        addLog('system', 'کد ربات به‌روزرسانی شد.');
      }
      if (resultData.reply) {
        addLog('agent', resultData.reply);
      }
    } catch (err: any) {
      addLog('system', `خطا: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Direct GitHub Deploy
  const handleDeploy = async () => {
    if (!githubToken.trim()) {
      setSettingsOpen(true);
      addLog('system', 'برای دیپلوی، ابتدا به گیت‌هاب متصل شوید.');
      return;
    }

    setLoading(true);
    addLog('system', 'در حال ارسال کد به گیت‌هاب...');

    try {
      const headers = {
        "Authorization": `Bearer ${githubToken.trim()}`,
        "Accept": "application/vnd.github+json"
      };

      const userRes = await fetch("https://api.github.com/user", { headers });
      if (!userRes.ok) throw new Error("توکن گیت‌هاب معتبر نیست.");
      const userData = await userRes.json();
      const username = userData.login;
      setGithubUser(username);
      localStorage.setItem("mb_gh_user", username);

      await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: repoName, private: true, auto_init: true })
      });

      const commitFile = async (filePath: string, fileContent: string) => {
        let sha: string | undefined;
        const check = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${filePath}`, { headers });
        if (check.ok) {
          const info = await check.json();
          sha = info.sha;
        }
        await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${filePath}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            message: `chore: update ${filePath}`,
            content: btoa(unescape(encodeURIComponent(fileContent))),
            sha
          })
        });
      };

      await commitFile("src/index.ts", code);
      await commitFile("wrangler.toml", `name = "${repoName}"\nmain = "src/index.ts"\ncompatibility_date = "2026-03-01"\n`);
      await commitFile("package.json", JSON.stringify({
        name: repoName,
        version: "1.0.0",
        private: true,
        dependencies: { grammy: "^1.35.0" }
      }, null, 2));

      addLog('system', `پروژه با موفقیت دیپلوی شد: github.com/${username}/${repoName}`);
    } catch (err: any) {
      addLog('system', `خطای دیپلوی: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Simulator send
  const handleSimSend = () => {
    if (!simInput.trim()) return;
    const msg = simInput.trim();
    setSimMessages(prev => [...prev, { sender: 'user', text: msg }]);
    setSimInput("");

    setTimeout(() => {
      let reply = `پاسخ به: ${msg}`;
      if (msg === "/start") reply = "سلام! ربات تلگرام شما فعال است.\n\nدستورات:\n/start - شروع\n/help - راهنما";
      else if (msg === "/help") reply = "راهنمای ربات:\nاین ربات روی Cloudflare Workers مستقر شده است.";
      setSimMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-[#07080b] text-slate-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* 1. CLEAN TOP HEADER */}
      <header className="h-12 border-b border-slate-800 bg-[#0b0c11] px-3 md:px-4 flex items-center justify-between shrink-0 z-30">
        
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-xs md:text-sm text-white">Motherboter</span>
        </div>

        {/* Center Tabs */}
        <div className="flex items-center bg-[#13151d] p-0.5 rounded-lg border border-slate-800 text-xs">
          <button 
            onClick={() => setTab('console')}
            className={`px-3 py-1 rounded-md transition-colors ${tab === 'console' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
          >
            کنسول
          </button>
          <button 
            onClick={() => setTab('code')}
            className={`px-3 py-1 rounded-md transition-colors ${tab === 'code' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
          >
            کد
          </button>
          <button 
            onClick={() => setTab('preview')}
            className={`px-3 py-1 rounded-md transition-colors ${tab === 'preview' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
          >
            تست
          </button>
        </div>

        {/* Right Actions: Direct GitHub Connect & Settings */}
        <div className="flex items-center gap-2">
          {githubUser ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#13151d] border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-300">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span>@{githubUser}</span>
            </div>
          ) : (
            <button 
              onClick={handleGithubOAuth}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-slate-700"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">اتصال به گیت‌هاب</span>
            </button>
          )}

          <button 
            onClick={handleDeploy}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            <span>دیپلوی</span>
          </button>

          <button 
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg bg-[#13151d] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            title="تنظیمات"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-hidden pb-24">

        {/* TAB 1: CONSOLE */}
        {tab === 'console' && (
          <div className="flex-1 p-3 md:p-4 overflow-y-auto flex flex-col gap-2 max-w-3xl w-full mx-auto">
            {logs.map((item) => (
              <div 
                key={item.id}
                className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  item.sender === 'user' 
                    ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-100 self-end max-w-[85%]' 
                    : item.sender === 'system'
                    ? 'bg-[#0f1118] border-slate-800 text-slate-300 w-full font-mono'
                    : 'bg-[#12141e] border-slate-800 text-slate-100 w-full'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span>{item.sender === 'user' ? 'شما' : item.sender === 'system' ? 'سیستم' : 'پاسخ'}</span>
                  <span>{item.time}</span>
                </div>
                <div>{item.text}</div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* TAB 2: EDITABLE CODE */}
        {tab === 'code' && (
          <div className="flex-1 p-3 md:p-4 flex flex-col max-w-4xl w-full mx-auto overflow-hidden">
            <div className="bg-[#0b0c12] border border-slate-800 rounded-xl flex-1 flex flex-col overflow-hidden">
              <div className="bg-[#10121a] px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400">src/index.ts</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'کپی شد' : 'کپی'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      const blob = new Blob([code], { type: 'text/typescript' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = 'index.ts';
                      a.click();
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>دانلود</span>
                  </button>
                </div>
              </div>
              <textarea 
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 p-3 bg-transparent text-indigo-200 font-mono text-xs leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* TAB 3: SIMULATOR */}
        {tab === 'preview' && (
          <div className="flex-1 p-3 md:p-4 flex flex-col items-center justify-center max-w-md w-full mx-auto">
            <div className="w-full bg-[#0b0c12] border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[440px]">
              <div className="bg-[#10121a] px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px]">🤖</div>
                  <div>
                    <h4 className="text-xs font-bold text-white">شبیه‌ساز تلگرام</h4>
                    <p className="text-[9px] text-slate-400">سندباکس محلی</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSimMessages([{ sender: 'bot', text: 'ربات ری‌استارت شد.' }])}
                  className="text-slate-400 hover:text-white text-[10px]"
                >
                  پاکسازی
                </button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 text-xs">
                {simMessages.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2.5 rounded-xl max-w-[85%] whitespace-pre-line ${
                      m.sender === 'user' 
                        ? 'bg-indigo-600 text-white self-end rounded-br-none' 
                        : 'bg-[#151722] text-slate-200 border border-slate-800 self-start rounded-bl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="p-2 bg-[#10121a] border-t border-slate-800 flex items-center gap-1.5">
                <input 
                  type="text" 
                  value={simInput}
                  onChange={e => setSimInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSimSend()}
                  placeholder="ارسال پیام یا دستور..." 
                  className="flex-1 bg-[#151722] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
                <button 
                  onClick={handleSimSend}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 3. PROMPT INPUT BAR (Roomy, human placeholder) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#07080b]/95 border-t border-slate-800 z-20">
        <div className="max-w-3xl w-full mx-auto flex items-center gap-2">
          <input 
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendPrompt()}
            placeholder="مثلاً: یک ربات قیمت ارز با منوی دکمه‌ای بساز..."
            className="flex-1 bg-[#10121a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button 
            onClick={handleSendPrompt}
            disabled={loading || !prompt.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 shrink-0 flex items-center gap-1"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>ارسال</span>
          </button>
        </div>
      </div>

      {/* 4. SETTINGS MODAL (Concise labels, zero fluff) */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3">
          <div className="bg-[#0f1118] border border-slate-800 rounded-2xl max-w-md w-full p-4 flex flex-col gap-3 max-h-[90vh] overflow-y-auto text-xs">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white">تنظیمات و کلیدها</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Gemini */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">کلید Gemini</label>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline">
                  دریافت کلید
                </a>
              </div>
              <input 
                type="password"
                value={geminiKey}
                onChange={e => {
                  setGeminiKey(e.target.value);
                  localStorage.setItem("mb_gemini_key", e.target.value.trim());
                }}
                placeholder="AQ... یا AIza..."
                className="w-full bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            {/* GitHub */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">توکن گیت‌هاب</label>
                <a href="https://github.com/settings/tokens/new?scopes=repo,workflow" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline">
                  ساخت توکن
                </a>
              </div>
              <input 
                type="password"
                value={githubToken}
                onChange={e => {
                  setGithubToken(e.target.value);
                  localStorage.setItem("mb_gh_token", e.target.value.trim());
                }}
                placeholder="ghp_..."
                className="w-full bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            {/* Repo Name */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">نام ریپازیتوری</label>
              <input 
                type="text"
                value={repoName}
                onChange={e => {
                  setRepoName(e.target.value);
                  localStorage.setItem("mb_repo_name", e.target.value.trim());
                }}
                className="w-full bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            {/* Telegram Bot Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">توکن ربات تلگرام (اختیاری)</label>
                <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline">
                  BotFather@
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
                className="w-full bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <button 
              onClick={() => setSettingsOpen(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-xl text-xs transition-colors mt-2"
            >
              ذخیره
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
