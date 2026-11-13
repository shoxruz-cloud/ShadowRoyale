try { process.loadEnvFile(); } catch {}
try { process.loadEnvFile(); } catch {}
const express = require("express");
const TG = require("node-telegram-bot-api");
const TelegramBot = TG.default || TG;

const { BOT_TOKEN, WEBAPP_URL, PORT = 3000 } = process.env;
if (!BOT_TOKEN || !WEBAPP_URL) {
  console.error("BOT_TOKEN va WEBAPP_URL kiriting!");
  process.exit(1);
}

const app = express();
app.use(express.static("public"));
app.get("/health", (_, res) => res.send("ok"));
app.listen(PORT, () => console.log("Server port:", PORT));

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `Salom, ${msg.from.first_name}! 🧠\nXotira o'yiniga xush kelibsiz:`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎮 O'ynash", web_app: { url: WEBAPP_URL } }],
        ],
      },
    }
  );
});

console.log("Bot ishga tushdi...");
