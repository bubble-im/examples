/**
 * ------------------------------------------------------------
 * PixelMug GIF Player Bot
 * ------------------------------------------------------------
 * This demo controls PixelMug using the `talPlayGif` SET method.
 *
 * Features:
 * - InlineKeyboard "GIF Player"
 *   Row 1: Interval controls (Query / Long / Medium / Short)
 *   Row 2: Order controls (Query / Random / Sequential)
 *   Row 3: Manual navigation (Prev / Next)
 *   Row 4: Clear Display (Return to Home)
 *
 * - Maintains a GIF playlist.
 * - Validates GIF before playing:
 *     * Size <= 40 KB
 *     * Dimensions == 32x16
 *     * Header must be GIF87a or GIF89a
 *
 * Behavior:
 * - /start starts the auto playback loop.
 * - Changing interval/order restarts the loop to apply new settings.
 * - Query buttons do NOT restart the loop.
 * - "Next" / "Prev" immediately play a different GIF and do NOT touch the timer.
 * - "Clear Display" calls talReturn2Home and does NOT touch the timer.
 * ------------------------------------------------------------
 */

// import Bot SDK
import { BotManager, InlineKeyBoard } from "./sdk/Bot_0.2.js";
import PixelMug from "./sdk/DeviceSDK_PixelMug_0.1.ts";

// API Token
const token = "your_bot_token";

// 1. Create Bot Manager instance
const bot = new BotManager(token);

// 2. Instantiate device
const myMug = new PixelMug();

// 3. Bind device
bot.bindDevices(myMug);

// ----------------------
// Playlist
// ----------------------
const GIF_PLAYLIST: string[] = [  
  "https://storage.jeejio.com/im/artifact/gif/01JSKMV3ZZ7ZCYZ5KPA5X8Q7B2/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JSKSA3PC6GT7Q57F12K397ZV/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JSXQRXC5QCMKZ46EA9P5NTPE/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JTMPHDK3SKRDSREGGGFH92G4/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JV70YCWVNFM91HBHPGZHA42N/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JXM50F7C2KS4ZJG91JQ7FBVH/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JXM509MNV3SCNJQBYGSMACJZ/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JWTCMMQH6RNZQXKRK8CB2Y7V/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JWG6MHKRNR6GNNW9SWJMZPA4/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JWG6MAQNC4HEK0TY1KC1NSHQ/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JWG6KJ787S11JPCE48ZA452C/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JWG6KBF3S57A1W7YQ6JDA2W4/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JWG6K579JN41TQN44S5130FY/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JWG6JC521TE4MY6887W6H9FM/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JWG6HXS6HGRQCVYS4RBZN2YJ/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JW8P8SX6ADERJ574GG3TA9EA/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JW5V40MDEVG6RSAXTR3FTMZM/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JTMPHJX3PC20MZXW5E0369M9/jeejio.gif",
  "https://storage.jeejio.com/im/artifact/gif/01JTJATT79JK6J1FKHK4XXB2XT/jeejio.gif"
];

// ----------------------
// Player state
// ----------------------
type PlayOrder = "random" | "sequential";

let intervalMs = 2 * 60 * 1000;
let order: PlayOrder = "sequential";

let timer: any = null;
let seqIndex = 0; // current pointer for sequential mode

// ----------------------
// Commands
// ----------------------
bot.setMyCommands([{ command: "start", description: "Open GIF Player" }]);

// ----------------------
// UI builder
// ----------------------
function buildGifPlayerKeyboard() {
  const kb = new InlineKeyBoard("GIF Player");

  // Row 1: Interval
  kb.text("Interval", "get_interval")
    .text("Long", "gif_int_5m")
    .text("Medium", "gif_int_2m")
    .text("Short", "gif_int_30s");
  kb.row();

  // Row 2: Order
  kb.text("Order", "get_order")
    .text("Random", "gif_order_random")
    .text("Sequential", "gif_order_seq");
  kb.row();

  // Row 3: Manual navigation
  kb.text("Prev", "gif_prev").text("Next", "gif_next");
  kb.row();

  // Row 4: Clear display
  kb.text("Clear Display", "gif_clear");

  return kb;
}

// ----------------------
// Helpers
// ----------------------
function intervalLabel(ms: number) {
  if (ms === 5 * 60 * 1000) return "Long (5m)";
  if (ms === 2 * 60 * 1000) return "Medium (2m)";
  if (ms === 30 * 1000) return "Short (30s)";
  return `${ms}ms`;
}

function pickNextIndex(): number {
  const n = GIF_PLAYLIST.length;
  if (n <= 0) return 0;

  if (order === "random") {
    return Math.floor(Math.random() * n);
  }

  const idx = seqIndex % n;
  seqIndex = (seqIndex + 1) % n;
  return idx;
}

