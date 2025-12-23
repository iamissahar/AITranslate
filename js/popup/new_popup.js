const ALLOWED_LANGUAGES = new Map([
  ["af", "Afrikaans"],
  ["sq", "Albanian"],
  ["ar", "Arabic"],
  ["hy", "Armenian"],
  ["bn", "Bengali"],
  ["bs", "Bosnian"],
  ["bg", "Bulgarian"],
  ["ca", "Catalan"],
  ["hr", "Croatian"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["nl", "Dutch"],
  ["en", "English"],
  ["eo", "Esperanto"],
  ["et", "Estonian"],
  ["tl", "Filipino"],
  ["fi", "Finnish"],
  ["fr", "French"],
  ["de", "German"],
  ["el", "Greek"],
  ["gu", "Gujarati"],
  ["hi", "Hindi"],
  ["hu", "Hungarian"],
  ["is", "Icelandic"],
  ["id", "Indonesian"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["jw", "Javanese"],
  ["ko", "Korean"],
  ["la", "Latin"],
  ["lv", "Latvian"],
  ["lt", "Lithuanian"],
  ["ml", "Malayalam"],
  ["mr", "Marathi"],
  ["no", "Norwegian"],
  ["pl", "Polish"],
  ["pt", "Portuguese"],
  ["pa", "Punjabi"],
  ["ro", "Romanian"],
  ["ru", "Russian"],
  ["sr", "Serbian"],
  ["sk", "Slovak"],
  ["sl", "Slovenian"],
  ["es", "Spanish"],
  ["sw", "Swahili"],
  ["sv", "Swedish"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["th", "Thai"],
  ["tr", "Turkish"],
  ["uk", "Ukrainian"],
  ["ur", "Urdu"],
  ["vi", "Vietnamese"],
  ["cy", "Welsh"],
  ["he", "Hebrew"],
  ["mk", "Macedonian"],
]);

const ALLOWED_DEEPL_SOURCE_LANGUAGE = new Map([
  ["ar", "Arabic"],
  ["bg", "Bulgarian"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["de", "German"],
  ["el", "Greek"],
  ["en", "English"],
  ["es", "Spanish"],
  ["et", "Estonian"],
  ["fi", "Finnish"],
  ["fr", "French"],
  ["he", "Hebrew"],
  ["hu", "Hungarian"],
  ["id", "Indonesian"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["lt", "Lithuanian"],
  ["lv", "Latvian"],
  ["nb", "Norwegian (Bokmål)"],
  ["nl", "Dutch"],
  ["pl", "Polish"],
  ["pt", "Portuguese"],
  ["ro", "Romanian"],
  ["ru", "Russian"],
  ["sk", "Slovak"],
  ["sl", "Slovenian"],
  ["sv", "Swedish"],
  ["th", "Thai"],
  ["tr", "Turkish"],
  ["uk", "Ukrainian"],
  ["vi", "Vietnamese"],
  ["zh", "Chinese"],
]);

const ALLOWED_DEEPL_TARGET_LANGUAGE = new Map([
  ["ar", "Arabic"],
  ["bg", "Bulgarian"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["de", "German"],
  ["el", "Greek"],
  ["en-gb", "English (British)"],
  ["en-us", "English (American)"],
  ["es", "Spanish"],
  ["es-419", "Spanish (Latin American)"],
  ["et", "Estonian"],
  ["fi", "Finnish"],
  ["fr", "French"],
  ["he", "Hebrew"],
  ["hu", "Hungarian"],
  ["id", "Indonesian"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["lt", "Lithuanian"],
  ["lv", "Latvian"],
  ["nb", "Norwegian (Bokmål)"],
  ["nl", "Dutch"],
  ["pl", "Polish"],
  ["pt-br", "Portuguese (Brazilian)"],
  ["pt-pt", "Portuguese (European)"],
  ["ro", "Romanian"],
  ["ru", "Russian"],
  ["sk", "Slovak"],
  ["sl", "Slovenian"],
  ["sv", "Swedish"],
  ["th", "Thai"],
  ["tr", "Turkish"],
  ["uk", "Ukrainian"],
  ["vi", "Vietnamese"],
  ["zh", "Chinese"],
  ["zh-hans", "Chinese (Simplified)"],
  ["zh-hant", "Chinese (Traditional)"],
]);

const RTL_LANGUAGES = new Map([
  ["ar", "Arabic"],
  ["he", "Hebrew"],
  ["ur", "Urdu"],
]);

class DeepL {
  static #REQUEST_NAME = "deepl_translation";
  /**
   * @param {PopupOutput} output
   * @param {Source} source
   */
  constructor(output, source) {
    this.output = output;
    this.source = source;
  }

  /**
   * @param {number} key
   * @param {string} text
   * @param {Popup} popup
   */
  async Do(key, text, popup) {
    var res;
    res = await new Promise(async (resolve) => {
      chrome.runtime.sendMessage(
        {
          action: DeepL.#REQUEST_NAME,
          data: {
            user_id: await new Promise((resolve) => {
              chrome.runtime.sendMessage({ action: "get_user_id" }, (res) => {
                resolve(res.user_id || 0);
              });
            }),
            target_lang: await new Promise((resolve) => {
              chrome.storage.local.get(["popup_target_lang"], (result) => {
                resolve(result.popup_target_lang);
              });
            }),
            source_lang: await new Promise((resolve) => {
              chrome.storage.local.get(["popup_source_lang"], (result) => {
                resolve(result.popup_source_lang || "");
              });
            }),
            text: text,
          },
        },
        (result) => {
          resolve(result);
        },
      );
    });

    if (res.ok) {
      chrome.storage.local.set({ user_id: res.result.user_id });
      this.output.Clear();
      this.output.Add(res.result.text);
      this.source.set(res.result.source_lang);
      popup.AddResult(key, res.result.text);
    } else {
      this.output.Clear();
      this.output.SetError("Something went wrong. Please try again later.");
    }
  }
}

class Settings {
  #settingsSlide = document.getElementById("settings_slide");
  #main = document.getElementById("holder");
  #settings = document.getElementById("settings");
  #saveBtn = document.getElementById("save_settings");
  #back = document.getElementById("back_btn");
  #statusMsg = document.getElementById("status_change");
  #switcher = document.getElementById("context_switch");
  #tlang = document.getElementById("settings_target_lang");

  #GoToSettings() {
    this.#main.style.transition = "left 0.3s ease-in-out";
    this.#main.style.left = "-100%";
    this.#settingsSlide.classList.add("active");
  }

  #GoBack() {
    this.#main.style.left = "0";
    this.#settingsSlide.classList.remove("active");
  }

  #SaveSettings() {
    this.#statusMsg.classList.add("shown");
    chrome.runtime.sendMessage({
      action: "enable_context_menu",
      enabled: this.#switcher.checked,
    });
    console.log("settings_target_lang:", this.#tlang.getAttribute("value"));
    chrome.storage.local.set({
      context_menu_enabled: this.#switcher.checked,
      settings_target_lang: this.#tlang.getAttribute("value"),
    });

    setTimeout(() => {
      this.#statusMsg.classList.remove("shown");
    }, 1500);
  }

  Activate() {
    this.#settings.addEventListener("click", this.#GoToSettings.bind(this));
    this.#back.addEventListener("click", this.#GoBack.bind(this));
    this.#saveBtn.addEventListener("click", this.#SaveSettings.bind(this));
    chrome.storage.local.get(
      ["settings_target_lang", "context_menu_enabled"],
      (result) => {
        console.log("settings_target_lang:", result.settings_target_lang);
        this.#tlang.setAttribute("value", result.settings_target_lang);
        this.#tlang.textContent = ALLOWED_LANGUAGES.get(
          result.settings_target_lang,
        );
        this.#switcher.checked = result.context_menu_enabled;
      },
    );
  }
}

class LanguageList {
  /**
   * @param {string} param0
   * @returns {HTMLDivElement}
   */
  #createLangOpt([code, name]) {
    var div, img;
    div = document.createElement("div");
    div.className = "lang-opt";
    div.setAttribute("value", code);

    img = document.createElement("img");
    img.src = "../icons/checkmark_black.png";

    div.appendChild(img);
    div.appendChild(document.createTextNode(name));

    return div;
  }

  /**
   * @param {string} containerclass
   * @param {string[]} langs
   * @returns {HTMLDivElement}
   */
  #fill(containerclass, langs) {
    var container;
    container = document.createElement("div");
    container.className = containerclass;
    langs.forEach((lang) => container.appendChild(this.#createLangOpt(lang)));
    return container;
  }

  /**
   * @param {boolean} issource
   * @param {boolean} forpopup
   * @returns {{ right: HTMLDivElement; left: HTMLDivElement; }}
   */
  popupate(issource, forpopup) {
    var entries, mid, right, left;

    if (forpopup) {
      if (issource) {
        entries = Array.from(ALLOWED_DEEPL_SOURCE_LANGUAGE.entries()).sort(
          (a, b) => a[0].localeCompare(b[0]),
        );
      } else {
        entries = Array.from(ALLOWED_DEEPL_TARGET_LANGUAGE.entries()).sort(
          (a, b) => a[0].localeCompare(b[0]),
        );
      }
    } else {
      entries = Array.from(ALLOWED_LANGUAGES.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
    }

    if (issource) {
      entries.unshift(["auto", "Detect Language"]);
    }

    mid = Math.ceil(entries.length / 2);
    right = entries.slice(0, mid);
    left = entries.slice(mid);

    return {
      right: this.#fill(".list-right", right),
      left: this.#fill(".list-left", left),
    };
  }

  change() {
    throw new Error("method 'change()' must be implemented in sub class");
  }

  set() {
    throw new Error("method 'set()' must be implemented in sub class");
  }

  show() {
    throw new Error("method 'show()' must be implemented in sub class");
  }

  close() {
    throw new Error("method 'close()' must be implemented in sub class");
  }

  init() {
    throw new Error("method 'init()' must be implemented in sub class");
  }
}

class Source extends LanguageList {
  #input = document.getElementById("input");
  #langlist = document.getElementById("source_lang_list");
  #currentCheckMark = null;
  #lang = document.getElementById("source_lang");
  #btn = document.getElementById("source");
  #shown = false;

  /**
   * @param {Event} event
   */
  #click(event) {
    if (event && !this.#langlist.contains(event.target)) {
      if (this.#langlist.classList.contains("shown")) {
        this.close();
      }
    }
  }

  /**
   * @param {string} lang
   * @param {string} val
   * @param {HTMLImageElement} img
   */
  change(lang, val, img) {
    var ok;
    if (this.#currentCheckMark)
      this.#currentCheckMark.classList.remove("shown");

    ok = RTL_LANGUAGES.get(val);
    if (ok) {
      this.#input.dir = "rtl";
    } else {
      this.#input.dir = "ltr";
    }

    this.#lang.textContent = lang;
    chrome.storage.local.set({ popup_source_lang: val });
    this.#lang.setAttribute("value", val);
    img.classList.add("shown");
    this.#currentCheckMark = img;
    this.close();
  }

  /**
   *
   * @param {string} val
   */
  set(val) {
    this.#langlist.querySelectorAll(".lang-opt").forEach((opt) => {
      if (opt.getAttribute("value") === val) {
        if (val === "auto") {
          this.change("Detect Language", val, opt.querySelector("img"));
        } else {
          this.change(
            ALLOWED_DEEPL_SOURCE_LANGUAGE.get(val),
            val,
            opt.querySelector("img"),
          );
        }
        // setTimeout(() => {
        //   if (popup.GetValue()) {
        //     dpl.Do(popup.GetCurrentPosition(), popup.GetValue(), popup);
        //   }
        // }, 400);
        return;
      }
    });
  }

  show() {
    if (!this.#shown) {
      setTimeout(() => {
        this.#shown = true;
        this.#langlist.classList.add("shown");
      }, 50);
    }
  }

  close() {
    this.#langlist.classList.remove("shown");
    this.#shown = false;
  }

  init() {
    var sides;
    sides = this.popupate(true, true);
    this.#langlist.appendChild(sides.right);
    this.#langlist.appendChild(sides.left);

    document.addEventListener("click", (event) => this.#click(event));
    this.#btn.addEventListener("click", this.show.bind(this));
    this.#langlist.querySelectorAll(".lang-opt").forEach((opt) => {
      opt.addEventListener(
        "click",
        this.change.bind(
          this,
          opt.textContent,
          opt.getAttribute("value"),
          opt.querySelector("img"),
        ),
      );
    });
  }
}

class Target extends LanguageList {
  #output = document.getElementById("output");
  #langlist = document.getElementById("target_lang_list");
  #currentCheckMark = null;
  #lang = document.getElementById("target_lang");
  #btn = document.getElementById("target");
  #shown = false;
  /**
   * @param {Event} event
   */
  #click(event) {
    if (event && !this.#langlist.contains(event.target)) {
      if (this.#langlist.classList.contains("shown")) {
        this.close();
      }
    }
  }

  /**
   * @param {string} lang
   * @param {string} val
   * @param {HTMLImageElement} img
   */
  change(lang, val, img) {
    var ok;
    if (this.#currentCheckMark)
      this.#currentCheckMark.classList.remove("shown");

    ok = RTL_LANGUAGES.get(val);
    if (ok) {
      this.#output.dir = "rtl";
    } else {
      this.#output.dir = "ltr";
    }

    this.#lang.textContent = lang;
    chrome.storage.local.set({ popup_target_lang: val });
    this.#lang.setAttribute("value", val);
    img.classList.add("shown");
    this.#currentCheckMark = img;
    this.close();

    if (popup.GetValue() !== "") {
      popup.InputInput();
    }
  }

  /**
   *
   * @param {string} val
   */
  set(val) {
    this.#langlist.querySelectorAll(".lang-opt").forEach((opt) => {
      if (opt.getAttribute("value") === val) {
        this.change(
          ALLOWED_DEEPL_TARGET_LANGUAGE.get(val),
          val,
          opt.querySelector("img"),
        );
        // setTimeout(() => {
        //   if (popup.GetValue()) {
        //     dpl.Do(popup.GetCurrentPosition(), popup.GetValue(), popup);
        //   }
        // }, 400);
        return;
      }
    });
  }

  show() {
    if (!this.#shown) {
      setTimeout(() => {
        this.#shown = true;
        this.#langlist.classList.add("shown");
      }, 50);
    }
  }

  close() {
    this.#langlist.classList.remove("shown");
    this.#shown = false;
  }

  init() {
    var sides;
    sides = this.popupate(false, true);
    this.#langlist.appendChild(sides.right);
    this.#langlist.appendChild(sides.left);

    document.addEventListener("click", (event) => this.#click(event));
    this.#btn.addEventListener("click", this.show.bind(this));
    this.#langlist.querySelectorAll(".lang-opt").forEach((opt) => {
      opt.addEventListener(
        "click",
        this.change.bind(
          this,
          opt.textContent,
          opt.getAttribute("value"),
          opt.querySelector("img"),
        ),
      );
    });
  }
}

