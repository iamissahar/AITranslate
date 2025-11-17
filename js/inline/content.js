const PROCCESS_STATUS = [
  "Translating",
  "Getting data",
  "Data processing",
  "Completing",
];
const GOOGLE_DRIVE = "google_drive";
const REGULAR_PAGE = "regular_page";

/**@type {ShadowRoot} */
var hroot = null;
/**@type {ShadowRoot} */
var root = null;
/**@type {Application} */
var _application = null;
/**@type {GoButton} */
var goBtn = null;

class InlineOutput extends Output {
  #buffer = "";
  #houtput = hroot.getElementById("hidden_phrase");
  #content = root.getElementById("window_content");
  #i = 0;
  #rendered = 0;

  /**
   * @param {HTMLElement} statusMsg
   * @param {HTMLElement} output
   */
  constructor(statusMsg, output) {
    super(statusMsg, output);
    this.output = root.getElementById("phrase");
    this.statusMsg = root.getElementById("status_message");
  }

  /**@param {string} html  */
  #AddHTMLStruture(html) {
    this.#houtput.innerHTML = html;
    _application.HandleResizing();
    this.output.innerHTML = html;
  }

  TurnOffAnimation() {
    this.#content.style.animation = "none";
    this.#content.style.background = "none";
    this.#content.style.color = "#0d0d0d";
    this.statusMsg.textContent = "";
  }

  Clear() {
    this.#houtput.innerText = "";
    this.output.style.display = "block";
    // this.statusMsg.remove();
    this.statusMsg.style.display = "none";
  }

  Flush() {
    this.#houtput.innerText = this.#buffer;
    _application.HandleResizing();
    this.output.innerText = this.#buffer;
  }

  /**@param {string} text  */
  async Add(text) {
    if (this.isStream) {
      this.#buffer += text;
      if (this.#buffer.length >= Output.BUFFER_LENGTH + this.#i) {
        return new Promise((resolve) => {
          requestAnimationFrame(() => {
            this.#houtput.textContent = this.#buffer;
            this.output.textContent = this.#buffer;
            this.#i += Output.BUFFER_LENGTH;
            _application.HandleResizing();
            resolve();
          });
        });
        // this.#houtput.textContent = this.#buffer;
        // _application.HandleResizing();

        // this.output.textContent = this.#buffer;
        // this.#i += Output.BUFFER_LENGTH;
        // await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } else {
      this.#AddHTMLStruture(text);
    }
  }
}

class Application {
  static #DEFAULT_MARGIN = 15;
  static #MAX_HEIGHT = 500;
  static #DEFAULT_WIDTH = 400;
  static #DEFAULT_HEIGHT = 55;
  static #OFFSET = 10;
  #hidHolder = hroot.getElementById("hidden_holder");
  #hinput = hroot.getElementById("hidden_phrase");
  #app = root.getElementById("translation_window");
  #content = root.getElementById("window_content");
  #onlyup = false;
  #text = "";
  #stopgrowing = false;
  #currentHeight = 20;
  #output = new InlineOutput();

  /**@param {string} type  */
  constructor(type) {
    this.type = type;
  }

  /**
   * @param {number} top
   * @param {number} bottom
   * @returns {boolean}
   */
  #WouldFit(top, bottom) {
    var res = false;
    if (top - Application.#DEFAULT_MARGIN > 0) {
      res = true;
    }

    if (res && bottom + Application.#DEFAULT_MARGIN < window.innerHeight) {
      res = true;
    }