function pickPrevIndex(): number {
  const n = GIF_PLAYLIST.length;
  if (n <= 0) return 0;

  if (order === "random") {
    return Math.floor(Math.random() * n);
  }

  seqIndex = (seqIndex - 1 + n) % n;
  return seqIndex;
}

function parseGifWidthHeight(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes.length < 10) return null;

  const sig = String.fromCharCode(...bytes.slice(0, 6));
  if (sig !== "GIF87a" && sig !== "GIF89a") return null;

  const w = bytes[6] | (bytes[7] << 8);
  const h = bytes[8] | (bytes[9] << 8);
  return { w, h };
}

async function gif2params(index: number) {
  const url = GIF_PLAYLIST[index];
  if (!url) throw new Error(`Invalid playlist index: ${index}`);

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch GIF: ${resp.status} ${resp.statusText}`);

  const buf = await resp.arrayBuffer();
  const size = buf.byteLength;

  if (size > 40 * 1024) throw new Error(`GIF too large: ${size} bytes (max 40960 bytes)`);

  const bytes = new Uint8Array(buf);
  const wh = parseGifWidthHeight(bytes);
  if (!wh) throw new Error("Invalid GIF header");

  if (wh.w !== 32 || wh.h !== 16) {
    throw new Error(`Invalid GIF dimensions: ${wh.w}x${wh.h} (expected 32x16)`);
  }

  return {
    method: "talPlayGif" as const,
    params: {
      gifContent: {
        size,
        type: "image/gif",
        url,
      },
    },
  };
}

async function playByIndex(chat: any, index: number) {
  const rpcMsg = await gif2params(index);
  await bot.setDevMessage(chat, myMug, rpcMsg);
}

async function playNext(chat: any) {
  const idx = pickNextIndex();
  await playByIndex(chat, idx);
}

async function playPrev(chat: any) {
  const idx = pickPrevIndex();
  await playByIndex(chat, idx);
}

function stopLoop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startOrRestartLoop(chat: any) {
  stopLoop();

  // immediate play once
  void playNext(chat).catch(async (e) => {
    await bot.sendMessage(chat, `GIF play failed: ${String(e?.message ?? e)}`);
  });

  // schedule next plays
  timer = setInterval(() => {
    void playNext(chat).catch(async (e) => {
      await bot.sendMessage(chat, `GIF play failed: ${String(e?.message ?? e)}`);
    });
  }, intervalMs);
}

// ----------------------
// Bot logic
// ----------------------
bot.on(async (ctx: any) => {
  if (ctx?.message?.content === "/start") {
    await bot.sendMessage(ctx.chat, buildGifPlayerKeyboard());

    startOrRestartLoop(ctx.chat);

    await bot.sendMessage(
      ctx.chat,
      `GIF Player started. Interval: ${intervalLabel(intervalMs)}. Order: ${order}.`
    );
    return;
  }

  const cb = String(ctx?.callback?.value ?? "");
  if (!cb) return;

  // Query (no restart)
  if (cb === "get_interval") {
    await bot.sendMessage(ctx.chat, `Current interval: ${intervalLabel(intervalMs)}.`);
    return;
  }

  if (cb === "get_order") {
    await bot.sendMessage(ctx.chat, `Current order: ${order}.`);
    return;
  }

  // Interval changes (restart loop)
  if (cb === "gif_int_5m") intervalMs = 5 * 60 * 1000;
  if (cb === "gif_int_2m") intervalMs = 2 * 60 * 1000;
  if (cb === "gif_int_30s") intervalMs = 30 * 1000;

  if (cb.startsWith("gif_int_")) {
    startOrRestartLoop(ctx.chat);
    await bot.sendMessage(ctx.chat, `Updated interval: ${intervalLabel(intervalMs)}.`);
    return;
  }

  // Order changes (restart loop)
  if (cb === "gif_order_random") order = "random";
  if (cb === "gif_order_seq") order = "sequential";

  if (cb.startsWith("gif_order_")) {
    startOrRestartLoop(ctx.chat);
    await bot.sendMessage(ctx.chat, `Updated order: ${order}.`);
    return;
  }

  // Manual navigation (no restart)
  if (cb === "gif_next") {
    await playNext(ctx.chat);
    return;
  }

  if (cb === "gif_prev") {
    await playPrev(ctx.chat);
    return;
  }

  // Clear display (no restart)
  if (cb === "gif_clear") {
    await bot.setDevMessage(ctx.chat, myMug, myMug.rpc.talReturn2Home({}));
    await bot.sendMessage(ctx.chat, "Display cleared (returned to home).");
    return;
  }
});

bot.start();
