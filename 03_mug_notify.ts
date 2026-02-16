/**
 * ------------------------------------------------------------
 * PixelMug Device Notification Listener Example
 * ------------------------------------------------------------
 * This example demonstrates how to listen to device-side
 * notifications (RPC notify frames) and forward them to users.
 *
 * Scenario:
 * - The PixelMug device reports state changes (e.g. charging state).
 * - The bot receives RPC notifications via ctx.rpc.notify.
 * - The bot parses notifications using device SDK helpers.
 * - If the user has subscribed, the bot forwards the update.
 *
 * Key Concepts:
 *
 * 1️⃣ Device Notification (RPC Notify)
 *    When the device pushes state updates, they arrive in:
 *        ctx.rpc.notify
 *    This contains raw RPC notification frames.
 *
 * 2️⃣ parseNotify(...)
 *    The device SDK provides a parser to convert raw RPC frames
 *    into structured event objects with:
 *        { name, params }
 *
 * 3️⃣ Subscription Control
 *    Since device notifications are global, we implement a simple
 *    subscription mechanism:
 *        - User clicks "Yes" to subscribe
 *        - Bot stores the chat reference
 *        - Only subscribed chats receive device updates
 *
 * 4️⃣ Separation of Logic
 *    We prioritize device notification handling before normal
 *    message processing to avoid side effects.
 *
 * This pattern is recommended for:
 * - Power state monitoring
 * - Sensor updates
 * - Button events
 * - Real-time hardware status reporting
 * ------------------------------------------------------------
 */

// import Bot SDK
import { BotManager, InlineKeyBoard } from "./sdk/Bot_0.2.js";

// import device SDK
import PixelMug from "./sdk/DeviceSDK_PixelMug_0.1.ts";

// API Token
const token = "your_bot_token";

// Create bot instance
const bot = new BotManager(token);

// Instantiate device
const myMug = new PixelMug();

// Bind device to bot runtime (required for RPC routing)
bot.bindDevices(myMug);

// Subscription state
let subscribed = false;
let subscribedChat: any = null; // Store subscribed chat reference

bot.on(async (ctx) => {

  // ----------------------------
  // 1. Handle device notifications first
  // ----------------------------
  if (ctx?.rpc?.notify?.length) {    

    // Parse raw notify frames into structured events
    const parsed = myMug.parseNotify(ctx.rpc.notify);
    if (!parsed.length) return;

    // Iterate parsed notifications
    for (const n of parsed) {
      if (n.name === "CurChargingState") {
        const value = (n.params as any)?.value;
        const textMsg = value ? "Charging Now" : "Not Charging";

        // Forward only if subscribed
        if (subscribed && subscribedChat) {
          await bot.sendMessage(subscribedChat, `[Power State] ${textMsg}`);
        }
      }
    }

    return; // Stop further processing for notify frames
  }

  // ----------------------------
  // 2. Handle inline keyboard callbacks (subscription)
  // ----------------------------
  if (ctx?.callback?.value) {
    const v = String(ctx.callback.value);
    const yes = v === "y";

    subscribed = yes;
    subscribedChat = yes ? ctx.chat : null;

    await bot.sendMessage(
      ctx.chat,
      yes
        ? "✅ Subscribed. I will report power state changes."
        : "❎ Unsubscribed."
    );

    return;
  }

  // ----------------------------
  // 3. Handle regular chat messages
  // ----------------------------
  if (ctx?.chat) {

    // Show subscription keyboard if not yet subscribed
    if (!subscribed) {
      const kb = new InlineKeyBoard("Subscribe to Power State Reporting?")
        .text("Yes", "y")
        .text("No", "n");

      await bot.sendMessage(ctx.chat, kb);

    } else {
      // Optional: notify user they are subscribed
      await bot.sendMessage(
        ctx.chat,
        "You're subscribed. Waiting for device reports…"
      );
    }
  }
});

// Start bot runtime
bot.start();
