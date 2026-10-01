// Mock Transport for Lambo RC Controller
// High-fidelity hardware emulation of Arduino Nano (ATmega328P) + HC-05 + Sensors
import { BaseTransport } from './baseTransport';
import { CONNECTION_STATE, CONNECTION_ERROR } from './connectionState';

export class MockTransport extends BaseTransport {
  constructor() {
    super('MockTransport');
    this.state = CONNECTION_STATE.DISCONNECTED;
    this.telemetryInterval = null;
    this.sunroofTimer = null;

    // Simulated Arduino Hardware State
    this.hardware = {
      throttle: 0,
      steering: 0,
      isRotating: false,
      headlights: false,
      rearLights: false,
      mist: false,
      horn: false,
      driveMode: 'S',
      lineFollow: false,
      batteryVoltage: 7.84, // 2S LiPo (8.4V max, 7.4V nominal)
      batteryPercent: 82,
      obstacleDistance: 48, // cm
      lineSensors: { left: false, center: true, right: false },
      sunroofState: 'CLOSED', // 'OPEN' | 'CLOSED' | 'OPENING' | 'CLOSING'
      sunroofProgress: 0,
      motorCurrentmA: 380,
      safetyStopActive: false
    };

    this.simulatedLatency = 18; // ms
  }

  getState() {
    return this.state;
  }

