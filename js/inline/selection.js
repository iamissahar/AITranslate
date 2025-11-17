class SelectionHandler {
  #text = "";
  #lasttext = "";
  #coordinates = { x: 0, y: 0 };
  #usedMouse = false;
  #mousePressed = false;
  #clipboardSetup = false;
  #lastClipboardText = null;
  #isProcessingCopy = false;
  #isGoogleDocs = window.location.href.includes(
    "https://docs.google.com/document",
  );
  #methods = [
    this.#DirectSelection.bind(this),
    this.#GoogleDocsIframeSelection.bind(this),
    this.#ShadowDOMSelection.bind(this),
    this.#GoogleDocsContentExtraction.bind(this),
  ];

  constructor() {
    this.#SetUpEventListeners();
  }

  /**@returns {Promise<string>} */
  async #GetSelection() {
    let result = "";

    for (const method of this.#methods) {
      if (!result.trim()) {
        try {
          result = await method();
          if (result && result.trim().length > 0) {
            break;
          }
        } catch (e) {
          console.warn(`Method ${method.name} failed:`, e);
        }
      }
    }
    return result || "";
  }

  /**@returns {Promise<string>} */
  #DirectSelection() {
    const selection = window.getSelection();
    return Promise.resolve(selection.toString().trim());
  }

  /**@returns {HTMLDivElement} */
  #CreateOverlay() {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: transparent;
      z-index: 2147483647;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  /**@returns {Promise<string>} */
  #ShadowDOMSelection() {
    return new Promise((resolve) => {
      const overlay = this.#CreateOverlay();
      setTimeout(() => {
        const text = window.getSelection().toString().trim();
        document.body.removeChild(overlay);
        resolve(text);
      }, 50);
    });
  }

  /**@returns {Promise<string>} */
  #GoogleDocsIframeSelection() {
    return new Promise((resolve) => {
      if (!this.#isGoogleDocs) {
        resolve("");
        return;
      }

      let text = "";
      try {
        const iframes = document.getElementsByTagName("iframe");
        for (let i = 0; i < iframes.length; i++) {
          try {
            const iframe = iframes[i];
            if (iframe.contentDocument?.body) {
              const iframeSelection = iframe.contentWindow.getSelection();
              const iframeText = iframeSelection?.toString().trim();
              if (iframeText) {
                text = iframeText;
                break;
              }
            }
          } catch (_) {}
        }
      } catch (err) {
        console.warn("Iframe method failed:", err);
      }
      resolve(text);
    });
  }

  /**@returns {string} */
  #ExtractTextFromNode(node) {
    let text = "";

    if (node.nodeType === Node.TEXT_NODE) {
      text = node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const style = window.getComputedStyle(node);
      const isVisible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0";

      if (isVisible) {
        if (node.childNodes.length > 0) {
          for (const child of node.childNodes) {
            text += this.#ExtractTextFromNode(child);
          }
        } else {
          text += node.textContent + " ";
        }
      }
    }

    return text;
  }

  #GoogleDocsContentExtraction() {
    return new Promise((resolve) => {
      if (!this.#isGoogleDocs) {
        resolve("");
        return;
      }

      let text = "";
      try {
        const textElements = document.querySelectorAll(
          [
            ".kix-paragraphrenderer",
            ".kix-lineview-text",
            '[role="textbox"]',
            '[contenteditable="true"]',
            ".docs-texteventtarget-iframe",
            ".kix-page-content-wrapper",
            ".kix-page",
          ].join(","),
        );

        for (const element of textElements) {
          try {
            if (element.tagName === "IFRAME" && element.contentDocument) {
              const iframeText = this.#ExtractTextFromNode(
                element.contentDocument.body,
              );
              if (iframeText) text += iframeText + "\n";
            } else {
              const elementText = this.#ExtractTextFromNode(element);
              if (elementText) text += elementText + "\n";
            }
          } catch (_) {}
        }

        text = text.trim();
      } catch (err) {
        console.warn("DOM extraction failed:", err);
      }
      resolve(text);
    });
  }

  #SetupClipboardInterceptor() {
    if (!this.#clipboardSetup) {
      this.#clipboardSetup = true;

      document.addEventListener(
        "copy",
        (e) => {
          if (this.#isProcessingCopy) {
            // Это наше копирование - перехватываем данные
            const selection = window.getSelection().toString().trim();
            if (selection) {
              this.#lastClipboardText = selection;
              e.clipboardData.setData("text/plain", selection);
              e.preventDefault();
            }
          }
        },
        true,
      );
    }
  }

  /** Безопасное копирование с сохранением буфера */
  async #safeCopyWithRestoration() {
    if (this.#isProcessingCopy) return null;

    this.#isProcessingCopy = true;
    this.#lastClipboardText = null;
    let oldClipboard = null;

    try {
      // Сохраняем текущий буфер
      try {
        oldClipboard = await navigator.clipboard.readText();
      } catch (e) {
        console.warn("Failed to read clipboard:", e);
      }

      // Выполняем копирование
      document.execCommand("copy");

      // Ждем пока перехватчик получит данные
      await new Promise((resolve) => setTimeout(resolve, 20));

      const copiedText = this.#lastClipboardText;

      // Восстанавливаем оригинальный буфер
      if (oldClipboard !== null) {
        try {
          await navigator.clipboard.writeText(oldClipboard);
        } catch (e) {
          console.warn("Failed to restore clipboard:", e);
        }
      }

      return copiedText;
    } catch (e) {
      console.warn("Safe copy failed:", e);
      return null;
    } finally {
      this.#isProcessingCopy = false;
    }
  }

  /** Умный Pull с оптимизацией для Google Docs */
  async #Pull() {
    // Пропускаем если уже обрабатываем копирование
    if (this.#isProcessingCopy) return;

    let txt = "";

    // Сначала пробуем стандартные методы
    txt = await this.#GetSelection();

    // Для Google Docs используем безопасное копирование только если другие методы не сработали
    if (this.#isGoogleDocs && (!txt || !txt.trim())) {
      this.#SetupClipboardInterceptor();
      txt = await this.#safeCopyWithRestoration();
    }

    if (txt && txt.trim() && this.#lasttext !== txt) {
      this.#text = txt;
      this.#lasttext = txt;

      // Активируем функциональность если нужно
      // if (goBtn && goBtn.Activate) {
      //   goBtn.Activate();
      // }

      setTimeout(() => {
        this.#usedMouse = false;
      }, 100);
    }
  }

  async #SelectionChange() {
    if (!this.#mousePressed && !this.#isProcessingCopy) {
      if (this.#isGoogleDocs) {
        setTimeout(() => this.#Pull(), 100);
      } else {
        this.#Pull();
      }
    }
  }

  #MouseDown() {
    this.#mousePressed = true;
    this.#coordinates = { x: 0, y: 0 };
  }

  async #MouseUp(e) {
    this.#coordinates.x = e.clientX;
    this.#coordinates.y = e.clientY;
    this.#mousePressed = false;
    this.#usedMouse = true;

    if (!this.#isProcessingCopy) {
      if (this.#isGoogleDocs) {
        setTimeout(() => this.#Pull(), 150);
      } else {
        this.#Pull();
      }
    }
  }

  #SetUpEventListeners() {
    // Дебаунсим selectionchange для оптимизации
    let selectionChangeTimeout;
    const debouncedSelectionChange = () => {
      clearTimeout(selectionChangeTimeout);
      selectionChangeTimeout = setTimeout(() => {
        this.#SelectionChange();
      }, 50);
    };

    window.addEventListener("selectionchange", debouncedSelectionChange);

    if (this.#isGoogleDocs) {
      // Дебаунсим события в Google Docs
      let docsTimeout;
      const debouncedPull = () => {
        clearTimeout(docsTimeout);
        docsTimeout = setTimeout(() => this.#Pull(), 200);
      };

      document.addEventListener("click", debouncedPull);
      document.addEventListener("mouseup", debouncedPull);
      document.addEventListener("keyup", debouncedPull);

      // Увеличиваем интервал для периодической проверки
      setInterval(() => {
        if (!this.#mousePressed && !this.#isProcessingCopy) {
          this.#Pull();
        }
      }, 1000);
    } else {
      document.addEventListener("mousedown", this.#MouseDown.bind(this));
      document.addEventListener("mouseup", (e) => this.#MouseUp(e));
    }
  }

  GetText() {
    return this.#text;
  }

  /**@returns {{ ok: boolean; coordinates: { x: number; y: number } | null }} */
  GetCoordinates() {
    return {
      ok: this.#usedMouse,
      coordinates: this.#usedMouse ? this.#coordinates : null,
    };
  }

  async ForceUpdate() {
    await this.#Pull();
  }
}

// Создаем экземпляр
var sh = new SelectionHandler();
