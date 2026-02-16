/**
 * ------------------------------------------------------------
 * Wordby Bot (Two-Device Demo)
 * ------------------------------------------------------------
 * This demo shows how a single bot can control TWO PixelMug devices.
 *
 * Behavior:
 * 1) Text input mode:
 *    - The bot listens to ctx.message.content
 *    - It extracts the first two words from the message
 *    - Word #1 is shown on mug1
 *    - Word #2 is shown on mug2
 *
 * 2) Try mode (InlineKeyboard):
 *    - The bot sends an InlineKeyboard named "Try wordby"
 *    - Three rows, one button per row:
 *        * "Boy Girl"
 *        * "Bride Groom"
 *        * "Dad Mom"
 *    - When a button is clicked, the bot applies the same rule:
 *        first word -> mug1, second word -> mug2
 *
 * Notes:
 * - This demo uses `text2Tal(...)` to build the RPC message.
 * - The bot must bind both devices so they can be attached in the Bubble App.
 * ------------------------------------------------------------
 */

// import Bot SDK
import { BotManager, InlineKeyBoard } from "./sdk/Bot_0.2.js";
// PixelMug device SDK
import PixelMug from "./sdk/DeviceSDK_PixelMug_0.1.ts";
// text to rpc message builder
import { text2Tal, Specifications } from "./sdk/Text2Params.js";

// API Token
const token = "your_bot_token";

// 1. Create Bot Manager instance
const bot = new BotManager(token);

// 2. Instantiate TWO devices
const mug1 = new PixelMug();
const mug2 = new PixelMug();

// 3. Bind devices to bot runtime (required for attachment & RPC routing)
bot.bindDevices(mug1, mug2);

// 4. Register command
bot.setMyCommands([
  { command: "start", description: "Open wordby" },
]);

// ----------------------
// Helpers
// ----------------------
function firstTwoWords(text: string): { w1: string | null; w2: string | null } {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    w1: words.length >= 1 ? words[0] : null,
    w2: words.length >= 2 ? words[1] : null,
  };
}

async function buildTextRpc(text: string) {
  const rpcMsg = await text2Tal(text, Specifications.SMALL, "#00ff00");
  rpcMsg.params.direction = 0; // no rolling
  rpcMsg.params.speed = 1; //
  return rpcMsg;
}

async function showOnMug(chat: any, mug: PixelMug, text: string) {
  const rpcMsg = await buildTextRpc(text);
  await bot.setDevMessage(chat, mug, rpcMsg);
}

async function showPair(chat: any, a: string, b: string) {
  await showOnMug(chat, mug1, a);
  await showOnMug(chat, mug2, b);
}

function buildTryKeyboard() {
  const kb = new InlineKeyBoard("Try wordby")
    .text("Boy Girl", "pair_boy_girl");
  kb.row();
  kb.text("Bride Groom", "pair_bride_groom");
  kb.row();
  kb.text("Dad Mom", "pair_dad_mom");
  kb.row();
  kb.text("Clear Display", "clear_display");

  return kb;
}

// ----------------------
// Bot logic
// ----------------------
bot.on(async (ctx: any) => {
  // /start => show Try keyboard
  if (ctx?.message?.content === "/start") {
    await bot.sendMessage(ctx.chat, buildTryKeyboard());
    return;
  }

  // Handle try buttons
  const cb = String(ctx?.callback?.value ?? "");
  if (cb) {
    if (cb === "pair_boy_girl") {
      await showPair(ctx.chat, "Boy", "Girl");      
      return;
    }
    if (cb === "pair_bride_groom") {
      await showPair(ctx.chat, "Bride", "Groom");      
      return;
    }
    if (cb === "pair_dad_mom") {
      await showPair(ctx.chat, "Dad", "Mom");      
      return;
    }
    if (cb === "clear_display") {
      await bot.setDevMessage(ctx.chat, mug1, mug1.rpc.call("talReturn2Home", {}));
      await bot.setDevMessage(ctx.chat, mug2, mug2.rpc.call("talReturn2Home", {}));
      return;
    }    
    return; // ignore unknown callbacks
  }

  // Text input mode
  const content = String(ctx?.message?.content ?? "").trim();
  if (!content) return;

  const { w1, w2 } = firstTwoWords(content);
  if (!w1 || !w2) {
    await bot.sendMessage(ctx.chat, "Please send at least two words (e.g., `Boy Girl`).");
    return;
  }

  await showPair(ctx.chat, w1, w2);
  await bot.sendMessage(ctx.chat, `Displayed: "${w1}" on one mug, "${w2}" on the other.`);
});

bot.start();
