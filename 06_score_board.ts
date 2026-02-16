// import Bot SDK
import { BotManager, InlineKeyBoard } from "./sdk/Bot_1.0.js";
import PixelMug from "./sdk/DeviceSDK_PixelMug_0.1.ts";
// Text to Params
import { text2Tal, Specifications } from "./sdk/Text2Params.js";

// API Token
const token = "your_bot_token";

// 1.Create Bot Manager instance
const bot = new BotManager(token);
// 2.Instantiate device
const sbd = new PixelMug();
// 3.Sync devices
bot.bindDevices(sbd);

// ----------------------
// Scoreboard demo state
// ----------------------
let homeScore = 0;
let visitScore = 0;

function scoreText() {
  return `${homeScore} : ${visitScore}`;
}

async function showScoreOnPixelMug(ctx: any) {
  const text = scoreText();
  const rpcParams = await text2Tal(text, Specifications.SMALL, "#ff0000");
  rpcParams.params.direction = 0; // no scrolling, just static display
  // rpcParams.params.speed = 10;
  bot.setDevMessage(ctx.chat, sbd, rpcParams);
  bot.sendMessage(ctx.chat, `Score updated: \`${text}\``);
}

// ----------------------
// Bot commands
// ----------------------
bot.setMyCommands([
  {
    command: "start",
    description: "Scoreboard demo",
  },
]);

bot.on(async (ctx: any) => {
  // /start => show keyboard
  if (ctx?.message?.content === "/start") {
    const kbd = new InlineKeyBoard("Scoreboard")
      .text("Home", "score_home")
      .text("Visit", "score_visit")
      .row()
      .text("Reset", "score_reset")
      .row()
      .text("Exit", "exit_game");

    bot.sendMessage(ctx.chat, kbd);

    // optional: also render initial score
    await showScoreOnPixelMug(ctx);
    return;
  }

  // callbacks
  if (ctx?.callback?.value) {
    if (ctx.callback.value === "score_home") {
      homeScore += 1;
      await showScoreOnPixelMug(ctx);
      return;
    }

    if (ctx.callback.value === "score_visit") {
      visitScore += 1;
      await showScoreOnPixelMug(ctx);
      return;
    }

    if (ctx.callback.value === "score_reset") {
      homeScore = 0;
      visitScore = 0;
      await showScoreOnPixelMug(ctx);
      return;
    }
    if (ctx.callback.value === "exit_game") {
      bot.setDevMessage(ctx.chat, sbd, sbd.rpc.call("talReturn2Home", {}));
      bot.sendMessage(ctx.chat, "Game exited.");
      return;
    }   
  }
});

bot.start();
