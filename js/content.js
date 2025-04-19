chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received:", request);
        if (request.action === "translate" && request.text) {
            init().then(() => { theBeginingOfTheLogic() })
        }
});

function closePopup(popup, hpopup) {
    if (popup && popup.style.display !== "none") {
        popup.remove()
        hpopup.remove()
        visibleHost.remove()
        hiddenHost.remove()
        popup = null
        content = null
        errorImg = null
        copyLogo = null
        checkmark = null
        textBtn = null
        div = null
        divText = null
        copyBtn = null
        textNod = null
        closeBtn = null
        hiddenTagName = null;
        hiddenHost = null
        visibleTagName = null
        visibleHost = null
    }
}

function addListeners() {
    console.log(visibleTagName, hiddenTagName)
    const popup = document.querySelector(visibleTagName)
    const hpopup = document.querySelector(hiddenTagName)

    document.addEventListener("click", function (event) {
        console.log("Event target:", event.target);
        console.log("visibleHost:", visibleHost);
        if (visibleHost && !visibleHost.contains(event.target)) {
            console.log("Click outside visibleHost");
            closePopup(popup, hpopup);
        }
    })

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && visibleHost && popup) {
            closePopup(popup, hpopup);
        }
    })

    copyBtn.addEventListener("click", function() {
        copyText().then(() => {
            console.log("text copied");
        });
    });

    closeBtn.addEventListener("click", function() {
        closePopup(popup, hpopup);
    })

}
  