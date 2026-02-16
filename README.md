
# Bot Development for PixelMug

## 1. Introduction
### 1.1 Overview

The `Bot framework` provides a lightweight, device-centric bot development system designed to run inside the Bubble App. It enables developers to build interactive bots that can communicate directly with hardware devices such as `PixelMug`, unlocking new usage scenarios beyond the device’s standalone capabilities.

A **bubble bot** is not a standalone server process. Instead, it runs within the Bubble App ecosystem. Developers must first apply for and obtain their own bot **token**, which uniquely identifies and authorizes their bot instance within the platform. This token is required to initialize the BotManager and establish a secure runtime session.

### 1.2 Design Philosophy

The Bubble Bot architecture is intentionally modeled after the Telegram Bot ecosystem. This design choice significantly lowers the learning curve for developers who are already familiar with Telegram bot development concepts.

Key similarities include:
- Command registration (/start, etc.)
- Context-based message handling (ctx.message, ctx.callback)
- Inline keyboards for interactive UI
- Event-driven bot logic
- Callback handling for button interactions

By aligning with widely adopted bot interaction patterns, Bubble Bot allows developers to focus on device integration and application logic rather than learning a completely new interaction model.

### 1.3 Device-Centric Interaction Model

Unlike traditional chat bots that primarily generate text responses, **Bubble Bots are fundamentally device-oriented.** The primary objective of a Bubble Bot is to:
- Send RPC requests to hardware devices
- Receive device notifications
- Coordinate real-time interaction between user and hardware

Through this model, developers can build applications that:
- Display dynamic content (text, gif) on PixelMug
- Control device state (brightness, display on/off)
- Synchronize multiple devices
- Automate device behavior based on user interaction

In this sense, Bubble Bot acts as a programmable bridge between:
```sql
User Chat Interaction  →  Bot Runtime  →  Physical Hardware
```

Bubble bot enables developers to extend the functional boundaries of PixelMug, transforming them from standalone smart objects into programmable, interactive endpoints within a conversational interface.

## 2. Dev Environment Setup

Before developing a Bubble Bot, you need to prepare your local development environment. This section explains the required tools and how to set up your project structure.

---

### 2.1 Install Bun

Bubble Bot projects run using **Bun**, a fast JavaScript/TypeScript runtime.  
Installing Bun is the first and most important step.

Follow the official installation guide:

👉 https://bun.com/docs/installation

After installation, verify that Bun is correctly installed by running:

```bash
bun --version
```

If a version number is printed, your Bun environment is ready.

### 2.2 Download SDK Files

To develop a Bubble Bot for PixelMug, you will need the following SDK files:

- **Device SDK**  
  https://devstorage.jeejio.com/BubbleSDK/PixelMug/DeviceSDK_PixelMug_0.1.ts  
  Provides device RPC method definitions and helpers. This file serves as a driver-level 
  interface that exposes the device capabilities to bot developers. **DO NOT MODIFY THIS FILE.** 
  Any changes to this file may result in runtime errors or undefined behavior.

- **Bot SDK**  
  https://devstorage.jeejio.com/BubbleSDK/Bot/Bot_0.2.js  
  Provides bot runtime, message handling, inline keyboard support, and device binding.

- **Text Conversion Utility**  
  https://devstorage.jeejio.com/BubbleSDK/Other/Text2Params.js  
  Converts text into device-ready RPC parameters (for example, rendering text on the display).

### 2.3 Import SDK
Download the files from the links above. Place them into your project directory. Import them into your bot script. Example:


```ts
import { BotManager, InlineKeyBoard } from "./Bot_0.2.js";
import PixelMug from "./DeviceSDK_PixelMug_0.1.ts";
import { text2Tal, Specifications } from "./Text2Params.js";
```

:::note

**Please note that we do not provide cloud hosting services**

* **Environment Setup**: You must provide your own computer or third-party cloud environment to run your bot code.
* **Deployment**: Deploy your scripts to your own infrastructure and communicate with the Bubble platform using your **Bot Token**.
* **Maintenance**: Developers are responsible for the maintenance, security, and scalability of their own servers.
:::

Let's start developing your first Bubble Bot.

## 3. Quick Start

### Example1: Chat with your bot

The first example illustrates the minimal architecture required to build a Bubble Bot using the Bot SDK. Run the script to get the initial impression.

```ts
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

// run bot
bot.start();
```

A bot is first initialized by creating a `BotManager` instance with a valid API token. The token uniquely identifies the bot within the Bubble App ecosystem and allows it to establish a runtime session.

