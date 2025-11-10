let onlyup, dotsInterval, wordsInterval, process;
let currentlineHeight = 10;
let stopgrowing = false;
let phraseProcess;
let i = 0;
let popup,
  content,
  errorImg,
  copyLogo,
  checkmark,
  textBtn,
  div,
  phrase,
  hiddenPhrase,
  copyBtn,
  textNod,
  closeBtn,
  isBusy;
let hiddenTagName, hiddenHost, visibleTagName, visibleHost;
let wordHolder = [];
let hiddenWordHolder = [];
let lineHolder = [];
let hiddenLineHolder = [];
const PROCCESS_STATUS = [
  "Translating",
  "Getting data",
  "Data processing",
  "Completing",
];
const GOOGLE_DRIVE = "google_drive";
const REGULAR_PAGE = "regulart_page";
const lineInPX = 19.2;
const popupWidth = 400;
const offset = 10;
const headersHeight = 25;
const defaultHeight = 55;
const fontSize = 16;
const LINE_WIDTH = 367;

/**@type {ShadowRoot} */
var hroot = null;
/**@type {ShadowRoot} */
var root = null;
/**@type {Input} */
var input = null;
/**@type {Application} */
var _application = null;
/**@type {GoButton} */
var goBtn = null;
/**@type {boolean} */
var selectionChanged = false;
/**@type {number} */
var selectionTimeoutID = 0;

class InlineOutput extends Output {
  static #DEFAULT_LINE_WIDTH = 367
  #lineHolder = null;
  #hiddenLineHolder = null;
  #wordHolder = [];
  #hiddenWordHolder = [];
  #buffer = "";
  #houtput = hroot.getElementById("hidden_phrase");
  #content = root.getElementById("window_content");
  #hidHolder = hroot.getElementById("hidden_holder");
  #app = root.getElementById("translation_window");
  #hiddenWordHolder = [];
  #wordHolder = [];
  #hiddenLineHolder = [];
  #lineHolder = [];
  #isBusy = [false, false, false, false, false];

  /**
   * @param {HTMLElement} statusMsg
   * @param {HTMLElement} output
   */
  constructor(statusMsg, output) {
    super(statusMsg, output);
    this.output = root.getElementById("phrase");
    this.statusMsg = root.getElementById("status_message");
    this.#InitHolders();
  }

  #InitHolders() {
    for (let i = 1; i <= 5; i++) {
      if (i < 5) {
        this.#lineHolder[i - 1] = root.getElementById(`a_line_${i}`);
        this.#hiddenLineHolder[i - 1] = hroot.getElementById(`a_line_${i}`);
      }
      this.#wordHolder[i - 1] = {
        aWord: root.getElementById(`a_word_${i}`),
        partOfSpeech: root.getElementById(`header_${i}`),
        context: root.getElementById(`bold_title_${i}`),
        translation: root.getElementById(`translated_word_${i}`),
        example: root.getElementById(`meaning_${i}`),
      };
      this.#hiddenWordHolder[i - 1] = {
        aWord: hroot.getElementById(`a_word_${i}`),
        partOfSpeech: hroot.getElementById(`header_${i}`),
        context: hroot.getElementById(`bold_title_${i}`),
        translation: hroot.getElementById(`translated_word_${i}`),
        example: hroot.getElementById(`meaning_${i}`),
      };
    }
  }

  /**@returns {{top: number; bottom: number; height: number; ok: boolean; overflow: boolean;}} */
  #IsRestructedNeeded() {
    var res = { top: 0, bottom: 0, height: 0, ok: false, overflow: false },
      hrect,
      rect;
    hrect = this.#hidHolder.getBoundingClientRect();
    rect = this.#app.getBoundingClientRect();

    if (hrect.height >= window.innerHeight) {
      // if new height doesn't fit display at all
      res = {
        top: 0,
        bottom: window.innerHeight,
        height: window.innerHeight,
        ok: true,
        overflow: true,
      };
    } else if (!onlyup) {
      if (rect.top + hrect.height >= window.innerHeight) {
        // if height is too much, and it doesn't fit in a display (bottom),
        // I need to raise up popup.top, til the future popup.bottom
        // fits in a display
        res = {
          top: rect.top + hrect.height - window.innerHeight,
          bottom: window.innerHeight,
          height: hrect.height,
          ok: true,
          overflow: false,
        };
      } else {
        res = {
          top: rect.top,
          bottom: rect.top + hrect.height,
          height: hrect.height,
          ok: true,
          overflow: false,
        };
      }
    } else if (onlyup) {
      if (rect.bottom - hrect.height <= 0) {
        // if height is too much, and it doesn't fit in a display (top),
        // I need to reduce popup.bottom down, til the future popup.top
        // fits in a display
        res = {
          top: 0,
          bottom: hrect.height,
          height: hrect.height,
          ok: true,
          overflow: false,
        };
      } else {
        res = {
          top: rect.bottom - hrect.height,
          bottom: rect.bottom,
          height: hrect.height,
          ok: true,
          overflow: false,
        };
      }
    }
    return res;
  }

  /**
   * @param {string} partOfSpeech
   * @param {string} meaning
   * @param {number} j
   * @param {boolean} showLine
   */
  #HiddenInsert(partOfSpeech, meaning, j, showLine) {
    this.#hiddenWordHolder[j].aWord.style.display = "block";
    this.#hiddenWordHolder[j].partOfSpeech.innerText = `[${partOfSpeech}]`;
    this.#hiddenWordHolder[j].context.innerText = meaning.context;
    this.#hiddenWordHolder[j].translation.innerText = meaning.translation;
    this.#hiddenWordHolder[j].example.innerText = meaning.example;

    if (showLine) {
      this.#hiddenLineHolder[j].style.display = "block";
      this.#lineHolder[j].style.width = `${InlineOutput.#DEFAULT_LINE_WIDTH}px`;
    }
  }

  /**
   * @param {string} partOfSpeech
   * @param {string} meaning
   * @param {number} lengthOfMeanings
   * @param {number} indx
   * @param {number} j
   * @param {boolean} overflow
   * @returns {number}
   */
  #Insert(partOfSpeech, meaning, lengthOfMeanings, indx, j, overflow) {
    var lw = InlineOutput.#DEFAULT_LINE_WIDTH;
    this.#wordHolder[j].aWord.style.display = "block";
    this.#wordHolder[j].partOfSpeech.innerText = `[${partOfSpeech}]`;
    this.#wordHolder[j].context.innerText = meaning.context;
    this.#wordHolder[j].translation.innerText = meaning.translation;
    this.#wordHolder[j].example.innerText = meaning.example;

    if (indx + 1 < lengthOfMeanings) {
      this.#lineHolder[indx].style.display = "block";
      if (overflow) {
        lw = lw - 8;
      }
      this.#lineHolder[indx].style.width = `${lw}px`;
    }

    isBusy[j] = true;
    ++indx;
    return indx;
  }

  #AddJsonStruture(res) {
    var indx = 0;
    var meaning, obj;

    for (var j = 0; j < this.#isBusy.length; j++) {
      if (!this.#isBusy[j] && indx < res.meanings.length) {
        meaning = res.meanings[indx];

        this.#HiddenInsert(
          res.part_of_speech,
          meaning,
          j,
          indx + 1 < res.meanings.length,
        );

        obj = this.#IsRestructedNeeded();
        if (obj.ok) {
          popup.style.top = `${top}px`;
          popup.style.bottom = `${bottom}px`;
          popup.style.height = `${height}px`;

          if (overflow) {
            content.style.overflow = "auto";
            content.scrollWidth = "auto";
          }
        }

        indx = this.#Insert(
          res.part_of_speech,
          meaning,
          res.meanings.length,
          indx,
          j,
          overflow,
        );
      }
    }
  }

  TurnOffAnimation() {
    this.#content.style.animation = "none";
    this.#content.style.background = "none";
    this.#content.style.color = "#0d0d0d";
    this.statusMsg.textContent = "";
  }

  Clear() {
    this.#houtput.textContent = "";
    this.output.style.display = "block";
    this.statusMsg.remove();
  }

  Flush() {
    this.#houtput.innerText = this.#buffer;
    this.output.innerText = this.#buffer;

    _application.TurnOffObserver()
    this.#houtput.textContent = "";
  }

  /**@param {string} text  */
  Add(text) {
    if (this.isStream) {
      this.#buffer += text;

      if (this.#buffer.length >= Output.BUFFER_LENGTH) {
        this.#houtput.innerText = this.#buffer;
        this.output.innerText = this.#buffer;
      }
    } else {
      this.#AddJsonStruture(text);
    }
  }
}

