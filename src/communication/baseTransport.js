// Base Abstract Transport for Lambo Communication Layer
// Standard interface for Mock, Web Bluetooth, Web Serial, and React Native transports

export class BaseTransport {
  constructor(name = 'BaseTransport') {
    this.name = name;
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  }

  emit(event, ...args) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((handler) => {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[${this.name}] Error in '${event}' event listener:`, err);
        }
      });
    }
  }

  // Abstract methods to be implemented by subclasses
  async connect(_options = {}) {
    throw new Error(`${this.name} must implement connect()`);
  }

  async disconnect(_reason) {
    throw new Error(`${this.name} must implement disconnect()`);
  }

  async send(_dataString) {
    throw new Error(`${this.name} must implement send()`);
  }

  getState() {
    throw new Error(`${this.name} must implement getState()`);
  }
}
