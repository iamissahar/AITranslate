chrome.contextMenus.create({
  id: "ai_translate",
  title: "AI Translate",
  contexts: ["selection", "frame"]
})

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "ai_translate") {
      console.log("sending message to content.js")
      chrome.tabs.sendMessage(tab.id, {
        action: "translate",
        text: info.selectionText
      });
  }
});

async function request(json) {
  try {
    console.log("Sending request:", json);
    const res = await fetch("https://nathanissahar.me/change_language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    });
    console.log("gotten result, starts reading")
    const data = await res.json();
    return { ok: res.ok, data: data };
  } catch (err) {
    console.error("Request failed:", err);
    return { ok: false, error: err.toString() };
  }
}

async function stream(json) {
  try {
    const response = await fetch("https://nathanissahar.me/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: json,
    })
    const type = response.headers.get("Content-Type") || "";
    return {content_type: type, resp: response}
  } catch(err) {
    return err
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.path === "change_language") {

    const jsonData = typeof message.json === 'string' ? JSON.parse(message.json) : message.json;
    
    request(jsonData).then(response => {
      sendResponse(response);
    });

    return true;

  } else if (message.path === "translate") {

    stream(message.json).then((response) => {
      sendResponse(response)
      
    }).catch((err) => {
      sendResponse(err)
    })

    return true
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name == "stream_data") {
    console.log("conntects")
    port.onMessage.addListener(async (message) => {
      try {
        console.log("requests servers")
        const response = await fetch("https://nathanissahar.me/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message),
          });

        console.log("gets response")
        if (!response.ok || !response.body) {
            console.log("the response is error")
            const errorBody = await response.json()
            port.postMessage({ error: `Bad response: ${errorBody}` });
            port.postMessage({ done: true });
            return;
        }

        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            port.postMessage({ chunk: Array.from(value) });
        }

        console.log("stream ends well")
        port.postMessage({ done: true });

      } catch (err) {
          console.log("catchs error")
          port.postMessage({ error: err.message });
          port.postMessage({ done: true });
      }
    })
  }
})