// class Input {
//   static #BUFFER_LENGTH = 10;
//   static #DEFAULT_LINE_WIDTH = 367;
//   constructor() {
//     this.buffer = "";
//     this.hinput = hroot.getElementById("hidden_phrase");
//     this.input = root.getElementById("phrase");
//     this.statusMsg = root.getElementById("status_message");
//     this.content = root.getElementById("window_content");
//     this.hidHolder = hroot.getElementById("hidden_holder");
//     this.app = root.getElementById("translation_window");
//     this.wordsID = 0;
//     this.dotsID = 0;
//     this.i = 0;
//     this.hiddenWordHolder = [];
//     this.wordHolder = [];
//     this.hiddenLineHolder = [];
//     this.lineHolder = [];
//     this.isBusy = [false, false, false, false, false];
//     this.#InitHolders();
//   }

//   #InitHolders() {
//     for (let i = 1; i <= 5; i++) {
//       if (i < 5) {
//         this.lineHolder[i - 1] = root.getElementById(`a_line_${i}`);
//         this.hiddenLineHolder[i - 1] = hroot.getElementById(`a_line_${i}`);
//       }
//       this.wordHolder[i - 1] = {
//         aWord: root.getElementById(`a_word_${i}`),
//         partOfSpeech: root.getElementById(`header_${i}`),
//         context: root.getElementById(`bold_title_${i}`),
//         translation: root.getElementById(`translated_word_${i}`),
//         example: root.getElementById(`meaning_${i}`),
//       };
//       this.hiddenWordHolder[i - 1] = {
//         aWord: hroot.getElementById(`a_word_${i}`),
//         partOfSpeech: hroot.getElementById(`header_${i}`),
//         context: hroot.getElementById(`bold_title_${i}`),
//         translation: hroot.getElementById(`translated_word_${i}`),
//         example: hroot.getElementById(`meaning_${i}`),
//       };
//     }
//   }

//   /**@returns {void} */
//   #Clear() {
//     this.hinput.textContent = "";
//     this.input.style.display = "block";
//     this.statusMsg.remove();
//   }

//   /**@returns {Promise<void>} */
//   async #SetDirection() {
//     var rtlLanguages, language;

//     rtlLanguages = ["ar", "he", "ur"];
//     language = await new Promise((resolve) => {
//       chrome.storage.local.get(["new_language"], (result) => {
//         resolve(result.new_language || navigator.language.slice(0, 2));
//       });
//     });

//     if (rtlLanguages.includes(language)) {
//       this.input.setAttribute("lang", language);
//       this.input.setAttribute("dir", "rtl");
//       this.input.style.textAlign = "right";
//     }
//   }

//   /**@returns {void} */
//   #TurnOffAnimation() {
//     this.content.style.animation = "none";
//     this.content.style.background = "none";
//     this.content.style.color = "#0d0d0d";
//     this.statusMsg.textContent = "";
//   }

//   /**@returns {void} */
//   #StopLoadingAnimation() {
//     clearInterval(this.dotsID);
//     clearInterval(this.wordsID);
//     this.i = 0;
//   }

//   /**@returns {void} */
//   Set() {
//     this.#Clear();
//     this.#SetDirection();
//     this.#TurnOffAnimation();
//     this.#StopLoadingAnimation();
//   }

//   TurnOnAnimation() {
//     var dots = 0;
//     this.wordsID = setInterval(() => {
//       if (this.i + 1 > PROCCESS_STATUS.length - 1) {
//         this.i = 0;
//       } else {
//         this.i++;
//       }
//     }, 4000);
//     this.dotsID = setInterval(() => {
//       dots = (dots + 1) % 4;
//       this.statusMsg.textContent = `${PROCCESS_STATUS[i]}${".".repeat(dots)}`;
//     }, 300);
//   }

