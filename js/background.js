chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "AITranslate",
      title: "AI Translation",
      contexts: ["selection"]
    });
});
  
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "AITranslate" && info.selectionText) {
      chrome.tabs.sendMessage(tab.id, {
        type: "TRANSLATE_SELECTION",
        text: info.selectionText
      });
    }
});