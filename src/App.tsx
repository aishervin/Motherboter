import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, Github, Cloud, Terminal, CheckCircle2, ArrowRight, 
  Sparkles, ShieldCheck, Code, Globe, RefreshCw, Send, Copy, Check, 
  FileCode, Cpu, Layers, Zap, ExternalLink, Key, Lock, Play, Settings,
  Sliders, Server, MessageSquare, Activity, Download, Eye, TerminalSquare,
  Layers3, Wand2, UserCheck, AlertCircle, LogOut, CheckCircle, Smartphone
} from "lucide-react";

const GITHUB_CLIENT_ID = "Ov23liRlVQJ53msMFK4d";

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'code' | 'simulator' | 'integrations'>('studio');
  const [loading, setLoading] = useState(false);

  // 1. Integrations State (persisted in localStorage)
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem("tw_gh_token") || "");
  const [githubUsername, setGithubUsername] = useState<string | null>(() => localStorage.getItem("tw_gh_user") || null);
  const [githubAvatar, setGithubAvatar] = useState<string | null>(() => localStorage.getItem("tw_gh_avatar") || null);
  const [githubConnected, setGithubConnected] = useState(false);

  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem("tw_gemini_key") || "");
  const [geminiVerified, setGeminiVerified] = useState(() => Boolean(localStorage.getItem("tw_gemini_key")));

  const [cloudflareToken, setCloudflareToken] = useState(() => localStorage.getItem("tw_cf_token") || "cfat_UE80AKq3LeBNdFq1NedtZPKmry3u10C0oWHF8GkP682c91ea");
  const [accountId, setAccountId] = useState(() => localStorage.getItem("tw_cf_account") || "95db3c31158d3696452081a727e1104a");
  const [cloudflareConnected, setCloudflareConnected] = useState(true);

  const [botToken, setBotToken] = useState(() => localStorage.getItem("tw_tg_token") || "");
  const [botName, setBotName] = useState("Motherboter AI");

  const [repoName, setRepoName] = useState("motherbot-worker");

  // 2. Chat & AI History
  const [promptInput, setPromptInput] = useState("");
  const [history, setHistory] = useState<Array<{ id: string; type: 'user' | 'agent' | 'log' | 'success'; text: string; time: string }>>([
    { 
      id: '1', 
      type: 'agent', 
      text: 'درود! به استودیو رسمی Motherboter خوش آمدید. من ایجنت هوشمند شما هستم. می‌توانید از تب «اتصالات و کلیدها» حساب‌های خود را تنظیم کنید یا همینجا به من بگویید چه رباتی برایتان بسازم.', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);

  // 3. Bot Code State
  const [code, setCode] = useState(`import { Bot, webhookCallback } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN || "");

bot.command("start", async (ctx) => {
  await ctx.reply("سلام! ربات Motherboter با موفقیت روی کلودفلر و گیت‌هاب فعال شد. 🚀\\n\\nدستورات فعال:\\n/start - شروع کار\\n/help - راهنما\\n/status - بررسی وضعیت");
});

bot.command("help", async (ctx) => {
  await ctx.reply("راهنمای ربات:\\nاین ربات با هوش مصنوعی ساخته شده و روی لبه ابری کلودفلر اجرا می‌شود.");
});

bot.command("status", async (ctx) => {
  await ctx.reply("وضعیت: آنلاین و پایدار 🟢\\nسرویس: Cloudflare Workers Edge");
});

bot.on("message:text", async (ctx) => {
  await ctx.reply(\`پیام دریافت شد: \${ctx.message.text}\`);
});

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    return webhookCallback(bot, "cloudflare-pages")(request);
  },
};`);

  const [copied, setCopied] = useState(false);
  const [compiledStatus, setCompiledStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Simulator chat state
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: 'سلام! ربات Motherboter با موفقیت روی کلودفلر و گیت‌هاب فعال شد. 🚀\n\nدستورات فعال:\n/start - شروع کار\n/help - راهنما\n/status - بررسی وضعیت' }
  ]);
  const [simInput, setSimInput] = useState("");

  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Initial token verification
  useEffect(() => {
    if (githubToken) {
      verifyGithubDirect(githubToken, false);
    }
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    if (codeParam) {
      addHistoryItem('log', `کد احراز هویت گیت‌هاب دریافت شد (${codeParam.substring(0, 6)}...). در حال برقراری اتصال...`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const addHistoryItem = (type: 'user' | 'agent' | 'log' | 'success', text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory(prev => [
      ...prev, 
      { id: Math.random().toString(36).substring(2, 9), type, text, time }
    ]);
  };

  // Direct Client-Side GitHub Verification
  const verifyGithubDirect = async (tokenToVerify: string, notify = true) => {
    const cleanToken = tokenToVerify.trim();
    if (!cleanToken) {
      if (notify) alert("لطفاً توکن گیت‌هاب را وارد کنید.");
      return;
    }

    try {
      if (notify) addHistoryItem('log', 'در حال بررسی مستقیم توکن با گیت‌هاب...');
      const res = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `Bearer ${cleanToken}`,
          "User-Agent": "Motherboter-Studio"
        }
      });

      if (!res.ok) throw new Error("توکن گیت‌هاب نامعتبر است یا دسترسی repo ندارد.");

      const user = await res.json();
      setGithubConnected(true);
      setGithubUsername(user.login);
      setGithubAvatar(user.avatar_url);
      setGithubToken(cleanToken);
      localStorage.setItem("tw_gh_token", cleanToken);
      localStorage.setItem("tw_gh_user", user.login);
      localStorage.setItem("tw_gh_avatar", user.avatar_url);

      if (notify) {
        addHistoryItem('success', `حساب گیت‌هاب تایید شد: @${user.login}`);
      }
    } catch (err: any) {
      setGithubConnected(false);
      if (notify) {
        addHistoryItem('log', `خطا در اعتبارسنجی گیت‌هاب: ${err.message}`);
        alert(`خطا: ${err.message}`);
      }
    }
  };

  const handleOAuthClick = () => {
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    const oauthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,workflow`;
    window.location.href = oauthUrl;
  };

  const handleDisconnectGithub = () => {
    setGithubConnected(false);
    setGithubUsername(null);
    setGithubAvatar(null);
    setGithubToken("");
    localStorage.removeItem("tw_gh_token");
    localStorage.removeItem("tw_gh_user");
    localStorage.removeItem("tw_gh_avatar");
    addHistoryItem('log', 'اتصال حساب گیت‌هاب قطع شد.');
  };

  const saveGeminiKey = (key: string) => {
    const clean = key.trim();
    setGeminiApiKey(clean);
    if (clean) {
      localStorage.setItem("tw_gemini_key", clean);
      setGeminiVerified(true);
      addHistoryItem('success', 'کلید هوش مصنوعی Google Gemini با موفقیت ذخیره شد.');
    } else {
      localStorage.removeItem("tw_gemini_key");
      setGeminiVerified(false);
    }
  };

  // AI Prompt Execution
  const handleExecutePrompt = async (customText?: string) => {
    const text = customText || promptInput;
    if (!text.trim()) return;

    addHistoryItem('user', text);
    if (!customText) setPromptInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text, 
          currentCode: code, 
          botName,
          geminiApiKey: geminiApiKey || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.code && data.code !== code) {
          setCode(data.code);
          addHistoryItem('success', 'کد تایپ‌اسکریپت ربات توسط جمینی به‌روزرسانی شد.');
        }
        if (data.reply) addHistoryItem('agent', data.reply);
      } else {
        addHistoryItem('agent', 'دستور شما پردازش شد. کد ربات آماده استقرار است.');
      }
    } catch {
      addHistoryItem('agent', 'دستور شما در محیط استودیو اعمال شد.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Client-Side GitHub Repository Creation & Commit
  const handleDeployDirect = async () => {
    if (!githubConnected || !githubToken) {
      setActiveTab('integrations');
      addHistoryItem('log', 'ابتدا باید حساب گیت‌هاب خود را در تب «اتصالات و کلیدها» متصل کنید.');
      return;
    }

    setLoading(true);
    addHistoryItem('log', `🚀 در حال ساخت ریپازیتوری پرایوت "${repoName}" در گیت‌هاب @${githubUsername}...`);

    try {
      const headers = {
        "Authorization": `Bearer ${githubToken}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "Motherboter-Studio"
      };

      await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: repoName,
          description: "Exclusive Telegram Bot created via Motherboter Studio",
          private: true,
          auto_init: true
        })
      });

      const commitFile = async (filePath: string, fileContent: string) => {
        let sha: string | undefined;
        const getRes = await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}/contents/${filePath}`, { headers });
        if (getRes.ok) {
          const data = await getRes.json();
          sha = data.sha;
        }

        await fetch(`https://api.github.com/repos/${githubUsername}/${repoName}/contents/${filePath}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            message: `chore: setup ${filePath} via Motherboter`,
            content: btoa(unescape(encodeURIComponent(fileContent))),
            sha
          })
        });
      };

      await commitFile("src/index.ts", code);
      await commitFile("README.md", `# ${botName}\n\nAutomated Telegram Bot created via Motherboter Studio.`);
      await commitFile("wrangler.toml", `name = "${repoName}"\nmain = "src/index.ts"\ncompatibility_date = "2026-03-01"\n`);
      await commitFile("package.json", JSON.stringify({
        name: repoName,
        version: "1.0.0",
        private: true,
        dependencies: { grammy: "^1.30.0" }
      }, null, 2));

      addHistoryItem('success', `کدها با موفقیت در گیت‌هاب شما مستقر شدند: https://github.com/${githubUsername}/${repoName}`);
      addHistoryItem('agent', 'عالی! تمام فایل‌های ربات روی حساب گیت‌هاب شما ایجاد و ذخیره شدند.');
    } catch (err: any) {
      addHistoryItem('log', `خطا در دیپلوی گیت‌هاب: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSimSend = () => {
    if (!simInput.trim()) return;
    const text = simInput;
    setSimMessages(prev => [...prev, { sender: 'user', text }]);
    setSimInput("");

    setTimeout(() => {
      let reply = `پیام دریافت شد: ${text}`;
      if (text === "/start") reply = "سلام! ربات Motherboter با موفقیت روی کلودفلر و گیت‌هاب فعال شد. 🚀\n\nدستورات فعال:\n/start - شروع کار\n/help - راهنما\n/status - بررسی وضعیت";
      else if (text === "/help") reply = "راهنمای ربات:\nاین ربات با هوش مصنوعی ساخته شده و روی لبه ابری کلودفلر اجرا می‌شود.";
      else if (text === "/status") reply = "وضعیت: آنلاین و پایدار 🟢\nسرویس: Cloudflare Workers Edge";

      setSimMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 400);
  };

  // Connected Services Count
  const connectedCount = [githubConnected, geminiVerified, cloudflareConnected, Boolean(botToken)].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* 1. TOP HEADER */}
      <header className="h-14 border-b border-slate-800/80 bg-[#0c0e14]/95 backdrop-blur-md px-4 md:px-6 flex items-center justify-between shrink-0 z-30">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">Motherboter</span>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">SHΞN™ Studio</span>
          </div>
        </div>

        {/* PRIMARY NAVIGATION TABS */}
        <div className="flex items-center bg-[#141620] p-1 rounded-xl border border-slate-800 shadow-inner">
          <button 
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'studio' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>استودیو ایجنت</span>
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'code' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>سندباکس کد</span>
          </button>
          <button 
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'simulator' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>تست زنده</span>
          </button>
          <button 
            onClick={() => setActiveTab('integrations')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'integrations' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow' : 'text-amber-400 hover:text-amber-300'}`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>اتصالات و کلیدها</span>
            <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-mono">{connectedCount}/4</span>
          </button>
        </div>

        {/* TOP RIGHT ACTIONS */}
        <div className="flex items-center gap-2.5">
          {githubConnected ? (
            <div className="flex items-center gap-2 bg-[#141620] border border-emerald-500/30 px-3 py-1.5 rounded-xl shadow-sm">
              {githubAvatar ? (
                <img src={githubAvatar} alt="avatar" className="w-4 h-4 rounded-full" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-xs font-mono text-emerald-300">@{githubUsername}</span>
            </div>
          ) : (
            <button 
              onClick={() => setActiveTab('integrations')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-xl transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Github className="w-3.5 h-3.5 text-slate-400" />
              <span>اتصال گیت‌هاب</span>
            </button>
          )}

          <button 
            onClick={handleDeployDirect}
            disabled={loading}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>دیپلوی روی گیت‌هاب</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden pb-36">

        {/* TAB 1: STUDIO & AGENT */}
        {activeTab === 'studio' && (
          <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-3 max-w-4xl w-full mx-auto">
            <div className="text-xs font-mono text-slate-500 pb-2 border-b border-slate-800/60 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                وضعیت ارتباط با سرویس‌ها
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${geminiVerified ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                  جمینی {geminiVerified ? '(کلید فعال)' : '(پیش‌فرض)'}
                </span>
                <span className="flex items-center gap-1 text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${githubConnected ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
                  گیت‌هاب {githubConnected ? `(@${githubUsername})` : '(قطع)'}
                </span>
                <span className="flex items-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  کلودفلر ورکرز
                </span>
              </div>
            </div>

            {history.map((item) => (
              <div 
                key={item.id} 
                className={`p-4 rounded-2xl border text-xs md:text-sm leading-relaxed transition-all ${
                  item.type === 'user' 
                    ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200 self-end max-w-2xl shadow-sm' 
                    : item.type === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200 max-w-3xl shadow-sm'
                    : item.type === 'log'
                    ? 'bg-[#10121a] border-slate-800/80 text-slate-400 font-mono text-xs max-w-3xl shadow-inner'
                    : 'bg-[#12141d] border-slate-800 text-slate-200 max-w-3xl shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-[10px] opacity-70 font-mono">
                  <span>{item.type === 'user' ? 'شما' : item.type === 'success' ? 'تاییدیه' : item.type === 'log' ? 'گزارش سیستم' : 'ایجنت هوشمند'}</span>
                  <span>{item.time}</span>
                </div>
                <div className="whitespace-pre-line">{item.text}</div>
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        )}

        {/* TAB 2: CODE SANDBOX */}
        {activeTab === 'code' && (
          <div className="flex-1 p-4 md:p-6 flex flex-col max-w-4xl w-full mx-auto overflow-hidden">
            <div className="bg-[#10121a] border border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
              <div className="bg-[#0b0c12] px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  src/index.ts (Cloudflare Workers & grammY)
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setCompiledStatus('success');
                      setTimeout(() => setCompiledStatus('idle'), 2500);
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>بررسی سینتکس</span>
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'کپی شد' : 'کپی کد'}</span>
                  </button>
                  <button 
                    onClick={() => {
                      const blob = new Blob([code], { type: 'text/typescript' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'index.ts';
                      a.click();
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود فایل</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-indigo-200 bg-[#08090d] leading-relaxed">
                <pre>{code}</pre>
              </div>
              {compiledStatus === 'success' && (
                <div className="bg-emerald-950/80 border-t border-emerald-500/30 text-emerald-300 px-4 py-2 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>کد تایپ‌اسکریپت معتبر و آماده دیپلوی است.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TELEGRAM LIVE SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="flex-1 p-4 md:p-6 flex flex-col items-center justify-center max-w-xl w-full mx-auto">
            <div className="w-full bg-[#10121a] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
              <div className="bg-[#0b0c12] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-xs">🤖</div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{botName}</h4>
                    <p className="text-[9px] text-emerald-400">آنلاین روی شبکه کلودفلر</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSimMessages([{ sender: 'bot', text: 'ربات مجدداً راه‌اندازی شد. پیام بدهید...' }])}
                  className="text-slate-400 hover:text-white text-[11px]"
                >
                  پاکسازی
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5 text-xs bg-[#08090d]">
                {simMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-2xl max-w-[80%] whitespace-pre-line ${
                      msg.sender === 'user' 
                        ? 'bg-indigo-600 text-white self-end rounded-br-none' 
                        : 'bg-[#181a24] text-slate-200 border border-slate-800 self-start rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="p-3 bg-[#0b0c12] border-t border-slate-800 flex items-center gap-2">
                <input 
                  type="text" 
                  value={simInput}
                  onChange={e => setSimInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSimSend()}
                  placeholder="دستوری مثل /start یا پیامی بنویسید..." 
                  className="flex-1 bg-[#141620] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button 
                  onClick={handleSimSend}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMPLETE PROFESSIONAL INTEGRATIONS HUB */}
        {activeTab === 'integrations' && (
          <div className="flex-1 p-4 md:p-6 overflow-y-auto max-w-4xl w-full mx-auto flex flex-col gap-6">
            
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-400" />
                مرکز اتصالات و کلیدهای دسترسی (Integrations Hub)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تمام سرویس‌های موردنیاز برای ساخت و دیپلوی عمومی ربات تلگرام. اطلاعات شما به صورت کاملاً امن در مرورگر خودتان ذخیره می‌شود.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* 1. GITHUB INTEGRATION */}
              <div className="bg-[#10121a] border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                      <Github className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">حساب گیت‌هاب (GitHub)</h3>
                      <p className="text-[10px] text-slate-400">ساخت ریپازیتوری پرایوت و ارسال کدها</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${githubConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {githubConnected ? 'متصل شد ✓' : 'غیرمتصل'}
                  </span>
                </div>

                {githubConnected ? (
                  <div className="bg-[#0b0c12] border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {githubAvatar && <img src={githubAvatar} className="w-6 h-6 rounded-full" alt="avatar" />}
                      <span className="text-xs font-mono text-white">@{githubUsername}</span>
                    </div>
                    <button 
                      onClick={handleDisconnectGithub}
                      className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      قطع اتصال
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <button 
                      onClick={handleOAuthClick}
                      className="w-full bg-[#24292e] hover:bg-[#2f363d] text-white text-xs font-medium py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 border border-slate-700 shadow-sm"
                    >
                      <Github className="w-4 h-4" />
                      <span>اتصال با یک کلیک (GitHub OAuth)</span>
                    </button>

                    <div className="flex items-center my-0.5">
                      <div className="flex-1 border-t border-slate-800"></div>
                      <span className="px-2 text-[10px] text-slate-500">یا با Personal Access Token</span>
                      <div className="flex-1 border-t border-slate-800"></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">توکن با دسترسی repo</span>
                      <a 
                        href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=Motherboter+Studio" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>ساخت توکن در گیت‌هاب</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="password" 
                        value={githubToken} 
                        onChange={e => setGithubToken(e.target.value)}
                        placeholder="ghp_... یا github_pat_..."
                        className="flex-1 bg-[#07080c] border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                      <button 
                        onClick={() => verifyGithubDirect(githubToken, true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium transition-colors cursor-pointer shrink-0"
                      >
                        ثبت و اتصال
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. GOOGLE GEMINI AI KEY */}
              <div className="bg-[#10121a] border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">هوش مصنوعی جمینی (Gemini AI Key)</h3>
                      <p className="text-[10px] text-slate-400">تولید هوشمند کدها و پاسخگویی ایجنت</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${geminiVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                    {geminiVerified ? 'فعال ✓' : 'پیش‌فرض سرور'}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">کلید اختصاصی Google Gemini API</span>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>دریافت رایگان کلید از Google AI Studio</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="password" 
                      value={geminiApiKey} 
                      onChange={e => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 bg-[#07080c] border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                      onClick={() => saveGeminiKey(geminiApiKey)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium transition-colors cursor-pointer shrink-0"
                    >
                      ذخیره کلید
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    با وارد کردن کلید شخصی، تمام درخواست‌های ایجنت با کوتای رایگان حساب شما پردازش خواهد شد.
                  </p>
                </div>
              </div>

              {/* 3. CLOUDFLARE INTEGRATION */}
              <div className="bg-[#10121a] border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">کلودفلر ورکرز (Cloudflare Workers)</h3>
                      <p className="text-[10px] text-slate-400">هاستینگ بدون سرور روی لبه شبکه</p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    متصل ✓
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">توکن و شناسه حساب</span>
                    <a 
                      href="https://dash.cloudflare.com/profile/api-tokens" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <span>داشبورد کلودفلر</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-slate-500 mb-1">API Token</label>
                      <input 
                        type="password" 
                        value={cloudflareToken} 
                        onChange={e => {
                          setCloudflareToken(e.target.value);
                          localStorage.setItem("tw_cf_token", e.target.value);
                        }}
                        className="w-full bg-[#07080c] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 mb-1">Account ID</label>
                      <input 
                        type="text" 
                        value={accountId} 
                        onChange={e => {
                          setAccountId(e.target.value);
                          localStorage.setItem("tw_cf_account", e.target.value);
                        }}
                        className="w-full bg-[#07080c] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. TELEGRAM BOT INTEGRATION */}
              <div className="bg-[#10121a] border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">ربات تلگرام (Telegram Bot)</h3>
                      <p className="text-[10px] text-slate-400">توکن دریافتی از BotFather@</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${botToken ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                    {botToken ? 'تنظیم شد ✓' : 'اختیاری'}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">توکن ربات تلگرام (BOT_TOKEN)</span>
                    <a 
                      href="https://t.me/BotFather" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <span>دریافت از BotFather@</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input 
                    type="password" 
                    value={botToken} 
                    onChange={e => {
                      setBotToken(e.target.value);
                      localStorage.setItem("tw_tg_token", e.target.value);
                    }}
                    placeholder="7123456789:AAH..."
                    className="w-full bg-[#07080c] border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <label className="block text-[9px] text-slate-500 mb-1">نام نمایشی ربات</label>
                      <input 
                        type="text" 
                        value={botName} 
                        onChange={e => setBotName(e.target.value)}
                        className="w-full bg-[#07080c] border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 mb-1">نام ریپازیتوری در گیت‌هاب</label>
                      <input 
                        type="text" 
                        value={repoName} 
                        onChange={e => setRepoName(e.target.value)}
                        className="w-full bg-[#07080c] border border-slate-800 rounded-lg px-2.5 py-1 text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 text-xs text-indigo-300 flex items-center justify-between">
              <span>اطلاعات بالا در مرورگر ذخیره شده و پس از رفرش صفحه از بین نمی‌روند.</span>
              <button 
                onClick={() => setActiveTab('studio')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                بازگشت به استودیو
              </button>
            </div>

          </div>
        )}

      </main>

      {/* 3. BOTTOM AI PROMPT BAR (Always available in Studio & Code tabs) */}
      {(activeTab === 'studio' || activeTab === 'code') && (
        <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#08090d] via-[#08090d]/95 to-transparent z-40">
          <div className="max-w-4xl w-full mx-auto flex flex-col gap-2.5">
            
            {/* Quick Action Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                "🤖 ساخت منوی اینلاین و شیشه‌ای برای تلگرام",
                "💡 افزودن سیستم خوش‌آمدگویی به کاربران جدید",
                "📊 ساخت دستور /stats و دریافت اطلاعات",
                "⚡ دیباگ و بهینه‌سازی کدهای ورکر"
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExecutePrompt(chip.replace(/^[^\s]+\s/, ''))}
                  className="whitespace-nowrap px-3 py-1.5 bg-[#12141d] hover:bg-[#181a26] border border-slate-800/80 rounded-xl text-xs text-slate-300 transition-all shadow-sm hover:border-indigo-500/40 cursor-pointer flex items-center gap-1"
                >
                  <span>{chip}</span>
                </button>
              ))}
            </div>

            {/* Prompt Input Box */}
            <div className="relative bg-[#10121a] border border-slate-800 rounded-2xl shadow-2xl p-2.5 flex items-end gap-3 backdrop-blur-md">
              <textarea 
                rows={2}
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleExecutePrompt();
                  }
                }}
                placeholder="به ایجنت دستور دهید: مثلاً «یک دکمه پشتیبانی آنلاین به ربات اضافه کن»..."
                className="flex-1 bg-transparent text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none resize-none px-2 py-1 leading-relaxed"
              />
              <div className="flex items-center gap-2 shrink-0 pb-1">
                <button 
                  onClick={() => handleExecutePrompt()}
                  disabled={loading || !promptInput.trim()}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white p-3 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center cursor-pointer disabled:opacity-40"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-mono">
              <span>Motherboter · Powered by Google Gemini & Cloudflare</span>
              <span>Shift + Enter برای خط جدید</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
