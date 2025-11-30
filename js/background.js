const OFFSCREEN_PATH = "html/off_screen.html";
const DOMAIN = "https://nathanissahar.me";
const TEST_MESSAGES = [
  {
    ok: true,
    result: {
      user_id: 13,
      text: `Yes, the sky looks a bit cloudy today, but according to the forecast the clouds should clear by the evening. Usually, after this kind of weather, the sunset turns out especially beautiful.If you’re planning to go for a walk, it might be a good idea to take a light jacket with you.It’s still warm enough during the day, but the temperature tends to drop once the sun sets, especially if the wind picks up.If you’re planning to go for a walk, it might be a good idea to take a light jacket with you.It’s still warm enough during the day, but the temperature tends to drop once the sun sets, especially if the wind picks up.`,
    },
  },
  {
    ok: true,
    result: {
      user_id: 13,
      text: `If you’re planning to go for a walk, it might be a good idea to take a light jacket with you.It’s still warm enough during the day, but the temperature tends to drop once the sun sets, especially if the wind picks up.If you’re planning to go for a walk, it might be a good idea to take a light jacket with you.It’s still warm enough during the day, but the temperature tends to drop once the sun sets, especially if the wind picks up.If you’re planning to go for a walk, it might be a good idea to take a light jacket with you.It’s still warm enough during the day, but the temperature tends to drop once the sun sets, especially if the wind picks up.`,
    },
  },
  {
    ok: true,
    result: {
      user_id: 13,
      text: `By the way, tomorrow’s forecast looks much better — they’re saying it should be sunny almost all day. That could be a great opportunity to plan something outdoors, maybe even a short trip outside the city.If you’re planning to go for a walk, it might be a good idea to take a light jacket with you.It’s still warm enough during the day, but the temperature tends to drop once the sun sets, especially if the wind picks up.If you’re planning to go for a walk, it might be a good idea to take a light jacket with you.It’s still warm enough during the day, but the temperature tends to drop once the sun sets, especially if the wind picks up.`,
    },
  },
  {
    ok: true,
    result: {
      user_id: 13,
      text: `In general, these little shifts in the weather can be a nice reminder to slow down a bit. Spending some time outside, even just for an hour, often helps clear the head and gives a fresh perspective.If you’re planning to go for a walk, it might be a good idea to take a light jacket with you.It’s still warm enough during the day, but the temperature tends to drop once the sun sets, especially if the wind picks up.If you’re planning to go for a walk, it might be a good idea to take a light jacket with you.It’s still warm enough during the day, but the temperature tends to drop once the sun sets, especially if the wind picks up.`,
    },
  },
];
const TEST_HTML = [
  `<div class="translation-result">
    <div class="part-of-speech">глагол, существительное</div>
    <div class="meaning-card">
        <div class="context">Двигаться быстро, перемещаясь на ногах</div>
        <div class="translation">бежать</div>
        <div class="example">I run every morning.</div>
    </div>
    <div class="meaning-card">
        <div class="context">Осуществлять управление, руководить</div>
        <div class="translation">управлять, руководить</div>
        <div class="example">She runs a small company.</div>
    </div>
    <div class="meaning-card">
        <div class="context">Период показа или действия чего-либо</div>
        <div class="translation">период, серия, показ</div>
        <div class="example">The show had a three-year run.</div>
    </div>
</div>`,
  `<div class="translation-result">
    <div class="part-of-speech">идиома</div>
    <div class="meaning-card">
        <div class="context">Пожелание удачи, особенно перед выступлением</div>
        <div class="translation">ни пуха ни пера</div>
        <div class="example">Break a leg, you're going to do great!</div>
    </div>
</div>`,
];
const CONTEXT_MENU_ID = "ai_translate";
var contextMenu = false;
var mainPageID = null;
var responseFunc = null;
var controller = null;

function CreateContextMenu() {
  try {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "AI Translate",
      contexts: ["selection"],
    });
  } catch (_) {}
}