The bot operates using an event-driven model. All incoming updates—such as user messages, inline keyboard button callbacks, device notifications — are delivered through a unified context object (`ctx`) inside a global handler registered with `bot.on(...)`. This handler acts as the central entry point for your application logic, where you inspect the incoming data and decide how the bot should respond.

To reply to users, the bot calls `bot.sendMessage(chat, text)`. In the basic example, the bot listens for incoming text messages and responds with an echo message. After registering the handler, calling `bot.start()` activates the runtime and begins processing events.

This structure represents the fundamental workflow of a Bubble Bot: initialize the bot, register event handlers, process incoming context, and respond via SDK APIs. More advanced features—such as inline keyboards or device control—build on this same architectural pattern.

### Example2: Interact with your PixelMug

The second example builds on the basic bot architecture and introduces **device interaction**, which is the core capability of the Bubble Bot system. When run this bot by `/start` command, you will see an inline keyboard with one "Hello bot" button. If you click the button, you will see green "Hi Mug" text on your mug.

```ts
import { BotManager, InlineKeyBoard } from "./sdk/Bot_0.2.js";
import PixelMug from "./sdk/DeviceSDK_PixelMug_0.1.ts";
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
```

Unlike the first example, which only demonstrated sending text messages back to the user, this version integrates a physical PixelMug device. The key addition is the use of `bot.bindDevices(myMug)`. This step registers the device instance with the bot runtime and enables device attachment inside the Bubble App. Without calling `bindDevices`, the bot cannot route RPC calls to the hardware. It is the essential bridge between chat interaction and physical device control.

Another important addition is the use of `InlineKeyBoard`. Instead of responding immediately to a text message, the bot sends an interactive keyboard:

```ts
new InlineKeyBoard("Click to show on PixelMug")
  .text("Hello bot", "hi_bot");
```

Each button has:
- A visible label ("Hello bot")
- A callback value ("hi_bot")

When the user clicks the button, the callback value is delivered to ctx.callback.value, allowing the bot to execute specific logic.

The device interaction itself happens through:
```ts
bot.setDevMessage(ctx.chat, myMug, rpcMsg);
```

This method sends an RPC command to the bound device. It connects the chat session (ctx.chat) with the specific hardware instance (myMug) and executes the provided RPC message.

The RPC message in this example is generated using `text2Tal(...)`. This helper function converts plain text into a properly structured device RPC payload that PixelMug understands. It handles font configuration and formatting, allowing developers to focus on content rather than low-level device parameters. After generating the RPC object, additional parameters such as direction or speed can be customized before sending.

In summary, compared to the basic echo bot, this example demonstrates:
- Binding a hardware device to the bot runtime
- Creating interactive inline keyboards
- Handling callback events
- Generating structured RPC messages
- Sending requests to PixelMug

This pattern forms the foundation for building interactive, hardware-powered Bubble Bot applications.

### Example3: Device notification

This example demonstrates how a bot **listens for device-reported notifications** and forwards meaningful updates to the user. The scenario implemented here is a simple “power state reporter”: When the PixelMug is placed on or taken from the charging base, the bot will push a **Charging Now** or **Not Charging** message into the chat, giving the user real-time device status updates.

```ts
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

bot.start();
```


The key difference is the first branch in the handler:

```ts
if (ctx?.rpc?.notify?.length) { ... }
```

Here, the bot checks whether the incoming context contains an RPC notification frame from the device. These notifications are device-to-bot messages (asynchronous reports), and they should be handled with higher priority than normal chat messages or inline keyboard callbacks. That is why the code processes `ctx.rpc.notify` first and then `return`s immediately to avoid mixing notification handling with other logic.

Raw notification frames are typically not convenient to use directly, so the Device SDK provides:

```ts
const parsed = myMug.parseNotify(ctx.rpc.notify);
```

`parseNotify(...)` converts the raw RPC notification list into a structured array of events, each containing a `name` and `params`. This allows the bot to filter and react to specific device events in a clean way:

```ts
if (n.name === "CurChargingState") {
  const value = n.params.value;
}

```

Once the charging state is extracted, the bot optionally forwards it to the user. This example introduces a basic subscription mechanism using an inline keyboard. The user chooses Yes/No, and the bot stores the chat reference (subscribedChat) so it knows where to push future updates.

### Example4: Multiple devices

This example demonstrates a **multi-device interaction scenario** using two PixelMug devices. The application concept is simple: a **"word by word"** display experience. When a user sends a message containing two words (for example, “Boy Girl”), the bot extracts the first word and displays it on the first mug, and the second word on the second mug. This creates a coordinated dual-device effect, where each mug becomes part of a combined visual output.

```ts
import { BotManager, InlineKeyBoard } from "./sdk/Bot_0.2.js";
import PixelMug from "./sdk/DeviceSDK_PixelMug_0.1.ts";
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
```

