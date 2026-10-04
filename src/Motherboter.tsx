import { useEffect, useRef, useState } from "react";
import { Activity, AlertCircle, Bot, Check, ChevronDown, CircleHelp, Cloud, Database, FileCode2, Github, KeyRound, LoaderCircle, LockKeyhole, Paperclip, Plus, Send, Settings2, Shield, Sparkles, Terminal, X } from "lucide-react";
import "./Motherboter.css";

type Credentials = { gemini: string; accountId: string; telegram: string; custom: { name: string; value: string }[] };
type GitHubUser = { login: string; name: string | null; avatar_url: string };
type CloudflareAccount = { id: string; name: string; type?: string };
type Block = { type: "code" | "terminal" | "deploy" | "simulator"; title?: string; filename?: string; code?: string; command?: string; logs?: string[]; repoName?: string; summary?: string; botName?: string; welcome?: string };
type Message = { id: string; role: "user" | "assistant"; text: string; blocks?: Block[] };
const KEY = "motherboter.credentials.v1";
const MODEL = "gemini-3.8-flash";
const INITIAL_CODE = `import { Bot, webhookCallback } from "grammy";\n\ntype Env = { BOT_TOKEN: string };\n\nexport default {\n  async fetch(request: Request, env: Env): Promise<Response> {\n    if (!env.BOT_TOKEN) return new Response("BOT_TOKEN is not configured", { status: 500 });\n    const bot = new Bot(env.BOT_TOKEN);\n    bot.command("start", ctx => ctx.reply("سلام! ربات آمادهٔ خدمت است."));\n    bot.command("help", ctx => ctx.reply("راهنمای ربات"));\n    return webhookCallback(bot, "cloudflare-mod")(request);\n  },\n};`;
const emptyKeys: Credentials = { gemini: "", accountId: "", telegram: "", custom: [] };
const stages = ["نیازمندی", "مخزن GitHub", "تولید کد", "Cloudflare", "Webhook", "آمادهٔ اجرا"];

function loadKeys(): Credentials {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, unknown>;
    if ("github" in stored || "cloudflare" in stored) { delete stored.github; delete stored.cloudflare; localStorage.setItem(KEY, JSON.stringify(stored)); }
    return { ...emptyKeys, ...stored } as Credentials;
  } catch { return emptyKeys; }
}
function id() { return Math.random().toString(36).slice(2, 10); }

