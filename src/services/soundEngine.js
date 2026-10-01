// Web Audio API Synthesizer with Multi-Channel Audio Mixer
// Zero external sound assets needed - works 100% reliably in browser

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;

    // Multi-Channel Volume Levels (0.0 to 1.0)
    // Persisted in localStorage if available
    this.volumes = this.loadVolumes() || {
      master: 0.8,
      engine: 0.7,
      horn: 0.8,
      ui: 0.5,
      startup: 0.6,
      mist: 0.0 // Mist default 0% (Silent)
    };

    this.motorOsc = null;
    this.motorSubOsc = null;
    this.motorGain = null;
    this.motorFilter = null;
    this.hornOsc1 = null;
    this.hornOsc2 = null;
    this.hornGain = null;
    this.mistSource = null;
    this.mistGain = null;
    this.isMotorRunning = false;
    this.initialized = false;
    this.lastSpeedPercent = 0;
    this.lastIsReversing = false;
  }

  loadVolumes() {
    try {
      const stored = localStorage.getItem('lambo_audio_volumes');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  }

  saveVolumes() {
    try {
      localStorage.setItem('lambo_audio_volumes', JSON.stringify(this.volumes));
    } catch {
      // ignore
    }
  }

  setVolume(channel, value) {
    const val = Math.max(0, Math.min(1, Number(value)));
    this.volumes[channel] = val;
    this.saveVolumes();

    if (channel === 'engine' || channel === 'master') {
      this.updateMotorSpeed(this.lastSpeedPercent, this.lastIsReversing);
    }
  }

  getVolume(channel) {
    return this.volumes[channel] ?? 0.8;
  }

  getVolumes() {
    return { ...this.volumes };
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext not supported', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (muted) {
      if (this.motorGain && this.ctx) {
        this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      this.stopHorn();
      this.stopMist();
    } else {
      this.updateMotorSpeed(this.lastSpeedPercent, this.lastIsReversing);
    }
  }

  // --- STARTUP POWER-ON EFFECT ---
  playStartupSound() {
    if (this.isMuted) return;
    const vol = this.volumes.master * this.volumes.startup;
    if (vol <= 0.001) return;

    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 1.2);
    osc.frequency.exponentialRampToValueAtTime(440, t + 2.0);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(3500, t + 1.2);
    filter.frequency.exponentialRampToValueAtTime(800, t + 2.2);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18 * vol, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 2.3);

    setTimeout(() => {
      this.playChime();
    }, 1100);
  }

  playChime() {
    if (this.isMuted || !this.ctx) return;
    const vol = this.volumes.master * this.volumes.startup;
    if (vol <= 0.001) return;

    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t + i * 0.08);
      g.gain.setValueAtTime(0.1 * vol, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.5);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.5);
    });
  }

  // --- BUTTON UI CLICKS ---
  playBeep(freq = 900, duration = 0.05, type = 'sine') {
    if (this.isMuted) return;
    const vol = this.volumes.master * this.volumes.ui;
    if (vol <= 0.001) return;

    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.06 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + duration);
  }

  playToggle(state = true) {
    this.playBeep(state ? 1200 : 700, 0.06);
  }

  // --- MOTOR & ENGINE SIMULATOR ---
  startMotor() {
    if (this.isMotorRunning) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    this.motorOsc = this.ctx.createOscillator();
    this.motorOsc.type = 'sawtooth';
    this.motorOsc.frequency.setValueAtTime(45, t);

    this.motorSubOsc = this.ctx.createOscillator();
    this.motorSubOsc.type = 'triangle';
    this.motorSubOsc.frequency.setValueAtTime(22.5, t);

    this.motorFilter = this.ctx.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.setValueAtTime(250, t);
    this.motorFilter.Q.setValueAtTime(3, t);

    this.motorGain = this.ctx.createGain();
    const vol = this.isMuted ? 0 : this.volumes.master * this.volumes.engine;
    this.motorGain.gain.setValueAtTime(vol * 0.06, t);

    this.motorOsc.connect(this.motorFilter);
    this.motorSubOsc.connect(this.motorFilter);
    this.motorFilter.connect(this.motorGain);
    this.motorGain.connect(this.ctx.destination);

    this.motorOsc.start(t);
    this.motorSubOsc.start(t);
    this.isMotorRunning = true;
  }

  updateMotorSpeed(speedPercent, isReversing = false) {
    this.lastSpeedPercent = speedPercent;
    this.lastIsReversing = isReversing;

    if (!this.isMotorRunning || !this.ctx) return;

    const t = this.ctx.currentTime;
    const vol = this.isMuted ? 0 : this.volumes.master * this.volumes.engine;

    if (vol <= 0.001) {
      if (this.motorGain) this.motorGain.gain.setTargetAtTime(0, t, 0.1);
      return;
    }

    const absSpeed = Math.min(100, Math.max(0, Math.abs(speedPercent)));
    const normalized = absSpeed / 100;

    const baseFreq = 45 + normalized * 115;
    this.motorOsc.frequency.setTargetAtTime(baseFreq, t, 0.1);
    this.motorSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.1);

    const cutoff = 250 + normalized * 1200;
    this.motorFilter.frequency.setTargetAtTime(cutoff, t, 0.1);

    const targetGain = (isReversing ? 0.08 : 0.06 + normalized * 0.08) * vol;
    this.motorGain.gain.setTargetAtTime(targetGain, t, 0.1);
  }

  // --- HORN SIMULATOR ---
  startHorn() {
    if (this.isMuted) return;
    const vol = this.volumes.master * this.volumes.horn;
    if (vol <= 0.001) return;

    this.ensureContext();
    if (!this.ctx || this.hornGain) return;

    const t = this.ctx.currentTime;
    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc2 = this.ctx.createOscillator();
    this.hornGain = this.ctx.createGain();

    this.hornOsc1.type = 'sawtooth';
    this.hornOsc2.type = 'sawtooth';

    this.hornOsc1.frequency.setValueAtTime(349, t);
    this.hornOsc2.frequency.setValueAtTime(440, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, t);

    this.hornGain.gain.setValueAtTime(0.001, t);
    this.hornGain.gain.linearRampToValueAtTime(0.18 * vol, t + 0.04);

    this.hornOsc1.connect(filter);
    this.hornOsc2.connect(filter);
    filter.connect(this.hornGain);
    this.hornGain.connect(this.ctx.destination);

    this.hornOsc1.start(t);
    this.hornOsc2.start(t);
  }

  stopHorn() {
    if (!this.hornGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      this.hornGain.gain.linearRampToValueAtTime(0.001, t + 0.06);
      setTimeout(() => {
        if (this.hornOsc1) {
          try { this.hornOsc1.stop(); } catch {}
          this.hornOsc1 = null;
        }
        if (this.hornOsc2) {
          try { this.hornOsc2.stop(); } catch {}
          this.hornOsc2 = null;
        }
        this.hornGain = null;
      }, 70);
    } catch {
      this.hornGain = null;
    }
  }

  // --- ULTRASONIC MIST (Independently Controlled Channel) ---
  startMist() {
    if (this.isMuted) return;
    const vol = this.volumes.master * this.volumes.mist;
    if (vol <= 0.001) return; // Silent if volume is 0

    this.ensureContext();
    if (!this.ctx || this.mistGain) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.mistSource = this.ctx.createBufferSource();
    this.mistSource.buffer = noiseBuffer;
    this.mistSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(3200, t);
    bandpass.Q.setValueAtTime(2.5, t);

    this.mistGain = this.ctx.createGain();
    this.mistGain.gain.setValueAtTime(0.001, t);
    this.mistGain.gain.linearRampToValueAtTime(0.07 * vol, t + 0.1);

    this.mistSource.connect(bandpass);
    bandpass.connect(this.mistGain);
    this.mistGain.connect(this.ctx.destination);

    this.mistSource.start(t);
  }

  stopMist() {
    if (!this.mistGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      this.mistGain.gain.linearRampToValueAtTime(0.001, t + 0.1);
      setTimeout(() => {
        if (this.mistSource) {
          try { this.mistSource.stop(); } catch {}
          this.mistSource = null;
        }
        this.mistGain = null;
      }, 110);
    } catch {
      this.mistGain = null;
    }
  }
}

export const soundEngine = new SoundEngine();