The above example includes two interaction modes:
- Manual input mode – The bot listens to `ctx.message.content`, extracts the first two words, and sends them separately to each mug.
- Try mode (InlineKeyboard) – The bot provides predefined word pairs (e.g., “Boy Girl”, “Bride Groom”, “Dad Mom”) so users can quickly test the dual-display effect. There is also a “Clear Display” option that sends a `talReturn2Home` command to both devices.

The most important difference from previous examples is that this bot binds **two separate PixelMug devices**:

```ts
const mug1 = new PixelMug();
const mug2 = new PixelMug();

bot.bindDevices(mug1, mug2);
```

By passing two device instances into `bindDevices`, the bot runtime registers both devices for RPC routing. In the Bubble App, the user must attach two physical PixelMug units to this bot. Each attached device corresponds to one instance (`mug1` and `mug2`). Once attached, the bot logic can independently send RPC commands to either device using:

```ts
bot.setDevMessage(chat, mug1, rpcMsg);
bot.setDevMessage(chat, mug2, rpcMsg);
```

This enables synchronized or differentiated control between multiple hardware units within the same chat session.

This example illustrates how Bubble Bot can scale from single-device control to coordinated multi-device orchestration. By binding multiple device instances and addressing them explicitly in the bot logic, developers can build richer hardware-driven experiences that extend beyond the capabilities of a single PixelMug.

## 4. Demos

### Control Panel

  *Source code*: https://devstorage.jeejio.com/04_control_pannel.ts  

  *Idea*: This bot implements a **PixelMug Control Panel** inside the Bubble Bot environment. When the user sends `/start`, the bot displays a multi-row control panel. Each row corresponds to a specific device capability, including reading water temperature, checking and adjusting brightness, retrieving battery level and WiFi information, clearing the display, querying or toggling the display state, enabling or disabling bottom-swipe app switching, and rebooting the device.

### Gif Player

  *Source code*: https://devstorage.jeejio.com/05_gif_player.ts 

  *Idea*: This bot implements an interactive **GIF Player** for PixelMug. It allows users to control animated content on the device through a structured inline control panel inside the Bubble App. When the user sends `/start`, the bot opens a “GIF Player” interface. From there, users can:
  - Set the playback interval (Long / Medium / Short)
  - Choose the playback order (Sequential or Random)
  - Manually switch to the previous or next GIF
  - Clear the display instantly

  The bot maintains an internal playlist (`GIF_PLAYLIST`) containing multiple GIF URLs. It automatically cycles through this list according to the selected interval and playback mode. Before sending any GIF to the device, the bot validates the file by checking:
  - File size (must be ≤ 40KB)
  - Dimensions (must be exactly 32×16)
  - Valid GIF header (GIF87a / GIF89a)

  Only GIFs that meet these constraints will be played, ensuring compatibility with PixelMug.

  Most importantly, developers can easily customize the experience by **adding their own GIF URLs to the `GIF_PLAYLIST` array**. As long as the GIF files follow the size and resolution requirements, they can be freely inserted into the playlist. This makes the bot highly extensible and suitable for themed animations, promotional content, seasonal graphics, or personalized visual effects.

### E-Scoreboard

  *Source code*: https://devstorage.jeejio.com/06_score_board.ts

  *Idea*: This bot implements a simple **E-Scoreboard** for PixelMug. It turns the device into a live score display that can be controlled directly from the chat interface using inline buttons. When the user sends `/start`, the bot opens a “Scoreboard” keyboard with four controls:
  - **Home** – increments the home team score  
  - **Visit** – increments the visiting team score  
  - **Reset** – resets both scores to 0  
  - **Exit** – clears the display and exits the scoreboard mode  

The current score is formatted as: HomeScore : VisitScore. For example `3 : 2`.

## 4. From Hardware to Creativity

While PixelMug has limited hardware resources and a defined set of device APIs, the true potential emerges when it is combined with the Bubble Bot framework. By bringing users and devices together through a conversational bot interface, simple hardware capabilities can be transformed into rich, interactive applications.

With this model, PixelMug is no longer just a display device — it becomes a programmable endpoint in a chat-driven workflow. Developers can build creative use cases such as **displaying stock prices or Bitcoin updates, sending reminders for medication or meetings, or pushing real-time notifications from external services such as weather updates, package tracking.**

The power lies not in expanding hardware complexity, but in leveraging conversational logic and automation around it. We encourage developers to experiment, explore new ideas, and build interesting bots that extend the boundaries of what a small device can do. Share your creations with the community and help grow the ecosystem of interactive, device-powered applications.
