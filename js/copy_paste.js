/**@type {CopyPaste | null} */
var cp = null;

class CopyPaste {
  #last_copied_item = "";
  constructor() {
    this.isActive = false;
  }

  /**@returns {boolean} */
  #Copy() {
    console.log("[DEBUG] copy!");
    return document.execCommand("copy");
  }

  GetLast() {
    return this.#last_copied_item;
  }

  /**@param {string} text  */
  SaveLast(text) {
    console.log("[DEBUG] pasted text saved! text is", text);
    this.#last_copied_item = text;
  }

  Do() {
    console.log(
      "[DEBIG] Do() has been called. this.#isActive is",
      this.isActive,
    );
    if (this.isActive) {
      if (!this.#Copy()) console.error("[ERROR] unable to copy");
    }
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "done") {
    cp.SaveLast(msg.text);
  } else if (msg.action === "tab_status") {
    console.log("[DEBUG] tab_status is", msg.active);
    cp.isActive = msg.active;
  }
});

cp = new CopyPaste();
setInterval(cp.Do.bind(cp), 500);