class SettingsTarget extends LanguageList {
  #langlist = document.getElementById("settings_target_lang_list");
  #currentCheckMark = null;
  #lang = document.getElementById("settings_target_lang");
  #btn = document.getElementById("settings_target");
  #shown = false;

  /**
   * @param {Event} event
   */
  #click(event) {
    if (event && !this.#langlist.contains(event.target)) {
      if (this.#langlist.classList.contains("shown")) {
        this.close();
      }
    }
  }

  /**
   * @param {string} lang
   * @param {string} val
   * @param {HTMLImageElement} img
   */
  change(lang, val, img) {
    if (this.#currentCheckMark)
      this.#currentCheckMark.classList.remove("shown");

    this.#lang.textContent = lang;
    chrome.storage.local.set({ settings_target_lang: val });
    this.#lang.setAttribute("value", val);
    img.classList.add("shown");
    this.#currentCheckMark = img;
    this.close();
  }

  /**
   *
   * @param {string} val
   */
  set(val) {
    this.#langlist.querySelectorAll(".lang-opt").forEach((opt) => {
      if (opt.getAttribute("value") === val) {
        this.change(ALLOWED_LANGUAGES.get(val), val, opt.querySelector("img"));
        return;
      }
    });
  }

  show() {
    if (!this.#shown) {
      setTimeout(() => {
        this.#shown = true;
        this.#langlist.classList.add("shown");
      }, 50);
    }
  }

  close() {
    this.#langlist.classList.remove("shown");
    this.#shown = false;
  }

  init() {
    var sides;
    sides = this.popupate(false, false);
    this.#langlist.appendChild(sides.right);
    this.#langlist.appendChild(sides.left);

    document.addEventListener("click", (event) => this.#click(event));
    this.#btn.addEventListener("click", this.show.bind(this));
    this.#langlist.querySelectorAll(".lang-opt").forEach((opt) => {
      opt.addEventListener(
        "click",
        this.change.bind(
          this,
          opt.textContent,
          opt.getAttribute("value"),
          opt.querySelector("img"),
        ),
      );
    });
  }
}

