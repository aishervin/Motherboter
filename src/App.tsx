import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, Settings, Send, RefreshCw, Copy, Check, Download, 
  Terminal, Code, Play, CheckCircle2, X, Github, Sparkles, Cloud
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

const DEFAULT_CLIENT_ID = "Ov23liRlVQJ53msMFK4d";

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Active workspace code
  const [activeCode, setActiveCode] = useState(`import { Bot, webhookCallback } from "grammy";

const bot = new Bot(process.env.BOT_TOKEN || "");

bot.command("start", async (ctx) => {
  await ctx.reply("سلام! ربات تلگرام فعال است.\\n/start - شروع\\n/help - راهنما");
});

bot.command("help", async (ctx) => {
  await ctx.reply("راهنما: این ربات روی Cloudflare Workers مستقر شده است.");
});

bot.on("message:text", async (ctx) => {
  await ctx.reply(\`پیام شما: \${ctx.message.text}\`);
});

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    return webhookCallback(bot, "cloudflare-pages")(request);
  },
};`);

  // Credentials
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("mb_gemini_key") || "");
  const [githubClientId, setGithubClientId] = useState(() => localStorage.getItem("mb_gh_client_id") || DEFAULT_CLIENT_ID);
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem("mb_gh_token") || "");
  const [githubUser, setGithubUser] = useState(() => localStorage.getItem("mb_gh_user") || "");
  const [cfToken, setCfToken] = useState(() => localStorage.getItem("mb_cf_token") || "cfat_UE80AKq3LeBNdFq1NedtZPKmry3u10C0oWHF8GkP682c91ea");
  const [cfAccount, setCfAccount] = useState(() => localStorage.getItem("mb_cf_acc") || "95db3c31158d3696452081a727e1104a");
  const [tgToken, setTgToken] = useState(() => localStorage.getItem("mb_tg_token") || "");

  // Deploying state tracking
  const [deployStatus, setDeployStatus] = useState<{ [key: string]: 'idle' | 'deploying' | 'success' | 'error' }>({});
  const [deployRepoNames, setDeployRepoNames] = useState<{ [key: string]: string }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle GitHub OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('code')) {
      window.history.replaceState({}, document.title, window.location.pathname);
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

  // Direct AI Call
  const handleSendMessage = async () => {
    const userPrompt = input.trim();
    if (!userPrompt || loading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), sender: 'user', text: userPrompt, time }
    ]);

    try {
      let resultData: { message: string; blocks?: AgentBlock[] };

      const systemPrompt = `You are Motherboter AI Agent, an autonomous Telegram Bot engineer using 'grammY' framework on Cloudflare Workers.
Communicate naturally and concisely in Persian.
Respond STRICTLY with valid JSON:
{
  "message": "پاسخ کوتاه و مرتبط به فارسی",
  "blocks": [
    // { "type": "terminal", "title": "بیلد و بررسی", "command": "npx wrangler check", "logs": ["کامپایل موفق ✓"] }
    // { "type": "code", "filename": "src/index.ts", "code": "/* سورس کد کامل تایپ‌اسکریپت */" }
    // { "type": "simulator", "botName": "نام ربات", "welcome": "پیام استارت ربات در شبیه‌ساز" }
    // { "type": "deploy", "repoName": "motherbot-worker", "summary": "آماده استقرار روی مخزن گیت‌هاب" }
  ]
}`;

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
          throw new Error(errBody.error?.message || "خطا در هوش مصنوعی");
        }

        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        resultData = JSON.parse(rawJson);
      } else {
        const serverRes = await fetch("/api/generate-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userPrompt, currentCode: activeCode })
        });

        if (!serverRes.ok) {
          throw new Error("لطفاً کلید جمینی را در تنظیمات ⚙️ وارد کنید.");
        }
        resultData = await serverRes.json();
      }

      if (resultData.blocks) {
        const codeBlock = resultData.blocks.find(b => b.type === 'code' && b.code);
        if (codeBlock?.code) {
          setActiveCode(codeBlock.code);
        }
      }

      addAgentMessage(resultData.message || "انجام شد.", resultData.blocks);
    } catch (err: any) {
      addAgentMessage(`خطا: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Deploy to GitHub
  const executeDeployBlock = async (blockKey: string, customRepo?: string) => {
    if (!githubToken.trim()) {
      setSettingsOpen(true);
      return;
    }

    const finalRepoName = (deployRepoNames[blockKey] || customRepo || "motherbot-worker").trim();
    setDeployStatus(prev => ({ ...prev, [blockKey]: 'deploying' }));

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
        body: JSON.stringify({ name: finalRepoName, private: true, auto_init: true })
      });

      const commitFile = async (path: string, content: string) => {
        let sha: string | undefined;
        const check = await fetch(`https://api.github.com/repos/${username}/${finalRepoName}/contents/${path}`, { headers });
        if (check.ok) {
          const info = await check.json();
          sha = info.sha;
        }
        await fetch(`https://api.github.com/repos/${username}/${finalRepoName}/contents/${path}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            message: `chore: deploy ${path}`,
            content: btoa(unescape(encodeURIComponent(content))),
            sha
          })
        });
      };

      await commitFile("src/index.ts", activeCode);
      await commitFile("wrangler.toml", `name = "${finalRepoName}"\nmain = "src/index.ts"\ncompatibility_date = "2026-03-01"\n`);
      await commitFile("package.json", JSON.stringify({
        name: finalRepoName,
        version: "1.0.0",
        private: true,
        dependencies: { grammy: "^1.35.0" }
      }, null, 2));

      setDeployStatus(prev => ({ ...prev, [blockKey]: 'success' }));
      addAgentMessage(`پروژه با موفقیت دیپلوی شد:\nhttps://github.com/${username}/${finalRepoName}`);
    } catch (err: any) {
      setDeployStatus(prev => ({ ...prev, [blockKey]: 'error' }));
      addAgentMessage(`خطا در دیپلوی: ${err.message}`);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#07080b] text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* 1. MINIMAL HEADER */}
      <header className="h-12 border-b border-slate-800 bg-[#0b0c11] px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-sm text-white">Motherboter</span>
        </div>

        <button 
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-lg bg-[#12141c] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          title="تنظیمات و کلیدها"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* 2. CHAT TIMELINE */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-36 max-w-3xl w-full mx-auto flex flex-col gap-4">
        
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center my-auto py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow-inner">
              <Bot className="w-6 h-6" />
            </div>
            <h2 className="text-base md:text-lg font-bold text-white mb-1.5">چه رباتی می‌خواهید بسازید؟</h2>
            <p className="text-xs text-slate-400 max-w-xs">ایده خود را بنویسید تا کد ربات تولید، تست و مستقر شود.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex flex-col gap-2.5 ${msg.sender === 'user' ? 'items-start' : 'items-end'} w-full`}
            >
              {/* Message Bubble */}
              <div 
                className={`p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed max-w-[92%] ${
                  msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-[#10121a] text-slate-100 border border-slate-800 rounded-tl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-line text-right">{msg.text}</div>
                <div className="text-[10px] text-left mt-1 opacity-60 font-mono" dir="ltr">{msg.time}</div>
              </div>

              {/* Dynamic Inline Blocks */}
              {msg.blocks && msg.blocks.map((block, idx) => {
                const blockKey = `${msg.id}-${idx}`;

                // 1. INLINE TERMINAL
                if (block.type === 'terminal') {
                  return (
                    <div key={idx} dir="ltr" className="w-full bg-[#050608] border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-lg">
                      <div className="bg-[#0c0e14] px-3 py-1.5 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span className="ml-2 font-medium text-slate-300">{block.title || 'Terminal'}</span>
                        </div>
                        {block.command && <span className="text-slate-500 text-[10px]">{block.command}</span>}
                      </div>
                      <div className="p-3 text-slate-300 flex flex-col gap-1 leading-relaxed">
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
                    <div key={idx} dir="ltr" className="w-full bg-[#0b0c12] border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-lg">
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
                            <span>Copy</span>
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
                            <span>Download</span>
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
                  const currentRepoInput = deployRepoNames[blockKey] !== undefined ? deployRepoNames[blockKey] : (block.repoName || 'motherbot-worker');

                  return (
                    <div key={idx} className="w-full bg-[#10121a] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            آماده استقرار و دیپلوی
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">{block.summary || 'ایجاد ریپازیتوری در گیت‌هاب و فعال‌سازی در ورکرز'}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-slate-800/60">
                        <div className="flex-1 flex items-center bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs">
                          <span className="text-slate-400 text-[11px] shrink-0 ml-2">نام مخزن گیت‌هاب:</span>
                          <input 
                            type="text"
                            dir="ltr"
                            value={currentRepoInput}
                            onChange={e => setDeployRepoNames(prev => ({ ...prev, [blockKey]: e.target.value }))}
                            placeholder="motherbot-worker"
                            className="bg-transparent text-white font-mono text-xs flex-1 focus:outline-none"
                          />
                        </div>

                        <button 
                          onClick={() => executeDeployBlock(blockKey, currentRepoInput)}
                          disabled={status === 'deploying' || status === 'success'}
                          className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
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
                              <span>تایید و ساخت مخزن</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }

                return null;
              })}

            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 bg-[#10121a] border border-slate-800 px-3 py-2 rounded-xl self-start">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>در حال پردازش...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 3. PROMPT INPUT BAR (Send button on the OPPOSITE side, Enter key adds new line!) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[#07080b]/95 border-t border-slate-800 backdrop-blur-md z-20">
        <div className="max-w-3xl w-full mx-auto relative flex items-end">
          
          {/* Send Button on the OPPOSITE side (Right side!) */}
          <button 
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="absolute right-2.5 bottom-2.5 bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-30 flex items-center justify-center cursor-pointer shadow z-10"
            title="ارسال درخواست"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>

          {/* Multiline textarea: Enter adds a newline! Only button or Ctrl+Enter sends! */}
          <textarea 
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSendMessage();
              }
              // Normal Enter just adds a new line naturally!
            }}
            placeholder="ایده ربات خود را بنویسید... (اینتر برای خط بعد، کلیک برای ارسال)"
            className="w-full bg-[#10121a] border border-slate-800 rounded-2xl pr-12 pl-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none min-h-[46px] max-h-[140px] leading-relaxed"
          />

        </div>
      </div>

      {/* 4. SETTINGS MODAL */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3">
          <div className="bg-[#0f1118] border border-slate-800 rounded-2xl max-w-md w-full p-4 flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto text-xs">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white">تنظیمات و کلیدهای ارتباطی</h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Gemini */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">کلید Gemini API</label>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline">
                  دریافت کلید
                </a>
              </div>
              <input 
                type="password"
                dir="ltr"
                value={geminiKey}
                onChange={e => {
                  setGeminiKey(e.target.value);
                  localStorage.setItem("mb_gemini_key", e.target.value.trim());
                }}
                placeholder="AQ... یا AIza..."
                className="w-full bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            {/* 2. GitHub */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">حساب گیت‌هاب</label>
                <a href="https://github.com/settings/tokens/new?scopes=repo,workflow" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline">
                  ساخت Personal Token
                </a>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={() => {
                    const cleanClientId = (githubClientId || DEFAULT_CLIENT_ID).trim();
                    // Omit redirect_uri parameter so GitHub redirects automatically to the exact registered callback URL without any mismatch warning!
                    window.location.href = `https://github.com/login/oauth/authorize?client_id=${cleanClientId}&scope=repo,workflow`;
                  }}
                  className="flex-1 bg-[#24292e] hover:bg-[#2f363d] text-white py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>ورود با گیت‌هاب (OAuth)</span>
                </button>
              </div>

              <div className="mb-2">
                <span className="text-[10px] text-slate-500 block mb-0.5">OAuth Client ID (اختیاری اگر اپ اختصاصی دارید):</span>
                <input 
                  type="text"
                  dir="ltr"
                  value={githubClientId}
                  onChange={e => {
                    setGithubClientId(e.target.value);
                    localStorage.setItem("mb_gh_client_id", e.target.value.trim());
                  }}
                  placeholder={DEFAULT_CLIENT_ID}
                  className="w-full bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-0.5">یا توکن شخصی (Personal Access Token - مستقیم و بدون خطا):</span>
                <input 
                  type="password"
                  dir="ltr"
                  value={githubToken}
                  onChange={e => {
                    setGithubToken(e.target.value);
                    localStorage.setItem("mb_gh_token", e.target.value.trim());
                  }}
                  placeholder="ghp_..."
                  className="w-full bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Cloudflare */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-amber-400" />
                  حساب کلودفلر (Cloudflare Workers)
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Cloudflare API Token</span>
                  <input 
                    type="password"
                    dir="ltr"
                    value={cfToken}
                    onChange={e => {
                      setCfToken(e.target.value);
                      localStorage.setItem("mb_cf_token", e.target.value.trim());
                    }}
                    placeholder="cfat_..."
                    className="w-full bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">Account ID</span>
                  <input 
                    type="text"
                    dir="ltr"
                    value={cfAccount}
                    onChange={e => {
                      setCfAccount(e.target.value);
                      localStorage.setItem("mb_cf_acc", e.target.value.trim());
                    }}
                    placeholder="95db3c3..."
                    className="w-full bg-[#08090e] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Telegram Bot Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">توکن ربات تلگرام (اختیاری)</label>
                <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline">
                  BotFather@
                </a>
              </div>
              <input 
                type="password"
                dir="ltr"
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
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-xl text-xs transition-colors mt-2 cursor-pointer"
            >
              ذخیره
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

// INLINE SIMULATOR
function InlineSimulator({ botName, welcome, code }: { botName?: string; welcome?: string; code: string }) {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: welcome || 'سلام! شبیه‌ساز آماده است. دستور /start را بفرستید.' }
  ]);
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setText("");

    setTimeout(() => {
      let reply = `پاسخ به: ${userMsg}`;
      if (userMsg === "/start") {
        reply = welcome || "سلام! ربات تلگرام فعال شد.\n/start - شروع\n/help - راهنما";
      } else if (userMsg === "/help") {
        reply = "راهنما:\nاین ربات روی کلودفلر ورکرز با grammY اجرا می‌شود.";
      }
      setMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 250);
  };

  return (
    <div className="w-full bg-[#0b0c12] border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[300px] shadow-lg">
      <div className="bg-[#10121a] px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px]">🤖</div>
          <span className="font-bold text-white">{botName || 'شبیه‌ساز تلگرام'}</span>
        </div>
        <button 
          onClick={() => setMessages([{ sender: 'bot', text: welcome || 'شبیه‌ساز ری‌استارت شد.' }])}
          className="text-slate-400 hover:text-white text-[10px] cursor-pointer"
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
                ? 'bg-indigo-600 text-white self-start rounded-tr-none'
                : 'bg-[#141620] text-slate-200 border border-slate-800 self-end rounded-tl-none'
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
          placeholder="ارسال پیام یا دستور..."
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