  async connect(options = {}) {
    if (this.state === CONNECTION_STATE.CONNECTED) return true;

    this.state = CONNECTION_STATE.CONNECTING;
    this.emit('stateChange', this.state);

    // Simulate Bluetooth RF pairing & UART baud sync delay (500-750ms)
    const connectDelay = options.delay !== undefined ? options.delay : 650;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (options.forceFail) {
          this.state = CONNECTION_STATE.ERROR;
          const err = options.errorReason || CONNECTION_ERROR.DEVICE_NOT_FOUND;
          this.emit('stateChange', this.state, err);
          this.emit('error', err);
          reject(new Error(err));
          return;
        }

        this.state = CONNECTION_STATE.CONNECTED;
        this.emit('stateChange', this.state);
        this.startTelemetryLoop();
        resolve(true);
      }, connectDelay);
    });
  }

  async disconnect(reason = CONNECTION_ERROR.MANUAL_DISCONNECT) {
    this.stopTelemetryLoop();
    if (this.sunroofTimer) clearTimeout(this.sunroofTimer);

    this.state = CONNECTION_STATE.DISCONNECTED;
    this.hardware.throttle = 0;
    this.hardware.steering = 0;
    this.hardware.isRotating = false;

    this.emit('stateChange', this.state, reason);
    return true;
  }

  // Inject unexpected link failure for testing connection failure handling
  simulateDisconnect(errorReason = CONNECTION_ERROR.LINK_LOST) {
    this.stopTelemetryLoop();
    this.state = CONNECTION_STATE.ERROR;
    this.hardware.throttle = 0;
    this.hardware.steering = 0;
    this.emit('stateChange', this.state, errorReason);
    this.emit('error', errorReason);
  }

  async send(rawCommand) {
    if (this.state !== CONNECTION_STATE.CONNECTED) {
      throw new Error('Cannot send packet: Mock Transport is not connected.');
    }

    // Simulate UART transmission latency
    setTimeout(() => {
      this.processIncomingCommand(rawCommand.trim());
    }, this.simulatedLatency);

    return true;
  }

  processIncomingCommand(cmd) {
    // 1. Emergency Stop
    if (cmd === 'EMG_STOP') {
      this.hardware.throttle = 0;
      this.hardware.steering = 0;
      this.hardware.isRotating = false;
      this.hardware.safetyStopActive = true;
      this.emit('data', 'ACK,EMG_STOP');
      this.emit('data', 'SAFE_STOP,D:0');
      return;
    }

    // 2. Ping / Heartbeat
    if (cmd === 'PING') {
      this.emit('data', 'PONG');
      return;
    }

    // 3. Movement Commands: F,PWM / B,PWM / S
    if (cmd.startsWith('F,')) {
      const pwm = parseInt(cmd.substring(2), 10);
      this.hardware.throttle = Math.round((pwm / 255) * 100);
      this.hardware.safetyStopActive = false;
      this.emit('data', `ACK,F,${pwm}`);
    } else if (cmd.startsWith('B,')) {
      const pwm = parseInt(cmd.substring(2), 10);
      this.hardware.throttle = -Math.round((pwm / 255) * 100);
      this.hardware.safetyStopActive = false;
      this.emit('data', `ACK,B,${pwm}`);
    } else if (cmd === 'S') {
      this.hardware.throttle = 0;
      this.hardware.isRotating = false;
      this.emit('data', 'ACK,S');
    }

    // 4. Steering: L,val / R,val / C
    else if (cmd.startsWith('L,')) {
      this.hardware.steering = -parseInt(cmd.substring(2), 10);
      this.emit('data', `ACK,${cmd}`);
    } else if (cmd.startsWith('R,')) {
      this.hardware.steering = parseInt(cmd.substring(2), 10);
      this.emit('data', `ACK,${cmd}`);
    } else if (cmd === 'C') {
      this.hardware.steering = 0;
      this.emit('data', 'ACK,C');
    }

    // 5. 360° Pivot Rotation: ROT,CW / ROT,CCW / ROT,360 / ROT,0
    else if (cmd.startsWith('ROT,')) {
      const dir = cmd.substring(4);
      if (dir === '0') {
        this.hardware.isRotating = false;
        this.emit('data', 'ACK,ROT,0');
      } else {
        this.hardware.isRotating = true;
        this.hardware.throttle = 0;
        this.emit('data', `ACK,ROT,${dir}`);
      }
    }

    // 6. Headlights: HL,1 / HL,0
    else if (cmd.startsWith('HL,')) {
      this.hardware.headlights = cmd === 'HL,1';
      this.emit('data', `ACK,${cmd}`);
    }

    // 7. Rear Lights: RL,1 / RL,0
    else if (cmd.startsWith('RL,')) {
      this.hardware.rearLights = cmd === 'RL,1';
      this.emit('data', `ACK,${cmd}`);
    }

    // 8. Horn: HN,1 / HN,0
    else if (cmd.startsWith('HN,')) {
      this.hardware.horn = cmd === 'HN,1';
      this.emit('data', `ACK,${cmd}`);
    }

    // 9. Mist Maker: MS,1 / MS,0
    else if (cmd.startsWith('MS,')) {
      this.hardware.mist = cmd === 'MS,1';
      this.emit('data', `ACK,${cmd}`);
    }

    // 10. Drive Mode: MD,E / MD,S / MD,T
    else if (cmd.startsWith('MD,')) {
      this.hardware.driveMode = cmd.substring(3);
      this.emit('data', `ACK,${cmd}`);
    }

    // 11. Line Follow: LF,1 / LF,0
    else if (cmd.startsWith('LF,')) {
      this.hardware.lineFollow = cmd === 'LF,1';
      this.emit('data', `ACK,${cmd}`);
    }

    // 12. Sunroof Actuator: SR,O / SR,C / SR,S
    else if (cmd.startsWith('SR,')) {
      const act = cmd.substring(3);
      if (this.sunroofTimer) clearTimeout(this.sunroofTimer);

      if (act === 'O') {
        this.hardware.sunroofState = 'OPENING';
        this.emit('data', 'ACK,SR,O');
        // Motorized roof slides open over 2.2 seconds
        this.sunroofTimer = setTimeout(() => {
          this.hardware.sunroofState = 'OPEN';
          this.broadcastTelemetry();
        }, 2200);
      } else if (act === 'C') {
        this.hardware.sunroofState = 'CLOSING';
        this.emit('data', 'ACK,SR,C');
        // Motorized roof slides closed over 2.2 seconds
        this.sunroofTimer = setTimeout(() => {
          this.hardware.sunroofState = 'CLOSED';
          this.broadcastTelemetry();
        }, 2200);
      } else if (act === 'S') {
        // Stop midway
        this.hardware.sunroofState = 'OPEN';
        this.emit('data', 'ACK,SR,S');
      }
    } else {
      this.emit('data', `ACK,${cmd}`);
    }
  }

  startTelemetryLoop() {
    this.stopTelemetryLoop();

    // Broadcast simulated Arduino Nano sensor telemetry every 250ms
    this.telemetryInterval = setInterval(() => {
      if (this.state !== CONNECTION_STATE.CONNECTED) return;
      this.updateSimulatedPhysics();
      this.broadcastTelemetry();
    }, 250);
  }

  stopTelemetryLoop() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
  }

  updateSimulatedPhysics() {
    const hw = this.hardware;

    // 1. Battery voltage subtle dynamics (sag under load, slow drift)
    const loadSag = Math.abs(hw.throttle) > 0 ? (Math.abs(hw.throttle) / 100) * 0.18 : 0;
    const baseV = 7.82 - (100 - hw.batteryPercent) * 0.012;
    hw.batteryVoltage = Math.max(6.4, Math.round((baseV - loadSag + (Math.random() * 0.02 - 0.01)) * 100) / 100);

    // 2. HC-SR04 Sonar Obstacle Simulation
    // When driving forward, obstacle slowly approaches; otherwise oscillates gently around safe range
    if (hw.throttle > 20) {
      hw.obstacleDistance = Math.max(8, hw.obstacleDistance - Math.round(hw.throttle * 0.03));
      // Local safety stop threshold (< 12 cm)
      if (hw.obstacleDistance <= 12 && !hw.safetyStopActive) {
        hw.safetyStopActive = true;
        hw.throttle = 0;
        this.emit('data', `SAFE_STOP,D:${hw.obstacleDistance}`);
      }
    } else {
      // Normal variation
      const target = 45 + Math.sin(Date.now() / 4000) * 20;
      hw.obstacleDistance = Math.round(hw.obstacleDistance + (target - hw.obstacleDistance) * 0.1);
    }

    // 3. TCRT5000 3-Sensor IR Line Simulation
    if (hw.steering < -20) {
      hw.lineSensors = { left: true, center: false, right: false };
    } else if (hw.steering > 20) {
      hw.lineSensors = { left: false, center: false, right: true };
    } else {
      hw.lineSensors = { left: false, center: true, right: false };
    }

    // 4. Current draw
    hw.motorCurrentmA = Math.abs(hw.throttle) > 0
      ? 450 + Math.round((Math.abs(hw.throttle) / 100) * 850)
      : (hw.headlights ? 120 : 65);
  }

  broadcastTelemetry() {
    const hw = this.hardware;
    const srCode = hw.sunroofState === 'OPEN' ? 'O' : hw.sunroofState === 'OPENING' ? 'OP' : hw.sunroofState === 'CLOSING' ? 'CL' : 'C';
    const l = hw.lineSensors.left ? '1' : '0';
    const c = hw.lineSensors.center ? '1' : '0';
    const r = hw.lineSensors.right ? '1' : '0';
    const safe = hw.safetyStopActive ? '1' : '0';

    // Format: TLM,V:7.84,P:82,D:48,L:0,C:1,R:0,SR:C,SAFE:0,MODE:S,MA:380
    const packet = `TLM,V:${hw.batteryVoltage},P:${hw.batteryPercent},D:${hw.obstacleDistance},L:${l},C:${c},R:${r},SR:${srCode},SAFE:${safe},MODE:${hw.driveMode},MA:${hw.motorCurrentmA}`;
    this.emit('data', packet);
  }
}
