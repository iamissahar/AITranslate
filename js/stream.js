const STREAM_PORT = "stream";
class Stream {
  /**@param {Output} output  */
  constructor(output) {
    /** @type {chrome.runtime.Port} */
    this.port = chrome.runtime.connect({ name: STREAM_PORT });
    /** @type {boolean} */
    this.once = true;
    this.output = output;
  }

  /**
   * @param {number} ms
   * @returns {Promise<any>}
   */
  #Sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * @param {{ value: string }} buffer
   * @param {TextDecoder} decoder
   * @param {Uint8Array} uint8
   */
  async #HandleChunk(buffer, decoder, uint8) {
    var eventType, data, parts, lines, parsed;

    console.assert(
      typeof buffer === "object" &&
        buffer !== null &&
        typeof buffer.value === "string",
      "buffer is not of type { value: string }",
    );
    console.assert(
      decoder instanceof TextDecoder,
      "decoder is not a TextDecoder",
    );
    console.assert(uint8 instanceof Uint8Array, "uint8 is not a Uint8Array");

    buffer.value += decoder.decode(uint8, { stream: true });
    parts = buffer.value.split("\n\n");
    buffer.value = parts.pop();

    for (let part of parts) {
      lines = part.split("\n");
      eventType = "message";
      data = "";

      for (let line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      try {
        parsed = JSON.parse(data);
        if (this.once) {
          this.once = false;
          chrome.storage.local.set({ user_id: parsed.result.user_id });
          this.output.Set();
        }

        if (eventType === "data" && parsed.result !== undefined) {
          await this.output.Add(parsed.result.text);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  /**
   * @typedef {Object} Result
   * @property {string} user_id
   * @property {string} auth_token
   * @property {string} ai_message
   */

  /**
   * @typedef {Object} Chunk
   * @property {boolean} [ok]
   * @property {Result} [result]
   */

  /**
   * @typedef {Object} ServerResponse
   * @property {boolean} [done]
   * @property {Chunk} [chunk]
   */

  /**
   * @param {ServerResponse} msg
   * @param {{ value: string }} buffer
   * @param {TextDecoder} decoder
   * @param {Queue} queue
   */
  #GetResponse(msg, buffer, decoder, queue) {
    var uint8;
    console.assert(
      typeof msg === "object" && msg !== null,
      "msg is not an object",
    );
    console.assert(
      typeof buffer === "object" &&
        buffer !== null &&
        typeof buffer.value === "string",
      "buffer is not of type { value: string }",
    );
    console.assert(
      decoder instanceof TextDecoder,
      "decoder is not a TextDecoder",
    );
    console.assert(queue instanceof Queue, "queue is not an instance of Queue");

    if ("chunk" in msg) {
      console.assert(
        Array.isArray(msg.chunk) &&
          msg.chunk.every((n) => typeof n === "number"),
        "msg.chunk is not a number[]",
      );
    }
    if ("done" in msg) {
      console.assert(
        typeof msg.done === "boolean",
        "msg.done is not a boolean",
      );
    }

    if (msg.done) {
      this.port.disconnect();
      queue.DoCallback();
    } else if (!msg.ok) {
      this.output.Add("Something went wrong!");
    } else if (msg.chunk) {
      uint8 = new Uint8Array(msg.chunk);
      queue.Add(() => this.#HandleChunk(buffer, decoder, uint8));
    }
  }

  /**
   * @param {string} text*/
  async Begin(text) {
    var data;

    data = {
      decoder: new TextDecoder("utf-8"),
      buffer: { value: "" },
      queue: new Queue(),
      user_id: await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "get_user_id" }, (msg) => {
          resolve(msg.user_id || 0);
        });
      }),
      language: await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "get_language" }, (msg) => {
          resolve(msg.language || "en");
        });
      }),
    };

    this.port.postMessage({
      user_id: data.user_id,
      target_lang: data.language,
      text: text,
    });

    data.queue.OnIdle(this.output.Flush.bind(this.output));
    this.port.onMessage.addListener((msg) =>
      this.#GetResponse(msg, data.buffer, data.decoder, data.queue),
    );
  }
}