class Popup {
  static #DEFAULT_SOURCE = "Detected language";
  #input = document.getElementById("input");
  #instruction = document.getElementById("instruction");
  #switcher = document.getElementById("switcher");
  #tlang = document.getElementById("target_lang");
  #slang = document.getElementById("source_lang");
  #rightArea = document.getElementById("right_area");
  #backbtn = document.getElementById("go_back");
  #forwardbtn = document.getElementById("go_forward");
  #rateSlide = document.getElementById("rate_slide");
  #rateCloseBtn = document.getElementById("rate_close_btn");
  #stars = [
    document.getElementById("star_1"),
    document.getElementById("star_2"),
    document.getElementById("star_3"),
    document.getElementById("star_4"),
    document.getElementById("star_5"),
  ];
  #settings = new Settings();
  #lists = {};
  #timeoutcounter = [];
  #rqrs = new Map();
  #history = [];
  #notoback = true;
  #notoforward = true;
  #currentPosition = 0;
  #rateUsid = 0;

  /**
   * @param {Source} sl
   * @param {Target} tl
   * @param {SettingsTarget} stl
   * @param {DeepL} dpl
   * @param {PopupOutput} otp
   */
  constructor(sl, tl, stl, dpl, otp) {
    this.source = sl;
    this.target = tl;
    this.settarget = stl;
    this.deepl = dpl;
    this.output = otp;
    this.#settings.Activate(this.#lists);
  }

  /**
   * @returns {string}
   */
  GetValue() {
    return this.#input.value;
  }

  GetCurrentPosition() {
    return this.#currentPosition;
  }

  /**
   * @param {boolean} shown
   */
  async #rateUs(shown) {
    if (!shown) {
      this.#rateUsid = setTimeout(() => {
        this.#rateSlide.classList.add("active");
      }, 6000);
    }
  }

  InputInput() {
    if (this.#input.value === "") {
      this.#instruction.classList.add("shown");
    } else {
      chrome.storage.local.get(["rate_us_shown"], (result) => {
        clearTimeout(this.#rateUsid);
        this.#rateUs(result.rate_us_shown);
      });
      this.output.SetReadOnly();
      this.#instruction.classList.remove("shown");
      var l;
      this.#timeoutcounter.push(0);
      l = this.#timeoutcounter.length;
      setTimeout(() => {
        if (this.#timeoutcounter.length === l) {
          if (this.#history.length > 10) {
            this.#RemoveFirst();
          }
          this.#AddItem();
          if (this.#history.length > 1) {
            this.#notoback = false;
            this.#currentPosition = this.#history.length - 1;
            this.#backbtn.classList.add("available");
          }

          this.output.SetAnimation();
          if (this.#input.value !== "")
            this.deepl.Do(this.#currentPosition, this.#input.value, this);
        }
      }, 500);
    }
    if (document.activeElement === this.#input) {
      this.#rightArea.classList.add("focused");
    }
  }

  #Switch() {
    var s, t, txt;
    if (this.#slang.textContent !== Popup.#DEFAULT_SOURCE) {
      t = this.#tlang.getAttribute("value");
      s = this.#slang.getAttribute("value");
      txt = this.output.GetValue();
      if (txt) {
        this.#input.value = txt;
        this.InputInput();
      }

      if (t === "en-gb" || t === "en-us") t = "en";
      if (t === "es-419") t = "es";
      if (t === "pt-pt" || t === "pt-br") t = "pt";
      if (t === "zh-hans" || t === "zh-hant") t = "zh";

      if (s === "en") s = "en-us";
      if (s === "pt") s = "pt-pt";

      this.source.set(t);
      this.target.set(s);
    } else {
      this.source.set(this.#tlang.getAttribute("value"));
    }
  }

  /**
   * @param {Event} event
   */
  #ResetTextArea(event) {
    console.assert(event instanceof Event);
    if (
      event &&
      !this.#instruction.classList.contains("shown") &&
      !this.#input.value
    ) {
      this.#instruction.classList.add("shown");
    }
  }

  #HistoryBack() {
    var data,
      past = this.#input.value;
    if (!this.#notoback) {
      data = this.#rqrs.get(this.#currentPosition - 1);
      this.output.Clear();
      this.output.Add(data.response_text);
      this.#input.value = data.request_text;
      if (past === "" && this.#input.value !== "") {
        this.#instruction.classList.remove("shown");
      }
      if (this.#currentPosition - 1 === 0) {
        this.#notoback = true;
        this.#backbtn.classList.remove("available");
      }
      this.#currentPosition = this.#currentPosition - 1;
      this.#notoforward = false;
      this.#forwardbtn.classList.add("available");
    }
  }

  #HistoryForward() {
    var data,
      past = this.#input.value;
    if (!this.#notoforward) {
      data = this.#rqrs.get(this.#currentPosition + 1);
      this.output.Clear();
      this.output.Add(data.response_text);
      this.#input.value = data.request_text;
      if (past === "" && this.#input.value !== "") {
        this.#instruction.classList.remove("shown");
      }
      if (this.#currentPosition + 1 === this.#history.length - 1) {
        this.#notoforward = true;
        this.#forwardbtn.classList.remove("available");
      }
      this.#currentPosition++;
      this.#notoback = false;
      this.#backbtn.classList.add("available");
    }
  }

  #RemoveFirst() {
    this.#rqrs.delete(0);
    this.#history.shift();
  }

  #AddItem() {
    this.#history.push(this.#input.value);
    this.#rqrs.set(this.#history.length - 1, {
      request_text: this.#input.value,
    });
  }

  AddResult(key, val) {
    var data = this.#rqrs.get(key);
    if (data && data.request_text) {
      this.#rqrs.set(key, {
        request_text: data.request_text,
        response_text: val,
      });
    }
  }

  Activate() {
    chrome.storage.local.get(
      ["popup_source_lang", "popup_target_lang"],
      (result) => {
        console.log(result);
        if (result.popup_source_lang) this.source.set(result.popup_source_lang);
        if (result.popup_target_lang) this.target.set(result.popup_target_lang);
      },
    );

    this.#input.addEventListener("click", () => {
      this.#instruction.classList.remove("shown");
      this.#rightArea.classList.add("focused");
    });
    this.#input.addEventListener("input", this.InputInput.bind(this));
    this.#switcher.addEventListener("click", this.#Switch.bind(this));
    document.addEventListener("click", (event) => {
      if (document.activeElement !== this.#input) {
        this.#rightArea.classList.remove("focused");
      }
      this.#ResetTextArea(event);
    });
    this.#backbtn.addEventListener("click", this.#HistoryBack.bind(this));
    this.#forwardbtn.addEventListener("click", this.#HistoryForward.bind(this));
    this.#rateCloseBtn.addEventListener("click", () => {
      chrome.storage.local.set({ rate_us_shown: true });
      this.#rateSlide.classList.remove("active");
    });

    for (let i = 0; i < this.#stars.length; i++) {
      this.#stars[i].addEventListener("click", () => {
        chrome.storage.local.set({ rate_us_shown: true });
        chrome.tabs.create({
          url: "https://chromewebstore.google.com/detail/blcdghlkkelnjabklhgoenenkefifoeo/reviews",
        });
      });
      this.#stars[i].addEventListener("mouseenter", () => {
        for (let j = 0; j <= i; j++) {
          this.#stars[j].querySelector("img").classList.add("active");
        }
      });
      this.#stars[i].addEventListener("mouseleave", () => {
        for (let j = 0; j <= i; j++) {
          this.#stars[j].querySelector("img").classList.remove("active");
        }
      });
    }
  }
}

