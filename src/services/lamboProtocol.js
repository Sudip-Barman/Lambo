// LAMBO Hardware Protocol Simulator & Service Bridge
// Connects the unified Vehicle Engine & Communication Layer with existing UI bindings
import { vehicleEngine } from './vehicleEngine';
import { connectionManager } from '../communication/connectionManager';
import { HARDWARE_SPEC } from '../communication/lamboProtocol';

export { HARDWARE_SPEC, vehicleEngine, connectionManager };

class LamboProtocolAdapter {
  constructor() {
    this.vehicleEngine = vehicleEngine;
    this.connectionManager = connectionManager;
  }

  get state() {
    return this.vehicleEngine.state;
  }

  get connectionState() {
    return this.vehicleEngine.state.connectionState;
  }

  subscribe(listener) {
    return this.vehicleEngine.subscribe(listener);
  }

  getPacketLogs() {
    return this.connectionManager.getPacketLogs();
  }

  setConnectionState(newState) {
    if (newState === 'CONNECTED') {
      this.connectionManager.connect();
    } else if (newState === 'DISCONNECTED') {
      this.connectionManager.disconnect();
    } else if (newState === 'ERROR') {
      this.connectionManager.simulateConnectionDrop();
    } else {
      this.connectionManager.reconnect();
    }
  }

  handleControl(action, value) {
    switch (action) {
      case 'throttle':
        this.vehicleEngine.setThrottle(value);
        break;
      case 'steering':
        this.vehicleEngine.setSteering(value);
        break;
      case 'pivot360':
      case 'rotation360':
        this.vehicleEngine.trigger360Rotation();
        break;
      case 'headlight':
        this.vehicleEngine.toggleHeadlights();
        break;
      case 'horn':
        if (value) {
          this.vehicleEngine.startHorn();
        } else {
          this.vehicleEngine.stopHorn();
        }
        break;
      case 'mist':
        this.vehicleEngine.toggleMist();
        break;
      case 'sunroof':
        this.vehicleEngine.setSunroof(value);
        break;
      case 'driveMode':
        this.vehicleEngine.setDriveMode(value);
        break;
      case 'lineFollow':
        this.vehicleEngine.toggleLineFollow();
        break;
      case 'emergencyStop':
        this.vehicleEngine.emergencyStop();
        break;
      case 'resetEmergencyStop':
        this.vehicleEngine.resetEmergencyStop();
        break;
      default:
        console.warn(`[LamboProtocolAdapter] Unknown action: ${action}`);
    }
  }
}

export const lamboProtocol = new LamboProtocolAdapter();
