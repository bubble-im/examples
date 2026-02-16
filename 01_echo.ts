/**
 * ------------------------------------------------------------
 * Basic Bot Example
 * ------------------------------------------------------------
 * This example demonstrates the minimal structure required to
 * develop a bot using the Bot SDK.
 *
 * It shows:
 * 1. How to initialize a BotManager instance with an API token.
 * 2. How to register a global message handler using `bot.on(...)`.
 * 3. How to use the `sendMessage` API to send a message back to
 *    the current chat.
 *
 * In this demo, the bot listens for incoming messages and replies
 * with an "echo" response using:
 *
 *   bot.sendMessage(chat, text)
 *
 * This illustrates the fundamental bot workflow:
 *   Initialize → Handle Context → Call API → Start Runtime
 *
 * This serves as a starting template for building more advanced
 * bot logic such as commands, inline keyboards, or device control.
 * ------------------------------------------------------------
 */

// import Bot SDK
import { BotManager } from "./sdk/Bot_0.2.js";

// API Token, Put the API Token you just applied for here
const token = "your_bot_token"

// Create your bot with the token
const bot = new BotManager(token);

bot.on(async (ctx) => {
  const content = ctx?.message?.content;

  if (content) {
    await bot.sendMessage(
      ctx.chat,
      `Echo your message: ${content}`
    );
  }
});

/**
 * run bot
 */
bot.start();
