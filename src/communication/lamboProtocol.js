// LAMBO Hardware Protocol Engine
// Encodes outbound commands for Arduino Nano & decodes inbound telemetry from HC-05

export const HARDWARE_SPEC = {
  mcu: "Arduino Nano (ATmega328P, 16MHz)",
  driver: "TB6612FNG Dual H-Bridge Driver",
  motors: "4x Geared DC Motors (Differential 4WD)",
  sensors: {
    lineTrackers: "3x TCRT5000 IR Reflective Sensors (L, C, R)",
    ultrasonic: "HC-SR04 Front Sonar Distance Unit",
    audio: "MP3-TF-16P Serial Audio Unit with MicroSD",
    mist: "113KHz Ultrasonic Atomizer Transducer",
    sunroof: "Geared Servo / Linear Actuator Roof Hatch",
    lighting: "Front High-Power LEDs + Rear Tri-Function Ruby LEDs"
  },
  btModule: "HC-05 Bluetooth Serial (UART 9600 / 38400 baud)"
};

export const PROTOCOL_COMMANDS = {
  // Movement
  FORWARD: 'F',      // F,PWM (0-255)
  BACKWARD: 'B',     // B,PWM (0-255)
  STOP: 'S',         // S (All motors halted)
  STEER_LEFT: 'L',   // L,value (1-100)
  STEER_RIGHT: 'R',  // R,value (1-100)
  STEER_CENTER: 'C', // C (Center steering)
  PIVOT_360: 'ROT',  // ROT,360 or ROT,CW or ROT,0

  // Auxiliaries
  HEADLIGHT: 'HL',   // HL,1 / HL,0
  REARLIGHT: 'RL',   // RL,1 / RL,0
  HORN: 'HN',        // HN,1 / HN,0
  MIST: 'MS',        // MS,1 / MS,0
  SUNROOF: 'SR',     // SR,O (Open), SR,C (Close), SR,S (Stop)
  AUDIO_TRACK: 'SND',// SND,<track_number>

  // Autonomous / Modes
  DRIVE_MODE: 'MD',  // MD,E (Eco), MD,S (Sport), MD,T (Track)
  LINE_FOLLOW: 'LF', // LF,1 (Active), LF,0 (Standby)

  // Safety & System
  EMG_STOP: 'EMG_STOP',
  PING: 'PING',
  TLM_REQ: 'TLM_REQ'
};

export class LamboProtocolEncoder {
  static formatThrottle(val) {
    const clamped = Math.max(-100, Math.min(100, Math.round(val)));
    if (clamped === 0) return 'S';
    const pwm = Math.round((Math.abs(clamped) / 100) * 255);
    return clamped > 0 ? `F,${pwm}` : `B,${pwm}`;
  }

  static formatSteering(val) {
    const clamped = Math.max(-100, Math.min(100, Math.round(val)));
    if (clamped === 0) return 'C';
    return clamped < 0 ? `L,${Math.abs(clamped)}` : `R,${clamped}`;
  }

  static format360Rotation(active = true, direction = 'CW') {
    return active ? `ROT,${direction}` : 'ROT,0';
  }

  static formatHeadlights(enabled) {
    return `HL,${enabled ? 1 : 0}`;
  }

  static formatRearLights(enabled) {
    return `RL,${enabled ? 1 : 0}`;
  }

  static formatHorn(enabled) {
    return `HN,${enabled ? 1 : 0}`;
  }

  static formatMist(enabled) {
    return `MS,${enabled ? 1 : 0}`;
  }

  static formatSunroof(action) {
    // action: 'OPEN' | 'CLOSE' | 'STOP'
    const code = action === 'OPEN' ? 'O' : action === 'CLOSE' ? 'C' : 'S';
    return `SR,${code}`;
  }

  static formatDriveMode(mode) {
    const code = mode === 'ECO' ? 'E' : mode === 'TRACK' ? 'T' : 'S';
    return `MD,${code}`;
  }

  static formatLineFollow(enabled) {
    return `LF,${enabled ? 1 : 0}`;
  }

  static formatAudioTrack(trackNum) {
    return `SND,${trackNum}`;
  }

  static formatEmergencyStop() {
    return 'EMG_STOP';
  }

  static formatPing() {
    return 'PING';
  }
}

export class LamboProtocolDecoder {
  /**
   * Parses an incoming raw serial string from Arduino Nano
   * Example telemetry: TLM,V:7.82,P:84,D:45,L:0,C:1,R:0,SR:C,SAFE:0
   * Example ACK: ACK,F,255
   */
  static parse(line) {
    if (!line || typeof line !== 'string') return null;
    const trimmed = line.trim();
    if (!trimmed) return null;

    if (trimmed === 'PONG') {
      return { type: 'PONG', timestamp: Date.now() };
    }

    if (trimmed.startsWith('ACK,')) {
      return {
        type: 'ACK',
        command: trimmed.substring(4),
        timestamp: Date.now()
      };
    }

    if (trimmed.startsWith('SAFE_STOP')) {
      const parts = trimmed.split(',');
      const dist = parts[1]?.startsWith('D:') ? parseInt(parts[1].substring(2), 10) : 0;
      return {
        type: 'SAFE_STOP',
        obstacleDistance: dist,
        timestamp: Date.now()
      };
    }

    if (trimmed.startsWith('TLM,')) {
      const data = { type: 'TELEMETRY', raw: trimmed, timestamp: Date.now() };
      const tokens = trimmed.substring(4).split(',');

      for (const token of tokens) {
        const [k, v] = token.split(':');
        if (!k || v === undefined) continue;

        switch (k.trim()) {
          case 'V':
            data.batteryVoltage = parseFloat(v);
            break;
          case 'P':
            data.batteryPercent = parseInt(v, 10);
            break;
          case 'D':
            data.obstacleDistance = parseInt(v, 10);
            data.obstacleDetected = data.obstacleDistance > 0 && data.obstacleDistance <= 25;
            data.safetyStop = data.obstacleDistance > 0 && data.obstacleDistance <= 12;
            break;
          case 'L':
            data.lineLeft = v === '1';
            break;
          case 'C':
            data.lineCenter = v === '1';
            break;
          case 'R':
            data.lineRight = v === '1';
            break;
          case 'SR':
            // 'O': Open, 'C': Closed, 'OP': Opening, 'CL': Closing
            data.sunroofState = v === 'O' ? 'OPEN' : v === 'OP' ? 'OPENING' : v === 'CL' ? 'CLOSING' : 'CLOSED';
            break;
          case 'SAFE':
            data.safetyStop = v === '1';
            break;
          case 'MODE':
            data.driveMode = v === 'E' ? 'ECO' : v === 'T' ? 'TRACK' : 'SPORT';
            break;
          case 'MA':
            data.motorCurrentmA = parseInt(v, 10);
            break;
          default:
            data[k] = v;
        }
      }

      return data;
    }

    if (trimmed.startsWith('ERR,')) {
      return {
        type: 'ERROR',
        message: trimmed.substring(4),
        timestamp: Date.now()
      };
    }

    return { type: 'RAW', content: trimmed, timestamp: Date.now() };
  }
}
