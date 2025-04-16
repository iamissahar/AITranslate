chrome.contextMenus.create({
  id: "ai_translate",
  title: "AI Translate",
  contexts: ["selection"],
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  console.log("WTF?")
  if (info.menuItemId === "ai_translate") {
    console.log("sending message to content.js")
    chrome.tabs.sendMessage(tab.id, {
      action: "translate",
      text: info.selectionText
    });
  }
});