//   /**@returns {void} */
//   Flush() {
//     this.hinput.innerText = this.buffer;
//     this.input.innerText = this.buffer;

//     observer.disconnect();
//     currentlineHeight = 20;
//     stopgrowing = false;
//     this.hinput.textContent = "";
//   }

//   /**
//    * @param {string} text
//    * @returns {void}
//    */
//   Add(text) {
//     this.buffer += text;

//     if (this.buffer.length >= Input.#BUFFER_LENGTH) {
//       this.hinput.innerText = this.buffer;
//       this.input.innerText = this.buffer;
//     }
//   }

//   /**@returns {{top: number; bottom: number; height: number; ok: boolean; overflow: boolean;}} */
//   #IsRestructedNeeded() {
//     var res = { top: 0, bottom: 0, height: 0, ok: false, overflow: false },
//       hrect,
//       rect;
//     hrect = this.hidHolder.getBoundingClientRect();
//     rect = this.app.getBoundingClientRect();

//     if (hrect.height >= window.innerHeight) {
//       // if new height doesn't fit display at all
//       res = {
//         top: 0,
//         bottom: window.innerHeight,
//         height: window.innerHeight,
//         ok: true,
//         overflow: true,
//       };
//     } else if (!onlyup) {
//       if (rect.top + hrect.height >= window.innerHeight) {
//         // if height is too much, and it doesn't fit in a display (bottom),
//         // I need to raise up popup.top, til the future popup.bottom
//         // fits in a display
//         res = {
//           top: rect.top + hrect.height - window.innerHeight,
//           bottom: window.innerHeight,
//           height: hrect.height,
//           ok: true,
//           overflow: false,
//         };
//       } else {
//         res = {
//           top: rect.top,
//           bottom: rect.top + hrect.height,
//           height: hrect.height,
//           ok: true,
//           overflow: false,
//         };
//       }
//     } else if (onlyup) {
//       if (rect.bottom - hrect.height <= 0) {
//         // if height is too much, and it doesn't fit in a display (top),
//         // I need to reduce popup.bottom down, til the future popup.top
//         // fits in a display
//         res = {
//           top: 0,
//           bottom: hrect.height,
//           height: hrect.height,
//           ok: true,
//           overflow: false,
//         };
//       } else {
//         res = {
//           top: rect.bottom - hrect.height,
//           bottom: rect.bottom,
//           height: hrect.height,
//           ok: true,
//           overflow: false,
//         };
//       }
//     }
//     return res;
//   }

//   /**
//    * @param {string} partOfSpeech
//    * @param {string} meaning
//    * @param {number} j
//    * @param {boolean} showLine
//    */
//   #HiddenInsert(partOfSpeech, meaning, j, showLine) {
//     this.hiddenWordHolder[j].aWord.style.display = "block";
//     this.hiddenWordHolder[j].partOfSpeech.innerText = `[${partOfSpeech}]`;
//     this.hiddenWordHolder[j].context.innerText = meaning.context;
//     this.hiddenWordHolder[j].translation.innerText = meaning.translation;
//     this.hiddenWordHolder[j].example.innerText = meaning.example;

//     if (showLine) {
//       this.hiddenLineHolder[j].style.display = "block";
//       this.lineHolder[j].style.width = `${Input.#DEFAULT_LINE_WIDTH}px`;
//     }
//   }

//   /**
//    * @param {string} partOfSpeech
//    * @param {string} meaning
//    * @param {number} lengthOfMeanings
//    * @param {number} indx
//    * @param {number} j
//    * @param {boolean} overflow
//    * @returns {number}
//    */
//   #Insert(partOfSpeech, meaning, lengthOfMeanings, indx, j, overflow) {
//     var lw = linewidth;
//     this.wordHolder[j].aWord.style.display = "block";
//     this.wordHolder[j].partOfSpeech.innerText = `[${partOfSpeech}]`;
//     this.wordHolder[j].context.innerText = meaning.context;
//     this.wordHolder[j].translation.innerText = meaning.translation;
//     this.wordHolder[j].example.innerText = meaning.example;

//     if (indx + 1 < lengthOfMeanings) {
//       this.lineHolder[indx].style.display = "block";
//       if (overflow) {
//         lw = lw - 8;
//       }
//       this.lineHolder[indx].style.width = `${lw}px`;
//     }

//     isBusy[j] = true;
//     ++indx;
//     return indx;
//   }

//   AddJsonStruture(res) {
//     var indx = 0;
//     var meaning, obj;

//     for (var j = 0; j < this.isBusy.length; j++) {
//       if (!this.isBusy[j] && indx < res.meanings.length) {
//         meaning = res.meanings[indx];

//         this.#HiddenInsert(
//           res.part_of_speech,
//           meaning,
//           j,
//           indx + 1 < res.meanings.length,
//         );

//         obj = this.#IsRestructedNeeded();
//         if (obj.ok) {
//           popup.style.top = `${top}px`;
//           popup.style.bottom = `${bottom}px`;
//           popup.style.height = `${height}px`;

//           if (overflow) {
//             content.style.overflow = "auto";
//             content.scrollWidth = "auto";
//           }
//         }

//         indx = this.#Insert(
//           res.part_of_speech,
//           meaning,
//           res.meanings.length,
//           indx,
//           j,
//           overflow,
//         );
//       }
//     }
//   }
// }

class Application {
  static #DEFAULT_HEIGHT = 55
  static #DEFAULT_WIDTH = 400;
  static #DEFAULT_HEIGHT = 55;
  static #OFFSET = 10;
  static #DEFAULT_HEADERS_HEIGHT = 25;
  #hidHolder = hroot.getElementById("hidden_holder");
  #hinput = hroot.getElementById("hidden_phrase");
  #app = root.getElementById("translation_window");
  #onlyup = false;
  #text = "";
  #observer = null
  #stopgrowing = false
  #currentlineHeight = 20
  #output = new InlineOutput()

