class Queue {
  /** @type {Array<{task: () => Promise<any>, resolve: Function, reject: Function}>} */
  #queue = [];
  /** @type {Boolean} */
  #processing = false;
  /** @type {Function} */
  #onIdleCallback = null;

  /** @param {Function} callback */
  OnIdle(callback) {
    console.assert(callback instanceof Function, "callback is not a Function");
    this.#onIdleCallback = callback;
  }

  DoCallback() {
    while (this.#processing) {}

    console.log("calling callback!");
    this.#onIdleCallback();
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
        } catch (err) {
          chunk.reject(err);
        }
      }

      this.#processing = false;
    }
  }
}
