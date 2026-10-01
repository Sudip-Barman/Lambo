// Bluetooth Transport for Lambo RC Controller
// Hardware bridge for HC-05 (UART 9600 baud) via Web Bluetooth / Web Serial API
// Direct drop-in interface for future React Native Bluetooth Serial migration
import { BaseTransport } from './baseTransport';
import { CONNECTION_STATE, CONNECTION_ERROR } from './connectionState';

export class BluetoothTransport extends BaseTransport {
  constructor() {
    super('BluetoothTransport');
    this.state = CONNECTION_STATE.DISCONNECTED;
    this.device = null;
    this.server = null;
    this.rxCharacteristic = null;
    this.txCharacteristic = null;
    this.serialPort = null;
    this.serialWriter = null;
    this.serialReader = null;
    this.readLoopActive = false;
    this.lineBuffer = '';
  }

  getState() {
    return this.state;
  }

  static isSupported() {
    return Boolean(
      (typeof navigator !== 'undefined' && (navigator.bluetooth || navigator.serial))
    );
  }

  async connect(options = {}) {
    if (this.state === CONNECTION_STATE.CONNECTED) return true;

    this.state = CONNECTION_STATE.CONNECTING;
    this.emit('stateChange', this.state);

    const targetDeviceName = options.deviceName || 'HC-05';

    // 1. Try Web Serial API first (Often preferred for desktop USB-to-UART / HC-05 bridges)
    if (typeof navigator !== 'undefined' && navigator.serial && !options.preferBle) {
      try {
        const port = await navigator.serial.requestPort({
          // Request available serial port or HC-05 USB-UART adapter
        });
        await port.open({ baudRate: 9600 });
        this.serialPort = port;
        this.serialWriter = port.writable.getWriter();
        this.state = CONNECTION_STATE.CONNECTED;
        this.emit('stateChange', this.state);
        this.startSerialReadLoop();
        return true;
      } catch (serialErr) {
        console.warn('[BluetoothTransport] Serial connect bypassed or failed:', serialErr.message);
        // Fall through to Web Bluetooth if available
      }
    }

    // 2. Try Web Bluetooth API (Standard for BLE / SPP-over-BLE adapters like HM-10/AT-09/HC-05 BLE)
    if (typeof navigator !== 'undefined' && navigator.bluetooth) {
      try {
        const device = await navigator.bluetooth.requestDevice({
          filters: [
            { namePrefix: targetDeviceName },
            { namePrefix: 'HC-05' },
            { namePrefix: 'LAMBO' },
            { namePrefix: 'BT05' }
          ],
          optionalServices: [
            '0000ffe0-0000-1000-8000-00805f9b34fb', // Standard HM-10 / CC2541 UART service
            '00001101-0000-1000-8000-00805f9b34fb', // Classic SPP UUID
            '6e400001-b5a3-f393-e0a9-e50e24dcca9e'  // Nordic UART Service
          ]
        });

        this.device = device;
        device.addEventListener('gattserverdisconnected', () => {
          this.handleDisconnect(CONNECTION_ERROR.LINK_LOST);
        });

        const server = await device.gatt.connect();
        this.server = server;

        // Discover UART characteristic
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.txCharacteristic = char;
            }
            if (char.properties.notify || char.properties.indicate) {
              this.rxCharacteristic = char;
              await char.startNotifications();
              char.addEventListener('characteristicvaluechanged', (e) => {
                const decoder = new TextDecoder();
                const text = decoder.decode(e.target.value);
                this.handleIncomingRawText(text);
              });
            }
          }
        }

        this.state = CONNECTION_STATE.CONNECTED;
        this.emit('stateChange', this.state);
        return true;
      } catch (bleErr) {
        this.state = CONNECTION_STATE.ERROR;
        const errReason = bleErr.name === 'NotFoundError'
          ? CONNECTION_ERROR.DEVICE_NOT_FOUND
          : bleErr.message || CONNECTION_ERROR.LINK_LOST;
        this.emit('stateChange', this.state, errReason);
        this.emit('error', errReason);
        throw new Error(errReason);
      }
    }

    // Neither supported in this browser environment
    this.state = CONNECTION_STATE.ERROR;
    const err = CONNECTION_ERROR.UNSUPPORTED;
    this.emit('stateChange', this.state, err);
    this.emit('error', err);
    throw new Error(err);
  }

  async startSerialReadLoop() {
    if (!this.serialPort || !this.serialPort.readable) return;
    this.readLoopActive = true;
    const textDecoder = new TextDecoderStream();
    this.serialPort.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    this.serialReader = reader;

    try {
      while (this.readLoopActive) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          this.handleIncomingRawText(value);
        }
      }
    } catch {
      if (this.readLoopActive) {
        this.handleDisconnect(CONNECTION_ERROR.LINK_LOST);
      }
    }
  }

  handleIncomingRawText(chunk) {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split('\n');
    this.lineBuffer = lines.pop() || '';

    for (const line of lines) {
      const clean = line.trim();
      if (clean) {
        this.emit('data', clean);
      }
    }
  }

  async send(dataString) {
    if (this.state !== CONNECTION_STATE.CONNECTED) {
      throw new Error('Bluetooth transport is not connected');
    }

    const payload = dataString.endsWith('\n') ? dataString : `${dataString}\n`;
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    if (this.serialWriter) {
      await this.serialWriter.write(payload);
      return true;
    }

    if (this.txCharacteristic) {
      if (this.txCharacteristic.writeValueWithoutResponse) {
        await this.txCharacteristic.writeValueWithoutResponse(data);
      } else {
        await this.txCharacteristic.writeValue(data);
      }
      return true;
    }

    throw new Error('No writable characteristic or serial stream available');
  }

  async disconnect(reason = CONNECTION_ERROR.MANUAL_DISCONNECT) {
    this.readLoopActive = false;

    if (this.serialReader) {
      try { await this.serialReader.cancel(); } catch { /* ignore */ }
      this.serialReader = null;
    }
    if (this.serialWriter) {
      try { await this.serialWriter.close(); } catch { /* ignore */ }
      this.serialWriter = null;
    }
    if (this.serialPort) {
      try { await this.serialPort.close(); } catch { /* ignore */ }
      this.serialPort = null;
    }

    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.txCharacteristic = null;
    this.rxCharacteristic = null;

    this.state = CONNECTION_STATE.DISCONNECTED;
    this.emit('stateChange', this.state, reason);
    return true;
  }

  handleDisconnect(reason) {
    this.state = CONNECTION_STATE.DISCONNECTED;
    this.emit('stateChange', this.state, reason);
    this.emit('error', reason);
  }
}