function RemoveContextMenu() {
  try {
    chrome.contextMenus.remove(CONTEXT_MENU_ID);
  } catch (_) {}
}

chrome.runtime.onInstalled.addListener(() => {
  GetSettings().then((settings) => {
    if (settings && settings.context_menu) {
      CreateContextMenu();
    } else if (settings && settings.context_menu === undefined) {
      CreateContextMenu();
    }
  });

  // chrome.tabs.create({
  //   url: chrome.runtime.getURL("html/welcome.html"),
  // });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "ai_translate") {
    console.log("sending message to content.js");
    // mainPageID = tab.id;
    chrome.tabs.sendMessage(tab.id, {
      action: "translate",
      text: info.selectionText,
    });
  }
});

async function TranslateAWord(msg, responseF) {
  try {
    console.log("[DEBUG]", msg);
    const response = await fetch(
      DOMAIN + "/ai_translate/v2.1/translate/get_json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      },
    );
    const data = await response.json();
    if (data && data.ok) {
      console.log("hiV1! ", data);
      responseF(data);
    } else if (data && !data.ok) {
      console.log("hiV2! ", data);
      responseF(data);
    }
  } catch (err) {
    responseF({
      ok: false,
      result: { user_id: msg.user_id, error: err.toString() },
    });
  }
}

async function ChangeLanguage(msg, responseF) {
  try {
    const response = await fetch(
      DOMAIN + "/ai_translate/v2.1/change_language",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      },
    );
    const data = await response.json();
    responseF(data);
  } catch (err) {
    responseF({ ok: false, error: err.toString() });
  }
}

/**
 * @param {chrome.runtime.Port} port
 * @param {{ user_id: number; language: string; text: string; }} msg
 */
