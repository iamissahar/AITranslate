class Queue {
  static #BATCH_SIZE = 3;
  /** @type {Array<{task: () => Promise<any>, resolve: Function, reject: Function}>} */
  #queue = [];
  /** @type {Boolean} */
  #processing = false;
  /** @type {Function} */
  #onIdleCallback = null;
  #processed = 0;

  /** @param {Function} callback */
  OnIdle(callback) {
    console.assert(callback instanceof Function, "callback is not a Function");
    this.#onIdleCallback = callback;
  }

  DoCallback() {
    const checkIdle = () => {
      if (!this.#processing) {
        if (this.#onIdleCallback) this.#onIdleCallback();
      } else {
        setTimeout(checkIdle, 0);
      }
    };
    checkIdle();
  }

  /**
   * @param {() => Promise<any>} task
   * @returns {Promise}
   */
  async Add(task) {
    console.assert(task instanceof Function, "task is not a Function");
    return new Promise((resolve, reject) => {
      this.#queue.push({ task, resolve, reject });
      this.#Process();
    });
  }

  /** @returns {Promise<void>} */
  async #Process() {
    var chunk, result;

    if (!this.#processing) {
      this.#processing = true;

      while (this.#queue.length > 0) {
        chunk = this.#queue.shift();

        try {
          result = await chunk.task();
          chunk.resolve(result);

          this.#processed++;
          if (this.#processed >= Queue.#BATCH_SIZE) {
            await new Promise((r) => setTimeout(r, 50));
            this.#processed = 0;
          }
        } catch (err) {
          chunk.reject(err);
        }
      }

      this.#processing = false;
    }
  }
}
