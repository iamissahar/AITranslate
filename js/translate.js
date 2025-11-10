/**
 * @param {Output} output
 * @param {string} text
 */
function Translate(output, text) {
  var trimmed, isNoWordDelimiterLang, amount, isPopup;
  trimmed = text.trim();
  isNoWordDelimiterLang =
    /[\u4E00-\u9FFF\u3040-\u30FF\u0E00-\u0E7F\u1780-\u17FF\u1000-\u109F]/.test(
      trimmed,
    );

  isPopup = typeof PopupOutput !== "undefined" && output instanceof PopupOutput;

  if (isNoWordDelimiterLang) {
    output.SetStatus(true, isPopup);
    console.log("starting streaming v1");
    new Stream(output).Begin(text);
  } else {
    amount = trimmed.split(/\s+/).length;
    if (amount > 4) {
      console.log("starting streaming v2");
      output.SetStatus(true, isPopup);
      new Stream(output).Begin(text);
    } else {
      console.log("starting requesting");
      output.SetStatus(false, isPopup);
      new RequestJson(output).Begin(text);
    }
  }
}