export default function Motherboter() {
  const [keys, setKeys] = useState<Credentials>(loadKeys);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [cloudflareAccounts, setCloudflareAccounts] = useState<CloudflareAccount[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [repoName, setRepoName] = useState(() => sessionStorage.getItem("motherboter.repoName") || "motherbot");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState<{ text: string; tone: string; time: string }[]>([{ text: "استودیو آماده است؛ توضیح ربات را بنویس.", tone: "info", time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);
  const [sourceName, setSourceName] = useState("");
  const [sourceContext, setSourceContext] = useState("");
  const [code, setCode] = useState(() => sessionStorage.getItem("motherboter.sourceCode") || INITIAL_CODE);
  const [testStatus, setTestStatus] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [thread, setThread] = useState<{ role: "user" | "model"; parts: { text: string }[] }[]>([]);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(keys)); }, [keys]);
  useEffect(() => { sessionStorage.setItem("motherboter.repoName", repoName); }, [repoName]);
  useEffect(() => { sessionStorage.setItem("motherboter.sourceCode", code); }, [code]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [logs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, loading]);

  const addLog = (text: string, tone = "info") => setLogs(items => [...items, { text, tone, time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);
  const updateKey = (field: keyof Credentials, value: string) => setKeys(current => ({ ...current, [field]: value }));
  useEffect(() => {
    let active = true;
    const status = new URLSearchParams(window.location.search).get("github");
    const cloudflareStatus = new URLSearchParams(window.location.search).get("cloudflare");
    if (status) {
      const messages: Record<string, string> = {
        connected: "ورود امن GitHub انجام شد.",
        denied: "اتصال GitHub لغو شد.",
        "state-error": "اعتبارسنجی OAuth ناموفق بود؛ دوباره تلاش کن.",
        "token-error": "GitHub نتوانست نشست OAuth بسازد.",
        "not-configured": "تنظیمات OAuth در Cloudflare کامل نشده است.",
      };
      addLog(messages[status] || "پاسخ OAuth دریافت شد.", status === "connected" ? "ok" : "warn");
    }
    if (cloudflareStatus) {
      const messages: Record<string, string> = {
        connected: "ورود امن Cloudflare انجام شد.",
        denied: "اتصال Cloudflare لغو شد.",
        "state-error": "اعتبارسنجی Cloudflare OAuth ناموفق بود.",
        "token-error": "Cloudflare نتوانست نشست OAuth بسازد.",
        "not-configured": "تنظیمات OAuth کلودفلر هنوز کامل نیست.",
      };
      addLog(messages[cloudflareStatus] || "پاسخ OAuth کلودفلر دریافت شد.", cloudflareStatus === "connected" ? "ok" : "warn");
    }
    if (status || cloudflareStatus) window.history.replaceState({}, "", window.location.pathname);
    void fetch("/api/github/session", { credentials: "same-origin" })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (!active || !data?.connected) return;
        setGithubUser(data.user);
        const pending = sessionStorage.getItem("motherboter.pendingRepo");
        if (pending) {
          sessionStorage.removeItem("motherboter.pendingRepo");
          const request = JSON.parse(pending) as { name?: string };
          if (request.name) void createRepository({ type: "code", repoName: request.name }, true);
        }
      })
      .catch(() => {});
    void fetch("/api/cloudflare/session", { credentials: "same-origin" })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active && data?.connected) setCloudflareAccounts(data.accounts || []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const apiMessage = (answer: string, blocks?: Block[]) => {
    setMessages(current => [...current, { id: id(), role: "assistant", text: answer, blocks }]);
    const found = blocks?.find(block => block.type === "code" && block.code);
    if (found?.code) { setCode(found.code); setStage(2); addLog(`کد ${found.filename || "src/index.ts"} از پاسخ Gemini آماده شد.`, "ok"); }
    if (blocks?.some(block => block.type === "deploy")) setStage(1);
  };

  async function askAgent(prompt: string) {
    if (!keys.gemini.trim()) { setSettingsOpen(true); addLog("کلید Gemini وارد نشده است.", "warn"); return; }
    setLoading(true); setStage(0); addLog("درخواست برای ایجنت Gemini ارسال شد.");
    const system = `You are Motherboter, a dedicated Telegram bot creation agent for Cloudflare Workers and GitHub. Reply in Persian. Ask only for missing project requirements. Be truthful: never claim an external action succeeded unless its tool/API returned success. Help plan a bot, generate complete grammY Cloudflare Worker code, diagnose errors, and propose explicit next steps. When code is requested, return a JSON object: {"message":"Persian response","blocks":[{"type":"code","filename":"src/index.ts","code":"complete source"},{"type":"terminal","title":"Validation","command":"...","logs":["..."]},{"type":"deploy","repoName":"...","summary":"..."}]}. Keep JSON valid and include only needed blocks. Current project code follows:\n${code}\n\nUser source, if attached:\n${sourceContext.slice(0, 50000)}`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(keys.gemini.trim())}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: [...thread, { role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.35, maxOutputTokens: 3500 } })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || `Google API ${response.status}`);
      const raw = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "{}";
      let parsed: { message?: string; blocks?: Block[] };
      try { parsed = JSON.parse(raw); } catch { parsed = { message: raw }; }
      const answer = parsed.message || "پاسخ ایجنت خالی بود.";
      apiMessage(answer, parsed.blocks);
       setThread(previous => [...previous, { role: "user" as const, parts: [{ text: prompt }] }, { role: "model" as const, parts: [{ text: answer }] }].slice(-20));
      addLog("پاسخ Gemini دریافت شد.", "ok");
    } catch (error) {
      const text = error instanceof Error ? error.message : "خطای ناشناخته";
      apiMessage(`اتصال به Gemini ناموفق بود: ${text}`);
      addLog(`Gemini: ${text}`, "error");
    } finally { setLoading(false); }
  }

  function sendMessage() {
    const prompt = input.trim(); if (!prompt || loading) return;
    setMessages(current => [...current, { id: id(), role: "user", text: prompt }]); setInput(""); void askAgent(prompt);
  }
  async function readSource(file?: File) {
    if (!file) return;
    if (file.size > 1024 * 1024) { addLog("فایل بیش از 1 مگابایت است؛ فایل کوچک‌تری انتخاب کن.", "warn"); return; }
    setSourceContext(await file.text()); setSourceName(file.name); addLog(`سورس ${file.name} برای بررسی اضافه شد.`, "ok");
  }

  async function testGitHub() {
    setTestStatus("در حال بررسی GitHub…");
    try {
      const response = await fetch("/api/github/session", { credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok || !result.connected) throw new Error(result.error || "ابتدا GitHub را وصل کن.");
      setGithubUser(result.user); setTestStatus(`GitHub متصل: @${result.user.login}`); addLog(`اتصال امن GitHub برای @${result.user.login} تأیید شد.`, "ok");
    } catch (error) { const text = error instanceof Error ? error.message : "خطا"; setTestStatus(`GitHub: ${text}`); addLog(`بررسی GitHub: ${text}`, "error"); }
  }
  async function testCloudflare() {
    setTestStatus("در حال بررسی Cloudflare…");
    try {
      const response = await fetch("/api/cloudflare/session", { credentials: "same-origin" });
      const result = await response.json();
      if (!response.ok || !result.connected) throw new Error(result.error || "ابتدا Cloudflare را وصل کن.");
      const accounts = result.accounts as CloudflareAccount[];
      setCloudflareAccounts(accounts);
      if (!keys.accountId && accounts[0]) updateKey("accountId", accounts[0].id);
      setTestStatus(`Cloudflare متصل: ${accounts.length} حساب`); addLog(`اتصال امن Cloudflare با ${accounts.length} حساب تأیید شد.`, "ok");
    } catch (error) { const text = error instanceof Error ? error.message : "خطا"; setTestStatus(`Cloudflare: ${text}`); addLog(`بررسی Cloudflare: ${text}`, "error"); }
  }
  async function testGemini() {
    if (!keys.gemini.trim()) { setTestStatus("اول کلید Gemini را وارد کن."); return; }
    setTestStatus("در حال بررسی Gemini…");
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(keys.gemini.trim())}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: "Reply only: connected" }] }] }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);
      setTestStatus("Gemini متصل است."); addLog("اتصال Gemini تأیید شد.", "ok");
    } catch (error) { const text = error instanceof Error ? error.message : "خطا"; setTestStatus(`Gemini: ${text}`); addLog(`بررسی Gemini شکست خورد: ${text}`, "error"); }
  }

  async function createRepository(block: Block, afterOAuth = false) {
    if (!githubUser && !afterOAuth) {
      sessionStorage.setItem("motherboter.pendingRepo", JSON.stringify({ name: repoName.trim() || block.repoName || "motherbot" }));
      addLog("پس از تأیید GitHub، ساخت مخزن ادامه پیدا می‌کند.", "info");
      connectGitHub();
      return;
    }
    const name = (repoName.trim() || block.repoName || "motherbot").replace(/[^a-zA-Z0-9._-]/g, "-");
    addLog(`ساخت مخزن خصوصی ${name}…`, "warn"); setStage(1);
    try {
      const files: Record<string, string> = {
        "src/index.ts": code,
        "wrangler.toml": `name = "${name}"\nmain = "src/index.ts"\ncompatibility_date = "2026-09-01"\n\n[observability]\nenabled = true\n`,
        "package.json": JSON.stringify({ name, private: true, version: "0.1.0", scripts: { deploy: "wrangler deploy" }, dependencies: { grammy: "^1.35.0" }, devDependencies: { wrangler: "^4.0.0", typescript: "^5.0.0" } }, null, 2),
        "README.md": `# ${name}\n\nTelegram bot generated with Motherboter.\n\n## Deploy\n\nInstall dependencies and run npm run deploy. Configure the required bot settings before publishing.\n`
      };
      const response = await fetch("/api/github/repos", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, files }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `GitHub API ${response.status}`);
      addLog(`مخزن خصوصی ${result.fullName} آماده شد.`, "ok");
      addLog(`${result.filesWritten} فایل در GitHub ثبت شد.`, "ok");
      setStage(2); setMessages(current => [...current, { id: id(), role: "assistant", text: `مخزن خصوصی ساخته و فایل‌های اولیه ثبت شد: ${result.repository}\n\nWorker و webhook هنوز deploy نشده‌اند.` }]);
    } catch (error) { const text = error instanceof Error ? error.message : "خطا"; addLog(text, "error"); setMessages(current => [...current, { id: id(), role: "assistant", text: `ساخت مخزن کامل نشد: ${text}` }]); }
  }

  async function disconnectGitHub() {
    await fetch("/auth/github/logout", { method: "POST", credentials: "same-origin" });
    setGithubUser(null); setTestStatus("اتصال GitHub قطع شد."); addLog("نشست GitHub از این مرورگر حذف شد.", "info");
  }

  async function disconnectCloudflare() {
    await fetch("/auth/cloudflare/logout", { method: "POST", credentials: "same-origin" });
    setCloudflareAccounts([]); setTestStatus("اتصال Cloudflare قطع شد."); addLog("نشست Cloudflare از این مرورگر حذف شد.", "info");
  }

  function addCustomKey() { if (!customName.trim() || !customValue.trim()) return; setKeys(current => ({ ...current, custom: [...current.custom, { name: customName.trim(), value: customValue.trim() }] })); setCustomName(""); setCustomValue(""); }
  const keyState = (key: keyof Credentials | "github" | "cloudflare") => key === "github" ? Boolean(githubUser) : key === "cloudflare" ? cloudflareAccounts.length > 0 : Boolean(keys[key]);
  const connectGitHub = () => { sessionStorage.setItem("motherboter.repoName", repoName); sessionStorage.setItem("motherboter.sourceCode", code); window.location.assign("/auth/github"); };
  const connectCloudflare = () => { sessionStorage.setItem("motherboter.repoName", repoName); sessionStorage.setItem("motherboter.sourceCode", code); window.location.assign("/auth/cloudflare"); };

  return <div className="mb-app" dir="rtl">
    <aside className="mb-side"><a className="mb-brand" href="#"><span className="mb-brand-mark">M</span><span><b>Motherboter</b><small>استودیوی ساخت ربات تلگرام</small></span></a>
      <button className="mb-new" onClick={() => { setMessages([]); setThread([]); setStage(0); setLogs([{ text: "پروژهٔ تازه آماده است.", tone: "info", time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]); }}>＋ <span>پروژهٔ تازه</span></button>
      <div className="mb-side-label">فضای کاری</div><div className="mb-nav active"><Bot size={15}/> ایجنت سازنده</div><button className="mb-nav" onClick={() => setSettingsOpen(true)}><KeyRound size={15}/> بانک کلیدها</button><button className="mb-nav" onClick={() => logRef.current?.scrollIntoView({ behavior: "smooth" })}><Terminal size={15}/> کنسول و لاگ‌ها</button>
      <div className="mb-side-label">پروژهٔ جاری</div><div className="mb-project"><i className="mb-dot"/>{repoName || "ربات جدید"}<span>پیش‌نویس</span></div>
      <div className="mb-side-keys"><div className="mb-side-label">وضعیت اتصال‌ها</div>{([["GitHub", "github"], ["Cloudflare", "cloudflare"], ["Gemini", "gemini"], ["Telegram", "telegram"]] as const).map(([name, key]) => <div className="mb-side-key" key={key}><span>{name}</span><small className={keyState(key) ? "is-ready" : "is-missing"}>{keyState(key) ? "● آماده" : "● نیاز به کلید"}</small></div>)}</div>
      <div className="mb-profile"><span>ش</span> فضای شخصی <small>کلاینت مرورگر</small></div>
    </aside>
    <main className="mb-main"><header className="mb-top"><div className="mb-crumb">فضای کاری <span>/</span><b>ساخت ربات تلگرام</b></div><div className="mb-top-actions"><span className="mb-model"><i/> Gemini 3.8 Flash <ChevronDown size={12}/></span><button className="mb-settings" onClick={() => setSettingsOpen(true)}><Settings2 size={15}/><span>اتصال‌ها</span></button></div></header>
      <div className="mb-scroll"><div className="mb-page"><section className="mb-welcome"><div><p>استودیوی تخصصی ربات‌های تلگرام</p><h1>ایده‌ات را به ربات زنده تبدیل کن.</h1><span>ایجنت نیازمندی را می‌فهمد، کد را آماده می‌کند و مرحله‌به‌مرحله پیش می‌رود.</span></div><div className="mb-orb"><img src="https://raw.githubusercontent.com/aishervin/Xrayng/main/app/src/main/ic_launcher-web.png" alt="Motherboter"/></div></section>
        <section className="mb-stages">{stages.map((name, index) => <div className={`mb-stage ${index < stage ? "done" : ""} ${index === stage ? "current" : ""}`} key={name}><i className="mb-diamond"/><span>{name}</span></div>)}</section>
        <div className="mb-grid"><div className="mb-left"><section className="mb-card mb-chat"><div className="mb-card-head"><div><Sparkles size={15}/><b>ایجنت سازنده</b></div><small>{loading ? "در حال پردازش" : "آمادهٔ گفتگو"} · {MODEL}</small></div>
          <div className="mb-messages">{messages.length === 0 && <article className="mb-message assistant"><span className="mb-ai-icon"><Bot size={15}/></span><div><b>سلام، من ایجنت Motherboter هستم.</b><p>بگو چه رباتی لازم داری. ابتدا سؤال‌های ضروری را می‌پرسم، بعد طرح و سورس کامل را برای تأییدت آماده می‌کنم. نتیجه و خطاها در کنسول ثبت می‌شود.</p><p>شروع کن: ربات چه کاری انجام دهد و چه نامی برای مخزنش می‌خواهی؟</p></div></article>}{messages.map(message => <article key={message.id} className={`mb-message ${message.role}`}><div className="mb-bubble">{message.text}{message.blocks?.map((block, index) => block.type === "code" && block.code ? <div className="mb-code" key={index}><div><FileCode2 size={13}/>{block.filename || "src/index.ts"}<button onClick={() => void navigator.clipboard.writeText(block.code || "")}>کپی کد</button></div><pre>{block.code}</pre><button className="mb-action" onClick={() => createRepository(block)}><Github size={14}/> ساخت مخزن خصوصی و ثبت فایل‌ها</button></div> : block.type === "terminal" ? <div className="mb-inline-log" key={index}>{block.title}: {block.logs?.join(" · ")}</div> : null)}</div></article>)}{loading && <div className="mb-thinking"><LoaderCircle size={14}/> ایجنت در حال تحلیل درخواست…</div>}<div ref={endRef}/></div>
          <div className="mb-compose-wrap"><div className="mb-compose"><textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="مثلاً: ربات پشتیبانی فارسی با ثبت گفتگوها در D1"/><div className="mb-compose-row"><div className="mb-tools"><label className="mb-tool" title="بارگذاری سورس"><Paperclip size={14}/><span>{sourceName || "سورس"}</span><input type="file" accept=".ts,.js,.json,.txt,.md" onChange={e => void readSource(e.target.files?.[0])}/></label><button className="mb-tool" onClick={() => setSettingsOpen(true)}><KeyRound size={14}/> کلیدها</button><button className="mb-tool" onClick={() => setInput(value => `${value}\nلطفاً قبل از هر عملیات تغییردهنده طرح را برای تأیید نشان بده.`)}><Plus size={14}/></button></div><button className="mb-enter" disabled={!input.trim() || loading} onClick={sendMessage}><span>{loading ? "در حال کار" : "ادامه"}</span><kbd>↵</kbd><Send size={13}/></button></div></div><small className="mb-hint">Enter برای ارسال · Shift+Enter برای خط جدید</small></div></section>
          <section className="mb-card mb-console"><header><div><i/><i/><i/></div><span><Terminal size={13}/> BUILD CONSOLE</span><button onClick={() => setLogs([])}>پاک‌کردن</button></header><div className="mb-logs" ref={logRef}>{logs.map((item, index) => <div className={`mb-log ${item.tone}`} key={`${index}-${item.text}`}><time>{item.time}</time><span>{item.tone === "error" ? "ERROR" : item.tone.toUpperCase()}</span>{item.text}</div>)}</div></section></div>
          <aside className="mb-right"><section className="mb-card mb-key-card"><header><b>بانک کلیدهای دسترسی</b><button onClick={() => setSettingsOpen(true)}>مدیریت ←</button></header>{([["GH", "GitHub", "github"], ["CF", "Cloudflare", "cloudflare"], ["G", "Gemini API", "gemini"], ["TG", "Telegram Bot", "telegram"]] as const).map(([icon, label, field]) => <div className="mb-key-row" key={field}><span><i>{icon}</i>{label}</span><small className={keyState(field) ? "is-ready" : "is-missing"}>{keyState(field) ? "آماده" : "تنظیم نشده"}</small></div>)}{keys.custom.map((key, index) => <div className="mb-key-row" key={`${key.name}-${index}`}><span><i>＋</i>{key.name}</span><small className="is-ready">آماده</small></div>)}</section>
            <section className="mb-card mb-repo"><header><b>مخزن خروجی</b><span><LockKeyhole size={11}/> خصوصی</span></header><label>نام دلخواه مخزن</label><input dir="ltr" value={repoName} onChange={e => setRepoName(e.target.value)} placeholder="my-telegram-bot"/><div className="mb-tags"><span><Cloud size={11}/> Worker</span><span><Database size={11}/> KV / D1</span><span><Activity size={11}/> Webhook</span></div><button className="mb-build" onClick={() => { setInput(value => value || `می‌خواهم یک ربات تلگرام جدید بسازم و نام مخزن آن ${repoName} باشد. ابتدا سؤال‌های لازم را بپرس و سپس سورس کامل را آماده کن.`); document.querySelector<HTMLTextAreaElement>(".mb-compose textarea")?.focus(); }}><Sparkles size={13}/> شروع ویزارد ساخت</button></section>
            <section className="mb-card mb-progress"><div className="mb-ring"><img src="https://raw.githubusercontent.com/aishervin/Xrayng/main/app/src/main/ic_launcher-web.png" alt=""/></div><div><b>{loading ? "ایجنت در حال پردازش" : "فرایند ساخت"}</b><small>{loading ? "در حال تحلیل و آماده‌سازی" : "آمادهٔ شروع"}</small><div className="mb-progress-line"><i style={{ width: `${Math.max(8, stage * 19)}%` }}/></div></div></section>
            <section className="mb-card mb-test"><header><b>بررسی اتصال</b><CircleHelp size={13}/></header><div>{testStatus || "کلیدها را اضافه کن و اتصال را بیازمای."}</div><div className="mb-test-buttons"><button onClick={testGitHub}><Github size={12}/> تست GitHub</button><button onClick={testCloudflare}><Cloud size={12}/> تست Cloudflare</button></div></section></aside>
        </div></div></div>
    </main>
    {settingsOpen && <div className="mb-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}><section className="mb-modal"><header><div><KeyRound size={16}/><b>بانک کلیدها و اتصال سرویس‌ها</b></div><button onClick={() => setSettingsOpen(false)} aria-label="بستن"><X size={17}/></button></header><p>کلیدهای دیگر محلی‌اند؛ نشست GitHub با OAuth و به‌صورت رمزگذاری‌شده روی سرور نگه‌داری می‌شود.</p>
      <Credential label="Gemini API Key" value={keys.gemini} onChange={value => updateKey("gemini", value)} href="https://aistudio.google.com/app/apikey" hint="دریافت کلید ↗"/>
       <div className="mb-github-auth">{githubUser ? <div className="mb-github-connected"><img src={githubUser.avatar_url} alt=""/><span>متصل به <b dir="ltr">@{githubUser.login}</b></span><button onClick={() => void disconnectGitHub()}>خروج</button></div> : <button className="mb-github-connect" onClick={connectGitHub}><Github size={15}/> اتصال امن با GitHub</button>}<small>توکن در مرورگر نمایش داده نمی‌شود؛ خروج، نشست همین مرورگر را پاک می‌کند.</small></div>
       <div className="mb-github-auth">{cloudflareAccounts.length ? <><div className="mb-github-connected"><Cloud size={16}/><span>اتصال امن Cloudflare</span><button onClick={() => void disconnectCloudflare()}>خروج</button></div><label className="mb-credential"><span>حساب Cloudflare</span><select value={keys.accountId} onChange={event => updateKey("accountId", event.target.value)}>{cloudflareAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></> : <button className="mb-github-connect" onClick={connectCloudflare}><Cloud size={15}/> اتصال امن با Cloudflare</button>}<small>دسترسی‌ها را در صفحهٔ مجوز Cloudflare مرور و تأیید می‌کنی.</small></div>
      <Credential label="Cloudflare Account ID" value={keys.accountId} onChange={value => updateKey("accountId", value)} hint="از داشبورد Cloudflare"/>
      <Credential label="Telegram Bot Token · BotFather" value={keys.telegram} onChange={value => updateKey("telegram", value)} href="https://t.me/BotFather" hint="بازکردن BotFather ↗"/>
      <div className="mb-custom"><div className="mb-modal-label">کلید سرویس دلخواه</div><div><input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="نام سرویس"/><input value={customValue} onChange={e => setCustomValue(e.target.value)} placeholder="API key" type="password"/><button onClick={addCustomKey}><Plus size={13}/></button></div></div>
      <div className="mb-modal-foot"><span><Shield size={13}/> مدل: {MODEL}</span><button onClick={testGemini}><Activity size={13}/> تست Gemini</button><button className="mb-save" onClick={() => setSettingsOpen(false)}><Check size={13}/> ذخیره و بستن</button></div>
      {testStatus && <div className="mb-test-status"><AlertCircle size={13}/>{testStatus}</div>}
    </section></div>}
  </div>;
}

function Credential({ label, value, onChange, href, hint }: { label: string; value: string; onChange: (value: string) => void; href?: string; hint: string }) {
  return <label className="mb-credential"><span>{label}</span>{href ? <a href={href} target="_blank" rel="noreferrer">{hint}</a> : <small>{hint}</small>}<input type="password" dir="ltr" autoComplete="off" value={value} onChange={e => onChange(e.target.value)} placeholder="برای خالی‌گذاشتن، فیلد را پاک کن"/></label>;
}
