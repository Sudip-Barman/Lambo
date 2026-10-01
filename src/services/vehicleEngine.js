// Vehicle Control Engine for Lambo RC Controller
// Sits between UI Controls and Communication Layer
// Manages vehicle state, hardware command encoding, safety interlocks & telemetry aggregation
import { connectionManager } from '../communication/connectionManager';
import { LamboProtocolEncoder } from '../communication/lamboProtocol';
import { CONNECTION_STATE } from '../communication/connectionState';
import { soundEngine } from './soundEngine';

class VehicleEngine {
  constructor() {
    this.listeners = new Set();
    this.rotationTimer = null;
    this.rotationInterval = null;

    // Full Vehicle State
    this.state = {
      // Movement
      throttle: 0,        // -100 to +100 (negative = reverse)
      steering: 0,        // -100 to +100 (negative = left, positive = right)
      speedKmh: 0,
      isBraking: false,
      gear: 'P',          // 'P' | 'D' | 'R'
      isRotating360: false,
      rotationAngle: 0,   // 0 to 360 degrees for in-place pivot visualization

      // Auxiliaries
      headlights: false,
      rearLights: false,  // manual rear lights override
      horn: false,
      mist: false,

      // Sunroof mechanism (Nano accessibility hatch)
      sunroof: {
        state: 'CLOSED',  // 'OPEN' | 'CLOSED' | 'OPENING' | 'CLOSING'
        progress: 0       // 0 to 100%
      },

      // Profiles & Autonomous
      driveMode: 'SPORT', // 'ECO' | 'SPORT' | 'TRACK'
      lineFollowMode: false,

      // Safety
      emergencyStopActive: false,
      safetyStopActive: false, // Local Arduino sonar proximity stop

      // Sensor Telemetry
      telemetry: {
        batteryVoltage: 7.84, // 2S LiPo nominal 7.4V, max 8.4V
        batteryPercent: 82,
        lowBatteryWarning: false,
        obstacleDistance: 48, // cm (HC-SR04 sonar)
        obstacleDetected: false, // < 25 cm
        safetyStop: false,       // < 12 cm
        lineSensors: {
          left: false,
          center: true,
          right: false
        },
        motorCurrentmA: 420
      },

      // Connection Info
      connectionState: CONNECTION_STATE.DISCONNECTED,
      connectionMetrics: connectionManager.getMetrics()
    };

    // Bind communication layer
    this.initCommunication();
  }