async function requestResponse(port, msg) {
  try {
    var signal, response, contenttype, reader, line, err;

    controller = new AbortController();
    signal = controller.signal;
    response = await fetch(DOMAIN + "/ai_translate/v2.1/translate/get_stream", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    contenttype = response.headers.get("content-type") || "";

    if (contenttype.includes("application/json")) {
      try {
        console.log(response);
        err = await response.json();
        console.warn(err);
        port.postMessage({ ok: false });
      } catch (e) {
        console.error(e);
        port.postMessage({ ok: false });
      }
      messageHandler({ action: "abort_stream" }, null, null);
      controller = null;
    } else if (contenttype.includes("text/event-stream")) {
      try {
        reader = response.body.getReader();
        do {
          line = await reader.read();
          if (line.value) {
            // s += line.value
            port.postMessage({ ok: true, chunk: Array.from(line.value) });
          }
        } while (!line.done);

        port.postMessage({ done: true });
      } catch (e) {
        console.error(e);
        port.postMessage({ ok: false });
      }
      messageHandler({ action: "abort_stream" }, null, null);
      controller = null;
    } else {
      console.error("unexpected content type");
      port.postMessage({ ok: false });
      messageHandler({ action: "abort_stream" }, null, null);
      controller = null;
    }
  } catch (e) {
    port.postMessage({ ok: false });
    messageHandler({ action: "abort_stream" }, null, null);
    controller = null;
  }
}

/**
 * @param {object} msg
 * @param {number} chunkSize
 * @returns {ReadableStream<Uint8Array>}
 */
function jsonMessageToSSEStream(msg, chunkSize = 5) {
  const words = msg.result.text.split(" ");
  let i = 0;

  return new ReadableStream({
    pull(controller) {
      if (i < words.length) {
        const chunkMsg = {
          ...msg,
          result: {
            ...msg.result,
            text: words.slice(i, i + chunkSize).join(" "),
          },
        };

        const sseChunk = `event: data\ndata: ${JSON.stringify(chunkMsg)}\n\n`;
        controller.enqueue(new TextEncoder().encode(sseChunk));
        i += chunkSize;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * @param {number} ms
 * @returns {Promise<any>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testRequestResponse(port, msg) {
  await sleep(3000);
  const reader = jsonMessageToSSEStream(
    TEST_MESSAGES[Math.floor(Math.random() * 4)],
    5,
  ).getReader();
  let line;

  do {
    line = await reader.read();
    if (line.value) {
      port.postMessage({ ok: true, chunk: Array.from(line.value) });
    }
  } while (!line.done);

  port.postMessage({ done: true });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "stream") {
    port.onMessage.addListener(requestResponse.bind(this, port));
  } else if (port.name === "test_stream") {
    port.onMessage.addListener(testRequestResponse.bind(this, port));
  }
});

async function GetUserID() {
  var userID = await new Promise((resolve) => {
    chrome.storage.local.get(["user_id"], (result) => {
      resolve({ user_id: Number(result.user_id) || 0 });
    });
  });
  console.log("[DEBUG] user_id:", userID);
  return userID;
}

async function GetLangauge() {
  var lang = await new Promise((resolve) => {
    chrome.storage.local.get(["settings_target_lang"], (result) => {
      resolve({
        language: result.settings_target_lang || navigator.language.slice(0, 2),
      });
    });
  });
  return lang;
}

async function GetSettings() {
  var settings;
  settings = await new Promise((resolve) => {
    chrome.storage.local.get(["settings"], (result) => {
      resolve(result.settings || { null: null });
    });
  });
  return settings;
}

async function DeepLTranslate(msg, responsef) {
  try {
    const response = await fetch(
      DOMAIN + "/ai_translate/v2.1/translate/deepl",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      },
    );
    const data = await response.json();
    if (data && data.ok) {
      responsef(data);
    } else if (data && !data.ok) {
      responsef(data);
    }
  } catch (err) {
    responsef({
      ok: false,
      result: { user_id: msg.user_id, error: err.toString() },
    });
  }
}

async function messageHandler(msg, sender, response) {
  if (msg.action === "get_user_id") {
    GetUserID().then((userID) => response(userID));
  } else if (msg.action === "get_language") {
    GetLangauge().then((lang) => response(lang));
  } else if (msg.action === "translate_one_word") {
    TranslateAWord(msg.data, response);
  } else if (msg.action === "test_translate_one_word") {
    // test
    sleep(3000).then(() => {
      response({
        ok: true,
        result: {
          user_id: msg.data.user_id,
          text: TEST_HTML[Math.random() < 0.5 ? 0 : 1],
        },
      });
    });
  } else if (msg.action === "change_language") {
    ChangeLanguage(msg.data, response);
  } else if (msg.action === "abort_stream") {
    if (controller !== null) {
      controller.abort();
    }
  } else if (msg.action === "get_settings") {
    GetSettings().then((settings) => response(settings));
  } else if (msg.action === "save_settings") {
    chrome.storage.local.set({ settings: msg.settings });
    if (!msg.settings.context_menu) {
      RemoveContextMenu();
    } else {
      CreateContextMenu();
    }
    response({ null: null });
  } else if (msg.action === "save_language") {
    GetUserID().then((info) => {
      ChangeLanguage(
        { user_id: info.user_id, lang_code: msg.language },
        response,
      );
    });
    chrome.storage.local.set({ new_language: msg.language });
    console.log("the new language is:", msg.language);
    // response({ ok: true });
  } else if (msg.action === "read_clipboard") {
    navigator.clipboard
      .readText()
      .then((text) => response(text))
      .catch(() => response(""));
  } else if (msg.action === "write_clipboard") {
    navigator.clipboard
      .writeText(msg.text)
      .then(() => response({ null: null }))
      .catch(() => response({ null: null }));
  } else if (msg.action === "deepl_translation") {
    DeepLTranslate(msg.data, response);
  } else if (msg.action === "deepl_translation_test") {
    await sleep(599);
    response({
      ok: true,
      result: {
        user_id: msg.user_id,
        source_lang: "ru",
        text: Math.random().toString(36).slice(2, 10),
      },
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageHandler(message, sender, sendResponse);
  return true;
});
