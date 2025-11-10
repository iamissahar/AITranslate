/**@returns {string} */
function GetStyles() {
  return `@font-face {
    font-family: 'Inter';
    src: url('${chrome.runtime.getURL("fonts/inter/Inter_18pt-Regular.ttf")}') format('truetype');
    font-weight: 400;
    font-style: normal;
}
@font-face {
    font-family: 'Inter';
    src: url('${chrome.runtime.getURL("fonts/inter/Inter_18pt-SemiBold.ttf")}') format('truetype');
    font-weight: 600;
    font-style: normal;
}
@font-face {
    font-family: 'Inter';
    src: url('${chrome.runtime.getURL("fonts/inter/Inter_18pt-Bold.ttf")}') format('truetype');
    font-weight: 700;
    font-style: normal;
}
@font-face {
    font-family: 'Inter';
    src: url('${chrome.runtime.getURL("fonts/inter/Inter_18pt-Black.ttf")}') format('truetype');
    font-weight: 900;
    font-style: normal;
}
@font-face {
    font-family: 'Inter';
    src: url('${chrome.runtime.getURL("fonts/inter/Inter_18pt-Italic.ttf")}') format('truetype');
    font-weight: 400;
    font-style: normal;
}

.window {
    display: none;
    position: fixed;
    width: 400px;
    max-height: 100vh;
    background-color: #f8f8f8;
    color: rgb(13, 13, 13);
    border: 2px solid #787878;
    border-radius: 8px;
    z-index: 9999;
    max-width: 95%;
    flex-direction: column;
}

.window-header {
    display: flex;
    height: 25px;
    justify-content: space-between;
    align-items: center;
    padding: 1% 4%;
    background-color: #c6c6c6;
    color: #0d0d0d;
    border-bottom: 2px solid #acacac;

    border-top-left-radius: 8px;
    border-top-right-radius: 8px;

    flex-shrink: 0;
}

.icon-name-holder {
    display: flex;
    align-items: center;
    gap: 8px;
}

.window-title {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 600;
}

.button-holder {
    display: flex;
}

.copy-btn {
    display: none;
    align-items: center;
    justify-content: center;
    gap: 3px;

    background-color: #c6c6c6;
    border: none;
    padding: 5px 0px 5px 15px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.copy-btn p {
    margin: 0;
    color: #0d0d0d;
    font-size: 12px;
}

.copy-logo {
    width: 12px;
    height: 12px;
    transform: rotateX(0deg);
}

.checkmark-logo {
    display: none;
    width: 12px;
    height: 12px;
}

.close-btn {
    display: block;
    background-color: #c6c6c6;
    border: none;
    padding: 6px 0px 5px 15px;
    cursor: pointer;
}

.close-logo {
    width: 12px;
    height: 12px;
}

.window-content {
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    display: flex;
    padding: 3% 4%;
    word-wrap: break-word;
    background: linear-gradient(
        90deg,
        #0d0d0d 0%,
        #c0c0c0 30%,
        #0d0d0d 60%
    );
    background-size: 200%;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    animation: shimmer 1.8s infinite ease-in-out;
    height: 100%;
}

.window-content::-webkit-scrollbar {
    width: 8px;
}

.window-content::-webkit-scrollbar-thumb {
    background: #888;
}

.window-content::-webkit-scrollbar-track {
    background: #f8f8f8;
}

.error-img {
    display: none;
    width: 17px;
    height: 17px;
    vertical-align: middle;
    margin-right: 8px;
    margin-top: 2px;
}

.status-message {
    font-size: 16px;
    font-family: 'Inter', sans-serif;
    line-height: 1.5;
}

@keyframes shimmer {
    0% {
        background-position: -100% 0;
    }
    100% {
        background-position: 100% 0;
    }
}

.phrase {
    display: none;
    line-height: 1.5;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
}

.a-word {
    display: none;
}

.pos {
    line-height: 1.5;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 400;
    padding-bottom: 10px;
}

.context-definition {
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    line-height: 1.5;
    padding: 5px 0px;
}

.translated-word {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 18px;
    line-height: 1.5;
}

.meaning {
    font-family: 'Inter', sans-serif;
    font-style: italic;
    font-size: 16px;
    line-height: 1.5;
    color: rgb(40, 40, 40);
}

.a-line {
    display: none;
    height: 1px;
    background-color: #0d0d0d;
    width: 100%;
    margin: 15px 0px;
}`;
}

