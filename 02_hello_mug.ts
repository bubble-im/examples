/**
 * ------------------------------------------------------------
 * Hello PixelMug Bot (Getting Started Example)
 * ------------------------------------------------------------
 * This is the first example demonstrating how to build a bot
 * that interacts directly with a PixelMug device.
 *
 * Use Case:
 * - A user sends a command (/start)
 * - The bot responds with an InlineKeyboard
 * - The user clicks a button
 * - The bot sends a device RPC call to PixelMug via setDevMessage()
 *
 * Core Concepts Demonstrated:
 *
 * 1️⃣ Command (cmd)
 *    We register "/start" using setMyCommands().
 *    When the user types /start, the bot sends an interactive UI.
 *
 * 2️⃣ InlineKeyboard
 *    InlineKeyboard provides clickable buttons inside chat.
 *    Each button contains:
 *      - text  → what the user sees
 *      - value → callback identifier received in ctx.callback
 *
 * 3️⃣ bindDevices(device)
 *    This is a critical integration step.
 *
 *    bindDevices() registers the device instance into the bot runtime.
 *    In the Bubble App, users must complete the device attach process
 *    (use the builtin /attachdevice cmd to bind PixelMug to this bot).
 *
 *    Only after attachment:
 *      - The bot can send RPC calls
 *      - The device can receive setDevMessage instructions
 *      - The chat context is mapped to a real hardware session
 *
 *    Without bindDevices(), device RPC routing will not work.
 *
 * 4️⃣ setDevMessage(chat, device, rpc)
 *    Sends an RPC request to the bound device.
 *    This bridges:
 *        Chat Interaction → Bot Runtime → Device RPC → PixelMug Hardware
 *
 *
 * This file serves as a minimal template for building
 * interactive PixelMug-powered bots.
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

// 2. Instantiate device
const myMug = new PixelMug();

// 3. Bind device to bot runtime
//    Required for Bubble App device attachment & RPC routing
bot.bindDevices(myMug);

// 4. Register command
bot.setMyCommands([
  {
    command: "start",
    description: "Show hello bot keyboard",
  },
]);

bot.on(async (ctx) => {
  // Handle /start command
  if (ctx?.message?.content === "/start") {

    const kbd = new InlineKeyBoard("Click to show on PixelMug")
      .text("Hello bot", "hi_bot");

    await bot.sendMessage(ctx.chat, kbd);
  }

  // Handle inline callback
  if (ctx?.callback?.value === "hi_bot") {
    // Build RPC message from text
    const rpcMsg = await text2Tal(
      "Hi Mug",
      Specifications.SMALL,
      "#00ff00"
    );
    rpcMsg.params.direction = 0;
    // rpcMsg.params.speed = 10;  

    await bot.setDevMessage(ctx.chat, myMug, rpcMsg);

    await bot.sendMessage(ctx.chat, "Displayed on PixelMug!");
  }
});

bot.start();
