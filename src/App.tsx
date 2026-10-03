import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, Settings, Send, RefreshCw, Copy, Check, Download, 
  Terminal, Code, Play, CheckCircle2, AlertCircle, X, ExternalLink,
  ChevronDown, ChevronUp, Github, Sparkles, Cloud, ArrowUpRight
} from "lucide-react";

interface AgentBlock {
  type: 'terminal' | 'code' | 'simulator' | 'deploy';
  title?: string;
  command?: string;
  logs?: string[];
  filename?: string;
  code?: string;
  botName?: string;
  welcome?: string;
  repoName?: string;
  summary?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  time: string;
  blocks?: AgentBlock[];
}

const GITHUB_CLIENT_ID = "Ov23liRlVQJ53msMFK4d";

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      sender: 'agent',
      text: 'درود! من Motherboter هستم؛ ایجنت اختصاصی شما برای طراحی، برنامه‌نویسی و استقرار بدون سرور ربات‌های تلگرام روی لبه ابری Cloudflare Workers.\n\nمی‌خواهید چه رباتی برایتان بسازم؟ (مثلاً: ربات ارسال قیمت لحظه‌ای ارز، ربات فروشگاهی، ربات دانلودر، یا ربات پشتیبانی و ارتباط با ادمین)',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      blocks: [
        {
          type: 'terminal',
          title: 'راه‌اندازی محیط و پکیج‌ها',
          command: 'npx wrangler init motherbot-worker',
          logs: [
            'سیستم در حال آماده‌سازی فریم‌ورک grammY v1.35...',
            'پیکربندی هوش مصنوعی Google Gemini...',
            'محیط اجرا روی لبه کلودفلر آماده دریافت دستورات شماست ✓'
          ]
        }
      ]
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Active Bot Code in workspace
  const [activeCode, setActiveCode] = useState(`import { Bot, webhookCallback } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN || "");

bot.command("start", async (ctx) => {
  await ctx.reply("سلام! ربات تلگرام شما فعال شد.\\n\\nدستورات فعال:\\n/start - شروع\\n/help - راهنما");
});

bot.command("help", async (ctx) => {
  await ctx.reply("راهنما: این ربات روی Cloudflare Workers در حال اجراست.");
});

bot.on("message:text", async (ctx) => {
  await ctx.reply(\`پیام دریافت شد: \${ctx.message.text}\`);
});

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    return webhookCallback(bot, "cloudflare-pages")(request);
  },
};`);

  // Credentials
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("mb_gemini_key") || "");
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem("mb_gh_token") || "");
  const [githubUser, setGithubUser] = useState(() => localStorage.getItem("mb_gh_user") || "");
  const [cfToken, setCfToken] = useState(() => localStorage.getItem("mb_cf_token") || "cfat_UE80AKq3LeBNdFq1NedtZPKmry3u10C0oWHF8GkP682c91ea");
  const [cfAccount, setCfAccount] = useState(() => localStorage.getItem("mb_cf_acc") || "95db3c31158d3696452081a727e1104a");
  const [tgToken, setTgToken] = useState(() => localStorage.getItem("mb_tg_token") || "");
  const [repoName, setRepoName] = useState(() => localStorage.getItem("mb_repo_name") || "motherbot-worker");

  // Track deploying status per block
  const [deployStatus, setDeployStatus] = useState<{ [key: string]: 'idle' | 'deploying' | 'success' | 'error' }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle GitHub OAuth callback if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      addAgentMessage('کد تایید اتصال گیت‌هاب دریافت شد.');
    }
    if (githubToken && !githubUser) {
      fetch("https://api.github.com/user", {
        headers: { "Authorization": `Bearer ${githubToken.trim()}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(d => {
        if (d?.login) {
          setGithubUser(d.login);
          localStorage.setItem("mb_gh_user", d.login);
        }
      })
      .catch(() => {});
    }
  }, []);

  const addAgentMessage = (text: string, blocks?: AgentBlock[]) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), sender: 'agent', text, time, blocks }
    ]);
  };

  // Agent Communication (Client-Side Direct Gemini with Server Fallback)
  const handleSendMessage = async () => {
    const userPrompt = input.trim();
    if (!userPrompt || loading) return;

    setInput("");
    setLoading(true);

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), sender: 'user', text: userPrompt, time }
    ]);

    try {
      let resultData: { message: string; blocks?: AgentBlock[] };

      const systemPrompt = `You are Motherboter AI Agent, an autonomous Telegram Bot engineer and Cloudflare Workers specialist.
Communicate naturally in Persian.
When the user asks you to build, customize, or deploy a Telegram bot, respond with step-by-step guidance.
Generate production-ready grammY code, show realistic terminal operations, provide live testing, and offer deployment actions when appropriate.

Respond STRICTLY with valid JSON matching this schema:
{
  "message": "توضیح کوتاه، تمیز و حرفه‌ای به فارسی درباره اقدامات انجام شده",
  "blocks": [
    // Include blocks appropriate for this step:
    // { "type": "terminal", "title": "کامپایل و بیلد", "command": "npx wrangler deploy --dry-run", "logs": ["تحلیل ساختار هندلرها...", "تایید سینتکس تایپ‌اسکریپت ✓"] }
    // { "type": "code", "filename": "src/index.ts", "code": "/* کامل سورس کد grammY */" }
    // { "type": "simulator", "botName": "نام ربات", "welcome": "پیام استارت ربات در شبیه‌ساز" }
    // { "type": "deploy", "repoName": "motherbot-worker", "summary": "آماده استقرار روی مخزن گیت‌هاب و لبه کلودفلر" }
  ]
}`;

      // 1. Direct Call if user has entered their key (AQ... or AIza...)
      if (geminiKey.trim()) {
        const cleanKey = geminiKey.trim();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\nUser request: "${userPrompt}"\nCurrent Code:\n\`\`\`ts\n${activeCode}\n\`\`\``
              }]
            }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!res.ok) {
          const errBody = await res.json();
          throw new Error(errBody.error?.message || "خطا در برقراری ارتباط با مدل هوش مصنوعی");
        }

        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        resultData = JSON.parse(rawJson);
      } else {
        // Fallback to server endpoint
        const serverRes = await fetch("/api/generate-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userPrompt, currentCode: activeCode })
        });

        if (!serverRes.ok) {
          throw new Error("لطفاً کلید هوش مصنوعی را در تنظیمات ⚙️ وارد کنید.");
        }
        resultData = await serverRes.json();
      }

      // Update current code if a code block was returned
      if (resultData.blocks) {
        const codeBlock = resultData.blocks.find(b => b.type === 'code' && b.code);
        if (codeBlock?.code) {
          setActiveCode(codeBlock.code);
        }
      }

      addAgentMessage(resultData.message || "درخواست شما پردازش شد.", resultData.blocks);
    } catch (err: any) {
      addAgentMessage(`خطا: ${err.message}`, [
        {
          type: 'terminal',
          title: 'گزارش خطای سیستم',
          command: 'agent.handleError()',
          logs: [
            err.message,
            'می‌توانید کلید معتبر جمینی را از منوی تنظیمات ⚙️ ثبت کنید.'
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Perform GitHub & Cloudflare Deployment for a specific block
  const executeDeployBlock = async (blockId: string, customRepo?: string) => {
    if (!githubToken.trim()) {
      setSettingsOpen(true);
      return;
    }

    setDeployStatus(prev => ({ ...prev, [blockId]: 'deploying' }));

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

      const targetRepo = customRepo || repoName;

      await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: targetRepo, private: true, auto_init: true })
      });

      const commitFile = async (path: string, content: string) => {
        let sha: string | undefined;
        const check = await fetch(`https://api.github.com/repos/${username}/${targetRepo}/contents/${path}`, { headers });
        if (check.ok) {
          const info = await check.json();
          sha = info.sha;
        }
        await fetch(`https://api.github.com/repos/${username}/${targetRepo}/contents/${path}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            message: `chore: deploy ${path} via Motherboter Agent`,
            content: btoa(unescape(encodeURIComponent(content))),
            sha
          })
        });
      };

      await commitFile("src/index.ts", activeCode);
      await commitFile("wrangler.toml", `name = "${targetRepo}"\nmain = "src/index.ts"\ncompatibility_date = "2026-03-01"\n`);
      await commitFile("package.json", JSON.stringify({
        name: targetRepo,
        version: "1.0.0",
        private: true,
        dependencies: { grammy: "^1.35.0" }
      }, null, 2));

      setDeployStatus(prev => ({ ...prev, [blockId]: 'success' }));
      addAgentMessage(`پروژه با موفقیت روی گیت‌هاب مستقر شد:\nhttps://github.com/${username}/${targetRepo}`);
    } catch (err: any) {
      setDeployStatus(prev => ({ ...prev, [blockId]: 'error' }));
      addAgentMessage(`خطا در استقرار: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080b] text-slate-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* 1. MINIMAL HEADER */}
      <header className="h-12 border-b border-slate-800 bg-[#0b0c11] px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm text-white">Motherboter</span>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
            Agent
          </span>
        </div>

        <button 
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-lg bg-[#12141c] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          title="تنظیمات و کلیدها"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* 2. CHAT TIMELINE (EVERYTHING HAPPENS INLINE) */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-28 max-w-3xl w-full mx-auto flex flex-col gap-4">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex flex-col gap-2.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'} w-full`}
          >
            {/* Main Message Bubble */}
            <div 
              className={`p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed max-w-[92%] ${
                msg.sender === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-[#10121a] text-slate-100 border border-slate-800 rounded-bl-none shadow-sm'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>
              <div className="text-[10px] text-right mt-1 opacity-60 font-mono">{msg.time}</div>
            </div>

            {/* Dynamic Inline Blocks Rendered Right in Timeline */}
            {msg.blocks && msg.blocks.map((block, idx) => {
              const blockKey = `${msg.id}-${idx}`;

              // 1. INLINE TERMINAL
              if (block.type === 'terminal') {
                return (
                  <div key={idx} className="w-full bg-[#050608] border border-slate-800/90 rounded-xl overflow-hidden font-mono text-xs shadow-lg">
                    <div className="bg-[#0c0e14] px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                        <span className="ml-2 font-medium text-slate-300">{block.title || 'ترمینال'}</span>
                      </div>
                      {block.command && <span className="text-slate-500 text-[10px]">{block.command}</span>}
                    </div>
                    <div className="p-3 text-slate-300 flex flex-col gap-1 leading-relaxed bg-[#050608]">
                      {block.command && (
                        <div className="text-indigo-400 flex items-center gap-1 mb-1">
                          <span>$</span>
                          <span>{block.command}</span>
                        </div>
                      )}
                      {block.logs?.map((log, lIdx) => (
                        <div key={lIdx} className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <span className="text-emerald-400">›</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // 2. INLINE CODE EDITOR
              if (block.type === 'code' && block.code) {
                return (
                  <div key={idx} className="w-full bg-[#0b0c12] border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-lg">
                    <div className="bg-[#11131b] px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-indigo-300 text-[11px] flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-indigo-400" />
                        {block.filename || 'src/index.ts'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => navigator.clipboard.writeText(block.code || '')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>کپی سورس</span>
                        </button>
                        <button 
                          onClick={() => {
                            const blob = new Blob([block.code || ''], { type: 'text/typescript' });
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = block.filename || 'index.ts';
                            a.click();
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>دانلود</span>
                        </button>
                      </div>
                    </div>
                    <textarea 
                      value={block.code}
                      onChange={e => {
                        const newCode = e.target.value;
                        block.code = newCode;
                        setActiveCode(newCode);
                      }}
                      spellCheck={false}
                      className="w-full p-3 bg-transparent text-indigo-200 font-mono text-xs leading-relaxed resize-none focus:outline-none min-h-[160px] max-h-[300px]"
                    />
                  </div>
                );
              }

              // 3. INLINE TELEGRAM SIMULATOR
              if (block.type === 'simulator') {
                return <InlineSimulator key={idx} botName={block.botName} welcome={block.welcome} code={activeCode} />;
              }

              // 4. INLINE DEPLOY ACTION
              if (block.type === 'deploy') {
                const status = deployStatus[blockKey] || 'idle';
                return (
                  <div key={idx} className="w-full bg-[#10121a] border border-indigo-950/60 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        آماده استقرار خودکار پروژه
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{block.summary || 'ارسال کدها به ریپازیتوری پرایوت گیت‌هاب و فعال‌سازی در ورکرز'}</p>
                    </div>

                    <button 
                      onClick={() => executeDeployBlock(blockKey, block.repoName)}
                      disabled={status === 'deploying' || status === 'success'}
                      className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        status === 'success'
                          ? 'bg-emerald-600 text-white'
                          : status === 'deploying'
                          ? 'bg-indigo-700 text-white opacity-80'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                      }`}
                    >
                      {status === 'deploying' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>در حال ارسال...</span>
                        </>
                      ) : status === 'success' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>دیپلوی شد ✓</span>
                        </>
                      ) : (
                        <>
                          <Github className="w-3.5 h-3.5" />
                          <span>دیپلوی روی گیت‌هاب</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              }

              return null;
            })}

          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono bg-[#10121a] border border-slate-800/80 px-3 py-2 rounded-xl self-start">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>ایجنت در حال تحلیل، برنامه‌نویسی و ساخت محیط است...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 3. PROMPT INPUT BAR (Roomy, human placeholder) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#07080b]/95 border-t border-slate-800/80 backdrop-blur-md z-20">
        <div className="max-w-3xl w-full mx-auto flex items-center gap-2">
          <input 
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="مثلاً: یک ربات قیمت ارز با منوی دکمه‌ای بساز..."
            className="flex-1 bg-[#10121a] border border-slate-800 rounded-xl px-4 py-2.5 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button 
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-colors disabled:opacity-40 shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">ارسال</span>
          </button>
        </div>
      </div>

      {/* 4. SETTINGS MODAL */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
          <div className="bg-[#0f1118] border border-slate-800 rounded-2xl max-w-md w-full p-4 flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto text-xs">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white">تنظیمات و کلیدهای ارتباطی</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Gemini */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">کلید Gemini API</label>
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
                <label className="text-slate-300 font-medium">حساب گیت‌هاب</label>
                <a href="https://github.com/settings/tokens/new?scopes=repo,workflow" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline">
                  ساخت توکن
                </a>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={() => {
                    const redirectUri = window.location.origin + window.location.pathname;
                    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,workflow`;
                  }}
                  className="flex-1 bg-[#24292e] hover:bg-[#2f363d] text-white py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>اتصال یک‌کلیک (OAuth)</span>
                </button>
              </div>
              <input 
                type="password"
                value={githubToken}
                onChange={e => {
                  setGithubToken(e.target.value);
                  localStorage.setItem("mb_gh_token", e.target.value.trim());
                }}
                placeholder="یا وارد کردن Personal Access Token (ghp_...)"
                className="w-full bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            {/* Repo Name */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">نام ریپازیتوری در گیت‌هاب</label>
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
              ذخیره تنظیمات
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

// INLINE TELEGRAM SIMULATOR COMPONENT
function InlineSimulator({ botName, welcome, code }: { botName?: string; welcome?: string; code: string }) {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: welcome || 'سلام! شبیه‌ساز فعال شد. دستوری مثل /start یا پیامی ارسال کنید.' }
  ]);
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setText("");

    setTimeout(() => {
      let reply = `پاسخ ربات به: ${userMsg}`;
      if (userMsg === "/start") {
        reply = welcome || "سلام! ربات تلگرام فعال است.\nدستورات فعال:\n/start - شروع\n/help - راهنما";
      } else if (userMsg === "/help") {
        reply = "راهنما:\nاین ربات بر بستر کلودفلر ورکرز و فریم‌ورک grammY اجرا می‌شود.";
      }
      setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 250);
  };

  return (
    <div className="w-full bg-[#0b0c12] border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[320px] shadow-lg">
      <div className="bg-[#10121a] px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px]">🤖</div>
          <span className="font-bold text-white">{botName || 'شبیه‌ساز تلگرام'}</span>
        </div>
        <button 
          onClick={() => setMessages([{ sender: 'bot', text: welcome || 'شبیه‌ساز ری‌استارت شد.' }])}
          className="text-slate-400 hover:text-white text-[10px]"
        >
          پاکسازی
        </button>
      </div>

      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 text-xs bg-[#07080b]">
        {messages.map((m, i) => (
          <div 
            key={i}
            className={`p-2 rounded-xl max-w-[85%] whitespace-pre-line text-xs ${
              m.sender === 'user'
                ? 'bg-indigo-600 text-white self-end rounded-br-none'
                : 'bg-[#141620] text-slate-200 border border-slate-800 self-start rounded-bl-none'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="p-2 bg-[#10121a] border-t border-slate-800 flex items-center gap-1.5">
        <input 
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="تست دستور یا ارسال پیام..."
          className="flex-1 bg-[#141620] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
        />
        <button 
          onClick={handleSend}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
