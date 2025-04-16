chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received:", request);
    if (request.action === "translate" && request.text) {
        init().then(() => { theBeginingOfTheLogic() })
    }
});
