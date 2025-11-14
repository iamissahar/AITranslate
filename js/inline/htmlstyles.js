/**@returns {string} */
function GetStyles() {
  return `@font-face {
    font-family: 'Inter';
    src: url('${chrome.runtime.getURL("fonts/Inter-Regular.ttf")}') format('truetype');
    font-weight: 400;
    font-style: normal;
}
@font-face {
    font-family: 'Inter';
    src: url('${chrome.runtime.getURL("fonts/Inter-SemiBold.ttf")}') format('truetype');
    font-weight: 600;
    font-style: normal;
}
@font-face {
    font-family: 'Inter';
    src: url('${chrome.runtime.getURL("fonts/Inter-Bold.ttf")}') format('truetype');
    font-weight: 700;
    font-style: normal;
}
@font-face {
    font-family: 'Inter';
    src: url('${chrome.runtime.getURL("fonts/Inter-Black.ttf")}') format('truetype');
    font-weight: 900;
    font-style: normal;
}
.window {
      display: none;
      position: fixed;
      width: 380px;
      max-height: 500px;
      background: #ffffff;
      color: #111827;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow:
          0 10px 25px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05),
          0 0 0 1px rgba(0, 0, 0, 0.05);
      z-index: 10000;
      font-family: 'Inter', sans-serif;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      overflow: hidden;
  }

  .copy-btn {
     width: 15px;
     height: 15px;
     position: absolute;
     top: 5px;
     right: 5px;
     opacity: 0;
     transition: 0.5s opacity;
     cursor: pointer;
  }

  .copy-btn.show {
    opacity: 1;
  }

  .copy-btn img {
    width: 15px;
    height: 15px;
  }

  .window-content {
      padding: 16px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #374151;
      background: #ffffff;
      overflow-y: auto;
      max-height: 460px;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 #f1f5f9;
  }

  .window-content::-webkit-scrollbar {
      width: 6px;
  }

  .window-content::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 3px;
  }

  .window-content::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
  }

  .window-content::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
  }

  .error-img {
      display: none;
      width: 16px;
      height: 16px;
      vertical-align: middle;
      margin-right: 8px;
      opacity: 0.7;
  }

  .status-message {
      font-size: 14px;
      color: #6b7280;
      font-style: italic;
      background: linear-gradient(90deg, #9ca3af 25%, #6b7280 50%, #9ca3af 75%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: shimmer 1.5s linear infinite;
  }

  .phrase {
      display: none;
      color: #111827;
      font-family: 'Inter', sans-serif;
      font-size: 16px;
  }

  @keyframes shimmer {
      0% {
          background-position: -200% 0;
      }
      100% {
          background-position: 200% 0;
      }
  }

  .window.show {
      animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
      from {
          opacity: 0;
          transform: translateY(-8px) scale(0.95);
      }
      to {
          opacity: 1;
          transform: translateY(0) scale(1);
      }
  }

  .copy-btn.copied {
      background: #dcfce7;
      border-color: #bbf7d0;
      color: #166534;
  }

  .copy-btn.copied {
      display: none;
  }

  .copy-btn.copied .checkmark-logo {
      display: block;
  }
  .translation-result {
      padding: 10px;
      font-family: "Inter", sans-serif;
      color: #111827;
  }

  .translation-result .part-of-speech {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
      text-transform: capitalize;
  }

  .meaning-card {
      background: #f3f4f6; /* совпадает с output */
      border-radius: 12px;
      padding: 10px;
      margin-bottom: 8px;
  }

  .meaning-card .context {
      font-weight: 500;
      color: #2563eb; /* синий */
      font-size: 13px;
  }

  .meaning-card .translation {
      margin-top: 4px;
      font-size: 14px;
      font-weight: 600;
      color: #16a34a; /* зеленый */
  }

  .meaning-card .example {
      margin-top: 6px;
      font-size: 13px;
      font-style: italic;
      color: #6b7280; /* серый */
  }`;
}

/**@returns {string} */
function GetHTML() {
  return `<div id="translation_window" class="window">
  <div class="window-content" id="window_content">
    <img class="error-img" id="error_img" src=${chrome.runtime.getURL("/icons/error.png")}>
    <div class="status-message" id="status_message">
      Translating
    </div>
    <div class="phrase" id="phrase"></div>
  </div>
</div>`;
}

/**@returns {string} */
function GetHiddenStyles() {
  return `#hidden_holder {
  visibility: hidden;
  top: 0px;
  left: 0px;
  display: flex;
  position: absolute;
  width: 380px;
  background: #ffffff;
  color: #111827;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow:
      0 10px 25px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05),
      0 0 0 1px rgba(0, 0, 0, 0.05);
  z-index: 10000;
  font-family: 'Inter', sans-serif;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  overflow: hidden;
  max-width: 95%;
  flex-direction: column;
}

#hidden_text_container {
  visibility: hidden;
  padding: 16px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
  background: #ffffff;
  word-wrap: break-word;
}

.phrase {
    visibility: hidden;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
}

.translation-result {
    padding: 10px;
    font-family: "Inter", sans-serif;
    color: #111827;
}

.translation-result .part-of-speech {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 8px;
    text-transform: capitalize;
}

.meaning-card {
    background: #f3f4f6; /* совпадает с output */
    border-radius: 12px;
    padding: 10px;
    margin-bottom: 8px;
}

.meaning-card .context {
    font-weight: 500;
    color: #2563eb; /* синий */
    font-size: 13px;
}

.meaning-card .translation {
    margin-top: 4px;
    font-size: 14px;
    font-weight: 600;
    color: #16a34a; /* зеленый */
}

.meaning-card .example {
    margin-top: 6px;
    font-size: 13px;
    font-style: italic;
    color: #6b7280; /* серый */
}
`;
}

/** @returns {string}*/
function GetHiddenHTML() {
  return `<div id="hidden_holder">
  <div id="hidden_text_container">
      <div class="phrase" id="hidden_phrase"></div>
  </div>
</div>`;
}

function GetButtonHTML() {
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
}
#go_btn.show {
  opacity: 1;
}
#logo {
  width: 22px;
  height: 20px;
}`;
}

function GetButtonHTML() {
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
