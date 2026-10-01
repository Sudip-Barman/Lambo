// Command Queue for Lambo RC Controller
// Prevents UART buffer overflow on HC-05 by rate-limiting & coalescing continuous controls
// Guarantees zero-latency immediate dispatch for critical safety commands (EMG_STOP)

export class CommandQueue {
  constructor(sendCallback, options = {}) {
    this.sendCallback = sendCallback;
    this.intervalMs = options.intervalMs || 40; // ~25Hz transmission max for smooth UART
    this.queue = [];
    this.pendingThrottle = null;
    this.pendingSteering = null;
    this.timer = null;
    this.isProcessing = false;

    // Packet statistics
    this.stats = {
      totalSent: 0,
      coalescedCount: 0,
      priorityCount: 0,
      errorsCount: 0
    };
  }

  setSendCallback(fn) {
    this.sendCallback = fn;
  }

  /**
   * Enqueue a command.
   * - 'EMG_STOP' is treated as highest priority and dispatched immediately.
   * - 'F,PWM', 'B,PWM', 'S' coalesce into pendingThrottle.
   * - 'L,val', 'R,val', 'C' coalesce into pendingSteering.
   * - Other commands (HL, HN, MS, SR, MD) are queued FIFO.
   */
  enqueue(cmd, isPriority = false) {
    if (!cmd) return;

    // 1. Critical Priority (EMG_STOP)
    if (cmd === 'EMG_STOP' || isPriority) {
      // Clear pending movements
      this.pendingThrottle = null;
      this.pendingSteering = null;
      this.queue = []; // Drop non-essential queued packets

      this.stats.priorityCount++;
      this.dispatchImmediately(cmd);
      return;
    }

    // 2. Coalesce continuous Throttle updates (F,PWM / B,PWM / S)
    if (cmd.startsWith('F,') || cmd.startsWith('B,') || cmd === 'S') {
      if (this.pendingThrottle !== null) {
        this.stats.coalescedCount++;
      }
      this.pendingThrottle = cmd;
      this.ensurePumpRunning();
      return;
    }

    // 3. Coalesce continuous Steering updates (L,val / R,val / C)
    if (cmd.startsWith('L,') || cmd.startsWith('R,') || cmd === 'C') {
      if (this.pendingSteering !== null) {
        this.stats.coalescedCount++;
      }
      this.pendingSteering = cmd;
      this.ensurePumpRunning();
      return;
    }

    // 4. Auxiliary or Discrete Commands (Headlights, Mist, Sunroof, etc.)
    this.queue.push(cmd);
    this.ensurePumpRunning();
  }

  async dispatchImmediately(cmd) {
    if (!this.sendCallback) return;
    try {
      this.stats.totalSent++;
      await this.sendCallback(cmd);
    } catch (err) {
      this.stats.errorsCount++;
      console.error('[CommandQueue] Immediate dispatch failed:', err);
    }
  }

  ensurePumpRunning() {
    if (this.timer) return;
    this.timer = setInterval(() => this.pump(), this.intervalMs);
    // Trigger immediately if not currently processing
    if (!this.isProcessing) {
      this.pump();
    }
  }

  async pump() {
    if (this.isProcessing) return;

    let nextCmd = null;

    // Check auxiliary queue first
    if (this.queue.length > 0) {
      nextCmd = this.queue.shift();
    } else if (this.pendingThrottle !== null) {
      nextCmd = this.pendingThrottle;
      this.pendingThrottle = null;
    } else if (this.pendingSteering !== null) {
      nextCmd = this.pendingSteering;
      this.pendingSteering = null;
    }

    if (!nextCmd) {
      // Nothing left in queue
      if (this.timer && this.queue.length === 0 && this.pendingThrottle === null && this.pendingSteering === null) {
        clearInterval(this.timer);
        this.timer = null;
      }
      return;
    }

    this.isProcessing = true;
    try {
      this.stats.totalSent++;
      if (this.sendCallback) {
        await this.sendCallback(nextCmd);
      }
    } catch (err) {
      this.stats.errorsCount++;
      console.warn('[CommandQueue] Send failed:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  clear() {
    this.queue = [];
    this.pendingThrottle = null;
    this.pendingSteering = null;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isProcessing = false;
  }

  getStats() {
    return {
      ...this.stats,
      queueLength: this.queue.length + (this.pendingThrottle ? 1 : 0) + (this.pendingSteering ? 1 : 0)
    };
  }
}
