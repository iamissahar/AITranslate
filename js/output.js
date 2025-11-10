class Output {
  static BUFFER_LENGTH = 10;
  static #PROCCESS_STATUS = [
    "Translating",
    "Getting data",
    "Data processing",
    "Completing",
  ];
  wordsID = 0;
  dotsID = 0;

  /**
   * @param {HTMLElement} statusMsg
   * @param {HTMLElement} output
   */
  constructor(statusMsg, output) {
    this.output = output;
    this.statusMsg = statusMsg;
    this.isStream = false;
    this.isPopup = false;
  }

  /**
   * @param {boolean} isStream
   * @param {boolean} isPopup
   */
  SetStatus(isStream, isPopup) {
    this.isStream = isStream;
    this.isPopup = isPopup;
  }

  /**@param {string} text */
  SetError(text) {
    throw new Error("Method 'SetError()' must be implemented in subclass.");
  }

  Clear() {
    throw new Error("Method 'Clear()' must be implemented in subclass.");
  }

  Flush() {
    throw new Error("Method 'Flush()' must be implemented in subclass.");
  }

  /**@param {string} text  */
  Add(text) {
    throw new Error("Method 'Add()' must be implemented in subclass.");
  }

  async SetDirection() {
    var rtlLanguages, language;

    rtlLanguages = ["ar", "he", "ur"];
    language = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "get_language" }, (res) => {
        resolve(res.language || "");
      });
    });

    if (rtlLanguages.includes(language)) {
      this.output.setAttribute("lang", language);
      this.output.setAttribute("dir", "rtl");
      this.output.style.textAlign = "right";
    }
  }

  TurnOffAnimation() {
    this.output.style.animation = "none";
    if (this.isPopup) {
      this.output.style.background = "#f3f4f6";
    } else {
      this.output.style.background = "none";
    }
    this.output.style.color = "#0d0d0d";
    this.statusMsg.textContent = "";

    console.log("turned animation off");
  }

  StopLoadingAnimation() {
    clearInterval(this.dotsID);
    clearInterval(this.wordsID);
  }

  TurnOnAnimation() {
    console.log("fuck it");
    var dots = 0,
      i = 0;
    this.wordsID = setInterval(() => {
      if (i + 1 > Output.#PROCCESS_STATUS.length - 1) {
        i = 0;
      } else {
        i++;
      }
    }, 4000);
    this.dotsID = setInterval(() => {
      dots = (dots + 1) % 4;
      this.statusMsg.textContent = `${Output.#PROCCESS_STATUS[i]}${".".repeat(dots)}`;
    }, 300);
    console.log("what's wrong!?");
  }

  Set() {
    this.Clear();
    this.SetDirection();
    this.TurnOffAnimation();
    this.StopLoadingAnimation();
  }
}