    return res;
  }

  #TurnOnOverflow() {
    this.#content.style.overflow = "auto";
    // this.#content.scrollWidth = "auto";
  }

  /**
   * @param {number} top
   * @param {number} bottom
   * @param {number} height
   */
  #Change(top, bottom, height) {
    this.#app.style.height = height + "px";
    this.#app.style.top = top + "px";
    this.#app.style.bottom = bottom + "px";
  }

  /**
   *
   * @param {number} popupBottom
   * @param {number} popupTop
   * @param {number} newHeight
   */
  #GrowDown(popupBottom, popupTop, newHeight) {
    var coordinates = { top: popupTop, bottom: popupBottom, height: newHeight },
      self = this;
    function Fixed() {
      coordinates.bottom = window.innerHeight - Application.#DEFAULT_MARGIN;
      coordinates.top = coordinates.bottom - Application.#MAX_HEIGHT;
      coordinates.height = Application.#MAX_HEIGHT;
      self.#stopgrowing = true;
      self.#TurnOnOverflow();
    }

    this.#currentHeight = coordinates.height;

    if (coordinates.height >= Application.#MAX_HEIGHT) {
      Fixed();
      // if (!this.#WouldFit(coordinates.top, coordinates.bottom)) {
      //   coordinates.bottom = window.innerHeight - Application.#DEFAULT_MARGIN;
      //   coordinates.top = coordinates.bottom - coordinates.height;
      // }
    }

    if (!this.#stopgrowing) {
      if (
        coordinates.bottom + Application.#DEFAULT_MARGIN <
        window.innerHeight
      ) {
        coordinates.bottom = coordinates.top + coordinates.height;

        if (!this.#WouldFit(coordinates.top, coordinates.bottom)) {
          coordinates.bottom = window.innerHeight - Application.#DEFAULT_MARGIN;
          coordinates.top = coordinates.bottom - coordinates.height;
        }
      } else {
        if (coordinates.top - Application.#DEFAULT_MARGIN > 0) {
          // grows up
          coordinates.top = coordinates.bottom - coordinates.height;
        } else {
          Fixed();
        }
      }
    }
    this.#Change(coordinates.top, coordinates.bottom, coordinates.height);
  }

  /**
   * @param {number} popupBottom
   * @param {number} popupTop
   * @param {number} newHeight
   */
  #GrowUp(popupBottom, popupTop, newHeight) {
    var coordinates = { top: popupTop, bottom: popupBottom, height: newHeight },
      self = this;
    this.#currentHeight = coordinates.height;
    function Fixed() {
      coordinates.top = coordinates.bottom - Application.#MAX_HEIGHT;
      coordinates.height = Application.#MAX_HEIGHT;
      self.#stopgrowing = true;
      self.#TurnOnOverflow();
    }

    if (coordinates.height >= Application.#MAX_HEIGHT) {
      Fixed();
    }

    if (!this.#stopgrowing) {
      if (coordinates.top - Application.#DEFAULT_MARGIN > 0) {
        coordinates.top = coordinates.bottom - coordinates.height;

        if (!this.#WouldFit(coordinates.top, coordinates.bottom)) {
          coordinates.top = Application.#DEFAULT_MARGIN;
          coordinates.bottom = coordinates.top + coordinates.height;
        }
      } else {
        if (
          coordinates.bottom + Application.#DEFAULT_MARGIN <=
          window.innerHeight
        ) {
          coordinates.bottom = coordinates.top + coordinates.height;
        } else {
          Fixed();
        }
      }
    }
    this.#Change(coordinates.top, coordinates.bottom, coordinates.height);
  }

  HandleResizing() {
    var rect, newHeight;
    rect = this.#app.getBoundingClientRect();
    newHeight = this.#hidHolder.getBoundingClientRect().height;

    if (!this.#stopgrowing) {
      if (this.#currentHeight < newHeight && !this.#onlyup) {
        this.#GrowDown(rect.bottom, rect.top, newHeight);
      } else if (this.#currentHeight < newHeight && this.#onlyup) {
        this.#GrowUp(rect.bottom, rect.top, newHeight);
      }
    }
  }

  #AppearHidden() {
    this.#hinput.textContent = "";
  }

  #GoogleDriveAppearance() {
    var canvas, rect, ratio, margin;
    console.log("google_drive appearance");
    canvas = document.querySelector(".canvas-first-page");
    if (canvas) {
      rect = canvas.getBoundingClientRect();
      ratio = window.innerWidth - rect.right;
      this.#app.style.top = rect.top + "px";

      if (ratio >= Application.#DEFAULT_WIDTH) {
        margin = (ratio - Application.#DEFAULT_WIDTH) / 2;
        this.#app.style.left = rect.right + margin + "px";
      } else {
        this.#app.style.left =
          window.innerWidth - Application.#DEFAULT_WIDTH + "px";
      }

      this.#app.style.display = "block";
    }
  }

  /**
   * @param {Selection} selection
   * @returns {void}
   */
  #DefaultAppearance(selection) {
    var range, rect, left, top, res;
    range = selection.getRangeAt(0);
    rect = range.getBoundingClientRect();

    if (window.innerWidth < rect.left + Application.#DEFAULT_WIDTH) {
      left = `${window.innerWidth - Application.#DEFAULT_WIDTH}px`;
    } else {
      left = `${rect.left}px`;
    }

    if (rect.top > window.innerHeight - rect.bottom) {
      res = rect.top - Application.#OFFSET - Application.#DEFAULT_HEIGHT;
      if (res > 0) {
        top = `${res}px`;
        this.#onlyup = true;
      } else {
        top = "0px";
      }
    } else {
      // the popup is under
      top = `${rect.bottom + Application.#OFFSET}px`;
      this.#onlyup = false;
    }

    this.#app.style.top = top;
    this.#app.style.left = left;
    this.#app.style.display = "block";
  }

  /**
   * @param {Selection | null} selection
   * @returns {boolean}
   */
  #IsShowable(selection) {
    var res = true;
    if (window.innerWidth < Application.#DEFAULT_WIDTH) {
      res = false;
    }

    if (this.type === REGULAR_PAGE) {
      if (selection && !selection.rangeCount) res = false;
    }

    return res;
  }

  #ThroughSelection() {
    var selection;

    selection = window.getSelection();

    if (this.#text) {
      this.#AppearHidden(this.#text);
      if (this.#IsShowable(selection)) {
        this.#DefaultAppearance(selection);
        Translate(this.#output, this.#text);
      } else {
        alert("display is too small");
      }
    } else {
      console.warn("unable to get text for translating");
    }
  }

  #ThroughGoogleDrive() {
    this.#AppearHidden(this.#text);

    if (this.#IsShowable(null)) {
      this.#GoogleDriveAppearance();
      Translate(this.#output, this.#text);
    }
  }

  /**@returns {string} */
  GetType() {
    return this.type;
  }

  /**@param {string} text */
  SaveText(text) {
    this.#text = text;
  }

  Close() {
    if (root?.host) root.host.remove();
    if (hroot?.host) hroot.host.remove();

    root = null;
    hroot = null;
    _application = null;
  }

  async Activate() {
    if (!this.#text) {
      this.#text = sh.GetText();
    }
    if (this.type === GOOGLE_DRIVE) {
      this.#ThroughGoogleDrive();
    } else if (this.type === REGULAR_PAGE) {
      this.#ThroughSelection();
    }
  }
}

