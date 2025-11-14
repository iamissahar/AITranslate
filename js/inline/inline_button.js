class GoButton {
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

// if (!window.location.href.includes("https://docs.google.com/document")) {
//   goBtn = new GoButton();
// }
//