  initCommunication() {
    // 1. Connection State changes
    connectionManager.onStateChange((metrics) => {
      this.state.connectionState = metrics.state;
      this.state.connectionMetrics = metrics;

      // Fail-safe: if connection drops unexpectedly while moving, immediately stop locally
      if (metrics.state === CONNECTION_STATE.DISCONNECTED || metrics.state === CONNECTION_STATE.ERROR) {
        if (this.state.throttle !== 0 || this.state.isRotating360) {
          this.state.throttle = 0;
          this.state.isRotating360 = false;
          this.state.rotationAngle = 0;
        }
      }

      this.notify();
    });

    // 2. Telemetry packets from Arduino
    connectionManager.onTelemetry((tlm) => {
      if (tlm.type === 'SAFE_STOP') {
        this.state.safetyStopActive = true;
        this.state.throttle = 0;
        this.state.isRotating360 = false;
        this.notify();
        return;
      }

      if (tlm.type === 'TELEMETRY') {
        const curTlm = this.state.telemetry;
        if (tlm.batteryVoltage !== undefined) curTlm.batteryVoltage = tlm.batteryVoltage;
        if (tlm.batteryPercent !== undefined) {
          curTlm.batteryPercent = tlm.batteryPercent;
          curTlm.lowBatteryWarning = tlm.batteryPercent <= 20;
        }
        if (tlm.obstacleDistance !== undefined) {
          curTlm.obstacleDistance = tlm.obstacleDistance;
          curTlm.obstacleDetected = tlm.obstacleDistance > 0 && tlm.obstacleDistance <= 25;
          curTlm.safetyStop = tlm.obstacleDistance > 0 && tlm.obstacleDistance <= 12;

          if (curTlm.safetyStop && this.state.throttle > 0) {
            this.state.throttle = 0;
            this.state.safetyStopActive = true;
          }
        }
        if (tlm.lineLeft !== undefined) {
          curTlm.lineSensors.left = tlm.lineLeft;
          curTlm.lineSensors.center = tlm.lineCenter;
          curTlm.lineSensors.right = tlm.lineRight;
        }
        if (tlm.motorCurrentmA !== undefined) curTlm.motorCurrentmA = tlm.motorCurrentmA;

        // Sunroof telemetry sync
        if (tlm.sunroofState) {
          this.state.sunroof.state = tlm.sunroofState;
          if (tlm.sunroofState === 'OPEN') this.state.sunroof.progress = 100;
          if (tlm.sunroofState === 'CLOSED') this.state.sunroof.progress = 0;
        }

        this.notify();
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Initial call
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  // =========================================================================
  // VEHICLE MOTION CONTROLS
  // =========================================================================

  setThrottle(value) {
    // Safety check: Emergency Stop or local Obstacle Stop prohibits acceleration
    if (this.state.emergencyStopActive) return;
    if (this.state.safetyStopActive && value > 0) return;

    // Disallow regular throttle while in 360° pivot mode
    if (this.state.isRotating360) {
      this.stop360Rotation();
    }

    const clamped = Math.max(-100, Math.min(100, Math.round(value)));
    if (this.state.throttle === clamped) return;

    this.state.throttle = clamped;
    const cmd = LamboProtocolEncoder.formatThrottle(clamped);
    connectionManager.sendCommand(cmd);
    this.notify();
  }

  setSteering(value) {
    if (this.state.emergencyStopActive) return;

    if (this.state.isRotating360 && Math.abs(value) > 20) {
      this.stop360Rotation();
    }

    const clamped = Math.max(-100, Math.min(100, Math.round(value)));
    if (this.state.steering === clamped) return;

    this.state.steering = clamped;
    const cmd = LamboProtocolEncoder.formatSteering(clamped);
    connectionManager.sendCommand(cmd);
    this.notify();
  }

  setBraking(braking) {
    this.state.isBraking = Boolean(braking);
    this.notify();
  }

  // =========================================================================
  // 360° IN-PLACE PIVOT ROTATION (4WD OPPOSITE WHEEL ROTATION)
  // =========================================================================

  trigger360Rotation() {
    if (this.state.emergencyStopActive) return;

    if (this.state.isRotating360) {
      this.stop360Rotation();
      return;
    }

    this.start360Rotation();
  }

  start360Rotation(direction = 'CW') {
    if (this.state.emergencyStopActive) return;

    this.state.isRotating360 = true;
    this.state.throttle = 0;
    this.state.steering = 0;
    this.state.rotationAngle = 0;

    // Play tactile sound
    soundEngine.playBeep(980, 0.08, 'sawtooth');

    // Transmit command to Arduino Nano: ROT,CW (4WD differential pivot)
    const cmd = LamboProtocolEncoder.format360Rotation(true, direction);
    connectionManager.sendCommand(cmd);

    // Animate smooth visual 360° spin over ~2.6 seconds (approx 138 deg/sec)
    const startTime = performance.now();
    const duration = 2600; // ms for full 360 rotation

    if (this.rotationInterval) clearInterval(this.rotationInterval);

    this.rotationInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Smooth ease in-out spin
      this.state.rotationAngle = progress * 360;

      if (progress >= 1) {
        this.stop360Rotation();
      } else {
        this.notify();
      }
    }, 16);

    this.notify();
  }

  stop360Rotation() {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }

    this.state.isRotating360 = false;
    this.state.rotationAngle = 0;

    // Send ROT,0 to Arduino to halt pivot
    const cmd = LamboProtocolEncoder.format360Rotation(false);
    connectionManager.sendCommand(cmd);
    this.notify();
  }

  // =========================================================================
  // VEHICLE ACCESSORIES & AUXILIARY CONTROLS
  // =========================================================================

  toggleHeadlights() {
    const next = !this.state.headlights;
    this.state.headlights = next;
    const cmd = LamboProtocolEncoder.formatHeadlights(next);
    connectionManager.sendCommand(cmd);
    soundEngine.playToggle(next);
    this.notify();
  }

  setHeadlights(on) {
    this.state.headlights = Boolean(on);
    const cmd = LamboProtocolEncoder.formatHeadlights(this.state.headlights);
    connectionManager.sendCommand(cmd);
    this.notify();
  }

  toggleRearLights() {
    const next = !this.state.rearLights;
    this.state.rearLights = next;
    const cmd = LamboProtocolEncoder.formatRearLights(next);
    connectionManager.sendCommand(cmd);
    this.notify();
  }

  startHorn() {
    this.state.horn = true;
    const cmd = LamboProtocolEncoder.formatHorn(true);
    connectionManager.sendCommand(cmd);
    soundEngine.startHorn();
    this.notify();
  }

  stopHorn() {
    this.state.horn = false;
    const cmd = LamboProtocolEncoder.formatHorn(false);
    connectionManager.sendCommand(cmd);
    soundEngine.stopHorn();
    this.notify();
  }

  toggleMist() {
    const next = !this.state.mist;
    this.state.mist = next;
    const cmd = LamboProtocolEncoder.formatMist(next);
    connectionManager.sendCommand(cmd);
    soundEngine.playToggle(next);
    this.notify();
  }

  // =========================================================================
  // SUNROOF REMOVABLE ACCESS MECHANISM (ARDUINO NANO SERVICE HATCH)
  // =========================================================================

  setSunroof(action) {
    // action: 'OPEN' | 'CLOSE' | 'STOP'
    if (action === 'OPEN') {
      this.state.sunroof.state = 'OPENING';
    } else if (action === 'CLOSE') {
      this.state.sunroof.state = 'CLOSING';
    } else if (action === 'STOP') {
      this.state.sunroof.state = 'OPEN';
    }

    const cmd = LamboProtocolEncoder.formatSunroof(action);
    connectionManager.sendCommand(cmd);
    soundEngine.playBeep( action === 'OPEN' ? 880 : 540, 0.05);
    this.notify();
  }

  // =========================================================================
  // DRIVE MODES & AUTONOMOUS
  // =========================================================================

  setDriveMode(mode) {
    const valid = ['ECO', 'SPORT', 'TRACK'];
    if (!valid.includes(mode)) return;

    this.state.driveMode = mode;
    const cmd = LamboProtocolEncoder.formatDriveMode(mode);
    connectionManager.sendCommand(cmd);
    soundEngine.playBeep(mode === 'TRACK' ? 1200 : mode === 'SPORT' ? 900 : 700, 0.04);
    this.notify();
  }

  toggleLineFollow() {
    const next = !this.state.lineFollowMode;
    this.state.lineFollowMode = next;
    const cmd = LamboProtocolEncoder.formatLineFollow(next);
    connectionManager.sendCommand(cmd);
    soundEngine.playToggle(next);
    this.notify();
  }

  // =========================================================================
  // EMERGENCY SHUTDOWN SAFETY SYSTEM
  // =========================================================================

  emergencyStop() {
    this.state.emergencyStopActive = true;
    this.state.throttle = 0;
    this.state.steering = 0;
    this.state.isRotating360 = false;
    this.state.rotationAngle = 0;

    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }

    // High-priority immediate dispatch: bypasses queue
    const cmd = LamboProtocolEncoder.formatEmergencyStop();
    connectionManager.sendCommand(cmd, true);

    // Audio alarm
    soundEngine.playBeep(320, 0.25, 'sawtooth');
    this.notify();
  }

  resetEmergencyStop() {
    this.state.emergencyStopActive = false;
    this.state.safetyStopActive = false;
    this.state.throttle = 0;
    this.state.steering = 0;

    // Send neutral stop
    connectionManager.sendCommand('S');
    connectionManager.sendCommand('C');

    soundEngine.playBeep(1050, 0.06);
    this.notify();
  }

  // Update speed & gear from physics loop
  updatePhysicsState(speedKmh, gear) {
    this.state.speedKmh = speedKmh;
    this.state.gear = gear;
  }
}

export const vehicleEngine = new VehicleEngine();
