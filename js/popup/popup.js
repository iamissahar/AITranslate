const ALLOWED_LANGUAGES = [
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Albanian" },
  { code: "ar", name: "Arabic" },
  { code: "hy", name: "Armenian" },
  { code: "bn", name: "Bengali" },
  { code: "bs", name: "Bosnian" },
  { code: "bg", name: "Bulgarian" },
  { code: "ca", name: "Catalan" },
  { code: "hr", name: "Croatian" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "en", name: "English" },
  { code: "eo", name: "Esperanto" },
  { code: "et", name: "Estonian" },
  { code: "tl", name: "Filipino" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "gu", name: "Gujarati" },
  { code: "hi", name: "Hindi" },
  { code: "hu", name: "Hungarian" },
  { code: "is", name: "Icelandic" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "jw", name: "Javanese" },
  { code: "ko", name: "Korean" },
  { code: "la", name: "Latin" },
  { code: "lv", name: "Latvian" },
  { code: "lt", name: "Lithuanian" },
  { code: "ml", name: "Malayalam" },
  { code: "mr", name: "Marathi" },
  { code: "no", name: "Norwegian" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "pa", name: "Punjabi" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sr", name: "Serbian" },
  { code: "sk", name: "Slovak" },
  { code: "sl", name: "Slovenian" },
  { code: "es", name: "Spanish" },
  { code: "sw", name: "Swahili" },
  { code: "sv", name: "Swedish" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "th", name: "Thai" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "ur", name: "Urdu" },
  { code: "vi", name: "Vietnamese" },
  { code: "cy", name: "Welsh" },
  { code: "he", name: "Hebrew" },
  { code: "mk", name: "Macedonian" },
];

/**@type {PopupOutput} */
var output = null;
/**@type {Input} */
var input = null;
/**@type {Settings} */
var settings = null;

class PopupOutput extends Output {
  static #DONE_IMG = "../icons/checkmark_black.png";
  static #COPY_IMG = "../icons/icon_copy_black.png";
  #outputContent = document.getElementById("output_content");
  #deleteBtn = document.getElementById("output_delete");
  #copyBtn = document.getElementById("output_copy");
  #buffer = "";
  #i = 0;
  /**
   * @param {HTMLElement} statusMsg
   * @param {HTMLElement} output
   */
  constructor(statusMsg, output) {
    super(statusMsg, output);
    this.output = document.getElementById("output");
    this.statusMsg = document.getElementById("status_message");
    this.#InitListeners();
  }

  Clear() {
    console.log(this.#outputContent);
    this.#outputContent.innerHTML = "";
    this.statusMsg.innerHTML = "";
    this.#buffer = "";
    this.#deleteBtn.classList.remove("show");
    this.#copyBtn.classList.remove("show");
    console.log("cleared");
  }

  SetError(text) {
    this.output.innerText = text;
  }

  #AddHTMLStructure(text) {
    this.#outputContent.innerHTML = text;
    this.#deleteBtn.classList.add("show");
    this.#copyBtn.classList.add("show");
    input.Complete();
  }

  /**@param {string} text  */
  async Add(text) {
    if (this.isStream) {
      this.#buffer += text;

      if (this.#buffer.length >= Output.BUFFER_LENGTH + this.#i) {
        return new Promise((resolve) => {
          requestAnimationFrame(() => {
            this.#outputContent.textContent = this.#buffer;
            this.#i += Output.BUFFER_LENGTH;
            resolve();
          });
        });
      }
    } else {
      this.#AddHTMLStructure(text);
    }
  }

  Flush() {
    this.#outputContent.textContent = this.#buffer;
    this.#deleteBtn.classList.add("show");
    this.#copyBtn.classList.add("show");
    input.Complete();
  }

  #Delete() {
    if (this.#deleteBtn.classList.contains("show")) {
      this.#outputContent.innerHTML = "";
      this.#deleteBtn.classList.remove("show");
      this.#copyBtn.classList.remove("show");
    }
  }

  #Copy() {
    var img = document.getElementById("output_copy_img");
    if (this.#copyBtn.classList.contains("show") && this.output.innerText) {
      navigator.clipboard.writeText(this.output.innerText);
      img.src = PopupOutput.#DONE_IMG;
      setTimeout(() => {
        img.src = PopupOutput.#COPY_IMG;
      }, 1500);
    }
  }

  #InitListeners() {
    this.#deleteBtn.addEventListener("click", this.#Delete.bind(this));
    this.#copyBtn.addEventListener("click", this.#Copy.bind(this));
  }

  ClearBefore() {
    console.log("AM I EVEN CLEANING IT:?");
    this.#outputContent.innerHTML = "";
    this.#outputContent.textContent = "";
    console.log(this.#outputContent);
  }
}

