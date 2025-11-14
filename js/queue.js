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

  async #Process() {
    if (this.#processing) return;

    this.#processing = true;

    try {
      while (this.#queue.length > 0) {
        // Обрабатываем только BATCH_SIZE задач за один "тик"
        const batch = this.#queue.splice(0, Queue.#BATCH_SIZE);

        // Обрабатываем пачку параллельно
        await Promise.all(
          batch.map(async ({ task, resolve, reject }) => {
            try {
              const result = await task();
              resolve(result);
            } catch (err) {
              reject(err);
            }
          }),
        );

        // Даем браузеру шанс обновить UI
        if (this.#queue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    } finally {
      this.#processing = false;
      this.DoCallback();
    }
  }
}
