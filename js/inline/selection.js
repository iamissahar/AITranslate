class SelectionHandler {
  #text = "";
  #lasttext = "";
  #coordinates = { x: 0, y: 0 };
  #usedMouse = false;
  #mousePressed = false;
  #clipboardSetup = false;
  #lastClipboardText = null;
  #isGoogleDocs = window.location.href.includes(
    "https://docs.google.com/document",
  );
  #methods = [
    this.#GoogleDocsDirectDOM.bind(this),
    this.#GoogleDocsContentExtraction.bind(this),
    this.#DirectSelection.bind(this),
    this.#ShadowDOMSelection.bind(this),
  ];

  constructor() {
    this.#SetUpEventListeners();
  }

  /**@returns {Promise<string>} */
  async #GetSelection() {
    var result, method;

    for (method of this.#methods) {
      if (!result || !result.trim()) {
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
    var selection = window.getSelection();
    var text = selection.toString().trim();
    return Promise.resolve(text);
  }

  /**@returns {HTMLDivElement} */
  #CreateOverlay() {
    var overlay;
    overlay = document.createElement("div");
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
    var overlay, text;
    return new Promise((resolve) => {
      overlay = this.#CreateOverlay();
      setTimeout(() => {
        text = window.getSelection().toString().trim();
        document.body.removeChild(overlay);
        resolve(text);
      }, 100);
    });
  }

  /**@returns {Promise<string>} */
  #GoogleDocsDirectDOM() {
    return new Promise((resolve) => {
      var text = "",
        iframe,
        iframes,
        iframeSelection;
      if (this.#isGoogleDocs) {
        try {
          iframes = document.getElementsByTagName("iframe");

          for (var i = 0; i < iframes.length; i++) {
            try {
              iframe = iframes[i];
              if (iframe.contentDocument && iframe.contentWindow) {
                iframeSelection = iframe.contentWindow.getSelection();
                if (iframeSelection && iframeSelection.toString().trim()) {
                  text = iframeSelection.toString().trim();
                  if (text) {
                    resolve(text);
                  }
                }
              }

              if (!text) {
                try {
                  iframe.contentDocument.execCommand("copy");
                } catch (_) {}
              }
            } catch (_) {}
          }
        } catch (err) {
          console.warn("Iframe method failed:", e);
        }
      }
      resolve(text);
    });
  }

  /**@returns {string} */
  #ExtractTextFromNode() {
    var text = "",
      style;
    if (node.nodeType === Node.TEXT_NODE) {
      text = node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      style = window.getComputedStyle(node);
      if (
        style.display !== "none" ||
        style.visibility !== "hidden" ||
        style.opacity !== "0"
      ) {
        if (
          style.backgroundColor &&
          style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
          style.backgroundColor !== "transparent"
        ) {
          text += node.textContent + " ";
        }

        for (var child of node.childNodes) {
          text += this.#ExtractTextFromNode(child);
        }
      }
    }

    return text;
  }

  #FindSelectedTextInDOM() {
    var text = "",
      selection,
      range,
      selectedText,
      highlightedElements,
      highlightedText = "",
      style;
    try {
      selection = window.getSelection();
      if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        selectedText = range.toString().trim();
        if (selectedText) text = selectedText;
      }
    } catch (e) {}

    if (!text) {
      try {
        highlightedElements = document.querySelectorAll("*");

        for (var element of highlightedElements) {
          try {
            style = window.getComputedStyle(element);
            if (
              style.backgroundColor &&
              !style.backgroundColor.includes("rgba(0, 0, 0, 0)") &&
              style.backgroundColor !== "transparent" &&
              element.textContent &&
              element.textContent.trim()
            ) {
              highlightedText += element.textContent + " ";
            }
          } catch (_) {}
        }

        text = highlightedText.trim();
      } catch (e) {
        text = "";
      }
    }
    return text;
  }

  #GoogleDocsContentExtraction() {
    return new Promise((resolve) => {
      var text = "",
        allText = "",
        textElements,
        iframeText,
        elementText,
        standardSelection;
      if (this.#isGoogleDocs) {
        try {
          textElements = document.querySelectorAll(
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

          for (var element of textElements) {
            try {
              if (element.tagName === "IFRAME" && element.contentDocument) {
                iframeText = this.#ExtractTextFromNode(
                  element.contentDocument.body,
                );
                if (iframeText) allText += iframeText + "\n";
              } else {
                elementText = this.#ExtractTextFromNode(element);
                if (elementText) allText += elementText + "\n";
              }
            } catch (_) {}
          }

          standardSelection = window.getSelection().toString().trim();
          if (standardSelection) {
            text = standardSelection;
          } else if (allText.trim()) {
            text = this.#FindSelectedTextInDOM(allText);
          }
        } catch (err) {
          console.warn("DOM extraction failed:", e);
        }
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
          try {
            var selection = window.getSelection().toString().trim();
            if (selection) {
              this.#lastClipboardText = selection;
            }
          } catch (e) {}
        },
        true,
      );
    }
  }

  async #Pull() {
    var txt;

    if (this.#isGoogleDocs) {
      this.#SetupClipboardInterceptor();

      try {
        document.execCommand("copy");
      } catch (e) {}

      await new Promise((resolve) => setTimeout(resolve, 50));

      if (this.#lastClipboardText) {
        txt = this.#lastClipboardText;
        this.#lastClipboardText = null;
      }
    }

    if (!txt) {
      txt = await this.#GetSelection();
    }

    if (txt && txt.trim() && this.#lasttext !== txt) {
      this.#text = txt;
      this.#lasttext = txt;

      // if (goBtn && goBtn.Activate) {
      //   goBtn.Activate();
      // }

      setTimeout(() => {
        this.#usedMouse = false;
      }, 100);
    }
  }

  async #SelectionChange() {
    if (!this.#mousePressed) {
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

    if (this.#isGoogleDocs) {
      setTimeout(() => this.#Pull(), 150);
    } else {
      this.#Pull();
    }
  }

  #SetUpEventListeners() {
    window.addEventListener(
      "selectionchange",
      this.#SelectionChange.bind(this),
    );

    if (this.#isGoogleDocs) {
      document.addEventListener("click", () => {
        setTimeout(() => this.#Pull(), 200);
      });

      document.addEventListener("mouseup", () => {
        setTimeout(() => this.#Pull(), 200);
      });

      document.addEventListener("keyup", () => {
        setTimeout(() => this.#Pull(), 200);
      });

      setInterval(() => {
        if (!this.#mousePressed) {
          this.#Pull();
        }
      }, 300);
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
    var res = { ok: false, coordinates: null };
    if (this.#usedMouse) {
      res.ok = this.#usedMouse;
      res.coordinates = this.#coordinates;
    }
    return res;
  }

  async ForceUpdate() {
    await this.#Pull();
  }
}

var sh = new SelectionHandler();
