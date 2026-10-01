import React, { useState } from 'react';
import { soundEngine } from '../services/soundEngine';

export default function SettingsPanel({
  isOpen,
  onClose,
  initialTab = 'audio',
  connectionState = 'CONNECTED',
  onCycleConnectionState
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'audio');

  // Multi-Channel Audio Mixer Volumes state
  const [volumes, setVolumes] = useState(() => soundEngine.getVolumes());
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);

  // Driving & System Mock Settings
  const [settings, setSettings] = useState({
    steerSensitivity: 85,
    throttleCurve: 'SPORT',
    reverseLock: false,
    headlightAuto: true,
    mistPulseSec: 5,
    deviceName: 'LAMBO_HC05_BT',
    firmwareVersion: 'v2.4-NANO'
  });

  if (!isOpen) return null;

  const handleVolumeChange = (channel, valuePercent) => {
    const val = Number(valuePercent) / 100;
    soundEngine.setVolume(channel, val);
    setVolumes(soundEngine.getVolumes());
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  const updateSetting = (key, val) => {
    soundEngine.playBeep(900, 0.03);
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const tabs = [
    { id: 'audio', label: 'AUDIO MIXER' },
    { id: 'driving', label: 'DRIVING' },
    { id: 'vehicle', label: 'VEHICLE' },
    { id: 'connection', label: 'CONNECT' },
    { id: 'system', label: 'SYSTEM' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 10, 0.95)',
        backdropFilter: 'blur(16px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out',
        padding: 'clamp(12px, 3vh, 24px) clamp(16px, 4vw, 36px)',
        overflow: 'hidden'
      }}
    >
      {/* Top Bar inside Settings */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-hairline)',
          paddingBottom: '12px',
          marginBottom: '16px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '18px',
              fontWeight: 900,
              letterSpacing: '3px',
              color: '#ffffff'
            }}
          >
            SETTINGS
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
            LAMBO COCKPIT & AUDIO MIXER
          </span>
        </div>

        {/* Back / Close Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playToggle(false);
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '4px',
            padding: '6px 14px',
            color: '#ffffff',
            cursor: 'pointer',
            fontFamily: 'var(--font-hud)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hairline)';
            e.currentTarget.style.color = '#ffffff';
          }}
        >
          <span>✕</span>
          <span>CLOSE</span>
        </button>
      </div>

      {/* Main Settings Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: 'clamp(16px, 3vw, 32px)',
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        {/* Left Category Tabs Navigation */}
        <div
          style={{
            width: 'clamp(115px, 20vw, 160px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flexShrink: 0
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine.playBeep(1100, 0.03);
                  setActiveTab(tab.id);
                }}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  backgroundColor: isActive ? 'var(--accent-dim)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-hud)',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          {/* ========================================================
              1. AUDIO MIXER TAB (Independent Channel Sliders)
              ======================================================== */}
          {activeTab === 'audio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Master Mute / Volume Bar */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                    MASTER AUDIO SYSTEM
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                    Controls global sound output across all synthesis channels
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleMute}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    backgroundColor: isMuted ? 'rgba(244, 63, 94, 0.25)' : 'var(--accent-dim)',
                    border: `1.5px solid ${isMuted ? 'var(--status-red)' : 'var(--accent)'}`,
                    color: isMuted ? 'var(--status-red)' : 'var(--accent)',
                    fontFamily: 'var(--font-hud)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '1px'
                  }}
                >
                  {isMuted ? 'MUTED' : 'ACTIVE'}
                </button>
              </div>

              {/* Master Volume Slider */}
              <div style={{ opacity: isMuted ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
                  <span>MASTER VOLUME</span>
                  <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{Math.round(volumes.master * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(volumes.master * 100)}
                  disabled={isMuted}
                  onChange={(e) => handleVolumeChange('master', e.target.value)}
                  style={{ width: '100%', maxWidth: '420px', accentColor: 'var(--accent)', height: 6 }}
                />
              </div>

              {/* Individual Channel Volume Sliders */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '14px',
                  opacity: isMuted ? 0.4 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {/* 1. Engine / Motor Rumble */}
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>
                    <span>MOTOR & ENGINE RPM</span>
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{Math.round(volumes.engine * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(volumes.engine * 100)}
                    disabled={isMuted}
                    onChange={(e) => handleVolumeChange('engine', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--accent)', height: 5 }}
                  />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginTop: 4 }}>
                    Dynamic pitch follows throttle & vehicle velocity
                  </div>
                </div>

                {/* 2. Horn Sound */}
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>HORN BLAST</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{Math.round(volumes.horn * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.startHorn();
                          setTimeout(() => soundEngine.stopHorn(), 200);
                        }}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-hairline)',
                          color: '#fff',
                          borderRadius: 2,
                          padding: '2px 6px',
                          fontSize: '9px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-hud)'
                        }}
                      >
                        TEST
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(volumes.horn * 100)}
                    disabled={isMuted}
                    onChange={(e) => handleVolumeChange('horn', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--accent)', height: 5 }}
                  />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginTop: 4 }}>
                    Dual-tone European sports horn (349Hz + 440Hz)
                  </div>
                </div>

                {/* 3. UI Clicks & Feedback */}
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>UI CLICKS & TACTILE BEEPS</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{Math.round(volumes.ui * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => soundEngine.playBeep(1200, 0.05)}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-hairline)',
                          color: '#fff',
                          borderRadius: 2,
                          padding: '2px 6px',
                          fontSize: '9px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-hud)'
                        }}
                      >
                        TEST
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(volumes.ui * 100)}
                    disabled={isMuted}
                    onChange={(e) => handleVolumeChange('ui', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--accent)', height: 5 }}
                  />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginTop: 4 }}>
                    Button presses, toggles, and mode switches
                  </div>
                </div>

                {/* 4. Startup Boot Sound */}
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>STARTUP BOOT SEQUENCE</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{Math.round(volumes.startup * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => soundEngine.playChime()}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-hairline)',
                          color: '#fff',
                          borderRadius: 2,
                          padding: '2px 6px',
                          fontSize: '9px',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-hud)'
                        }}
                      >
                        TEST
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(volumes.startup * 100)}
                    disabled={isMuted}
                    onChange={(e) => handleVolumeChange('startup', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--accent)', height: 5 }}
                  />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginTop: 4 }}>
                    Turbine spool and power-on boot chime
                  </div>
                </div>

                {/* 5. Ultrasonic Mist (Adjustable, defaulted to 0% silent) */}
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>ULTRASONIC MIST HISS</span>
                    <span style={{ color: volumes.mist > 0 ? 'var(--accent)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      {volumes.mist > 0 ? `${Math.round(volumes.mist * 100)}%` : 'MUTED (0%)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(volumes.mist * 100)}
                    disabled={isMuted}
                    onChange={(e) => handleVolumeChange('mist', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--accent)', height: 5 }}
                  />
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginTop: 4 }}>
                    Keep at 0% for complete silence, or raise if sound is desired
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              2. DRIVING TAB
              ======================================================== */}
          {activeTab === 'driving' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  STEERING SENSITIVITY: {settings.steerSensitivity}%
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: 8 }}>
                  Adjusts servo response curve and thumb damping
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={settings.steerSensitivity}
                  onChange={(e) => updateSetting('steerSensitivity', Number(e.target.value))}
                  style={{ width: '100%', maxWidth: '360px', accentColor: 'var(--accent)' }}
                />
              </div>

              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  THROTTLE PROFILE
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {['ECO', 'SPORT', 'TRACK'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateSetting('throttleCurve', mode)}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '4px',
                        backgroundColor: settings.throttleCurve === mode ? 'var(--accent-dim)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${settings.throttleCurve === mode ? 'var(--accent)' : 'var(--border-hairline)'}`,
                        color: settings.throttleCurve === mode ? 'var(--accent)' : 'var(--text-muted)',
                        fontFamily: 'var(--font-hud)',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  SAFETY REVERSE LOCK
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: 6 }}>
                  Require vehicle full stop before engaging reverse gear
                </div>
                <button
                  onClick={() => updateSetting('reverseLock', !settings.reverseLock)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    backgroundColor: settings.reverseLock ? 'var(--accent-dim)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${settings.reverseLock ? 'var(--accent)' : 'var(--border-hairline)'}`,
                    color: settings.reverseLock ? 'var(--accent)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-hud)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {settings.reverseLock ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              3. VEHICLE TAB
              ======================================================== */}
          {activeTab === 'vehicle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  HEADLIGHT DUAL PROJECTOR MODE
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: 6 }}>
                  High-beam volumetric projection with asphalt reflection
                </div>
                <button
                  onClick={() => updateSetting('headlightAuto', !settings.headlightAuto)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '4px',
                    backgroundColor: settings.headlightAuto ? 'var(--accent-dim)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${settings.headlightAuto ? 'var(--accent)' : 'var(--border-hairline)'}`,
                    color: settings.headlightAuto ? 'var(--accent)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-hud)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {settings.headlightAuto ? 'ACTIVE (LED ON)' : 'OFFLINE'}
                </button>
              </div>

              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  ULTRASONIC ATOMIZER MIST TIMER: {settings.mistPulseSec}s
                </div>
                <input
                  type="range"
                  min="2"
                  max="15"
                  value={settings.mistPulseSec}
                  onChange={(e) => updateSetting('mistPulseSec', Number(e.target.value))}
                  style={{ width: '100%', maxWidth: '360px', accentColor: 'var(--accent)', marginTop: 6 }}
                />
              </div>
            </div>
          )}

          {/* ========================================================
              4. CONNECTION TAB
              ======================================================== */}
          {activeTab === 'connection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  BLUETOOTH HC-05 SIMULATOR
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginTop: 2 }}>
                  DEVICE: <strong style={{ color: '#fff' }}>{settings.deviceName}</strong> [9600 BAUD]
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  CURRENT STATUS: <strong style={{ color: 'var(--status-green)' }}>{connectionState}</strong>
                </span>
                <button
                  onClick={onCycleConnectionState}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-hairline)',
                    color: '#fff',
                    fontFamily: 'var(--font-hud)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  CYCLE STATE
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              5. SYSTEM TAB
              ======================================================== */}
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontFamily: 'var(--font-brand)', fontSize: '14px', color: 'var(--accent)' }}>
                LAMBO DRIVE OS // BUILD 2026.09
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>• MCU: ATmega328P Arduino Nano 16MHz</div>
                <div>• MOTOR DRIVER: TB6612FNG Dual H-Bridge 4WD</div>
                <div>• SENSOR RIG: 3x TCRT5000 IR + HC-SR04 Sonar</div>
                <div>• FIRMWARE: {settings.firmwareVersion}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
