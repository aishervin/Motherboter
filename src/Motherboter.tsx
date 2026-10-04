import { useEffect, useRef, useState } from "react";
import { Activity, AlertCircle, Bot, Check, Cloud, Copy, ExternalLink, FileCode2, FileText, Github, KeyRound, LoaderCircle, LockKeyhole, Paperclip, Plus, Send, Settings2, Shield, Sparkles, Terminal, X } from "lucide-react";
import "./Motherboter.css";
import "./AgentWorkspace.css";

type Credentials = { gemini: string; accountId: string; telegram: string; custom: { name: string; value: string }[] };
type GitHubUser = { login: string; name: string | null; avatar_url: string };
type CloudflareAccount = { id: string; name: string; type?: string };
type Block = { type: "code" | "terminal" | "deploy" | "simulator"; title?: string; filename?: string; code?: string; command?: string; logs?: string[]; repoName?: string; summary?: string; botName?: string; welcome?: string };
type Attachment = { name: string; mimeType: string; data?: string; previewUrl?: string; text?: string };
type GeminiPart = { text?: string; inline_data?: { mime_type: string; data: string } };
type GeminiTurn = { role: "user" | "model"; parts: GeminiPart[] };
type Message = { id: string; role: "user" | "assistant"; text: string; blocks?: Block[]; attachment?: Pick<Attachment, "name" | "mimeType" | "previewUrl" | "text"> };
const KEY = "motherboter.credentials.v1";
const MODEL = "gemini-3.8-flash";
const MODEL_OPTIONS = [{ id: "gemini-3.8-flash", label: "Gemini 3.8 Flash" }, { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }];
const CLOUDFLARE_TOKEN_URL = "https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=%5B%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&accountId=*&zoneId=all&name=Motherboter%20Cloudflare%20Connection";
const INITIAL_CODE = `import { Bot, webhookCallback } from "grammy";\n\ntype Env = { BOT_TOKEN: string };\n\nexport default {\n  async fetch(request: Request, env: Env): Promise<Response> {\n    if (!env.BOT_TOKEN) return new Response("BOT_TOKEN is not configured", { status: 500 });\n    const bot = new Bot(env.BOT_TOKEN);\n    bot.command("start", ctx => ctx.reply("سلام! ربات آمادهٔ خدمت است."));\n    bot.command("help", ctx => ctx.reply("راهنمای ربات"));\n    return webhookCallback(bot, "cloudflare-mod")(request);\n  },\n};`;
const emptyKeys: Credentials = { gemini: "", accountId: "", telegram: "", custom: [] };
const cloudflareErrors: Record<string, string> = {
  token_required: "توکن API را وارد کن.",
  session_not_configured: "اتصال امن سمت سرور هنوز آماده نیست.",
  cloudflare_token_invalid_or_permission_missing: "توکن معتبر نیست یا مجوز Account Settings: Read را ندارد.",
  cloudflare_no_accounts: "هیچ حساب Cloudflare برای این توکن پیدا نشد؛ محدودهٔ دسترسی توکن را بررسی کن.",
  cloudflare_connection_failed: "Cloudflare اتصال را تأیید نکرد. توکن و مجوز آن را بررسی کن.",
};

