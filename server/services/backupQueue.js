const backupDb = require('../config/backupDb');

const QUEUE_MAX = 1000;
const RETRY_MAX = 3;
const WORKER_INTERVAL_MS = 5000;

class BackupQueue {
  constructor() {
    this.queue = [];
    this.running = false;
    this.timer = null;
  }

  enqueue(sql, params) {
    if (!backupDb.pool) return;
    if (this.queue.length >= QUEUE_MAX) {
      console.error('⚠️  BackupQueue 已滿，捨棄備份任務');
      return;
    }
    this.queue.push({ sql, params, retries: 0 });
    if (!this.running) this._startWorker();
  }

  enqueueAll(queries) {
    if (!backupDb.pool) return;
    queries.forEach(({ sql, params }) => this.enqueue(sql, params));
  }

  _startWorker() {
    this.running = true;
    this.timer = setTimeout(() => this._process(), WORKER_INTERVAL_MS);
  }

  async _process() {
    while (this.queue.length > 0) {
      const task = this.queue[0];
      try {
        await backupDb.query(task.sql, task.params);
        this.queue.shift();
      } catch {
        task.retries++;
        if (task.retries >= RETRY_MAX) {
          console.error(`❌ BackupQueue 重試 ${RETRY_MAX} 次仍失敗，丟棄:`, task.sql.substring(0, 80));
          this.queue.shift();
        } else {
          console.warn(`⚠️  BackupQueue 重試 ${task.retries}/${RETRY_MAX}`);
          break;
        }
      }
    }

    if (this.queue.length > 0) {
      this.timer = setTimeout(() => this._process(), WORKER_INTERVAL_MS);
    } else {
      this.running = false;
    }
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.running = false;
  }

  get size() {
    return this.queue.length;
  }
}

module.exports = new BackupQueue();
