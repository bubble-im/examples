/**
 * ------------------------------------------------------------
 * PixelMug Control Panel Demo (Get / Set Methods Showcase)
 * ------------------------------------------------------------
 * This demo shows a minimal “control panel” bot that interacts
 * with a PixelMug device using the Device SDK.
 *
 * Focus:
 * - GET methods: read device state / info (temperature, brightness, battery,
 *   WiFi info, display switch state).
 * - SET methods: change device state (set brightness, turn display on/off,
 *   enable/disable home swipe, reboot, clear display).
 *
 * Interaction model:
 * - User sends /start
 * - Bot sends an InlineKeyboard (control panel)
 * - User clicks buttons
 * - Bot calls bot.setDevMessage(chat, device, rpc) to execute RPC calls
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
// Control Panel State (in-memory cache)
// ----------------------
let cachedBrightness: number | null = null; // expected: 20..100
let cachedDisplayOn: boolean | null = null;

// ----------------------
// Commands
// ----------------------
bot.setMyCommands([
  {
    command: "start",
    description: "Open control panel",
  },
]);

/**
 * Extract number value from RPC response.
 */
function extractNumberValue(resp: any): number | null {
  const v = resp?.result?.[0]?.result?.value;
  return typeof v === "number" ? v : null;
}

/**
 * Extract boolean value from RPC response.
 */
function extractBoolValue(resp: any): boolean | null {
  const v = resp?.result?.[0]?.result?.value;
  return typeof v === "boolean" ? v : null;
}

/**
 * Build the control panel keyboard.
 * Layout (rows):
 *  1) Water Temperature
 *  2) Brightness / Up / Down
 *  3) Battery Level / WiFi Info
 *  4) Clear Display
 *  5) Display State / Turn on / Turn off
 *  6) Enable Swipe / Disable Swipe
 *  7) Reboot
 */
function buildControlPanelKeyboard() {
  const kb = new InlineKeyBoard("Control Panel");

  // Row 1
  kb.text("Water Temperature", "cp_temp");
  kb.row();

  // Row 2
  kb.text("Brightness", "cp_brightness_get")
    .text("UP+", "cp_brightness_inc")
    .text("Down-", "cp_brightness_dec");
  kb.row();

  // Row 3
  kb.text("Battery Level", "cp_battery").text("WiFi Info", "cp_wifi");
  kb.row();

  // Row 4
  kb.text("Clear Display", "cp_clear");
  kb.row();

  // Row 5
  kb.text("Display", "cp_display_get")
    .text("Turn on", "cp_display_on")
    .text("Turn off", "cp_display_off");
  kb.row();

  // Row 6
  kb.text("Enable Swipe", "cp_swipe_on").text("Disable Swipe", "cp_swipe_off");
  kb.row();

  // Row 7
  kb.text("Reboot", "cp_reboot");

  return kb;
}

