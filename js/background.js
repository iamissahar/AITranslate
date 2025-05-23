chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "ai_translation",
    title: "AI Translation",
    contexts: ["selection"],
  });
});
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "ai_translation") {
      console.log("sending message to content.js")
      chrome.tabs.sendMessage(tab.id, {
        action: "translate",
        text: info.selectionText
      });
  }
});

async function oneWord(json, port) {
  try {
    const response = await fetch("https://nathanissahar.me/translate/one_word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
    })
    const data = await response.json();
    if (data && !data.error) {
      console.log("hiV1! ", data)
      port.postMessage({ ok: response.ok, data: data })
    } else if (data.error) {
      console.log("hiV2! ", data)
      port.postMessage({ ok: response.ok, error: data.error})
    }
  } catch (err) {
    port.postMessage({ error: err.toString() });
  }
}

async function request(json, port) {
  try {
    const response = await fetch("https://nathanissahar.me/change_language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: json,
    })
    const data = await response.json()
    port.postMessage({ ok: response.ok, data: data })
  } catch (err) {
    port.postMessage({ error: err.toString() });
  }
}

async function stream(json, port) {
  try {
    const response = await fetch("https://nathanissahar.me/translate/phrase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
    });

    if (!response.ok || !response.body) {
      port.postMessage({ error: "Failed to connect or no response body." });
      return;
    }

    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        port.postMessage({ done: true });
        break;
      }

      port.postMessage({ chunk: Array.from(value) });
    }

  } catch (err) {
    port.postMessage({ error: err.toString() });
  }
}


chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "stream_data") {
    port.onMessage.addListener((msg) => {
      stream(JSON.stringify(msg), port);
    });
  } else if (port.name === "change_language") {
    port.onMessage.addListener((msg) => {
      console.log(msg)
      request(JSON.stringify(msg), port);
    })
  } else if (port.name === "one_word") {
    port.onMessage.addListener((msg) => {
      oneWord(JSON.stringify(msg), port);
    })
  }
});