  /**@param {string} type  */
  constructor(type) {
    this.type = type;
  }

  #TurnOnOverflow() {
    content.style.overflow = "auto";
    content.scrollWidth = "auto";
  }

  /**
   * @param {string} top
   * @param {string} bottom
   * @param {string} height
   */
  #Change(top, bottom, height) {
    if (height) {
      popup.style.height = height;
    }
    if (top) {
      if (parseFloat(top) >= 0) {
        popup.style.top = top;
      } else {
        popup.style.top = "0px";
      }
    }
    if (bottom) {
      popup.style.bottom = bottom;
    }
  }

  /**
   *
   * @param {number} popupBottom
   * @param {number} newHeight
   */
  #GrowDown(popupBottom, newHeight) {
    var top, bottom, height
    if (popupBottom < Window.innerHeight) {
      console.log("grows down");
      top = `0px`;
      bottom = `${popupBottom - (newHeight - this.#currentlineHeight)}px`;
      this.#currentlineHeight = newHeight;
      height = `${InlinePopup.#DEFAULT_HEADERS_HEIGHT + InlinePopup.#DEFAULT_HEIGHT + this.#currentlineHeight}px`;
    } else {
      console.log("stops growing");
      height = "100vh";
      this.#stopgrowing = true;
      this.#currentlineHeight = Infinity;
      this.#TurnOnOverflow()
    }
    this.#Change(top, bottom, height)
  }

  /**
   * @param {number} popupBottom
   * @param {number} popupTop
   * @param {number} newHeight
   */
  #GrowUp(popupBottom, popupTop, newHeight) {
    var top, bottom, height
    if (popupBottom > window.innerHeight) {
      if (popupTop <= 0) {
        console.log("stops growing");
        // starts addiding new text into a container,
        // but doesn't let grow the popup.
        height = "100vh";
        bottom = `${Window.innerHeight}px`;
        top = "0px";
        this.#stopgrowing = true;
        this.#currentlineHeight = Infinity;
        this.#TurnOnOverflow()
      } else {
        // grows up
        console.log("grows up");
        bottom = `${Window.innerHeight}px`;
        top = `${popupTop - (newHeight - this.#currentlineHeight)}px`;
        this.#currentlineHeight = newHeight;
        height = `${InlinePopup.#DEFAULT_HEADERS_HEIGHT + InlinePopup.#DEFAULT_HEIGHT + this.#currentlineHeight}px`;
      }
    } else {
      console.log("grows down");
      top = "0px"
      bottom = ""
      this.#currentlineHeight = newHeight;
      height = `${InlinePopup.#DEFAULT_HEADERS_HEIGHT  + InlinePopup.#DEFAULT_HEIGHT + this.#currentlineHeight}px`;
    }
    this.#Change(top, bottom, height)
  }


  /**@param {ResizeObserverEntry[]} entries  */
  #HandleResizing(entries) {
    var entry, rect, newHeight;

    for (entry of entries) {
      rect = root.getElementById("translation_window").getBoundingClientRect();
      newHeight = entry.contentRect.height

      if (!this.#stopgrowing) {
        // if the popup is upper
        if (this.#currentlineHeight < newHeight && this.#onlyup) {
          this.#GrowDown(rect.bottom, newHeight)
          // if the popup is under
        } else if (this.#currentlineHeight < newHeight && !this.#onlyup) {
          this.#GrowUp(rect.bottom, rect.top, newHeight)
        }
      }
    }
  }

  #NewObserver() {
    return new ResizeObserver((entries) => this.#HandleResizing(entries));
  }

  TurnOffObserver() {
    this.#observer.disconnect()
    this.#currentlineHeight = 20;
    this.#stopgrowing = false;
  }

  /**
   * @param {string} text
   * @returns {void}
   */
  #AppearHidden(text) {
    this.#hinput.textContent = text;
    this.#hinput.textContent = "";
    observer.observe(this.#hinput);
  }

  #GoogleDriveAppearance() {
    var canvas, rect, ratio, margin;
    canvas = document.querySelector(".canvas-first-page");
    if (canvas) {
      rect = canvas.getBoundingClientRect();
      console.log("[DEBUG] rect:", rect);

      ratio = window.innerWidth - rect.right;
      this.#app.style.top = rect.top + "px";

      if (ratio >= Application.#DEFAULT_WIDTH) {
        margin = (ratio - Application.#DEFAULT_WIDTH) / 2;
        this.#app.style.left = rect.right + margin + "px";
      } else {
        this.#app.style.left =
          window.innerWidth - Application.#DEFAULT_WIDTH + "px";
      }

      this.#app.style.display = "flex";
      input.TurnOnAnimation();
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
      console.log("popup is upper");
      res =
        rect.top -
        Application.#OFFSET -
        Application.#DEFAULT_HEIGHT -
        Application.#DEFAULT_HEADERS_HEIGHT;
      if (res > 0) {
        top = `${res}px`;
        this.onlyup = true;
      } else {
        top = "0px";
      }
    } else {
      // the popup is under
      console.log("popup is under");
      top = `${rect.bottom + Application.#OFFSET}px`;
      this.onlyup = false;
    }

    console.log("at the moment of appearens: top = ", top, "left = ", left);
    this.#app.style.top = top;
    this.#app.style.left = left;
    this.#app.style.display = "flex";
    input.TurnOnAnimation();
  }

  /**
   * @param {Selection | null} selection
   * @returns {boolean}
   */
  #IsShowable(selection) {
    var res = true;
    if (window.innerWidth < popupWidth) {
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
        this.#DefaultAppearance(selection, this.#text);
        this.#observer = this.#NewObserver()
        Translate(this.#output, this.#text);
      } else {
        alert("display is too small");
      }
    } else {
      console.warn("unable to get text for translating");
    }
  }

  #ThroughGoogleDrive() {
    console.log("[DEBUG] going through google");
    console.log("[DEBUG] this.#text is", this.#text);
    this.#AppearHidden(this.#text);

    if (this.#IsShowable(null)) {
      this.#GoogleDriveAppearance();
      this.#observer = this.#NewObserver()
      Translate(this.#output, this.#text);
    }
  }

  /**@returns {string} */
  GetType() {
    return this.type;
  }

  /**@param {string} text */
  SaveText(text) {
    console.log("[DEBUG] text saved");
    this.#text = text;
  }

  Close() {
    console.log("[WARN] !CLOSE!");
    if (root?.host) root.host.remove();
    if (hroot?.host) hroot.host.remove();

    root = null;
    hroot = null;
    _application = null;
    input = null;
  }

  async Activate() {
    this.#text = sh.GetText();
    if (this.type === GOOGLE_DRIVE) {
      this.#ThroughGoogleDrive();
    } else if (this.type === REGULAR_PAGE) {
      this.#ThroughSelection();
    }
  }
}

