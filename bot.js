try { process.loadEnvFile(); } catch {}
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const TG = require("node-telegram-bot-api");
const TelegramBot = TG.default || TG;

const { BOT_TOKEN, WEBAPP_URL, PORT = 3000 } = process.env;
if (!BOT_TOKEN || !WEBAPP_URL) {
  console.error("BOT_TOKEN va WEBAPP_URL kiriting!");
  process.exit(1);
}

const MAX_TPS = 15; // bir soniyada ruxsat etilgan maksimal bosish (avto-kliker himoyasi)
const DB_FILE = process.env.DB_PATH || "db.json"; // doimiy diskda bo'lsa: DB_PATH=/data/db.json

// ---------- Oddiy baza (db.json) ----------
let db = { users: {}, charges: {} };
try { db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) }; } catch {}
let t;
const flush = () => {
  try {
    fs.writeFileSync(DB_FILE + ".tmp", JSON.stringify(db));
    fs.renameSync(DB_FILE + ".tmp", DB_FILE); // yarim yozilib qolmasligi uchun
  } catch (e) { console.error("Saqlash xatosi:", e.message); }
};
const save = () => { clearTimeout(t); t = setTimeout(flush, 1000); };
process.on("SIGTERM", () => { flush(); process.exit(0); });
process.on("SIGINT", () => { flush(); process.exit(0); });
setInterval(() => { try { fs.copyFileSync(DB_FILE, DB_FILE + ".bak"); } catch {} }, 3600e3); // soatlik zaxira
const getUser = (id) =>
  (db.users[id] ||= {
    name: "Mehmon", score: 0, badge: "", premiumUntil: 0, coinsGranted: 0, skins: [], lastSync: 0,
    joined: Date.now(), hasData: false,
    data: { coins: 0, skins: ["feruza"], skin: "feruza", fxs: ["def"], fx: "def", badges: [""], badge: "", grantedSeen: 0 },
  });

const SKIN_IDS = ["feruza", "yoqut", "zumrad", "oltin", "ametist", "galaktika"];
const FX_IDS = ["def", "star", "fire", "heart"];
const BADGE_IDS = ["", "bolt", "rocket", "crown"];
function cleanData(d, u) {
  d = d && typeof d === "object" ? d : {};
  const arr = (a, ok, def) => {
    const r = [...new Set((Array.isArray(a) ? a : []).filter((x) => ok.includes(x)))];
    if (!r.includes(def)) r.unshift(def);
    return r;
  };
  const pick = (v, list, def) => (list.includes(v) ? v : def);
  const skins = arr(d.skins, SKIN_IDS, "feruza").filter((x) => x !== "galaktika" || u.skins.includes("galaktika"));
  const fxs = arr(d.fxs, FX_IDS, "def");
  const badges = arr(d.badges, BADGE_IDS, "");
  const earned = Math.floor(u.score / 10) * 2 + u.coinsGranted; // tangalar bundan ko'p bo'lolmaydi
  return {
    coins: Math.max(0, Math.min(Math.floor(Number(d.coins)) || 0, earned)),
    skins, skin: pick(d.skin, skins, "feruza"),
    fxs, fx: pick(d.fx, fxs, "def"),
    badges, badge: pick(d.badge, badges, ""),
    grantedSeen: Math.max(0, Math.min(Math.floor(Number(d.grantedSeen)) || 0, u.coinsGranted)),
  };
}

// ---------- Stars mahsulotlari (client bilan bir xil id) ----------
const ITEMS = {
  sub30: { title: "Premium 30 kun", stars: 150, days: 30 },
  sub90: { title: "Premium 90 kun", stars: 400, days: 90 },
  sub365: { title: "Premium 1 yil", stars: 1400, days: 365 },
  p500: { title: "500 tanga", stars: 25, coins: 500 },
  p2500: { title: "2 500 tanga", stars: 100, coins: 2500 },
  p10000: { title: "10 000 tanga", stars: 300, coins: 10000 },
  gal: { title: "Galaktika kristali", stars: 99, skin: "galaktika" },
};

function grant(uid, itemId) {
  const it = ITEMS[itemId];
  const u = getUser(uid);
  if (it.days) {
    u.premiumUntil = Math.max(Date.now(), u.premiumUntil || 0) + it.days * 864e5;
    if (!u.skins.includes("galaktika")) u.skins.push("galaktika");
  }
  if (it.coins) u.coinsGranted += it.coins;
  if (it.skin && !u.skins.includes(it.skin)) u.skins.push(it.skin);
  save();
}

