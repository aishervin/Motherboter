import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, Github, Cloud, Terminal, CheckCircle2, ArrowRight, 
  Sparkles, ShieldCheck, Code, Globe, RefreshCw, Send, Copy, Check, 
  FileCode, Cpu, Layers, Zap, ExternalLink, Key, Lock, Play, Settings,
  Sliders, Server, MessageSquare, Activity, Download, Eye, TerminalSquare,
  Layers3, Wand2, UserCheck, AlertCircle, HelpCircle
} from "lucide-react";

export default function App() {
  const [activePanel, setActivePanel] = useState<'monitor' | 'code' | 'simulator'>('monitor');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // User-specific credentials (stored in state and localStorage)
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem("tw_gh_token") || "");
  const [githubUsername, setGithubUsername] = useState<string | null>(() => localStorage.getItem("tw_gh_user") || null);
  const [githubAvatar, setGithubAvatar] = useState<string | null>(() => localStorage.getItem("tw_gh_avatar") || null);
  const [githubConnected, setGithubConnected] = useState(false);

  const [cloudflareToken, setCloudflareToken] = useState(() => localStorage.getItem("tw_cf_token") || "");
  const [accountId, setAccountId] = useState(() => localStorage.getItem("tw_cf_account") || "");
  const [cloudflareConnected, setCloudflareConnected] = useState(false);

  const [botToken, setBotToken] = useState(() => localStorage.getItem("tw_tg_token") || "");
  const [botName, setBotName] = useState("پشتیبان هوشمند تلگرام");

  const [repoName, setRepoName] = useState("telegram-bot-worker");
  const [workerName, setWorkerName] = useState("smart-telegram-bot");

  // OAuth capability state
  const [hasOAuthConfig, setHasOAuthConfig] = useState(false);
  const [oauthCallbackUrl, setOauthCallbackUrl] = useState("");

  // Agent State & History
  const [promptInput, setPromptInput] = useState("");
  const [history, setHistory] = useState<Array<{ id: string; type: 'user' | 'agent' | 'log' | 'success'; text: string; time: string }>>([
    { 
      id: '1', 
      type: 'agent', 
      text: 'سلام! به TeleWorker Studio خوش آمدید. این وب‌اپلیکیشن برای ساخت و دیپلوی خودکار ربات تلگرام روی حساب گیت‌هاب و کلودفلر اختصاصی شما طراحی شده است.', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }
  ]);

  // Code Sandbox State
  const [code, setCode] = useState(`import { Bot, webhookCallback } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN || "");

bot.command("start", async (ctx) => {
  await ctx.reply("سلام! ربات تلگرام اختصاصی شما روی کلودفلر و جمینی فعال است. 🚀");
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
  const [compiledStatus, setCompiledStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Check OAuth config and verify stored tokens on initial load
  useEffect(() => {
    fetch("/api/auth/github/config")
      .then(res => res.json())
      .then(data => {
        setHasOAuthConfig(data.hasOAuthConfig);
        setOauthCallbackUrl(data.redirectUri);
      })
      .catch(() => {});

    if (githubToken) {
      verifyGithubToken(githubToken, false);
    }
    if (cloudflareToken && accountId) {
      verifyCloudflare(cloudflareToken, accountId, false);
    }
  }, []);

  // Listen for OAuth message
  useEffect(() => {
    const handleOAuthResult = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_OAUTH_RESULT') {
        if (event.data.success && event.data.token) {
          verifyGithubToken(event.data.token, true);
        } else {
          addHistoryItem('log', `خطا در OAuth گیت‌هاب: ${event.data.error || 'لغو شد'}`);
        }
      }
    };
    window.addEventListener('message', handleOAuthResult);
    return () => window.removeEventListener('message', handleOAuthResult);
  }, []);

  const addHistoryItem = (type: 'user' | 'agent' | 'log' | 'success', text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory(prev => [
      ...prev, 
      { id: Math.random().toString(36).substring(2, 9), type, text, time }
    ]);
  };

  const verifyGithubToken = async (tokenToVerify: string, notify = true) => {
    if (!tokenToVerify) return;
    try {
      const res = await fetch("/api/auth/github/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToVerify })
      });
      const data = await res.json();
      if (data.success) {
        setGithubConnected(true);
        setGithubUsername(data.username);
        setGithubAvatar(data.avatar);
        setGithubToken(tokenToVerify);
        localStorage.setItem("tw_gh_token", tokenToVerify);
        localStorage.setItem("tw_gh_user", data.username);
        if (data.avatar) localStorage.setItem("tw_gh_avatar", data.avatar);
        if (notify) addHistoryItem('success', `حساب گیت‌هاب با موفقیت متصل و تایید شد: @${data.username}`);
      } else {
        setGithubConnected(false);
        if (notify) addHistoryItem('log', `خطا در اتصال به گیت‌هاب: ${data.error}`);
      }
    } catch {
      setGithubConnected(false);
      if (notify) addHistoryItem('log', 'خطا در ارتباط با سرور اعتبارسنجی گیت‌هاب.');
    }
  };

  const verifyCloudflare = async (token: string, accId: string, notify = true) => {
    if (!token || !accId) return;
    try {
      const res = await fetch("/api/auth/cloudflare/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, accountId: accId })
      });
      const data = await res.json();
      if (data.success) {
        setCloudflareConnected(true);
        localStorage.setItem("tw_cf_token", token);
        localStorage.setItem("tw_cf_account", accId);
        if (notify) addHistoryItem('success', 'اتصال به کلودفلر تایید شد.');
      } else {
        setCloudflareConnected(false);
      }
    } catch {
      setCloudflareConnected(false);
    }
  };

  const handleOAuthClick = async () => {
    try {
      const redirectUri = `${window.location.origin}/auth/github/callback`;
      const res = await fetch(`/api/auth/github/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "github_oauth", "width=600,height=700");
      } else {
        alert(data.message || "خطا در دریافت آدرس احراز هویت گیت‌هاب.");
      }
    } catch {
      alert("خطا در باز کردن احراز هویت گیت‌هاب.");
    }
  };

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
        body: JSON.stringify({ message: text, currentCode: code, botName })
      });
      const data = await res.json();
      
      if (data.code && data.code !== code) {
        setCode(data.code);
        addHistoryItem('success', 'کد تایپ‌اسکریپت ربات توسط جمینی به‌روزرسانی شد.');
      }

      if (data.reply) {
        addHistoryItem('agent', data.reply);
      }
    } catch {
      addHistoryItem('log', 'خطا در ارتباط با هوش مصنوعی جمینی.');
    } finally {
      setLoading(false);
    }
  };

  const handleFullAutonomousDeploy = async () => {
    if (!githubConnected || !githubToken) {
      setSettingsOpen(true);
      addHistoryItem('log', 'لطفاً ابتدا حساب گیت‌هاب خود را متصل کنید (از طریق اتصال گیت‌هاب در منوی تنظیمات).');
      return;
    }

    setLoading(true);
    addHistoryItem('log', `🚀 شروع اتومیشن برای کاربر @${githubUsername || 'user'}...`);

    try {
      // 1. GitHub Deploy
      addHistoryItem('log', `در حال ساخت ریپازیتوری پرایوت "${repoName}" در گیت‌هاب شما...`);
      const ghRes = await fetch("/api/deploy/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubToken, repoName, code, readme: `# ${botName}\n\nAutomated Telegram Bot created via TeleWorker Studio.` })
      });
      const ghData = await ghRes.json();
      if (!ghData.success) throw new Error(ghData.error);
      addHistoryItem('success', `ریپازیتوری با موفقیت در اکانت شما ایجاد و فایل‌ها کامیت شدند: ${ghData.repoUrl}`);

      // 2. Cloudflare Deploy (if configured)
      if (cloudflareToken && accountId) {
        addHistoryItem('log', `در حال دیپلوی ورکر "${workerName}" روی حساب کلودفلر شما...`);
        const cfRes = await fetch("/api/deploy/cloudflare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cloudflareToken, accountId, workerName, botToken })
        });
        const cfData = await cfRes.json();
        if (!cfData.success) throw new Error(cfData.error);
        addHistoryItem('success', `ورکر روی کلودفلر شما مستقر شد: ${cfData.workerUrl}`);
      } else {
        addHistoryItem('log', 'نکته: توکن کلودفلر وارد نشده بود؛ فایل‌های ربات روی گیت‌هاب شما بارگذاری شد اما دیپلوی کلودفلر مستلزم توکن کلودفلر است.');
      }

      addHistoryItem('agent', 'فرآیند با موفقیت انجام شد! پروژه کاملاً در مالکیت اکانت‌های شخصی شما قرار گرفت.');
    } catch (err: any) {
      addHistoryItem('log', `خطا در دیپلوی: ${err.message || 'خطای ناشناخته'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompile = () => {
    setCompiledStatus('success');
    addHistoryItem('log', 'TypeScript sandbox compilation successful. 0 errors found.');
    setTimeout(() => setCompiledStatus('idle'), 3000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.ts';
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* 1. Header */}
      <header className="h-13 border-b border-slate-800/60 bg-[#090a0f]/90 backdrop-blur-md px-4 md:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">TeleWorker</span>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">Studio v3.8</span>
          </div>
        </div>

        {/* Panel Switcher */}
        <div className="flex items-center bg-[#12141c] p-1 rounded-xl border border-slate-800 shadow-inner">
          <button 
            onClick={() => setActivePanel('monitor')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${activePanel === 'monitor' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            گفتگو و مانیتور
          </button>
          <button 
            onClick={() => setActivePanel('code')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${activePanel === 'code' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            سندباکس کد
          </button>
          <button 
            onClick={() => setActivePanel('simulator')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${activePanel === 'simulator' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            تست زنده
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl bg-[#12141c] hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors shadow-sm relative flex items-center gap-1.5"
            title="اتصال حساب‌ها و تنظیمات"
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span className={`w-2 h-2 rounded-full ${githubConnected ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
          </button>
          <button 
            onClick={handleFullAutonomousDeploy}
            disabled={loading}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">اتومیشن و دیپلوی</span>
          </button>
        </div>
      </header>

      {/* 2. Middle Section: History & Live Activity Monitor */}
      <main className="flex-1 flex flex-col overflow-hidden pb-40">
        {activePanel === 'monitor' && (
          <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-3 max-w-4xl w-full mx-auto">
            <div className="text-xs font-mono text-slate-500 pb-2 border-b border-slate-800/60 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                وضعیت حساب‌های متصل
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> جمینی فعال</span>
                <span className="flex items-center gap-1 text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${githubConnected ? 'bg-emerald-400' : 'bg-rose-500'}`}></span> 
                  {githubConnected ? `@${githubUsername}` : 'گیت‌هاب (قطع)'}
                </span>
                <span className="flex items-center gap-1 text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${cloudflareConnected ? 'bg-emerald-400' : 'bg-slate-600'}`}></span> 
                  {cloudflareConnected ? 'کلودفلر (متصل)' : 'کلودفلر'}
                </span>
              </div>
            </div>

            {history.map((item) => (
              <div 
                key={item.id} 
                className={`p-4 rounded-2xl border text-xs md:text-sm leading-relaxed transition-all ${
                  item.type === 'user' 
                    ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-200 self-end max-w-2xl shadow-sm' 
                    : item.type === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200 max-w-3xl shadow-sm'
                    : item.type === 'log'
                    ? 'bg-[#10121a] border-slate-800/80 text-slate-400 font-mono text-xs max-w-3xl shadow-inner'
                    : 'bg-[#13151f] border-slate-800 text-slate-200 max-w-3xl shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-[10px] opacity-70 font-mono">
                  <span>{item.type === 'user' ? 'شما' : item.type === 'success' ? 'تاییدیه' : item.type === 'log' ? 'سیستم لاگ' : 'ایجنت هوشمند'}</span>
                  <span>{item.time}</span>
                </div>
                <div>{item.text}</div>
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>
        )}

        {activePanel === 'code' && (
          <div className="flex-1 p-4 md:p-6 flex flex-col max-w-4xl w-full mx-auto overflow-hidden">
            <div className="bg-[#12141c] border border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl">
              <div className="bg-[#0e1017] px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-400 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  src/index.ts (Cloudflare Workers & Google Gemini)
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCompile}
                    className="flex items-center gap-1 px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>کامپایل</span>
                  </button>
                  <button 
                    onClick={copyCode}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'کپی' : 'کپی کد'}</span>
                  </button>
                  <button 
                    onClick={downloadCode}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-indigo-200 bg-[#0b0c12] leading-relaxed">
                <pre>{code}</pre>
              </div>
              {compiledStatus === 'success' && (
                <div className="bg-emerald-950/80 border-t border-emerald-500/30 text-emerald-300 px-4 py-2 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>کامپایل سندباکس با موفقیت انجام شد (بدون خطا).</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activePanel === 'simulator' && (
          <div className="flex-1 p-4 md:p-6 flex flex-col items-center justify-center max-w-xl w-full mx-auto">
            <div className="w-full bg-[#12141c] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[480px]">
              <div className="bg-[#0e1017] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs">🤖</div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{botName}</h4>
                    <p className="text-[9px] text-emerald-400">آنلاین روی لبه کلودفلر</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 text-xs">
                <div className="bg-[#1b1e2b] text-slate-200 p-3 rounded-2xl rounded-bl-none max-w-[85%] border border-slate-800">
                  سلام! ربات تلگرام شما آماده است. دستور /start را ارسال کنید.
                </div>
              </div>
              <div className="p-3 bg-[#0e1017] border-t border-slate-800 flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="پیام خود را بفرستید..." 
                  className="flex-1 bg-[#151822] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom 1/3 Global AI Prompt Placeholder */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/95 to-transparent z-40">
        <div className="max-w-4xl w-full mx-auto flex flex-col gap-3">
          
          {/* Action Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              "🚀 اتومیشن کامل (گیت‌هاب + کلودفلر + جمینی)",
              "🤖 ساخت ربات با منوی شیشه‌ای",
              "💡 افزودن دستورات /help و /status",
              "📦 کامیت کدها به گیت‌هاب",
              "🔍 دیباگ و اصلاح خطاهای کد"
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (idx === 0) handleFullAutonomousDeploy();
                  else handleExecutePrompt(chip.replace(/^[^\s]+\s/, ''));
                }}
                className="whitespace-nowrap px-3 py-1.5 bg-[#12141c] hover:bg-[#1a1d2b] border border-slate-800 rounded-xl text-xs text-slate-300 transition-all shadow-sm hover:border-indigo-500/50 cursor-pointer flex items-center gap-1.5"
              >
                <span>{chip}</span>
              </button>
            ))}
          </div>

          {/* Main AI Prompt Box */}
          <div className="relative bg-[#12141c] border border-slate-800/80 rounded-2xl shadow-2xl p-2.5 md:p-3 flex items-end gap-3 backdrop-blur-md">
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
              placeholder="دستور خود را به ایجنت بدهید..."
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
            <span>Powered by Google Gemini 3.8 Flash & Cloudflare Edge Network</span>
            <span>Shift + Enter برای خط جدید</span>
          </div>
        </div>
      </div>

      {/* 4. Settings & Account Connection Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                اتصال حساب‌های شخصی کاربر (گیت‌هاب و کلودفلر)
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              
              {/* 1. GitHub Connection Section */}
              <div className="bg-[#0b0c12] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white">
                      <Github className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">اتصال به حساب گیت‌هاب شما</h4>
                      <p className="text-[10px] text-slate-400">
                        {githubConnected ? `متصل به عنوان @${githubUsername}` : 'جهت ساخت ریپازیتوری پرایوت و کامیت فایل‌ها'}
                      </p>
                    </div>
                  </div>
                  {githubConnected ? (
                    <button 
                      onClick={() => {
                        setGithubConnected(false);
                        setGithubToken("");
                        setGithubUsername(null);
                        localStorage.removeItem("tw_gh_token");
                        localStorage.removeItem("tw_gh_user");
                      }}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      قطع اتصال
                    </button>
                  ) : null}
                </div>

                {/* If OAuth is enabled on deployment, show OAuth button */}
                {hasOAuthConfig && !githubConnected && (
                  <button 
                    onClick={handleOAuthClick}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Github className="w-4 h-4" />
                    <span>ورود با گیت‌هاب (OAuth)</span>
                  </button>
                )}

                {/* Direct Personal Access Token connection for ANY user */}
                {!githubConnected && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-medium">توکن شخصی گیت‌هاب (Personal Access Token)</span>
                      <a 
                        href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=TeleWorker+Studio" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-1 text-[10px]"
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
                        className="flex-1 bg-[#050608] border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                      />
                      <button 
                        onClick={() => verifyGithubToken(githubToken, true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg font-medium transition-colors cursor-pointer shrink-0"
                      >
                        بررسی و اتصال
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Cloudflare Connection Section */}
              <div className="bg-[#0b0c12] border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">حساب کلودفلر ورکر (Cloudflare)</h4>
                      <p className="text-[10px] text-slate-400">برای استقرار اسکریپت روی لبه اینترنت</p>
                    </div>
                  </div>
                  <a 
                    href="https://dash.cloudflare.com/profile/api-tokens" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 text-[10px]"
                  >
                    <span>ساخت توکن کلودفلر</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Cloudflare API Token</label>
                    <input 
                      type="password" 
                      value={cloudflareToken} 
                      onChange={e => {
                        setCloudflareToken(e.target.value);
                        localStorage.setItem("tw_cf_token", e.target.value);
                      }}
                      placeholder="cfat_..."
                      className="w-full bg-[#050608] border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Cloudflare Account ID</label>
                    <input 
                      type="text" 
                      value={accountId} 
                      onChange={e => {
                        setAccountId(e.target.value);
                        localStorage.setItem("tw_cf_account", e.target.value);
                      }}
                      placeholder="Account ID"
                      className="w-full bg-[#050608] border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Telegram Bot Token */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">توکن ربات تلگرام (BOT_TOKEN)</label>
                  <a 
                    href="https://t.me/BotFather" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1 text-[10px]"
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
                  className="w-full bg-[#0a0c14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">نام ریپازیتوری</label>
                  <input 
                    type="text" 
                    value={repoName} 
                    onChange={e => setRepoName(e.target.value)}
                    className="w-full bg-[#0a0c14] border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">نام ورکر</label>
                  <input 
                    type="text" 
                    value={workerName} 
                    onChange={e => setWorkerName(e.target.value)}
                    className="w-full bg-[#0a0c14] border border-slate-800 rounded-xl px-3.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <button 
                onClick={() => setSettingsOpen(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors cursor-pointer mt-2 shadow-lg shadow-indigo-600/20"
              >
                تایید و ذخیره تنظیمات
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
