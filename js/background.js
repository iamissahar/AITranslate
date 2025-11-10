const OFFSCREEN_PATH = "html/off_screen.html";
const DOMAIN = "https://nathanissahar.me";
var mainPageID = null;
var responseFunc = null;
var controller = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ai_translation",
    title: "AI Translation",
    contexts: ["selection"],
  });

  // chrome.tabs.create({
  //   url: chrome.runtime.getURL("html/welcome.html"),
  // });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "ai_translation") {
    console.log("sending message to content.js");
    mainPageID = tab.id;
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
      DOMAIN + "/ai_translate/v2/translate/get_json",
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

async function changeLanguge(msg, responseF) {
  try {
    const response = await fetch(DOMAIN + "/ai_translate/v2/change_language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    const data = await response.json();
    responseF({ ok: true, data: data });
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
    var signal, response, contenttype, reader, line;

    console.log("[DEBUG] msg:", msg);
    console.log("[DEBUG] port:", port);

    controller = new AbortController();
    signal = controller.signal;
    response = await fetch(DOMAIN + "/ai_translate/v2/translate/get_stream", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
    contenttype = response.headers.get("content-type") || "";

    if (contenttype.includes("application/json")) {
      try {
        err = await response.json();
        console.error(err);
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

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "stream") {
    port.onMessage.addListener(requestResponse.bind(this, port));
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
    chrome.storage.local.get(["new_language"], (result) => {
      resolve({
        language: result.new_language || navigator.language.slice(0, 2),
      });
    });
  });
  console.log("[DEBUG] language:", lang);
  return lang;
}

async function GetSettings(response) {
  var settings;
  settings = await new Promise((resolve) => {
    chrome.storage.local.get(["settings"], (result) => {
      resolve(result.settings || { null: null });
    });
  });
  return settings;
}

async function messageHandler(msg, sender, response) {
  if (msg.action === "get_user_id") {
    GetUserID().then((userID) => response(userID));
  } else if (msg.action === "get_language") {
    GetLangauge().then((lang) => response(lang));
  } else if (msg.action === "translate_one_word") {
    TranslateAWord(msg.data, response);
  } else if (msg.action === "change_language") {
    changeLanguge(msg.data, response);
  } else if (msg.action === "abort_stream") {
    if (controller !== null) {
      controller.abort();
    }
  } else if (msg.action === "get_settings") {
    GetSettings().then((settings) => response(settings));
  } else if (msg.action === "save_settings") {
    chrome.storage.local.set({ settings: msg.settings });
    response({ null: null });
  } else if (msg.action === "save_language") {
    GetUserID().then((userID) => {
      changeLanguge({ user_id: userID, lang_code: msg.language }, response);
    });
    chrome.storage.local.set({ new_language: msg.language });
    // response({ ok: true });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageHandler(message, sender, sendResponse);
  return true;
});
