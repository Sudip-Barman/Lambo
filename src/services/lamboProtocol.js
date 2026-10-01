// LAMBO Hardware Protocol Simulator
// Clean abstraction layer ready for drop-in HC-05 Bluetooth Serial Bridge

export const HARDWARE_SPEC = {
  mcu: "Arduino Nano (ATmega328P)",
  driver: "TB6612FNG Dual H-Bridge Driver",
  motors: "4x Geared DC Motors (Differential 4WD)",
  sensors: {
    lineTrackers: 3, // TCRT5000 IR reflective
    ultrasonic: "HC-SR04 Front Collision Sonar",
    audio: "MP3-TF-16P Serial Audio Unit",
    mist: "113KHz Ultrasonic Atomizer Transducer"
  },
  btModule: "HC-05 (UART 9600 baud)"
};

class LamboProtocol {
  constructor() {
    this.connectionState = 'CONNECTED'; // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'
    this.listeners = new Set();
    this.packetLog = [];
    this.maxLogs = 30;

    // Simulated Telemetry State
    this.state = {
      throttle: 0,        // -100 to +100 (negative = reverse)
      steering: 0,        // -100 to +100 (negative = left, positive = right)
      headlights: false,  // boolean
      horn: false,        // boolean
      mist: false,        // boolean
      driveMode: 'SPORT', // 'ECO' | 'SPORT' | 'TRACK'
      batteryVoltage: 7.8,// 7.4V 2S LiPo (full at 8.4V, nominal 7.4V)
      rssi: -48,          // dBm
      obstacleDistance: 45,// cm (simulated sonar)
      motorCurrentmA: 420 // mA
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn({ ...this.state, connectionState: this.connectionState }));
  }

  logPacket(direction, rawCommand, description) {
    const entry = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      direction, // 'TX' or 'RX'
      raw: rawCommand,
      description
    };
    this.packetLog = [entry, ...this.packetLog.slice(0, this.maxLogs - 1)];
  }

  getPacketLogs() {
    return this.packetLog;
  }

  setConnectionState(newState) {
    this.connectionState = newState;
    this.logPacket('SYS', `STATE -> ${newState}`, `Connection status changed to ${newState}`);
    this.notify();
  }

  // --- Core Control Dispatcher ---
  // Matches hardware command design for eventual HC-05 serial send
  handleControl(action, value) {
    switch (action) {
      case 'throttle': {
        const val = Math.max(-100, Math.min(100, Math.round(value)));
        this.state.throttle = val;
        // Map to PWM 0-255 for Arduino
        const pwm = Math.round((Math.abs(val) / 100) * 255);
        const cmd = val > 0 ? `F,${pwm}` : val < 0 ? `B,${pwm}` : `S`;
        this.logPacket('TX', cmd, `Drive ${val > 0 ? 'FORWARD' : val < 0 ? 'REVERSE' : 'STOP'} PWM:${pwm}`);
        break;
      }

      case 'steering': {
        const val = Math.max(-100, Math.min(100, Math.round(value)));
        this.state.steering = val;
        const cmd = val < 0 ? `L,${Math.abs(val)}` : val > 0 ? `R,${val}` : `C`;
        this.logPacket('TX', cmd, `Steer ${val < 0 ? 'LEFT' : val > 0 ? 'RIGHT' : 'CENTER'} ${Math.abs(val)}%`);
        break;
      }

      case 'headlight': {
        const next = typeof value === 'boolean' ? value : !this.state.headlights;
        this.state.headlights = next;
        this.logPacket('TX', next ? 'HL,1' : 'HL,0', `Headlights ${next ? 'ON' : 'OFF'}`);
        break;
      }

      case 'horn': {
        const next = Boolean(value);
        this.state.horn = next;
        this.logPacket('TX', next ? 'HN,1' : 'HN,0', `Horn ${next ? 'ACTIVE' : 'IDLE'}`);
        break;
      }

      case 'mist': {
        const next = typeof value === 'boolean' ? value : !this.state.mist;
        this.state.mist = next;
        this.logPacket('TX', next ? 'MS,1' : 'MS,0', `Ultrasonic Mist ${next ? 'ENABLED' : 'DISABLED'}`);
        break;
      }

      case 'driveMode': {
        const modes = ['ECO', 'SPORT', 'TRACK'];
        const nextMode = value || modes[(modes.indexOf(this.state.driveMode) + 1) % modes.length];
        this.state.driveMode = nextMode;
        this.logPacket('TX', `MD,${nextMode[0]}`, `Drive profile set to ${nextMode}`);
        break;
      }

      case 'emergencyStop': {
        this.state.throttle = 0;
        this.state.steering = 0;
        this.logPacket('TX', 'EMG_STOP', 'EMERGENCY SHUTDOWN TRIGGERED');
        break;
      }

      default:
        console.warn(`Unknown Lambo control action: ${action}`);
    }

    this.notify();
  }
}

export const lamboProtocol = new LamboProtocol();