function changePopup(height, bottom, top) {
  return new Promise((resolve) => {
    console.log("height = ", height, "bottom = ", bottom, "top = ", top);
    if (height) {
      popup.style.height = height;
    }
    if (top) {
      if (parseFloat(top) >= 0) {
        popup.style.top = top;
      } else {
        popup.style.top = "0px";
      }
    }
    if (bottom) {
      popup.style.bottom = bottom;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function turnOnOverFlow() {
  return new Promise((resolve) => {
    content.style.overflow = "auto";
    content.scrollWidth = "auto";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

const observer = new ResizeObserver((entries) => {
  for (let entry of entries) {
    var top, height, bottom;
    const popupRect = root
      .getElementById("translation_window")
      .getBoundingClientRect();
    const popupTop = popupRect.top;
    const popupBottom = popupRect.bottom;
    const newHeight = entry.contentRect.height;
    if (!stopgrowing) {
      // if the popup is upper
      if (currentlineHeight < newHeight && onlyup) {
        if (popupTop <= 0) {
          if (popupBottom < window.innerHeight) {
            // grows down
            console.log("grows down");
            top = `0px`;
            bottom = `${popupBottom - (newHeight - currentlineHeight)}px`;
            currentlineHeight = newHeight;
            height = `${headersHeight + defaultHeight + currentlineHeight}px`;
          } else {
            console.log("stops growing");
            // starts addiding new text into a container,
            // but doesn't let grow the popup.
            height = "100vh";
            stopgrowing = true;
            currentlineHeight = Infinity;
            turnOnOverFlow().then(() => console.log("overflow is tuned on"));
          }
        } else {
          // grows up
          console.log("grows up");
          top = `${popupTop - (newHeight - currentlineHeight)}px`;
          currentlineHeight = newHeight;
        }
        changePopup(height, bottom, top).then(() =>
          console.log("popup has been changed"),
        );
        // if the popup is under
      } else if (currentlineHeight < newHeight && !onlyup) {
        console.log(
          "popupBottom = ",
          popupBottom,
          "window.innerHeight = ",
          window.innerHeight,
          "is popupBottom greater?: ",
          popupBottom > window.innerHeight,
        );
        if (popupBottom > window.innerHeight) {
          if (popupTop <= 0) {
            console.log("stops growing");
            // starts addiding new text into a container,
            // but doesn't let grow the popup.
            height = "100vh";
            bottom = `${window.innerHeight}px`;
            top = "0px";
            stopgrowing = true;
            currentlineHeight = Infinity;
            turnOnOverFlow().then(() => console.log("overflow is tuned on"));
          } else {
            // grows up
            console.log("grows up");
            bottom = `${window.innerHeight}px`;
            top = `${popupTop - (newHeight - currentlineHeight)}px`;
            currentlineHeight = newHeight;
            height = `${headersHeight + defaultHeight + currentlineHeight}px`;
          }
        } else {
          console.log("grows down");
          currentlineHeight = newHeight;
          height = `${headersHeight + defaultHeight + currentlineHeight}px`;
        }
        changePopup(height, bottom, top).then(() =>
          console.log("popup has been changed"),
        );
      }
    }
  }
});

function errorChanges(text) {
  return new Promise((resolve) => {
    turnOffAnimationAndCleanText().then(() => {
      stopLoadingAnimation();

      content.style.animation = "none";
      content.style.background = "none";
      content.style.color = "#0d0d0d";
      textNod.textContent = text;
      errorImg.style.display = "block";

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });
}

function turnOffAnimationAndCleanText() {
  return new Promise((resolve) => {
    content.style.animation = "none";
    content.style.background = "none";
    content.style.color = "#0d0d0d";
    textNod.textContent = "";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function addInnerText(obj, objhidden, text) {
  return new Promise((resolve) => {
    objhidden.innerText += text;
    obj.innerText += text;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function regularTextChange(text) {
  return new Promise((resolve) => {
    hiddenPhrase.textContent += text;
    phrase.textContent += text;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function finalTextChange(text) {
  return new Promise((resolve) => {
    phrase.textContent = text;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function clearAll() {
  return new Promise((resolve) => {
    hiddenPhrase.textContent = "";
    phrase.style.display = "block";
    textNod.remove();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function clearTheField() {
  return new Promise((resolve) => {
    hiddenPhrase.textContent = "";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function stopLoadingAnimation() {
  clearInterval(dotsInterval);
  clearInterval(wordsInterval);
  dotsInterval = null;
  wordsInterval = null;
  i = 0;
}

async function setTextDirection() {
  const rtlLanguages = ["ar", "he", "ur"];
  const language = await new Promise((resolve) => {
    chrome.storage.local.get(["new_language"], (result) => {
      resolve(result.new_language || navigator.language.slice(0, 2));
    });
  });
  if (rtlLanguages.includes(language)) {
    phrase.setAttribute("lang", language);
    phrase.setAttribute("dir", "rtl");
    await new Promise((resolve) => {
      phrase.style.textAlign = "right";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  }
}

async function firstStep(id) {
  if (process) {
    console.log("got first data from a stream");
    process = false;
    chrome.storage.local.set({ user_id: id });
    await clearAll();
    await setTextDirection();
    await turnOffAnimationAndCleanText();
    stopLoadingAnimation();
  }
}

async function streamResponseHandler(buffer, decoder, value) {
  var eventType, data;
  buffer.value += decoder.decode(value, { stream: true });
  const parts = buffer.value.split("\n\n");
  buffer.value = parts.pop();

  for (let part of parts) {
    const lines = part.split("\n");
    eventType = "message";
    data = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }

    try {
      const parsed = JSON.parse(data);
      if (data) {
        await firstStep(parsed.user_id);
      }

      if (eventType === "data") {
        console.log(phrase);
        await regularTextChange(parsed.text);
      } else if (eventType === "final_data") {
        console.log("final data comes: ", parsed);
        const f = parsed.final_text;
        if (phrase.innerText !== f) {
          console.log("doesn't match");
          console.log(phrase.innerText);
          console.log(f);
          await finalTextChange(f);
        }
        observer.disconnect();
        currentlineHeight = 20;
        stopgrowing = false;
        await clearTheField();
      }
    } catch (err) {
      console.error("Failed to parse SSE JSON:", err, data);
    }
  }
}

function hiddenInsert(oneWord, meaning, j, showLine) {
  return new Promise((resolve) => {
    hiddenWordHolder[j].aWord.style.display = "block";
    hiddenWordHolder[j].partOfSpeech.innerText = `[${oneWord.part_of_speech}]`;
    hiddenWordHolder[j].context.innerText = meaning.context;
    hiddenWordHolder[j].translation.innerText = meaning.translation;
    hiddenWordHolder[j].example.innerText = meaning.example;

    if (showLine) {
      hiddenLineHolder[j].style.display = "block";
      lineHolder[j].style.width = `${linewidth}px`;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function isRestructedNeeded() {
  const rectV1 = div.getBoundingClientRect();
  const rectV2 = popup.getBoundingClientRect();
  var result = [0, 0, 0, false, false];

  if (rectV1.height >= window.innerHeight) {
    // if new height doesn't fit display at all
    result = [0, window.innerHeight, window.innerHeight, true, true];
  } else if (!onlyup) {
    if (rectV2.top + rectV1.height >= window.innerHeight) {
      // if height is too much, and it doesn't fit in a display (bottom),
      // I need to raise up popup.top, til the future popup.bottom
      // fits in a display
      result = [
        rectV2.top + rectV1.height - window.innerHeight,
        window.innerHeight,
        rectV1.height,
        true,
        false,
      ];
    } else {
      result = [
        rectV2.top,
        rectV2.top + rectV1.height,
        rectV1.height,
        true,
        false,
      ];
    }
  } else if (onlyup) {
    if (rectV2.bottom - rectV1.height <= 0) {
      // if height is too much, and it doesn't fit in a display (top),
      // I need to reduce popup.bottom down, til the future popup.top
      // fits in a display
      result = [0, rectV1.height, rectV1.height, true, false];
    } else {
      result = [
        rectV2.bottom - rectV1.height,
        rectV2.bottom,
        rectV1.height,
        true,
        false,
      ];
    }
  }

  return result;
}

function restructPopup(top, height, bottom) {
  return new Promise((resolve) => {
    popup.style.top = `${top}px`;
    popup.style.bottom = `${bottom}px`;
    popup.style.height = `${height}px`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function usualInsert(oneWord, meaning, indx, j, overflow) {
  const lw = linewidth;
  wordHolder[j].aWord.style.display = "block";
  wordHolder[j].partOfSpeech.innerText = `[${oneWord.part_of_speech}]`;
  wordHolder[j].context.innerText = meaning.context;
  wordHolder[j].translation.innerText = meaning.translation;
  wordHolder[j].example.innerText = meaning.example;

  if (indx + 1 < oneWord.meanings.length) {
    lineHolder[indx].style.display = "block";
    if (overflow) {
      lw = lw - 8;
    }
    lineHolder[indx].style.width = `${lw}px`;
  }

  isBusy[j] = true;
  ++indx;

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve(indx);
      });
    });
  });
}

async function insertOneWordStructure(oneWord) {
  var indx = 0;

  for (var j = 0; j < isBusy.length; j++) {
    if (!isBusy[j] && indx < oneWord.meanings.length) {
      const meaning = oneWord.meanings[indx];

      await hiddenInsert(
        oneWord,
        meaning,
        j,
        indx + 1 < oneWord.meanings.length,
      );

      const [top, bottom, height, ok, overflow] = isRestructedNeeded();
      if (ok) {
        await restructPopup(top, height, bottom);
        if (overflow) {
          await turnOnOverFlow();
        }
      }

      indx = await usualInsert(oneWord, meaning, indx, j, overflow);
    }
  }

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

async function jsonResponseHandler(msg) {
  return new Promise((resolve) => {
    firstStep(msg.user_id).then(() => {
      insertOneWordStructure(msg.content);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
  });
}

async function goStream(text) {
  const port = chrome.runtime.connect({ name: "stream_data" });

  const userID = await new Promise((resolve) =>
    chrome.storage.local.get(["user_id"], (result) => {
      resolve(Number(result.user_id) || 0);
    }),
  );

  const language = await new Promise((resolve) =>
    chrome.storage.local.get(["new_language"], (result) => {
      resolve(result.new_language || navigator.language.slice(0, 2));
    }),
  );

  const decoder = new TextDecoder("utf-8");
  const buffer = { value: "" };
  const dataQueue = new Queue();

  port.postMessage({
    user_id: userID,
    lang_code: language,
    text: text,
  });

  port.onMessage.addListener((msg) => {
    if (msg.done) {
      console.log("stream ends");
      copyBtn.style.display = "flex";
      port.disconnect();
    } else if (msg.error) {
      errorChanges("Sorry, I currently can't help you").then(() => {
        console.log("got an error");
        port.disconnect();
      });
    } else if (msg.chunk) {
      const uint8array = new Uint8Array(msg.chunk);
      dataQueue.add(() => streamResponseHandler(buffer, decoder, uint8array));
    }
  });
}

async function goRequest(text) {
  phraseProcess = false;
  const port = chrome.runtime.connect({ name: "one_word" });
  const userID = await new Promise((resolve) => {
    chrome.storage.local.get(["user_id"], (result) => {
      resolve(Number(result.user_id) || 0);
    });
  });
  const language = await new Promise((resolve) => {
    chrome.storage.local.get(["new_language"], (result) => {
      resolve(result.new_language || navigator.language.slice(0, 2));
    });
  });

  console.log("prepared data to send");
  port.postMessage({
    user_id: userID,
    lang_code: language,
    text: text,
  });

  console.log("prepared to be listening");
  port.onMessage.addListener((msg) => {
    console.log("got response");
    console.log(msg);
    if (msg.ok) {
      console.log(msg.data.content.error);
      if (msg.data.content.error === "invalid input") {
        errorChanges("Meaningless or nonsense input.").then(() => {
          console.log("got an error");
          port.disconnect();
        });
      } else {
        chrome.storage.local.set({ user_id: msg.data.user_id });
        jsonResponseHandler(msg.data).then(() => {
          port.disconnect();
        });
      }
    } else {
      errorChanges("Sorry, I currently can't help you.").then(() => {
        console.log("got an error");
        port.disconnect();
      });
    }
  });
}

async function translation(text) {
  const trimmed = text.trim();

  const isNoWordDelimiterLang =
    /[\u4E00-\u9FFF\u3040-\u30FF\u0E00-\u0E7F\u1780-\u17FF\u1000-\u109F]/.test(
      trimmed,
    );

  if (isNoWordDelimiterLang) {
    console.log("detected CJK or similar script – starting streaming");
    await goStream(trimmed);
    return;
  }

  const amount = trimmed.split(/\s+/).length;

  if (amount > 4) {
    console.log("starting streaming");
    await goStream(trimmed);
  } else {
    console.log("starting requesting");
    await goRequest(trimmed);
  }
}

function startLoadingAnimation() {
  let dotCount = 0;
  process = true;
  wordsInterval = setInterval(() => {
    if (i + 1 > processText.length - 1) {
      i = 0;
    } else {
      i++;
    }
  }, 4000);
  dotsInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    textNod.textContent = `${processText[i]}${".".repeat(dotCount)}`;
  }, 300);
}

function setUpPopup(top, left) {
  return new Promise((resolve) => {
    popup.style.top = top;
    popup.style.left = left;
    popup.style.display = "flex";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function showTranslationPopup(selection, text) {
  let left, top, res;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (window.innerWidth < rect.left + popupWidth) {
    left = `${window.innerWidth - popupWidth}px`;
  } else {
    left = `${rect.left}px`;
  }

  if (rect.top > window.innerHeight - rect.bottom) {
    console.log("popup is upper");
    res = rect.top - offset - defaultHeight - headersHeight;
    if (res > 0) {
      top = `${res}px`;
      onlyup = true;
    } else {
      top = "0px";
    }
  } else {
    // the popup is under
    console.log("popup is under");
    top = `${rect.bottom + offset}px`;
    onlyup = false;
  }

  console.log("at the moment of appearens: top = ", top, "left = ", left);
  setUpPopup(top, left).then(() => {
    startLoadingAnimation(text);
  });
}

function canShow(selection) {
  if (!selection.rangeCount) return false;

  if (window.innerWidth < popupWidth) {
    alert("Your display isn't suitable");
    return false;
  }

  return true;
}

function createTextHolder(text) {
  return new Promise((resolve) => {
    console.log("there's some text: ", text);
    hiddenPhrase.textContent = text;

    requestAnimationFrame(() => {
      console.log(div);
      const height = div.offsetHeight;
      hiddenPhrase.textContent = "";
      observer.observe(hiddenPhrase);
      resolve(height);
    });
  });
}

function theBeginingOfTheLogic(selectedText) {
  console.log("got called from shortcut");
  // const selectedText = window.getSelection().toString();
  console.log("got selected text", selectedText);
  if (selectedText) {
    createTextHolder(selectedText).then((height) => {
      const selection = window.getSelection();
      console.log("got height and selection");
      if (canShow(selection)) {
        showTranslationPopup(selection, processText);
        console.log("showed popup");
        translation(selectedText);
      }
    });
  }
}

function copyText() {
  return new Promise((resolve) => {
    copyLogo.style.display = "none";
    checkmark.style.display = "block";
    textBtn.textContent = "Copied";

    navigator.clipboard.writeText(phrase.textContent).catch((err) => {
      console.error("Failed to copy text: ", err);
      alert("Failed to copy text.");
    });

    setTimeout(() => {
      return new Promise((resolve) => {
        copyLogo.style.display = "block";
        checkmark.style.display = "none";
        textBtn.textContent = "Copy";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
    }, 3000);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
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

function dataIntoLets(hidden, visible) {
  popup = visible.getElementById("translation_window");
  content = visible.getElementById("window_content");
  errorImg = visible.getElementById("error_img");
  copyLogo = visible.getElementById("copy_logo");
  checkmark = visible.getElementById("checkmark_logo");
  textBtn = visible.getElementById("btn_text");
  div = hidden.getElementById("hidden_holder");
  textNod = visible.getElementById("status_message");
  console.log(
    "content.childNodes: ",
    content.childNodes,
    "textNod.nodeType = ",
    textNod.nodeType,
    Node.TEXT_NODE,
  );
  hiddenPhrase = hidden.getElementById("hidden_phrase");
  phrase = visible.getElementById("phrase");
  copyBtn = visible.getElementById("copy_btn");
  closeBtn = visible.getElementById("close_btn");
  isBusy = [false, false, false, false, false];
  for (let i = 1; i <= 5; i++) {
    if (i < 5) {
      lineHolder[i - 1] = visible.getElementById(`a_line_${i}`);
      hiddenLineHolder[i - 1] = hidden.getElementById(`a_line_${i}`);
    }
    wordHolder[i - 1] = {
      aWord: visible.getElementById(`a_word_${i}`),
      partOfSpeech: visible.getElementById(`header_${i}`),
      context: visible.getElementById(`bold_title_${i}`),
      translation: visible.getElementById(`translated_word_${i}`),
      example: visible.getElementById(`meaning_${i}`),
    };
    hiddenWordHolder[i - 1] = {
      aWord: hidden.getElementById(`a_word_${i}`),
      partOfSpeech: hidden.getElementById(`header_${i}`),
      context: hidden.getElementById(`bold_title_${i}`),
      translation: hidden.getElementById(`translated_word_${i}`),
      example: hidden.getElementById(`meaning_${i}`),
    };
  }
}

/** @param {Event} event */
function Cliked(event) {
  console.log("Event target:", event.target);
  if (root && !root.contains(event.target)) {
    console.log("the click is outside of the root");
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
  console.assert(_application !== undefined);
  setTimeout(() => {
    document.addEventListener("click", (event) => Cliked(event));
  }, 500);
  // document.addEventListener("click", (event) => Cliked(event));
  document.addEventListener("keydown", (event) => KeyDown(event));
  root.getElementById("copy_btn").addEventListener("click", CopyClick);
  root
    .getElementById("close_btn")
    .addEventListener("click", () => _application.Close());
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
          console.log("[DEBUG] Final attempt: direct append to body");
          document.body.appendChild(obj.el);
        }
      }, 5000);
    }
  }
}

/**@param {string} type  */
function Begin(type) {
  var hdobj, obj;
  hdobj = CreateHiddenObject();
  obj = CreateObject();
  hroot = hdobj.root;
  root = obj.root;
  Insert(hdobj);
  Insert(obj);
  console.log("inserted");
  input = new Input();
  _application = new Application(type);
  _application.Activate(type).then(() => AddListeners());

  // return new Promise((resolve) => {
  //   hidden().then((hiddenLink) => {
  //     visible().then((visibleLink) => {
  //       waitForRender(() => {
  //         dataIntoLets(hiddenLink, visibleLink);
  //         resolve();
  //       });
  //     });
  //   });
  // });
}

function GetButtonHTML() {
  console.log("ALO?");
  return `<div id="go_btn">
    <img id="logo" src=${chrome.runtime.getURL("icons/very_small_logo.png")}>
  </div>`;
}

function GetButtonStyles() {
  return `#go_btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 5px;
  position: absolute;
  width: 25px;
  height: 25px;
  border-radius: 5px;
  border: 1px solid #000000;
  opacity: 0;
  transition: opacity 0.5s;
  cursor: pointer;
  background-color: #ffff;
}
#go_btn.show {
  opacity: 1;
}
#logo {
  width: 22px;
  height: 20px;
}`;
}

class GoButton {
  static #DEFAULT_MARGIN = 5;
  static #DEFAULT_HEIGHT = 35;
  static #DEFAULT_WIDTH = 35;
  #isCreated = false;
  #root = null;
  #el = null;
  #btn = null;
  #timeout = true;
  constructor() {
    this.#SetUp();
  }

  #Create() {
    var host, shadow, style;
    host = document.createElement("div");
    host.id = GenerateUniqueTagName();
    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = GetButtonHTML();
    style = document.createElement("style");
    style.textContent = GetButtonStyles();
    shadow.appendChild(style);
    this.#el = host;
    this.#root = shadow;
    this.#btn = shadow.getElementById("go_btn");
    this.#isCreated = true;
  }

  /**
   * @param {{ x: number; y: number }} coordinates
   * @returns {{ top: string; left: string }}
   */
  #GetCoordinates(coordinates) {
    var res = { top: `${coordinates.y}px`, left: `${coordinates.x}px` };
    if (coordinates.x + GoButton.#DEFAULT_WIDTH >= window.innerWidth) {
      res.left = coordinates.x - GoButton.#DEFAULT_WIDTH;
    }

    if (coordinates.y + GoButton.#DEFAULT_HEIGHT >= window.innerHeight) {
      res.top = coordinates.y - GoButton.#DEFAULT_HEIGHT;
    }
    return res;
  }

  /**@param {{ x: number; y: number }} coordinates  */
  #Show(coordinates) {
    var btnCrdnts;
    if (!window.location.href.includes("https://docs.google.com/document")) {
      Insert({ el: this.#el, root: this.#root });
      btnCrdnts = this.#GetCoordinates(coordinates);
      console.log("[DEBUG] button coordinates:", btnCrdnts);
      this.#btn.style.top = btnCrdnts.top;
      this.#btn.style.left = btnCrdnts.left;
      this.#btn.classList.add("show");
      console.log("[DEBUG] done!");
      setTimeout(() => {
        this.#timeout = false;
      }, 300);
    }
  }

  #AddListeners() {
    document.addEventListener("click", (event) => this.#Remove(event, true));
    this.#btn.addEventListener("click", () => Begin(REGULAR_PAGE));
  }

  /**
   * @param {Event} event
   * @param {boolean} isEventNeeded
   * */
  #Remove(event, isEventNeeded) {
    var ok = false;
    if (isEventNeeded) {
      ok =
        this.#root &&
        !this.#root.contains(event.target) &&
        this.#btn.classList.contains("show") &&
        !this.#timeout;
    } else {
      ok = true;
    }

    if (ok) {
      this.#btn.classList.remove("show");
      this.#timeout = true;
    }
  }

  #SetUp() {
    console.log("[DEBUG] the button activated!");
    if (!this.#isCreated) {
      this.#Create();
      console.log("[DEBUG] the button created");
      this.#AddListeners();
      console.log("[DEBUG] the event listeners added to the button");
    }
    // Insert({ el: this.#el, root: this.#root });
  }

  Activate() {
    var res;
    console.log("ACTIVATED!");
    Insert({ el: this.#el, root: this.#root });
    res = sh.GetCoordinates();
    if (res.ok) {
      this.#Show(res.coordinates);
      console.log("[DEBUG] the button shown");
    } else {
      console.log("[DEBUG] got null insted of coordinates");
    }
  }
  get btn() {
    return this.#btn;
  }
}

if (!window.location.href.includes("https://docs.google.com/document")) {
  goBtn = new GoButton();
}

chrome.runtime.sendMessage({ action: "say_hello" });
// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//   console.log("Message received:", msg);
//   if (msg.action === "translate" && msg.text) {
//     Begin(REGULAR_PAGE);
//   }
// });