// ----------------------
// Bot Logic
// ----------------------
bot.on(async (ctx: any) => {
  // /start => show control panel
  if (ctx?.message?.content === "/start") {
    const kb = buildControlPanelKeyboard();
    await bot.sendMessage(ctx.chat, kb);
    return;
  }

  // Handle callbacks
  const cb = String(ctx?.callback?.value ?? "");
  if (!cb) return;

  // ---------- Row 1: Temperature (GET) ----------
  if (cb === "cp_temp") {
    const resp = await bot.setDevMessage(
      ctx.chat,
      myMug,
      myMug.rpc.talGetCupTemperature({})
    );

    const v = extractNumberValue(resp);
    if (v != null) {
      await bot.sendMessage(ctx.chat, `Water Temperature: ${v}°F`);
    } else {
      await bot.sendMessage(ctx.chat, "Failed to read water temperature.");
    }
    return;
  }

  // ---------- Row 2: Brightness (GET / SET) ----------
  if (cb === "cp_brightness_get") {
    const resp = await bot.setDevMessage(
      ctx.chat,
      myMug,
      myMug.rpc.talGetBrightness({})
    );

    const v = extractNumberValue(resp);
    if (v != null) cachedBrightness = v;

    await bot.sendMessage(
      ctx.chat,
      v != null ? `Brightness: ${v}` : "Failed to read brightness."
    );
    return;
  }

  if (cb === "cp_brightness_inc" || cb === "cp_brightness_dec") {
    // If brightness not cached, read once first
    if (cachedBrightness == null) {
      const r0 = await bot.setDevMessage(
        ctx.chat,
        myMug,
        myMug.rpc.talGetBrightness({})
      );
      const v0 = extractNumberValue(r0);
      if (v0 != null) cachedBrightness = v0;
    }

    // Apply step with clamp: min 20, max 100
    const cur = cachedBrightness ?? 20;
    const next =
      cb === "cp_brightness_inc"
        ? Math.min(100, cur + 10)
        : Math.max(20, cur - 10);

    cachedBrightness = next;

    await bot.setDevMessage(
      ctx.chat,
      myMug,
      myMug.rpc.talSetBrightness({ percent: next })
    );

    await bot.sendMessage(ctx.chat, `Brightness set to ${next}`);
    return;
  }

  // ---------- Row 3: Battery (GET) ----------
  if (cb === "cp_battery") {
    const resp = await bot.setDevMessage(
      ctx.chat,
      myMug,
      myMug.rpc.talGetBatteryLevel({})
    );

    const v = extractNumberValue(resp);
    if (v != null) {
      await bot.sendMessage(ctx.chat, `Battery Level: ${v}%`);
    } else {
      await bot.sendMessage(ctx.chat, "Failed to read battery level.");
    }
    return;
  }

  // ---------- Row 3: WiFi Info (GET) ----------
  if (cb === "cp_wifi") {
    const resp = await bot.setDevMessage(
      ctx.chat,
      myMug,
      myMug.rpc.talGetWifiInfo({})
    );

    const info = resp?.result?.[0]?.result?.value;
    await bot.sendMessage(ctx.chat, `WiFi: ${String(info)}`);
    return;
  }

  // ---------- Row 4: Clear Display (SET) ----------
  if (cb === "cp_clear") {
    await bot.setDevMessage(ctx.chat, myMug, myMug.rpc.talReturn2Home({}));
    await bot.sendMessage(ctx.chat, "Display cleared.");
    return;
  }

  // ---------- Row 5: Display State / On / Off (GET / SET) ----------
  if (cb === "cp_display_get") {
    const resp = await bot.setDevMessage(
      ctx.chat,
      myMug,
      myMug.rpc.talGetSwitch({})
    );

    const v = extractBoolValue(resp);
    if (v != null) cachedDisplayOn = v;

    await bot.sendMessage(
      ctx.chat,
      v != null ? `Display State: ${v ? "ON" : "OFF"}` : "Failed to read display state."
    );
    return;
  }

  if (cb === "cp_display_on" || cb === "cp_display_off") {
    const onoff = cb === "cp_display_on";
    cachedDisplayOn = onoff;

    await bot.setDevMessage(
      ctx.chat,
      myMug,
      myMug.rpc.talSetDisplayOnOff({ onoff })
    );

    await bot.sendMessage(ctx.chat, onoff ? "Display turned ON." : "Display turned OFF.");
    return;
  }

  // ---------- Row 6: Swipe Enable / Disable (SET) ----------
  if (cb === "cp_swipe_on" || cb === "cp_swipe_off") {
    const isSwipe = cb === "cp_swipe_on";

    await bot.setDevMessage(
      ctx.chat,
      myMug,
      myMug.rpc.talSetHomeSwipeEnable({ isSwipe })
    );

    await bot.sendMessage(
      ctx.chat,
      isSwipe
        ? "You can now switch apps by swiping at the bottom of the screen."
        : "Bottom swipe app switching has been turned off."
    );
    return;
  }

  // ---------- Row 7: Reboot (SET) ----------
  if (cb === "cp_reboot") {
    await bot.setDevMessage(ctx.chat, myMug, myMug.rpc.talRebootDevice({}));
    await bot.sendMessage(ctx.chat, "PixelMug is rebooting…");
    return;
  }
});

bot.start();