// ---------- Telegram initData tekshiruvi ----------
function verify(initData) {
  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  if (!hash) return null;
  p.delete("hash");
  const str = [...p.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const h = crypto.createHmac("sha256", secret).update(str).digest("hex");
  if (h !== hash) return null;
  if (Date.now() / 1000 - Number(p.get("auth_date")) > 86400) return null;
  try { return JSON.parse(p.get("user")); } catch { return null; }
}
const auth = (req, res, next) => {
  const u = verify(req.get("x-init-data") || "");
  if (!u) return res.status(401).json({ error: "auth" });
  req.tg = u;
  next();
};
const view = (id, u) => ({
  id: String(id), score: u.score, premiumUntil: u.premiumUntil,
  coinsGranted: u.coinsGranted, skins: u.skins, hasData: u.hasData, data: u.data,
});

// ---------- Server ----------
const app = express();
app.use(express.json());
app.use(express.static("public"));
app.get("/health", (_, res) => res.send("ok"));

app.get("/api/state", auth, (req, res) => {
  const u = getUser(req.tg.id);
  u.name = req.tg.first_name || req.tg.username || u.name;
  save();
  res.json(view(req.tg.id, u));
});

app.post("/api/sync", auth, (req, res) => {
  const u = getUser(req.tg.id);
  const now = Date.now();
  const dt = u.lastSync ? Math.min(86400, (now - u.lastSync) / 1000) : 1;
  const allowed = u.score + Math.ceil(dt * MAX_TPS) + 5;
  const claimed = Math.floor(Number(req.body.score) || 0);
  if (claimed > u.score) u.score = Math.min(claimed, allowed);
  u.lastSync = now;
  u.name = req.tg.first_name || req.tg.username || u.name;
  const okBadges = ["prem", "bolt", "rocket", "crown"];
  u.badge = String(req.body.badge || "")
    .split(",")
    .filter((b) => okBadges.includes(b) && (b !== "prem" || u.premiumUntil > now))
    .slice(0, 2)
    .join(",");
  if (req.body.data) { u.data = cleanData(req.body.data, u); u.hasData = true; }
  save();
  res.json(view(req.tg.id, u));
});

app.get("/api/top", (_, res) => {
  const top = Object.entries(db.users)
    .map(([id, u]) => ({ id, name: u.name, score: u.score, badge: u.badge }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  res.json({ top });
});

async function tgApi(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

app.post("/api/invoice", auth, async (req, res) => {
  const it = ITEMS[req.body.item];
  if (!it) return res.status(400).json({ error: "item" });
  const r = await tgApi("createInvoiceLink", {
    title: it.title,
    description: "Shadow Royale: " + it.title,
    payload: `${req.tg.id}:${req.body.item}`,
    currency: "XTR",
    prices: [{ label: it.title, amount: it.stars }],
  });
  if (!r.ok) return res.status(500).json({ error: r.description });
  res.json({ link: r.result });
});

app.listen(PORT, "0.0.0.0", () => console.log("Server port:", PORT));

// ---------- Bot ----------
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

function greet(msg) {
  const id = msg.from.id, name = msg.from.first_name || "do'st";
  const u = db.users[id];
  if (!u || !u.score) {
    getUser(id).name = name; save();
    return `Salom, ${name}! 👑\nShadow Royale: eng ko'p bosgan g'olib bo'ladi.\nReytingda birinchi bo'ling!`;
  }
  const rank = Object.values(db.users).filter((x) => x.score > u.score).length + 1;
  return `Qaytganingiz bilan, ${name}! 👑\nBallingiz: ${u.score}\nReytingdagi o'rningiz: ${rank}\nO'yinni davom ettiring:`;
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    greet(msg),
    {
      reply_markup: {
        inline_keyboard: [[{ text: "👑 O'ynash", web_app: { url: WEBAPP_URL } }]],
      },
    }
  );
});

bot.on("pre_checkout_query", (q) => bot.answerPreCheckoutQuery(q.id, true));

bot.on("message", (msg) => {
  const p = msg.successful_payment;
  if (!p) return;
  const [uid, item] = p.invoice_payload.split(":");
  if (!ITEMS[item] || db.charges[p.telegram_payment_charge_id]) return;
  db.charges[p.telegram_payment_charge_id] = 1;
  grant(uid, item);
  bot.sendMessage(msg.chat.id, "Rahmat! Xaridingiz o'yinga qo'shildi 👑");
});

tgApi("setChatMenuButton", {
  menu_button: { type: "web_app", text: "O'ynash", web_app: { url: WEBAPP_URL } },
});

console.log("Bot ishga tushdi...");

