class RequestJson {
  /**@param {Output} output */
  constructor(output) {
    this.output = output;
  }
  /**@param {string} text  */
  async Begin(text) {
    var res;
    res = await new Promise(async (resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "translate_one_word",
          data: {
            user_id: await new Promise((resolve) => {
              chrome.runtime.sendMessage({ action: "get_user_id" }, (res) => {
                resolve(res.user_id || 0);
              });
            }),
            lang_code: await new Promise((resolve) => {
              chrome.runtime.sendMessage({ action: "get_language" }, (res) => {
                resolve(res.language || "");
              });
            }),
            text: text,
          },
        },
        (msg) => {
          resolve(msg);
        },
      );
    });

    if (res.ok) {
      chrome.storage.local.set({ user_id: res.result.user_id });
      this.output.Set();
      this.output.Add(res.result.text);
    } else {
      this.output.SetError("Something went wrong. Please try again later.");
    }
  }
}