class Input {
  static #DONE_IMG = "../icons/checkmark_black.png";
  static #COPY_IMG = "../icons/icon_copy_black.png";
  #input = document.getElementById("input");
  #deleteBtn = document.getElementById("input_delete");
  #copyBtn = document.getElementById("input_copy");
  #sendBtn = document.getElementById("send_btn");
  #dropdown = document.getElementById("translate_to_dropdown");
  #inputDelBtn = document.getElementById("input_delete");
  #inputCopyBtn = document.getElementById("input_copy");
  #content = document.getElementById("status_content");
  #sent = false;

  /**@returns {string} */
  #GetText() {
    return this.#input.value || "";
  }

  /**@returns {Promise<boolean>} */
  async #SaveLanguage() {
    return new Promise((resolve) =>
      chrome.runtime.sendMessage(
        {
          action: "save_language",
          language: this.#dropdown.value,
        },
        (result) => {
          resolve(result.ok);
        },
      ),
    );
  }

  #Reset() {
    this.sent = true;
    this.#input.classList.add("locked");
    this.#deleteBtn.classList.add("locked");
    this.#copyBtn.classList.add("locked");
    this.#content.style.display = "flex";
  }

  async #Send() {
    if (!this.#sent) {
      output.ClearBefore();
      output.TurnOnAnimation();
      this.#Reset();
      await this.#SaveLanguage();
      // this.#statusMsg.style.display = "block";
      console.log("[DEBUG] animation has been turned on");
      Translate(output, this.#GetText());
    }
  }

  #Focus() {
    if (this.#input.classList.contains("placeholder")) {
      this.#input.value = "";
      this.#input.classList.remove("placeholder");
      this.#inputDelBtn.classList.add("show");
      this.#inputCopyBtn.classList.add("show");
    }
  }

  #Blur() {
    if (this.#input.value.trim() === "") {
      this.#input.value = "Type your text here...";
      this.#input.classList.add("placeholder");
      this.#inputDelBtn.classList.remove("show");
      this.#inputCopyBtn.classList.remove("show");
    }
  }

  #Delete() {
    this.#input.value = "";
    this.#input.classList.add("placeholder");
    this.#input.value = "Type your text here...";
  }

  #Copy() {
    var img = document.getElementById("input_copy_img");
    navigator.clipboard.writeText(
      this.#input.classList.contains("placeholder") ? "" : this.#input.value,
    );
    img.src = Input.#DONE_IMG;
    setTimeout(() => {
      img.src = Input.#COPY_IMG;
    }, 1500);
  }

  Complete() {
    this.#sent = false;
    this.#input.classList.remove("locked");
    this.#deleteBtn.classList.remove("locked");
    this.#copyBtn.classList.remove("locked");
  }

  Activate() {
    this.#input.addEventListener("focus", this.#Focus.bind(this));
    this.#input.addEventListener("blur", this.#Blur.bind(this));
    this.#deleteBtn.addEventListener("click", this.#Delete.bind(this));
    this.#copyBtn.addEventListener("click", this.#Copy.bind(this));
    this.#sendBtn.addEventListener("click", this.#Send.bind(this));
  }
}

class Settings {
  static #SUCCESS = "Success!";
  static #ERROR = "Oops! Something went wrong!";
  #changeBtn = document.getElementById("change_btn");
  #status = document.getElementById("status_change");
  #dropdown = document.getElementById("settings_dropdown");
  #settingsBtn = document.getElementById("settings");
  #backBtn = document.getElementById("back_btn");
  #saveBtn = document.getElementById("save_settings");
  #main = document.getElementById("holder");
  #settingsSlide = document.getElementById("settings_slide");

