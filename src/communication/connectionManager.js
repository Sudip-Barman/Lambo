// Connection Manager for Lambo RC Controller
// Coordinates transports (Mock vs Bluetooth), state transitions, packet logging, telemetry decoding, ping/latency & auto-reconnect
import { CONNECTION_STATE, CONNECTION_ERROR, TRANSPORT_TYPE } from './connectionState';
import { MockTransport } from './mockTransport';
import { BluetoothTransport } from './bluetoothTransport';
import { LamboProtocolDecoder } from './lamboProtocol';
import { CommandQueue } from './commandQueue';

class ConnectionManager {
  constructor() {
    this.state = CONNECTION_STATE.DISCONNECTED;
    this.lastError = null;
    this.lastConnectedTime = null;
    this.transportType = TRANSPORT_TYPE.MOCK;

    // Configurable settings
    this.deviceName = this.loadStoredDeviceName() || 'HC-05_LAMBO';
    this.autoReconnect = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 4;
    this.reconnectTimer = null;

    // Diagnostics / Metrics
    this.latencyMs = 18;
    this.rssi = -52; // dBm
    this.lastPingSent = 0;
    this.heartbeatTimer = null;
    this.missedHeartbeats = 0;

    this.packetLogs = [];
    this.maxLogs = 40;

    // Listeners
    this.listeners = {
      state: new Set(),
      packet: new Set(),
      telemetry: new Set(),
      error: new Set()
    };

    // Instantiate Transports
    this.mockTransport = new MockTransport();
    this.bluetoothTransport = new BluetoothTransport();
    this.activeTransport = this.mockTransport;

    // Instantiate Command Queue
    this.commandQueue = new CommandQueue((rawCmd) => this.dispatchRaw(rawCmd));

    this.bindTransportEvents(this.mockTransport);
    this.bindTransportEvents(this.bluetoothTransport);
  }

  loadStoredDeviceName() {
    try {
      return localStorage.getItem('lambo_device_name');
    } catch {
      return null;
    }
  }

  setDeviceName(name) {
    this.deviceName = name || 'HC-05_LAMBO';
    try {
      localStorage.setItem('lambo_device_name', this.deviceName);
    } catch {
      // ignore
    }
    this.notifyState();
  }

  setTransportType(type) {
    if (this.state === CONNECTION_STATE.CONNECTED || this.state === CONNECTION_STATE.CONNECTING) {
      this.disconnect(CONNECTION_ERROR.MANUAL_DISCONNECT);
    }
    this.transportType = type;
    this.activeTransport = type === TRANSPORT_TYPE.BLUETOOTH ? this.bluetoothTransport : this.mockTransport;
    this.logPacket('SYS', `TRANSPORT -> ${type}`, `Switched communication transport to ${type}`);
    this.notifyState();
  }

  bindTransportEvents(transport) {
    transport.on('stateChange', (newState, errorReason) => {
      if (transport !== this.activeTransport) return;
      this.handleTransportStateChange(newState, errorReason);
    });

    transport.on('data', (rawString) => {
      if (transport !== this.activeTransport) return;
      this.handleIncomingData(rawString);
    });

    transport.on('error', (err) => {
      if (transport !== this.activeTransport) return;
      this.lastError = err;
      this.logPacket('ERR', 'TRANSPORT_ERROR', typeof err === 'string' ? err : err?.message || 'Transport error');
      this.listeners.error.forEach((fn) => fn(err));
      this.notifyState();
    });
  }

  handleTransportStateChange(newState, errorReason) {
    const prevState = this.state;
    this.state = newState;

    if (errorReason) {
      this.lastError = errorReason;
    }

    if (newState === CONNECTION_STATE.CONNECTED) {
      this.lastConnectedTime = new Date();
      this.reconnectAttempts = 0;
      this.lastError = null;
      this.startHeartbeat();
      this.logPacket('SYS', 'CONNECTED', `Successfully connected to ${this.deviceName} via ${this.transportType}`);
    } else if (newState === CONNECTION_STATE.DISCONNECTED || newState === CONNECTION_STATE.ERROR) {
      this.stopHeartbeat();
      this.commandQueue.clear();

      if (prevState === CONNECTION_STATE.CONNECTED && this.autoReconnect && errorReason !== CONNECTION_ERROR.MANUAL_DISCONNECT) {
        this.attemptReconnect();
      }
    }

    this.notifyState();
  }

  handleIncomingData(rawString) {
    const parsed = LamboProtocolDecoder.parse(rawString);
    if (!parsed) return;

    if (parsed.type === 'PONG') {
      if (this.lastPingSent > 0) {
        this.latencyMs = Math.max(4, Math.round(Date.now() - this.lastPingSent));
        this.lastPingSent = 0;
      }
      this.missedHeartbeats = 0;
      return;
    }

    // Packet log
    this.logPacket('RX', rawString, parsed.type);

    // Notify telemetry listeners if telemetry data
    if (parsed.type === 'TELEMETRY' || parsed.type === 'SAFE_STOP') {
      this.listeners.telemetry.forEach((fn) => fn(parsed));
    }

    this.listeners.packet.forEach((fn) => fn({ direction: 'RX', raw: rawString, parsed }));
  }