/**@returns {string} */
function GenerateUniqueTagName() {
  return `ai_translate_${crypto.randomUUID()}`;
}

/** @returns {{ el: HTMLDivElement; root: ShadowRoot }} */
function CreateHiddenObject() {
  var host, shadow, style;
  host = document.createElement("div");
  host.id = GenerateUniqueTagName();
  shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = GetHiddenHTML();
  style = document.createElement("style");
  style.textContent = GetHiddenStyles();
  shadow.appendChild(style);
  return { el: host, root: shadow };
}

function CreateObject() {
  var host, shadow, style;
  host = document.createElement("div");
  host.id = GenerateUniqueTagName();
  shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = GetHTML();
  style = document.createElement("style");
  style.textContent = GetStyles();
  shadow.appendChild(style);
  return { el: host, root: shadow };
}

/** @param {Event} event */
function Cliked(event) {
  if (root && !root?.host.contains(event.target)) {
    _application.Close();
  }
}

/** @param {Event} event */
function KeyDown(event) {
  if (event.key === "Escape" && root && hroot) {
    if (_application) _application.Close();
  }
}

function CopyClick() {
  var logo, checkmark, text, inp;
  logo = root.getElementById("copy_logo");
  checkmark = root.getElementById("checkmark_logo");
  text = root.getElementById("btn_text");
  inp = root.getElementById("phrase");

  logo.style.display = "none";
  checkmark.style.display = "block";
  text.textContent = "Copied";

  navigator.clipboard.writeText(inp.innerText).catch((err) => {
    console.error("Failed to copy text: ", err);
    alert("Failed to copy text.");
  });

  setTimeout(() => {
    copyLogo.style.display = "block";
    checkmark.style.display = "none";
    textBtn.textContent = "Copy";
  }, 3000);
}

function AddListeners() {
  setTimeout(() => {
    document.addEventListener("click", (event) => Cliked(event));
  }, 500);
  document.addEventListener("keydown", (event) => KeyDown(event));
}

/**@returns {{ el: Element | null; html_el: HTMLElement | null}} */
function FindInsertionPoint() {
  var el,
    res,
    i = 0;
  const selectors = [
    "body",
    "html",
    'div[role="main"]',
    "main",
    "#root",
    "#app",
    ".main-content",
  ];
  do {
    el = document.querySelector(selectors[i]);
    i++;
  } while (i < selectors.length && !el);

  if (!el) {
    res = { el: null, html_el: document.body || document.documentElement };
  } else {
    res = { el: el, html_el: null };
  }
  return res;
}

/**@param {{el: HTMLDivElement; root: ShadowRoot;}} obj  */
function Insert(obj) {
  var insertion, observer;

  insertion = FindInsertionPoint();
  if (insertion.el instanceof Node) {
    insertion.el.appendChild(obj.el);
  } else if (insertion.html_el instanceof Node) {
    insertion.html_el.appendChild(obj.el);
  } else {
    console.error(
      "neither insertion.el nor insertion.html_el are instence of Node",
    );
  }

  if (!document.contains(obj.el)) {
    document.body.insertBefore(obj.el, document.body.firstChild);

    if (!document.contains(obj.el)) {
      observer = new MutationObserver((mutations, obs) => {
        if (document.body) {
          document.body.appendChild(obj.el);
          obs.disconnect();
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        if (document.body && !document.contains(obj.el)) {
          document.body.appendChild(obj.el);
        }
      }, 5000);
    }
  }
}

/**
 * @param {string} text
 * @param {string} type
 */
function Begin(text, type) {
  var hdobj, obj;
  inproccess = true;
  hdobj = CreateHiddenObject();
  obj = CreateObject();
  hroot = hdobj.root;
  root = obj.root;
  Insert(hdobj);
  Insert(obj);
  _application = new Application(type);
  _application.SaveText(text);
  _application.Activate(type).then(() => AddListeners());
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "translate" && msg.text) {
    Begin(msg.text, REGULAR_PAGE);
  }
});