function cloudflareErrorMessage(code?: string) { return cloudflareErrors[code || ""] || "اتصال Cloudflare ناموفق بود."; }

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
  const [cloudflareConnectOpen, setCloudflareConnectOpen] = useState(false);
  const [cloudflareToken, setCloudflareToken] = useState("");
  const [cloudflareConnecting, setCloudflareConnecting] = useState(false);
  const [cloudflareConnectError, setCloudflareConnectError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customValue, setCustomValue] = useState("");
  const [repoName, setRepoName] = useState(() => sessionStorage.getItem("motherboter.repoName") || "motherbot");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState<{ text: string; tone: string; time: string }[]>([{ text: "استودیو آماده است؛ توضیح ربات را بنویس.", tone: "info", time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);
  const [sourceAttachment, setSourceAttachment] = useState<Attachment | null>(null);
  const [model, setModel] = useState(() => localStorage.getItem("motherboter.model.v1") || MODEL);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const [monitorTab, setMonitorTab] = useState<"progress" | "logs">("progress");
  const [createdRepository, setCreatedRepository] = useState("");
  const [creatingRepository, setCreatingRepository] = useState(false);
  const [code, setCode] = useState(() => sessionStorage.getItem("motherboter.sourceCode") || INITIAL_CODE);
  const [testStatus, setTestStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [thread, setThread] = useState<GeminiTurn[]>([]);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(keys)); }, [keys]);
  useEffect(() => { localStorage.setItem("motherboter.model.v1", model); }, [model]);
  useEffect(() => { sessionStorage.setItem("motherboter.repoName", repoName); }, [repoName]);
  useEffect(() => { sessionStorage.setItem("motherboter.sourceCode", code); }, [code]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [logs, monitorOpen, monitorTab]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, loading]);

  const addLog = (text: string, tone = "info") => setLogs(items => [...items, { text, tone, time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);
  const updateKey = (field: keyof Credentials, value: string) => setKeys(current => ({ ...current, [field]: value }));
  useEffect(() => {
    let active = true;
    const status = new URLSearchParams(window.location.search).get("github");
    if (status) {
      const messages: Record<string, string> = {
        connected: "ورود امن GitHub انجام شد.",
        denied: "اتصال GitHub لغو شد.",
        "state-error": "اعتبارسنجی OAuth ناموفق بود؛ دوباره تلاش کن.",
        "token-error": "GitHub نتوانست نشست OAuth بسازد.",
        "not-configured": "تنظیم ورود کامل نشده است.",
      };
      addLog(messages[status] || "پاسخ OAuth دریافت شد.", status === "connected" ? "ok" : "warn");
    }
    if (status) window.history.replaceState({}, "", window.location.pathname);
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
      .then(data => {
        if (!active || !data?.connected) return;
        const accounts = data.accounts || [];
        setCloudflareAccounts(accounts);
        if (!keys.accountId && accounts[0]) updateKey("accountId", accounts[0].id);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const apiMessage = (answer: string, blocks?: Block[]) => {
    setMessages(current => [...current, { id: id(), role: "assistant", text: answer, blocks }]);
    const found = blocks?.find(block => block.type === "code" && block.code);
    if (found?.code) { setCode(found.code); setStage(2); addLog(`کد ${found.filename || "src/index.ts"} از پاسخ Gemini آماده شد.`, "ok"); }
    if (blocks?.some(block => block.type === "deploy")) setStage(1);
  };

  async function askAgent(prompt: string, attachment: Attachment | null) {
    if (!keys.gemini.trim()) { setSettingsOpen(true); addLog("کلید Gemini وارد نشده است.", "warn"); return; }
    setLoading(true); setStage(0); addLog("درخواست برای ایجنت Gemini ارسال شد.");
    const system = `You are Motherboter, a dedicated Telegram bot creation agent for Cloudflare Workers and GitHub. Reply in Persian. Ask only for missing project requirements and reveal controls only when the user needs them. Be truthful: never claim an external action succeeded unless its tool/API returned success. Before any external change, explain it and wait for the user to click its approval button. Help plan a bot, generate complete grammY Cloudflare Worker code, diagnose errors, and propose next steps. When code is requested, return valid JSON: {"message":"Persian response","blocks":[{"type":"code","filename":"src/index.ts","code":"complete source"},{"type":"terminal","title":"Validation","command":"...","logs":["..."]},{"type":"deploy","repoName":"...","summary":"..."},{"type":"simulator","botName":"...","welcome":"..."}]}. Only include needed blocks. Treat terminal blocks as suggestions only: no command has run. Do not claim Worker deployment is available; this app can currently create a private GitHub repository, but deployment is not implemented. Current project code follows:\n${code}`;
    const userParts: GeminiPart[] = [{ text: prompt }];
    if (attachment?.text) userParts.push({ text: `Attached source file ${attachment.name}:\n${attachment.text.slice(0, 50000)}` });
    if (attachment?.data) userParts.push({ inline_data: { mime_type: attachment.mimeType, data: attachment.data } });
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(keys.gemini.trim())}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: [...thread, { role: "user", parts: userParts }], generationConfig: { responseMimeType: "application/json", temperature: 0.35, maxOutputTokens: 3500 } })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || `Google API ${response.status}`);
      const raw = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "{}";
      let parsed: { message?: string; blocks?: Block[] };
      try { parsed = JSON.parse(raw); } catch { parsed = { message: raw }; }
      const answer = parsed.message || "پاسخ ایجنت خالی بود.";
      apiMessage(answer, parsed.blocks);
       setThread(previous => [...previous, { role: "user" as const, parts: userParts }, { role: "model" as const, parts: [{ text: answer }] }].slice(-20));
      addLog("پاسخ Gemini دریافت شد.", "ok");
    } catch (error) {
      const text = error instanceof Error ? error.message : "خطای ناشناخته";
      apiMessage(`اتصال به Gemini ناموفق بود: ${text}`);
      addLog(`Gemini: ${text}`, "error");
    } finally { setLoading(false); }
  }

  function sendMessage() {
    const prompt = input.trim() || (sourceAttachment ? `فایل پیوست‌شده را بررسی کن: ${sourceAttachment.name}` : "");
    if (!prompt || loading) return;
    if (!keys.gemini.trim()) { setSettingsOpen(true); addLog("کلید Gemini وارد نشده است؛ قبل از ارسال آن را تنظیم کن.", "warn"); return; }
    const attachment = sourceAttachment;
    const preview = attachment ? { name: attachment.name, mimeType: attachment.mimeType, previewUrl: attachment.previewUrl, text: attachment.text?.slice(0, 280) } : undefined;
    setMessages(current => [...current, { id: id(), role: "user", text: prompt, attachment: preview }]);
    setInput(""); setSourceAttachment(null); void askAgent(prompt, attachment);
  }
  async function readSource(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { addLog("فایل بیش از ۲ مگابایت است؛ فایل کوچک‌تری انتخاب کن.", "warn"); return; }
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isText = file.type.startsWith("text/") || /\.(ts|tsx|js|jsx|json|md|txt|yml|yaml|toml)$/i.test(file.name);
    if (!isImage && !isPdf && !isText) { addLog("این نوع فایل پشتیبانی نمی‌شود؛ تصویر، PDF یا فایل متنی انتخاب کن.", "warn"); return; }

    try {
      if (isImage || isPdf) {
        const previewUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("read_failed"));
          reader.onerror = () => reject(new Error("read_failed"));
          reader.readAsDataURL(file);
        });
        const mimeType = file.type || (isPdf ? "application/pdf" : "image/png");
        setSourceAttachment({ name: file.name, mimeType, data: previewUrl.split(",")[1], previewUrl: isImage ? previewUrl : undefined });
      } else {
        setSourceAttachment({ name: file.name, mimeType: file.type || "text/plain", text: await file.text() });
      }
      addLog(`فایل ${file.name} برای ایجنت آماده شد.`, "ok");
    } catch {
      addLog(`خواندن فایل ${file.name} ناموفق بود.`, "error");
    }
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
      if (!response.ok || !result.connected) {
        if (response.status === 401 || response.status === 403) setCloudflareAccounts([]);
        throw new Error(result.error ? cloudflareErrorMessage(result.error) : "ابتدا Cloudflare را وصل کن.");
      }
      const accounts = result.accounts as CloudflareAccount[];
      setCloudflareAccounts(accounts);
      if (!keys.accountId && accounts[0]) updateKey("accountId", accounts[0].id);
      setTestStatus(`Cloudflare متصل: ${accounts.length} حساب`); addLog(`اتصال امن Cloudflare با ${accounts.length} حساب تأیید شد.`, "ok");
    } catch (error) { const text = error instanceof Error ? error.message : "خطا"; setTestStatus(`Cloudflare: ${text}`); addLog(`بررسی Cloudflare: ${text}`, "error"); }
  }
  function openCloudflareConnect() {
    setSettingsOpen(false);
    setCloudflareToken("");
    setCloudflareConnectError("");
    setCloudflareConnectOpen(true);
  }
  function closeCloudflareConnect() {
    setCloudflareConnectOpen(false);
    setCloudflareToken("");
    setCloudflareConnectError("");
  }
  async function connectCloudflare() {
    setCloudflareConnecting(true);
    setCloudflareConnectError("");
    try {
      const response = await fetch("/api/cloudflare/connect", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: cloudflareToken.trim() }),
      });
      const result = await response.json().catch(() => ({})) as { connected?: boolean; accounts?: CloudflareAccount[]; error?: string };
      if (!response.ok || !result.connected) throw new Error(cloudflareErrorMessage(result.error));
      const accounts = result.accounts || [];
      setCloudflareAccounts(accounts);
      if (!accounts.some(account => account.id === keys.accountId) && accounts[0]) updateKey("accountId", accounts[0].id);
      setTestStatus(`Cloudflare متصل: ${accounts.length} حساب`);
      addLog(`اتصال Cloudflare با توکن امن و ${accounts.length} حساب تأیید شد.`, "ok");
      setCloudflareToken("");
      setCloudflareConnectOpen(false);
    } catch (error) {
      const text = error instanceof Error ? error.message : "اتصال Cloudflare ناموفق بود.";
      setCloudflareConnectError(text);
      addLog(`اتصال Cloudflare: ${text}`, "error");
    } finally { setCloudflareConnecting(false); }
  }
  async function testGemini() {
    if (!keys.gemini.trim()) { setTestStatus("اول کلید Gemini را وارد کن."); return; }
    setTestStatus("در حال بررسی Gemini…");
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(keys.gemini.trim())}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: "Reply only: connected" }] }] }) });
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
    setCreatingRepository(true);
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
      setCreatedRepository(name);
      addLog(`مخزن خصوصی ${result.fullName} آماده شد.`, "ok");
      addLog(`${result.filesWritten} فایل در GitHub ثبت شد.`, "ok");
      setStage(2); setMessages(current => [...current, { id: id(), role: "assistant", text: `مخزن خصوصی ساخته و فایل‌های اولیه ثبت شد: ${result.repository}\n\nWorker و webhook هنوز deploy نشده‌اند.` }]);
    } catch (error) { const text = error instanceof Error ? error.message : "خطا"; addLog(text, "error"); setMessages(current => [...current, { id: id(), role: "assistant", text: `ساخت مخزن کامل نشد: ${text}` }]); }
    finally { setCreatingRepository(false); }
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
  const connectGitHub = () => { sessionStorage.setItem("motherboter.repoName", repoName); sessionStorage.setItem("motherboter.sourceCode", code); window.location.assign("/auth/github"); };
  function newConversation() {
    setMessages([]); setThread([]); setStage(0); setCreatedRepository(""); setCode(INITIAL_CODE); setInput(""); setSourceAttachment(null); setTestStatus("");
    setLogs([{ text: "گفت‌وگوی تازه آماده است.", tone: "info", time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }]);
  }

  return <div className="mb-app" dir="rtl">
    <main className="mb-main"><header className="mb-top">
      <div className="mb-crumb"><span className="agent-brand-mark">M</span><span><b>Motherboter</b><small>{repoName || "گفت‌وگوی تازه"}</small></span></div>
      <div className="mb-top-actions"><span className={`agent-live-state ${loading ? "is-running" : ""}`}><i/>{loading ? "در حال کار" : "آمادهٔ گفتگو"}</span><button className={`agent-cloudflare-status ${cloudflareAccounts.length ? "connected" : ""}`} onClick={() => cloudflareAccounts.length ? setSettingsOpen(true) : openCloudflareConnect()}><Cloud size={13}/><span>{cloudflareAccounts.length ? "Cloudflare متصل" : "اتصال Cloudflare"}</span></button><button className="mb-settings agent-new-chat" onClick={newConversation}><Plus size={15}/><span>گفت‌وگوی تازه</span></button><button className="mb-settings agent-monitor-button" onClick={() => setMonitorOpen(true)}><Activity size={15}/><span>پیشرفت و لاگ</span></button><button className="mb-settings" onClick={() => setSettingsOpen(true)}><Settings2 size={15}/><span>اتصال‌ها</span></button></div>
    </header>
      <div className="mb-scroll"><div className="mb-page"><div className="mb-grid"><div className="mb-left"><section className="mb-card mb-chat">
        <div className="mb-card-head"><div><Sparkles size={15}/><b>ایجنت سازنده</b></div><small>{loading ? "در حال پردازش" : "آمادهٔ گفتگو"} · {MODEL_OPTIONS.find(option => option.id === model)?.label || model}</small></div>
        <div className="mb-messages" role="log" aria-live="polite">
          {messages.length === 0 && <section className="agent-empty"><span className="agent-empty-mark"><Bot size={24}/></span><h1>چه چیزی بسازیم؟</h1><p>توضیح بده رباتت چه کاری انجام دهد. ایجنت سؤال‌های لازم را می‌پرسد و هر تغییر بیرونی را پیش از اجرا برای تأیید نشان می‌دهد.</p><div className="agent-suggestions"><button onClick={() => setInput("یک ربات پشتیبانی فارسی برای پاسخ به سوال‌های پرتکرار می‌خواهم.")}>ربات پشتیبانی</button><button onClick={() => setInput("یک ربات مدیریت گروه تلگرام با خوش‌آمدگویی و ضداسپم بساز.")}>مدیریت گروه</button><button onClick={() => setInput("یک ربات ثبت سفارش ساده برای فروشگاه تلگرامی می‌خواهم.")}>ثبت سفارش</button></div></section>}
          {messages.map(message => <article key={message.id} className={`mb-message ${message.role}`}>
            {message.role === "assistant" && <span className="mb-ai-icon"><Bot size={15}/></span>}
            <div className="mb-bubble"><div className="agent-message-text">{message.text}</div>
              {message.attachment && <MessageAttachment attachment={message.attachment}/>}
              {message.blocks?.map((block, index) => <WorkPreview key={`${message.id}-${index}`} block={block} repoName={repoName} onRepoNameChange={setRepoName} approved={createdRepository === repoName && Boolean(repoName)} creating={creatingRepository} onApprove={() => void createRepository(block)}/>)}
            </div>
          </article>)}
          {loading && <div className="mb-thinking"><LoaderCircle size={14}/> ایجنت در حال تحلیل درخواست…</div>}
          <div ref={endRef}/>
        </div>
        <div className="mb-compose-wrap">
          {sourceAttachment && <div className="agent-file-chip">{sourceAttachment.previewUrl ? <img src={sourceAttachment.previewUrl} alt="پیش‌نمایش فایل"/> : <FileText size={17}/>}<span><b>{sourceAttachment.name}</b><small>{sourceAttachment.text ? "فایل متنی" : sourceAttachment.mimeType}</small></span><button onClick={() => setSourceAttachment(null)} aria-label="حذف پیوست"><X size={15}/></button></div>}
          <input ref={fileInputRef} className="agent-file-input" type="file" accept=".ts,.tsx,.js,.jsx,.json,.txt,.md,.yml,.yaml,.toml,.pdf,image/*" onChange={event => { void readSource(event.target.files?.[0]); event.currentTarget.value = ""; }}/>
          <div className="mb-compose"><textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="از ایجنت بخواه یک ربات بسازد، تغییر بدهد یا بررسی کند…" rows={3}/><div className="mb-compose-row"><div className="mb-tools"><button className="mb-tool" title="افزودن تصویر، PDF یا سورس" onClick={() => fileInputRef.current?.click()}><Paperclip size={15}/><span>پیوست</span></button><select className="agent-model-select" aria-label="انتخاب مدل" value={model} onChange={event => setModel(event.target.value)}>{MODEL_OPTIONS.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select><button className="mb-tool agent-keys-shortcut" onClick={() => setSettingsOpen(true)}><KeyRound size={14}/><span>کلیدها</span></button></div><button className="mb-enter" disabled={(!input.trim() && !sourceAttachment) || loading} onClick={sendMessage}><span>{loading ? "در حال کار" : "ارسال"}</span><kbd>↵</kbd><Send size={14}/></button></div></div>
          <small className="mb-hint">Enter برای ارسال · Shift+Enter برای خط جدید · فایل‌ها تا ۲ مگابایت</small>
        </div>
      </section></div></div></div></div>
    </main>
    {settingsOpen && <div className="mb-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section className="mb-modal"><header><div><KeyRound size={16}/><b>اتصال سرویس‌ها</b></div><button onClick={() => setSettingsOpen(false)} aria-label="بستن"><X size={17}/></button></header><p>کلید Gemini و Telegram در این مرورگر می‌مانند؛ اتصال‌های GitHub و Cloudflare در نشست امن همین مرورگر نگه‌داری می‌شوند.</p>
      <Credential label="Gemini API Key" value={keys.gemini} onChange={value => updateKey("gemini", value)} href="https://aistudio.google.com/app/apikey" hint="دریافت کلید ↗"/>
      <div className="mb-github-auth">{githubUser ? <div className="mb-github-connected"><img src={githubUser.avatar_url} alt=""/><span>متصل به <b dir="ltr">@{githubUser.login}</b></span><button onClick={() => void disconnectGitHub()}>خروج</button></div> : <button className="mb-github-connect" onClick={connectGitHub}><Github size={15}/> اتصال امن با GitHub</button>}<small>توکن GitHub به‌صورت رمزگذاری‌شده روی سرور نگه‌داری می‌شود.</small></div>
      <div className="mb-github-auth">{cloudflareAccounts.length ? <><div className="mb-github-connected agent-cf-connected"><Cloud size={16}/><span>Cloudflare متصل است</span><button onClick={() => void disconnectCloudflare()}>قطع اتصال</button></div><label className="mb-credential"><span>حساب Cloudflare</span><select value={keys.accountId} onChange={event => updateKey("accountId", event.target.value)}>{cloudflareAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></> : <button className="mb-github-connect" onClick={openCloudflareConnect}><Cloud size={15}/> اتصال با توکن API</button>}<small>مجوز فعلی فقط برای اعتبارسنجی و فهرست حساب‌هاست.</small></div>
      <Credential label="Telegram Bot Token · BotFather" value={keys.telegram} onChange={value => updateKey("telegram", value)} href="https://t.me/BotFather" hint="بازکردن BotFather ↗"/>
      <div className="mb-custom"><div className="mb-modal-label">کلید سرویس دلخواه</div><div><input value={customName} onChange={event => setCustomName(event.target.value)} placeholder="نام سرویس"/><input value={customValue} onChange={event => setCustomValue(event.target.value)} placeholder="API key" type="password"/><button onClick={addCustomKey}><Plus size={13}/></button></div></div>
      <div className="mb-modal-foot"><span><Shield size={13}/> مدل: {MODEL_OPTIONS.find(option => option.id === model)?.label || model}</span><button onClick={testGemini}><Activity size={13}/> تست Gemini</button><button onClick={testCloudflare}><Cloud size={13}/> تست Cloudflare</button><button className="mb-save" onClick={() => setSettingsOpen(false)}><Check size={13}/> بستن</button></div>
      {testStatus && <div className="mb-test-status"><AlertCircle size={13}/>{testStatus}</div>}
    </section></div>}
    {monitorOpen && <div className="agent-monitor-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setMonitorOpen(false); }}><aside className="agent-monitor" role="dialog" aria-modal="true" aria-label="پیشرفت و لاگ‌های اجرا">
      <header><div><Activity size={17}/><span><b>مانیتور کار</b><small>{loading ? "ایجنت در حال پردازش" : "وضعیت پروژه"}</small></span></div><button onClick={() => setMonitorOpen(false)} aria-label="بستن"><X size={18}/></button></header>
      <div className="agent-monitor-tabs"><button className={monitorTab === "progress" ? "active" : ""} onClick={() => setMonitorTab("progress")}>پیشرفت</button><button className={monitorTab === "logs" ? "active" : ""} onClick={() => setMonitorTab("logs")}>گزارش اجرا <span>{logs.length}</span></button></div>
      {monitorTab === "progress" ? <div className="agent-progress-list">{[
        { label: "گفت‌وگو و نیازمندی", done: messages.length > 0, active: loading },
        { label: "پیش‌نویس کد", done: stage >= 2 && code !== INITIAL_CODE, active: loading && messages.length > 0 },
        { label: "تأیید و ساخت مخزن خصوصی", done: Boolean(createdRepository), active: stage === 1 },
        { label: "اتصال Cloudflare", done: cloudflareAccounts.length > 0, active: false },
      ].map((item, index) => <div className={`agent-progress-item ${item.done ? "done" : item.active ? "active" : ""}`} key={item.label}><span>{item.done ? <Check size={14}/> : index + 1}</span><div><b>{item.label}</b><small>{item.done ? "انجام شد" : item.active ? "در حال انجام" : "هنوز شروع نشده"}</small></div></div>)}<p>گزینه‌های هر مرحله هنگام نیاز، داخل گفت‌وگو ظاهر می‌شوند.</p></div> : <div className="agent-log-list" ref={logRef}>{logs.map((item, index) => <div className={`agent-log ${item.tone}`} key={`${index}-${item.text}`}><time>{item.time}</time><span>{item.tone === "error" ? "خطا" : item.tone === "ok" ? "موفق" : item.tone === "warn" ? "در حال انجام" : "رویداد"}</span><p>{item.text}</p></div>)}<button className="agent-clear-logs" onClick={() => setLogs([])}>پاک‌کردن گزارش‌ها</button></div>}
    </aside></div>}
    {cloudflareConnectOpen && <div className="mb-cf-overlay" onMouseDown={event => { if (event.target === event.currentTarget) closeCloudflareConnect(); }}><section className="mb-cf-modal" role="dialog" aria-modal="true" aria-labelledby="mb-cf-title" aria-describedby="mb-cf-description">
      <header><div className="mb-cf-brand"><span><Cloud size={22}/></span><div><b>Cloudflare</b><small>اتصال حساب به Motherboter</small></div></div><button onClick={closeCloudflareConnect} aria-label="بستن"><X size={18}/></button></header>
      <div className="mb-cf-content"><h2 id="mb-cf-title">اتصال با توکن API</h2><p id="mb-cf-description">یک توکن محدود از Cloudflare بساز، اینجا واردش کن و اتصال حساب را تأیید کن.</p>
        <div className="mb-cf-permission"><div><Shield size={16}/><b>مجوز موردنیاز فعلی</b></div><strong>Account Settings · Read</strong><small>فقط برای اعتبارسنجی توکن و نمایش حساب‌هاست؛ انتشار Worker هنوز در اپ فعال نیست.</small></div>
        <a className="mb-cf-token-link" href={CLOUDFLARE_TOKEN_URL} target="_blank" rel="noreferrer"><span><b>ساخت توکن API در Cloudflare</b><small>مجوز لازم از قبل انتخاب شده است</small></span><ExternalLink size={17}/></a>
        <form onSubmit={event => { event.preventDefault(); void connectCloudflare(); }}><label className="mb-cf-token-field" htmlFor="mb-cf-token"><span>توکن API</span><input id="mb-cf-token" type="password" dir="ltr" autoComplete="off" autoFocus spellCheck={false} maxLength={2000} value={cloudflareToken} onChange={event => setCloudflareToken(event.target.value)} placeholder="توکن Cloudflare را اینجا وارد کن"/></label>
          <div className="mb-cf-security"><LockKeyhole size={14}/> توکن رمزگذاری‌شده و در کوکی امن HttpOnly این مرورگر نگه‌داری می‌شود؛ حداکثر ۸ ساعت.</div>
          {cloudflareConnectError && <div className="mb-cf-error" role="alert"><AlertCircle size={15}/>{cloudflareConnectError}</div>}
          <div className="mb-cf-actions"><button type="button" onClick={closeCloudflareConnect}>انصراف</button><button type="submit" disabled={!cloudflareToken.trim() || cloudflareConnecting}>{cloudflareConnecting ? <><LoaderCircle size={15}/> در حال بررسی</> : <><Check size={15}/> اتصال</>}</button></div>
        </form>
      </div>
    </section></div>}
  </div>;
}

function Credential({ label, value, onChange, href, hint }: { label: string; value: string; onChange: (value: string) => void; href?: string; hint: string }) {
  return <label className="mb-credential"><span>{label}</span>{href ? <a href={href} target="_blank" rel="noreferrer">{hint}</a> : <small>{hint}</small>}<input type="password" dir="ltr" autoComplete="off" value={value} onChange={e => onChange(e.target.value)} placeholder="برای خالی‌گذاشتن، فیلد را پاک کن"/></label>;
}

function MessageAttachment({ attachment }: { attachment: NonNullable<Message["attachment"]> }) {
  return <div className="agent-message-attachment">
    {attachment.previewUrl ? <img src={attachment.previewUrl} alt={`پیش‌نمایش ${attachment.name}`}/> : <span className="agent-attachment-icon"><FileText size={18}/></span>}
    <div><b>{attachment.name}</b><small>{attachment.mimeType}</small>{attachment.text && <pre>{attachment.text}</pre>}</div>
  </div>;
}

function WorkPreview({ block, repoName, onRepoNameChange, approved, creating, onApprove }: {
  block: Block;
  repoName: string;
  onRepoNameChange: (name: string) => void;
  approved: boolean;
  creating: boolean;
  onApprove: () => void;
}) {
  if (block.type === "code" && block.code) return <section className="agent-artifact agent-code-artifact">
    <header><div><FileCode2 size={15}/><b>{block.filename || "src/index.ts"}</b><small>پیش‌نمایش سورس</small></div><button onClick={() => void navigator.clipboard.writeText(block.code || "")} title="کپی کد"><Copy size={14}/><span>کپی</span></button></header>
    <pre><code>{block.code}</code></pre>
    <div className="agent-approval-card"><div><Shield size={15}/><span><b>اقدام نیازمند تأیید تو</b><small>ساخت مخزن خصوصی و ثبت فایل‌ها در GitHub</small></span></div><label>نام مخزن<input dir="ltr" value={repoName} onChange={event => onRepoNameChange(event.target.value)} placeholder="my-telegram-bot"/></label><button onClick={onApprove} disabled={approved || creating}>{approved ? <><Check size={14}/> مخزن ساخته شد</> : creating ? <><LoaderCircle size={14}/> در حال ساخت…</> : <><Github size={14}/> تأیید و ساخت مخزن خصوصی</>}</button></div>
  </section>;
  if (block.type === "terminal") return <section className="agent-artifact agent-terminal-artifact"><header><div><Terminal size={15}/><b>{block.title || "دستور و خروجی پیشنهادی"}</b></div><small>پیشنهاد ایجنت · اجرا نشده</small></header>{block.command && <code className="agent-command">{block.command}</code>}<pre>{block.logs?.join("\n") || "خروجی پیشنهادی نمایش داده می‌شود."}</pre></section>;
  if (block.type === "deploy") return <section className="agent-artifact agent-deploy-artifact"><header><div><Cloud size={15}/><b>پیش‌نمایش انتشار</b></div><span>در انتظار پیاده‌سازی</span></header><p>{block.summary || "تنظیمات و مقصد انتشار برای بررسی آماده است."}</p><small>انتشار Worker از داخل اپ هنوز فعال نیست؛ این کارت فقط طرح ایجنت را نشان می‌دهد.</small></section>;
  if (block.type === "simulator") return <section className="agent-artifact agent-simulator-artifact"><header><div><Bot size={15}/><b>پیش‌نمایش ربات</b></div><small>نمونهٔ تعاملی</small></header><div className="agent-phone-preview"><div><b>{block.botName || "ربات تلگرام"}</b><small>آنلاین</small></div><p>{block.welcome || "سلام! ربات آمادهٔ پاسخ‌گویی است."}</p><span>پیش‌نمایش گفتگو</span></div></section>;
  return null;
}
