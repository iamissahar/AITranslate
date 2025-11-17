class GoogleDriveButton {
  #activeElement = null;
  #bubble = null;
  #el = null;
  #root = null;
  #btn = null;
  #isCreated = false;
  constructor() {}

  /**@returns {string} */
  #GetHTML() {
    return `<div id="google_drive_btn" class="the-button">
  <img id="logo" src=${chrome.runtime.getURL("icons/very_small_logo.png")}>
</div>`;
  }

  /**@returns {string} */
  #GetStyles() {
    return `.the-button {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.the-button img {
  width: 27px;
  height: 25px;
  transition: width 0.5s, height 0.5s;
}

.the-button img:hover {
  transform: scale(1.15);
}`;
  }

  #Create() {
    var host, shadow, style;
    host = document.createElement("div");
    host.id = GenerateUniqueTagName();
    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = this.#GetHTML();
    style = document.createElement("style");
    style.textContent = this.#GetStyles();
    shadow.appendChild(style);
    this.#el = host;
    this.#root = shadow;
    this.#btn = shadow.getElementById("google_drive_btn");
    this.#isCreated = true;
  }

  /**@param {HTMLElement} bubble  */
  Activate(bubble) {
    var exmpl, rect;
    this.#Create();
    exmpl = document.querySelector(".superfab-button-container");
    rect = exmpl.getBoundingClientRect();

    this.#btn.style.width = rect.width + "px";
    this.#btn.style.height = rect.height + "px";
    this.#btn.addEventListener("click", () => {
      Begin(sh.GetText(), GOOGLE_DRIVE);
    });

    bubble.insertBefore(this.#el, bubble.firstChild);
  }
}

/**@param {Function} callback  */
function InstallObserver(callback) {
  var observer, bubble;
  observer = new MutationObserver(() => {
    bubble = document.getElementById("docs-instant-bubble");
    if (bubble) {
      observer.disconnect();
      callback(bubble);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function BeginDriveGoogle() {
  var btn;
  btn = new GoogleDriveButton();
  InstallObserver(btn.Activate.bind(btn));
}

if (window.location.href.includes("https://docs.google.com/document")) {
  BeginDriveGoogle();
}
