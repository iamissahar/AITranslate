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
            language: await new Promise((resolve) => {
              chrome.runtime.sendMessage({ action: "get_languge" }, (res) => {
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
      console.log(res.data.content.error);
      if (res.data.content.error === "invalid input") {
        this.output.SetError("Meaningless or nonsense input.");
      } else {
        chrome.storage.local.set({ user_id: msg.data.user_id });
        this.output.Set();
        this.output.Add(msg.content);
      }
    } else {
      this.output.SetError("Something went wrong. Please try again later.");
    }
  }
}