class PopupOutput {
  static #DONE_IMG = "../icons/checkmark_black.png";
  static #COPY_IMG = "../icons/icon_copy_black.png";
  #leftArea = document.getElementById("left_area");
  #outputContent = document.getElementById("output");
  #copyBtn = document.getElementById("output_copy");
  #statusMsg = document.getElementById("status_msg");
  #likeBtn = document.getElementById("output-like");
  #dislikeBtn = document.getElementById("output-dislike");
  #intervalid = 0;
  constructor() {
    this.#InitListeners();
  }

  SetAnimation() {
    // if (this.#outputContent.textContent === "") {
    const txt = "Thinking";
    let dots = 0;

    this.#outputContent.textContent = "";

    this.#statusMsg.classList.add("shown");
    this.#statusMsg.textContent = txt;

    this.#intervalid = setInterval(() => {
      dots = (dots + 1) % 4;
      this.#statusMsg.textContent = txt + ".".repeat(dots);
    }, 300);
    // }
  }

  Clear() {
    this.#outputContent.innerHTML = "";
    this.#statusMsg.innerHTML = "";
    this.#copyBtn.classList.remove("show");
  }

  SetError(text) {
    this.#outputContent.textContent = text;
  }

  SetReadOnly() {
    this.#outputContent.readOnly = true;
    this.#copyBtn.classList.remove("available");
    this.#likeBtn.classList.remove("available");
    this.#dislikeBtn.classList.remove("available");
    this.#likeBtn.querySelector("img").src = "../icons/like.png";
    this.#dislikeBtn.querySelector("img").src = "../icons/like.png";
  }

  /**@param {string} text  */
  Add(text) {
    clearInterval(this.#intervalid);
    this.#outputContent.readOnly = false;
    this.#statusMsg.classList.remove("shown");
    this.#outputContent.textContent += text;
    this.#copyBtn.classList.add("available");
    this.#likeBtn.classList.add("available");
    this.#dislikeBtn.classList.add("available");
  }

  /**
   * @returns {string}
   */
  GetValue() {
    return this.#outputContent.value;
  }

  #Copy() {
    var img = this.#copyBtn.querySelector("img");
    if (
      this.#copyBtn.classList.contains("available") &&
      this.#outputContent.textContent
    ) {
      navigator.clipboard.writeText(this.#outputContent.textContent);
      img.src = PopupOutput.#DONE_IMG;
      setTimeout(() => {
        img.src = PopupOutput.#COPY_IMG;
      }, 1500);
    }
  }

  #Like() {
    if (this.#likeBtn.getAttribute("value") === "true") {
      this.#likeBtn.querySelector("img").src = "../icons/like_filled.png";
      this.#likeBtn.setAttribute("value", "false");
    } else if (this.#likeBtn.getAttribute("value") === "false") {
      this.#likeBtn.querySelector("img").src = "../icons/like.png";
      this.#likeBtn.setAttribute("value", "true");
    }
  }

  #Dislike() {
    if (this.#dislikeBtn.getAttribute("value") === "true") {
      this.#dislikeBtn.querySelector("img").src = "../icons/like_filled.png";
      this.#dislikeBtn.setAttribute("value", "false");
    } else if (this.#dislikeBtn.getAttribute("value") === "false") {
      this.#dislikeBtn.querySelector("img").src = "../icons/like.png";
      this.#dislikeBtn.setAttribute("value", "true");
    }
  }

  #InitListeners() {
    this.#copyBtn.addEventListener("click", this.#Copy.bind(this));
    this.#likeBtn.addEventListener("click", this.#Like.bind(this));
    this.#dislikeBtn.addEventListener("click", this.#Dislike.bind(this));
    this.#outputContent.addEventListener("click", () => {
      if (
        document.activeElement === this.#outputContent &&
        !this.#outputContent.readOnly
      ) {
        this.#leftArea.classList.add("focused");
      }
    });
    document.addEventListener("click", () => {
      if (
        document.activeElement !== this.#outputContent &&
        !this.#outputContent.readOnly
      ) {
        this.#leftArea.classList.remove("focused");
      }
    });
  }
}

/**@type {Popup} */
var popup = null;
/**@type {DeepL} */
var dpl = null;

document.addEventListener("DOMContentLoaded", () => {
  var sl, tl, stl, otp;
  sl = new Source();
  tl = new Target();
  stl = new SettingsTarget();
  otp = new PopupOutput();
  dpl = new DeepL(otp, sl);
  sl.init();
  tl.init();
  stl.init();
  popup = new Popup(sl, tl, stl, dpl, otp);
  popup.Activate();
});