/**@returns {string} */
function GetHTML() {
  return `<div id="translation_window" class="window">
  <div class="window-header">
      <div class="icon-name-holder">
        <img class="window-img" src=${chrome.runtime.getURL("icons/very_small_logo.png")}>
        <span class="window-title">AI Translate</span>
      </div>
      <div class="button-holder">
        <button class="copy-btn" id="copy_btn">
            <img class="copy-logo" id="copy_logo" src=${chrome.runtime.getURL("icons/icon_copy_black.png")}>
            <img class="checkmark-logo" id="checkmark_logo" src=${chrome.runtime.getURL("icons/checkmark_black.png")}>
            <p class="btn-text" id="btn_text"> Copy</p>
        </button>
        <button class="close-btn" id="close_btn">
            <img class="close-logo" id="close_logo" src=${chrome.runtime.getURL("icons/close_logo.png")}>
        </button>
      </div>
  </div>
  <div class="window-content" id="window_content">
    <img class="error-img" id="error_img" src=${chrome.runtime.getURL("/icons/error.png")}>
    <div class="status-message" id="status_message">
        Translating
    </div>
    <div class="phrase" id="phrase"></div>
    <div id="a_word_holder">
      <div class="a-word" id="a_word_1">
          <div class="pos" id="header_1"></div>
          <div class="translated-word" id="translated_word_1"></div>
          <div class="context-definition" id="bold_title_1"></div>
          <div class="meaning" id="meaning_1"></div>
      </div>
      <div class="a-line" id="a_line_1"></div>
      <div class="a-word" id="a_word_2">
          <div class="pos" id="header_2"></div>
          <div class="translated-word" id="translated_word_2"></div>
          <div class="context-definition" id="bold_title_2"></div>
          <div class="meaning" id="meaning_2"></div>
      </div>
      <div class="a-line" id="a_line_2"></div>
      <div class="a-word" id="a_word_3">
          <div class="pos" id="header_3"></div>
          <div class="translated-word" id="translated_word_3"></div>
          <div class="context-definition" id="bold_title_3"></div>
          <div class="meaning" id="meaning_3"></div>
      </div>
      <div class="a-line" id="a_line_3"></div>
      <div class="a-word" id="a_word_4">
          <div class="pos" id="header_4"></div>
          <div class="translated-word" id="translated_word_4"></div>
          <div class="context-definition" id="bold_title_4"></div>
          <div class="meaning" id="meaning_4"></div>
      </div>
      <div class="a-line" id="a_line_4"></div>
      <div class="a-word" id="a_word_5">
          <div class="pos" id="header_5"></div>
          <div class="translated-word" id="translated_word_5"></div>
          <div class="context-definition" id="bold_title_5"></div>
          <div class="meaning" id="meaning_5"></div>
      </div>
    </div>
  </div>
</div>`;
}

/**@returns {string} */
function GetHiddenStyles() {
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

#hidden_holder {
    visibility: hidden;
    display: flex;
    position: fixed;
    width: 400px;
    background-color: #f8f8f8;
    color: rgb(13, 13, 13);
    border: 2px solid #787878;
    border-radius: 8px;
    z-index: 9999;
    max-width: 95%;
    flex-direction: column;
}

#hidden_text_container {
    visibility: hidden;
    padding: 3% 4%;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    line-height: 1.5;
    word-wrap: break-word;
    height: 100%;
}

#hidden_headers {
    visibility: hidden;
    display: flex;
    height: 25px;
    justify-content: space-between;
    align-items: center;
    padding: 1% 4%;
    background-color: #c6c6c6;
    color: #0d0d0d;
    border-bottom: 2px solid #acacac;

    border-top-left-radius: 8px;
    border-top-right-radius: 8px;

    flex-shrink: 0;
}

#hidden_img {
    visibility: hidden;
}

#hidden_title {
    visibility: hidden;
}

@keyframes shimmer {
    0% {
        background-position: -100% 0;
    }
    100% {
        background-position: 100% 0;
    }
}

.phrase {
    visibility: hidden;
    line-height: 1.5;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
}

.a-word {
    display: none;
    visibility: hidden;
}

.pos {
    visibility: hidden;
    line-height: 1.5;
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 400;
    padding-bottom: 10px;
}

.context-definition {
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    line-height: 1.5;
    padding: 5px 0px;
    visibility: hidden;
}

.translated-word {
    visibility: hidden;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 18px;
    line-height: 1.5;
}

.meaning {
    visibility: hidden;
    font-family: 'Inter', sans-serif;
    font-style: italic;
    font-size: 16px;
    line-height: 1.5;
    color: rgb(40, 40, 40);
}

.a-line {
    display: none;
    visibility: hidden;
    height: 1px;
    background-color: #0d0d0d;
    width: 100%;
    margin: 15px 0px;
}`;
}

/** @returns {string}*/
function GetHiddenHTML() {
  return `<div id="hidden_holder">
  <div id="hidden_headers">
      <img id="hidden_img" class="window-img" src=${chrome.runtime.getURL("icons/very_small_logo.png")}>
      <span id="hidden_title" class="window-title">AI Translate</span>
  </div>
  <div id="hidden_text_container">
      <div class="phrase" id="hidden_phrase"></div>
      <div id="a_word_holder">
          <div class="a-word" id="a_word_1">
              <div class="pos" id="header_1"></div>
              <div class="translated-word" id="translated_word_1"></div>
              <div class="context-definition" id="bold_title_1"></div>
              <div class="meaning" id="meaning_1"></div>
          </div>
          <div class="a-line" id="a_line_1"></div>
          <div class="a-word" id="a_word_2">
              <div class="pos" id="header_2"></div>
              <div class="translated-word" id="translated_word_2"></div>
              <div class="context-definition" id="bold_title_2"></div>
              <div class="meaning" id="meaning_2"></div>
          </div>
          <div class="a-line" id="a_line_2"></div>
          <div class="a-word" id="a_word_3">
              <div class="pos" id="header_3"></div>
              <div class="translated-word" id="translated_word_3"></div>
              <div class="context-definition" id="bold_title_3"></div>
              <div class="meaning" id="meaning_3"></div>
          </div>
          <div class="a-line" id="a_line_3"></div>
          <div class="a-word" id="a_word_4">
              <div class="pos" id="header_4"></div>
              <div class="translated-word" id="translated_word_4"></div>
              <div class="context-definition" id="bold_title_4"></div>
              <div class="meaning" id="meaning_4"></div>
          </div>
          <div class="a-line" id="a_line_4"></div>
          <div class="a-word" id="a_word_5">
              <div class="pos" id="header_5"></div>
              <div class="translated-word" id="translated_word_5"></div>
              <div class="context-definition" id="bold_title_5"></div>
              <div class="meaning" id="meaning_5"></div>
          </div>
      </div>
  </div>
</div>`;
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
}
#go_btn.show {
  opacity: 1;
}
#logo {
  width: 22px;
  height: 20px;
}`;
}
