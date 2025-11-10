var lastCopied = "";
var listening = null;

function Read(textarea) {
  return new Promise((resolve, reject) => {
    var success, text;
    // Clear textarea to avoid "before paste" issue
    textarea.value = "";
    // Focus textarea for paste (required for execCommand)
    textarea.focus();
    chrome.runtime.sendMessage({
      action: "log",
      data: "clipboard is in focus",
    });
    success = document.execCommand("paste");
    // Get clipboard content
    text = textarea.value;
    chrome.runtime.sendMessage({
      action: "log",
      data: "pasted",
    });

    if (!success) {
      reject(new Error("Unable to read from clipboard"));
    }

    resolve(text);
  });
}

function Reader() {
  Read(document.getElementById("clipboard"))
    .then((text) => {
      if (text !== "" && text !== lastCopied) {
        chrome.runtime.sendMessage({ action: "done", text: text });
        lastCopied = text;
      }
    })
    .catch((err) => {
      chrome.runtime.sendMessage({
        action: "error",
        data: `unable to read from clipboard: ${err}`,
      });
    });
}

function MessageHandler(message) {
  if (message.action === "begin_to_listen") {
    chrome.runtime.sendMessage({
      action: "log",
      data: "'begin_to_listen' has been caught",
    });
    if (!listening) {
      chrome.runtime.sendMessage({
        action: "log",
        data: "'listening' is null, starting WriterReader via interval",
      });
      listening = "not_null";
      setInterval(Reader, 500);
    }
  }
}

chrome.runtime.onMessage.addListener(MessageHandler);
