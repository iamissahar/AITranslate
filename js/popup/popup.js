const ALLOWED_LANGUAGES = [
  { code: "af", name: "Afrikaans" },
  { code: "sq", name: "Shqip" },
  { code: "ar", name: "العربية" },
  { code: "hy", name: "Հայերեն" },
  { code: "bn", name: "বাংলা" },
  { code: "bs", name: "Bosanski" },
  { code: "bg", name: "Български" },
  { code: "ca", name: "Català" },
  { code: "hr", name: "Hrvatski" },
  { code: "cs", name: "Čeština" },
  { code: "da", name: "Dansk" },
  { code: "nl", name: "Nederlands" },
  { code: "en", name: "English" },
  { code: "eo", name: "Esperanto" },
  { code: "et", name: "Eesti" },
  { code: "tl", name: "Filipino" },
  { code: "fi", name: "Suomi" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "el", name: "Ελληνικά" },
  { code: "gu", name: "ગુજરાતી" },
  { code: "hi", name: "हिन्दी" },
  { code: "hu", name: "Magyar" },
  { code: "is", name: "Íslenska" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "日本語" },
  { code: "jw", name: "Basa Jawa" },
  { code: "ko", name: "한국어" },
  { code: "la", name: "Latina" },
  { code: "lv", name: "Latviešu" },
  { code: "lt", name: "Lietuvių" },
  { code: "ml", name: "മലയാളം" },
  { code: "mr", name: "मराठी" },
  { code: "no", name: "Norsk" },
  { code: "pl", name: "Polski" },
  { code: "pt", name: "Português" },
  { code: "pa", name: "ਪੰਜਾਬੀ" },
  { code: "ro", name: "Română" },
  { code: "ru", name: "Русский" },
  { code: "sr", name: "Српски" },
  { code: "sk", name: "Slovenčina" },
  { code: "sl", name: "Slovenščina" },
  { code: "es", name: "Español" },
  { code: "sw", name: "Kiswahili" },
  { code: "sv", name: "Svenska" },
  { code: "ta", name: "தமிழ்" },
  { code: "te", name: "తెలుగు" },
  { code: "th", name: "ไทย" },
  { code: "tr", name: "Türkçe" },
  { code: "uk", name: "Українська" },
  { code: "ur", name: "اردو" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "cy", name: "Cymraeg" },
  { code: "he", name: "עברית" },
  { code: "mk", name: "Македонски" },
];

/**@type {PopupOutput} */
var output = null;
/**@type {Input} */
var input = null;
/**@type {Settings} */
var settings = null;

class PopupOutput extends Output {
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
    this.output.textContent = "";
    this.statusMsg.textContent = "";
    this.#deleteBtn.classList.remove("show");
    this.#copyBtn.classList.remove("show");
    console.log("cleared");
  }

  #AddJsonStructure() {}

  /**@param {string} text  */
  Add(text) {
    if (this.isStream) {
      this.#buffer += text;
      console.log("going to add.");
      console.log(this.#buffer);
      if (this.#buffer.length >= Output.BUFFER_LENGTH + this.#i) {
        this.output.innerText = this.#buffer;
        this.#i += Output.BUFFER_LENGTH;
      }
    } else {
      this.#AddJsonStructure();
    }
  }

  Flush() {
    this.output.innerText = this.#buffer;
    this.#deleteBtn.classList.add("show");
    this.#copyBtn.classList.add("show");
  }

  #Delete() {
    if (this.#deleteBtn.classList.contains("show"))
      this.output.textContent = "";
  }

  #Copy() {
    if (this.#copyBtn.classList.contains("show") && this.output.textContent)
      navigator.clipboard.writeText(this.output.textContent);
  }

  #InitListeners() {
    this.#deleteBtn.addEventListener("click", this.#Delete.bind(this));
    this.#copyBtn.addEventListener("click", this.#Copy.bind(this));
  }
}

class Input {
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

  async #Send() {
    if (!this.#sent) {
      this.#sent = true;
      console.log("[DEBUG] HEllo!");
      console.log("[DEBUG] the language is:", this.#dropdown.value);
      await this.#SaveLanguage();

      this.#content.style.display = "flex";
      // this.#statusMsg.style.display = "block";
      output.TurnOnAnimation();
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
    navigator.clipboard.writeText(
      this.#input.classList.contains("placeholder") ? "" : this.#input.value,
    );
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
      this.#status.innerText = Settings.#SUCCESS;
      chrome.storage.local.set({
        new_language: data.lang_code,
        user_id: res.result.user_id,
      });
    } else {
      this.#status.innerText = Settings.#ERROR;
      console.error(res.result.error);
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

    document.getElementById("inline_switch").checked = settings.inline_btn;
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

  #SaveSettings() {
    this.#status.classList.add("visible");

    setTimeout(() => {
      this.#status.classList.remove("visible");
    }, 1500);

    chrome.runtime.sendMessage({
      action: "save_settings",
      settings: {
        inline_btn: document.getElementById("inline_switch").checked,
        context_menu: document.getElementById("context-switch").checked,
      },
    });

    this.#status.innerText = Settings.#SUCCESS;
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