  async connect() {
    if (this.state === CONNECTION_STATE.CONNECTED) return true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.state = CONNECTION_STATE.CONNECTING;
    this.lastError = null;
    this.notifyState();
    this.logPacket('SYS', 'CONNECTING', `Initiating link to ${this.deviceName}...`);

    try {
      await this.activeTransport.connect({
        deviceName: this.deviceName,
        delay: 550
      });
      return true;
    } catch (err) {
      this.state = CONNECTION_STATE.ERROR;
      this.lastError = err.message || CONNECTION_ERROR.DEVICE_NOT_FOUND;
      this.logPacket('ERR', 'CONNECT_FAILED', this.lastError);
      this.notifyState();
      return false;
    }
  }

  async disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.stopHeartbeat();
    this.commandQueue.clear();

    await this.activeTransport.disconnect(CONNECTION_ERROR.MANUAL_DISCONNECT);
    this.state = CONNECTION_STATE.DISCONNECTED;
    this.logPacket('SYS', 'DISCONNECTED', 'Connection closed by operator');
    this.notifyState();
  }

  async reconnect() {
    await this.disconnect();
    return this.connect();
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.state = CONNECTION_STATE.ERROR;
      this.lastError = 'Maximum reconnection attempts exceeded';
      this.notifyState();
      return;
    }

    this.reconnectAttempts++;
    this.state = CONNECTION_STATE.RECONNECTING;
    this.notifyState();

    const backoffMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), 6000);
    this.logPacket('SYS', `RECONNECT_ATTEMPT_${this.reconnectAttempts}`, `Attempting reconnect in ${Math.round(backoffMs)}ms...`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.activeTransport.connect({ deviceName: this.deviceName, delay: 450 });
      } catch {
        if (this.state === CONNECTION_STATE.RECONNECTING) {
          this.attemptReconnect();
        }
      }
    }, backoffMs);
  }

  // Inject failure for UI verification & testing
  simulateConnectionDrop() {
    if (this.transportType === TRANSPORT_TYPE.MOCK && this.mockTransport.simulateDisconnect) {
      this.mockTransport.simulateDisconnect(CONNECTION_ERROR.LINK_LOST);
    } else {
      this.handleTransportStateChange(CONNECTION_STATE.ERROR, CONNECTION_ERROR.LINK_LOST);
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.missedHeartbeats = 0;

    this.heartbeatTimer = setInterval(() => {
      if (this.state !== CONNECTION_STATE.CONNECTED) return;

      if (this.missedHeartbeats >= 4) {
        this.logPacket('ERR', 'TIMEOUT', 'Telemetry heartbeat missed 4 times. Connection stale.');
        this.handleTransportStateChange(CONNECTION_STATE.ERROR, CONNECTION_ERROR.STALE_HEARTBEAT);
        return;
      }

      this.missedHeartbeats++;
      this.lastPingSent = Date.now();
      this.activeTransport.send('PING').catch(() => {});
    }, 2800);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * High-level send method called by Vehicle Engine
   * Route through commandQueue for pacing and safety priority
   */
  sendCommand(rawCommand, isPriority = false) {
    if (this.state !== CONNECTION_STATE.CONNECTED) {
      // If disconnected, do not falsely queue commands unless it's emergency stop
      if (rawCommand === 'EMG_STOP') {
        this.logPacket('TX', 'EMG_STOP (OFFLINE)', 'Emergency stop registered locally while offline');
      }
      return;
    }

    this.commandQueue.enqueue(rawCommand, isPriority);
  }

  async dispatchRaw(rawCommand) {
    this.logPacket('TX', rawCommand, 'TRANSMIT');
    this.listeners.packet.forEach((fn) => fn({ direction: 'TX', raw: rawCommand }));
    await this.activeTransport.send(rawCommand);
  }

  logPacket(direction, raw, description) {
    const entry = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fraction: '2' }),
      direction, // 'TX' | 'RX' | 'SYS' | 'ERR'
      raw,
      description
    };
    this.packetLogs = [entry, ...this.packetLogs.slice(0, this.maxLogs - 1)];
  }

  getPacketLogs() {
    return this.packetLogs;
  }

  getMetrics() {
    const queueStats = this.commandQueue.getStats();
    return {
      state: this.state,
      deviceName: this.deviceName,
      transportType: this.transportType,
      latencyMs: this.latencyMs,
      rssi: this.rssi,
      lastConnectedTime: this.lastConnectedTime
        ? this.lastConnectedTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : null,
      lastError: this.lastError,
      queueStats
    };
  }

  // Listener subscriptions
  onStateChange(cb) {
    this.listeners.state.add(cb);
    return () => this.listeners.state.delete(cb);
  }

  onTelemetry(cb) {
    this.listeners.telemetry.add(cb);
    return () => this.listeners.telemetry.delete(cb);
  }

  onPacket(cb) {
    this.listeners.packet.add(cb);
    return () => this.listeners.packet.delete(cb);
  }

  notifyState() {
    const info = this.getMetrics();
    this.listeners.state.forEach((fn) => fn(info));
  }
}

export const connectionManager = new ConnectionManager();