  /**@returns {Promise<boolean>} */
  async #SaveLanguage() {
    return new Promise((resolve) =>
      chrome.runtime.sendMessage(
        {
          action: "save_language",
          language: this.#dropdown.value,
        },
        (result) => {
          resolve(result.ok);
        },
      ),
    );
  }

  /**@returns {Prmose<{ action: string; user_id: number; lang_code: string; }>} */
  async #GetPayload() {
    return {
      action: "change_language",
      user_id: await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "get_user_id" }, (res) => {
          resolve(res.user_id);
        });
      }),
      lang_code: await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "get_language" }, (res) => {
          resolve(res.language || "");
        });
      }),
    };
  }

  /**
   * @param {{ action: string; user_id: number; lang_code: string; }} payload
   * @returns {Promose<{ ok: boolean; result: { code: string; error: string } | { user_id: number; message: string }}>}
   */
  async #Request(payload) {
    return new Promise(async (resolve) => {
      chrome.runtime.sendMessage(payload, (result) => {
        resolve(result);
      });
    });
  }

  async #SendRequest() {
    var res, data;

    await this.#SaveLanguage();
    data = await this.#GetPayload();
    res = await this.#Request();
    console.log(res);

    if (res.ok) {
      chrome.storage.local.set({
        new_language: data.lang_code,
        user_id: res.result.user_id,
      });
      setTimeout(() => {
        this.#status;
      }, 1500);
    } else {
      this.#status.innerText = Settings.#ERROR;
    }
  }

  // #ChangeLanguage() {
  //   this.#SendRequest();
  //   this.#status.classList.add("visible");

  //   setTimeout(() => {
  //     this.#status.classList.remove("visible");
  //   }, 1500);

  //   setTimeout(() => {
  //     this.#changeBtn.classList.remove("visible");
  //   }, 3000);
  // }

  async #PreloadSettings() {
    var settings;
    settings = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "get_settings" }, (result) => {
        resolve(result);
      });
    });

    // document.getElementById("inline_switch").checked = settings.inline_btn;
    document.getElementById("context_switch").checked = settings.context_menu;
  }

  #GotoSettings() {
    this.#main.style.transition = "left 0.3s ease-in-out";
    this.#main.style.left = "-100%";
    this.#settingsSlide.classList.add("active");
  }

  #GoBack() {
    this.#main.style.left = "0";
    this.#settingsSlide.classList.remove("active");
  }

  async #SaveSettings() {
    var lang,
      ok = true;

    lang = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "get_language" }, (res) => {
        resolve(res.language || "");
      });
    });

    if (lang !== document.getElementById("settings_dropdown").value) {
      ok = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: "save_language",
            language: document.getElementById("settings_dropdown").value,
          },
          (res) => {
            console.log(res);
            resolve(res.ok || false);
          },
        );
      });
    }

    chrome.runtime.sendMessage({
      action: "save_settings",
      settings: {
        // inline_btn: document.getElementById("inline_switch").checked,
        context_menu: document.getElementById("context_switch").checked,
      },
    });

    if (ok) {
      this.#status.innerText = Settings.#SUCCESS;
      PopulateDropdown(document.getElementById("translate_to_dropdown"));
      PopulateDropdown(document.getElementById("settings_dropdown"));
    } else {
      this.#status.innerText = Settings.#ERROR;
    }

    this.#status.classList.add("visible");
    setTimeout(() => {
      this.#status.classList.remove("visible");
    }, 1500);
  }

  Activate() {
    this.#PreloadSettings();
    // this.#changeBtn.addEventListener("click", this.#ChangeLanguage.bind(this));
    this.#settingsBtn.addEventListener("click", this.#GotoSettings.bind(this));
    this.#backBtn.addEventListener("click", this.#GoBack.bind(this));
    this.#saveBtn.addEventListener("click", this.#SaveSettings.bind(this));
  }
}

/**@param {HTMLElement} dropdown  */
async function PopulateDropdown(dropdown) {
  var language, selectedLanguage, option;

  language = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "get_language" }, (res) => {
      resolve(res.language || "");
    });
  });
  selectedLanguage = ALLOWED_LANGUAGES.find((lang) => lang.code === language);

  ALLOWED_LANGUAGES.forEach((lang) => {
    option = document.createElement("option");
    option.value = lang.code;
    option.textContent = lang.name;
    dropdown.appendChild(option);
  });

  if (selectedLanguage) {
    dropdown.value = selectedLanguage.code;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  PopulateDropdown(document.getElementById("translate_to_dropdown"));
  PopulateDropdown(document.getElementById("settings_dropdown"));
  input = new Input();
  output = new PopupOutput(
    document.getElementById("input"),
    document.getElementById("status_message"),
  );
  settings = new Settings();
  input.Activate();
  settings.Activate();
});
