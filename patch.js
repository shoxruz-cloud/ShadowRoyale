const fs = require("fs");
const f = process.argv[2] || "public/index.html";
let s = fs.readFileSync(f, "utf8");
function rep(a, b) {
  if (s.split(a).length !== 2) throw new Error("Topilmadi: " + a.slice(0, 50));
  s = s.replace(a, () => b);
}

/* CSS */
rep("</style>", `.ov{position:fixed;inset:8px;max-width:804px;margin:0 auto;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.ov.solid{background:rgba(10,12,18,.78)}
#menu{background:rgba(10,12,18,.2);justify-content:flex-start;padding-top:12px}
#menu h1{font-size:30px}
.glass,.tile{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);border-radius:14px}
.hdr{width:100%;max-width:440px;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;text-align:left}
.mut{color:#d5dae6;font-size:12px}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:440px}
.tile{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;font-size:14px;font-weight:600}
.tile b{font-size:24px}
.tile small{font-size:11px;font-weight:400;color:#d5dae6}
.tile.big{grid-column:1/3;background:linear-gradient(rgba(232,97,63,.8),rgba(185,47,28,.8))}
.ov>button.wide{width:100%;max-width:440px;font-size:16px;padding:12px}
.done{border-color:#4c4}
</style>`);

/* Menyu HTML */
const a = s.indexOf('<div class="ov" id="menu">');
const b = s.indexOf('<div class="ov solid hide" id="levels">');
if (a < 0 || b < 0) throw new Error("Menyu topilmadi");
s = s.slice(0, a) + `<div class="ov" id="menu">
    <div class="glass hdr"><div><b id="uname">Jangchi</b><br><span class="mut" id="rank"></span></div><div class="pill" id="stats"></div></div>
    <h1>SHADOW ROYALE</h1>
    <button id="resume" class="wide sec" style="display:none">▶ Davom etish</button>
    <div class="tiles">
      <button id="camp" class="tile big"><b>⚔</b>Kampaniya<small id="campsub"></small></button>
      <button id="endl" class="tile"><b>♾</b>Cheksiz rejim<small id="bestsub"></small></button>
      <button id="shop" class="tile"><b>🏪</b>Do'kon<small>Kuchaytirish</small></button>
      <button id="ach" class="tile"><b>🏅</b>Yutuqlar<small id="achsub"></small></button>
      <button id="gift" class="tile"><b>🎁</b>Kunlik sovg'a<small id="giftsub"></small></button>
      <button id="how" class="tile"><b>📖</b>Qo'llanma<small>Qanday o'ynaladi</small></button>
      <button id="setb" class="tile"><b>⚙</b>Sozlamalar<small>Vibratsiya, reset</small></button>
    </div>
  </div>

  <div class="ov solid hide" id="achv">
    <h2>🏅 Yutuqlar</h2>
    <div class="pill" id="achstat"></div>
    <div class="grid" id="achgrid"></div>
    <button class="sec" onclick="show('menu')">⬅ Orqaga</button>
  </div>

  <div class="ov solid hide" id="setv">
    <h2>⚙ Sozlamalar</h2>
    <button id="vibb" class="sec"></button>
    <button id="resetb" class="sec"></button>
    <button class="sec" onclick="show('menu')">⬅ Orqaga</button>
  </div>

  ` + s.slice(b);

/* Ma'lumotlar */
rep("prog: 1, wins: 0 };", "prog: 1, wins: 0, kills: 0, best: 0, daily: \"\", vib: 1 };");
rep("try { tg && tg.HapticFeedback", "try { D.vib && tg && tg.HapticFeedback");
rep("g: 60 }\n];", "g: 60 },\n  { n: \"Cheksiz\", hp: 1, sp: 5, a: 20, s: 40, g: 80, endless: 1 }\n];");
rep("hp: [1000 + 150 * D.st, 1000 * LV[l].hp], mx: [1000 + 150 * D.st, 1000 * LV[l].hp] };",
    "hp: [1000 + 150 * D.st, LV[l].endless ? 1e9 : 1000 * LV[l].hp], mx: [1000 + 150 * D.st, LV[l].endless ? 1e9 : 1000 * LV[l].hp] };");
rep("(team ? LV[lvl].hp : 1 + .1 * D.hp)", "(team ? LV[lvl].hp * (LV[lvl].endless ? 1 + S.t / 150 : 1) : 1 + .1 * D.hp)");
rep('"Daraja " + (lvl + 1) + ": " + LV[lvl].n', '(LV[lvl].endless ? "" : "Daraja " + (lvl + 1) + ": ") + LV[lvl].n');
rep("LV.forEach((l, i) => {", "LV.slice(0, 5).forEach((l, i) => {");

/* finish */
const fa = s.indexOf("function finish(win) {");
const fb = s.indexOf("/* ---------- chizish");
if (fa < 0 || fb < 0) throw new Error("finish topilmadi");
s = s.slice(0, fa) + `function finish(win) {
  S.over = true; screen = "end";
  const en = LV[lvl].endless, t = Math.floor(S.t);
  const coins = en ? 5 + S.kills + Math.floor(t / 10) : win ? 25 * (lvl + 1) + S.kills : 5 + S.kills;
  D.coins += coins; D.kills += S.kills;
  let extra = "";
  if (en && t > D.best) { D.best = t; extra = "<br>🏅 Yangi rekord!"; }
  if (win) { D.wins++; if (lvl + 2 > D.prog) D.prog = Math.min(5, lvl + 2); }
  save();
  $("etitle").textContent = win ? "🏆 G'alaba!" : en ? "⏱ " + t + " soniya chidadingiz" : "💀 Mag'lubiyat";
  $("etext").innerHTML = (win ? "Dushman haykali vayron bo'ldi!" : "Haykalingiz yiqildi.") +
    "<br>⏱ " + t + " soniya · 💀 " + S.kills + " dushman<br>🪙 +" + coins + " tanga" + extra;
  $("next").style.display = (win && lvl < 4) ? "" : "none";
  show("end");
}

` + s.slice(fb);

/* Ko'rinishlar */
rep('how: "howto", end: "end" };', 'how: "howto", end: "end", ach: "achv", set: "setv" };');
rep("function show(n) {\n", "let resetArm = false;\nfunction show(n) {\n  resetArm = false;\n");
rep('$("stats").textContent = "🏆 " + D.wins + "  ·  🪙 " + D.coins;', "renderMenu();");
rep('  if (n === "shop") renderShop();\n}', '  if (n === "shop") renderShop();\n  if (n === "ach") renderAch();\n  if (n === "set") renderSet();\n}');

rep("function renderLevels() {", `function today() { return new Date().toISOString().slice(0, 10); }
function rankName() {
  const w = D.wins;
  return w >= 10 ? "Afsona" : w >= 6 ? "Qo'mondon" : w >= 3 ? "Sardor" : w >= 1 ? "Askar" : "Yangi jangchi";
}
function achList() {
  const ups = UP.reduce((a, u) => a + D[u.k], 0);
  return [
    { n: "Birinchi qon", d: "1 ta g'alaba qozoning", ok: D.wins >= 1 },
    { n: "G'olib", d: "5 ta g'alaba", ok: D.wins >= 5 },
    { n: "Qirg'inchi", d: "Jami 100 dushman", ok: D.kills >= 100 },
    { n: "Chidamli", d: "Cheksiz rejimda 120 soniya", ok: D.best >= 120 },
    { n: "Boy jangchi", d: "5 ta kuchaytirish sotib oling", ok: ups >= 5 },
    { n: "Qal'aga yetdingiz", d: "5-darajani oching", ok: D.prog >= 5 }
  ];
}
function renderMenu() {
  const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  $("uname").textContent = u && u.first_name ? u.first_name : "Jangchi";
  $("rank").textContent = "🎖 " + rankName() + " · 🏆 " + D.wins;
  $("stats").textContent = "🪙 " + D.coins;
  $("campsub").textContent = "Daraja " + Math.min(D.prog, 5) + "/5 ochiq";
  $("bestsub").textContent = D.best ? "Rekord: " + D.best + "s" : "Qancha chidaysiz?";
  const L = achList();
  $("achsub").textContent = L.filter(a => a.ok).length + "/" + L.length;
  $("giftsub").textContent = D.daily === today() ? "Ertaga yana" : "+50 tanga!";
}
function renderAch() {
  $("achstat").textContent = "💀 " + D.kills + " · 🏆 " + D.wins + " · ♾ " + D.best + "s";
  $("achgrid").innerHTML = "";
  achList().forEach(a => {
    const d = document.createElement("div"); d.className = "card" + (a.ok ? " done" : "");
    d.innerHTML = "<span><b>" + a.n + "</b><br>" + a.d + "</span><span>" + (a.ok ? "✅" : "🔒") + "</span>";
    $("achgrid").appendChild(d);
  });
}
function renderSet() {
  $("vibb").textContent = "📳 Vibratsiya: " + (D.vib ? "yoqiq" : "o'chiq");
  $("resetb").textContent = resetArm ? "⚠ Yana bosing: hammasi o'chadi" : "🗑 Progressni o'chirish";
}
function renderLevels() {`);

rep('$("camp").onclick = () => show("levels");', `$("camp").onclick = () => show("levels");
$("endl").onclick = () => play(5);
$("ach").onclick = () => show("ach");
$("setb").onclick = () => show("set");
$("gift").onclick = () => {
  if (D.daily !== today()) { D.daily = today(); D.coins += 50; save(); buzz("medium"); }
  renderMenu();
};
$("vibb").onclick = () => { D.vib = D.vib ? 0 : 1; save(); renderSet(); };
$("resetb").onclick = () => {
  if (!resetArm) { resetArm = true; renderSet(); return; }
  D = Object.assign({}, DEF); save(); resetArm = false; renderSet();
};`);

fs.writeFileSync(f, s);
console.log("Tayyor! Fayl yangilandi:", f);
