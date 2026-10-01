import React from 'react';
import { soundEngine } from '../services/soundEngine';

export default function CockpitHeader({
  connectionState = 'CONNECTED',
  onCycleConnectionState,
  speedKmh = 0,
  gear = 'D',
  batteryVoltage = 7.8,
  rssi = -48,
  obstacleDistance = 45,
  isMuted = false,
  onToggleMute,
  onToggleTerminal
}) {
  // Status indicator styling
  const statusStyles = {
    CONNECTED: { color: 'var(--green-ok)', glow: 'var(--green-glow)', label: 'SYSTEM CONNECTED' },
    CONNECTING: { color: 'var(--amber-warn)', glow: 'var(--amber-glow)', label: 'SEARCHING HC-05...' },
    DISCONNECTED: { color: '#94a3b8', glow: 'none', label: 'OFFLINE' },
    ERROR: { color: 'var(--red-brake)', glow: 'var(--red-glow)', label: 'LINK TIMEOUT' }
  };

  const currentStatus = statusStyles[connectionState] || statusStyles.CONNECTED;

  // Battery percentage estimate based on 2S LiPo (6.6V empty, 8.4V max)
  const battPercent = Math.min(100, Math.max(10, Math.round(((batteryVoltage - 6.6) / 1.8) * 100)));

  return (
    <header
      style={{
        width: '100%',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        backgroundColor: 'rgba(8, 11, 18, 0.92)',
        borderBottom: '1px solid var(--border-tech)',
        backdropFilter: 'blur(10px)',
        zIndex: 50,
        position: 'relative'
      }}
    >
      {/* 1. BRANDING BADGE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: 34,
            height: 38,
            filter: 'drop-shadow(0 0 10px rgba(255, 196, 0, 0.4))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg viewBox="0 0 100 110" style={{ width: '100%', height: '100%' }}>
            <polygon points="50,4 96,26 96,82 50,106 4,82 4,26" fill="#141a26" stroke="#ffc400" strokeWidth="3" />
            <path d="M50 28 L58 44 L74 48 L60 62 L64 80 L50 70 L36 80 L40 62 L26 48 L42 44 Z" fill="#ffc400" />
          </svg>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '18px',
              fontWeight: 900,
              letterSpacing: '5px',
              color: '#ffffff',
              lineHeight: 1,
              textShadow: '0 0 15px rgba(255, 196, 0, 0.5)'
            }}
          >
            LAMBO
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '1.5px',
              color: 'var(--cyan-primary)',
              marginTop: '3px'
            }}
          >
            RC-COCKPIT // SIM-CORE v2.4
          </div>
        </div>
      </div>

      {/* 2. CENTER SPEEDOMETER / TACHOMETER HUD */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          padding: '4px 20px',
          backgroundColor: 'rgba(14, 18, 28, 0.75)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 4,
          clipPath: 'polygon(10px 0%, calc(100% - 10px) 0%, 100% 100%, 0% 100%)'
        }}
      >
        {/* Gear Indicator */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#64748b' }}>GEAR</div>
          <div
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '20px',
              fontWeight: 900,
              color: gear === 'R' ? 'var(--red-brake)' : 'var(--gold-primary)',
              lineHeight: 1
            }}
          >
            {gear}
          </div>
        </div>

        {/* Big Digital Speed */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '32px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '1px',
              textShadow: '0 0 20px rgba(0, 240, 255, 0.4)'
            }}
          >
            {Math.abs(Math.round(speedKmh))}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--cyan-primary)',
              fontWeight: 'bold'
            }}
          >
            KM/H
          </span>
        </div>

        {/* Tachometer RPM Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '70px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#64748b' }}>
            <span>RPM</span>
            <span style={{ color: 'var(--gold-primary)' }}>{Math.round(Math.abs(speedKmh) * 110 + 900)}</span>
          </div>
          <div style={{ display: 'flex', gap: '2px', height: '8px' }}>
            {[...Array(12)].map((_, i) => {
              const active = (Math.abs(speedKmh) / 90) * 12 > i;
              const isRedline = i >= 10;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    backgroundColor: active
                      ? isRedline
                        ? 'var(--red-brake)'
                        : 'var(--gold-primary)'
                      : '#1e2433',
                    borderRadius: 1
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. RIGHT TELEMETRY & HARDWARE INDICATORS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Sonar Sensor Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: obstacleDistance < 25 ? 'var(--red-brake)' : '#94a3b8'
          }}
          title="HC-SR04 Front Collision Sonar"
        >
          <span style={{ color: 'var(--cyan-primary)' }}>SONAR:</span>
          <span style={{ fontWeight: 'bold' }}>{obstacleDistance}cm</span>
        </div>

        {/* Bluetooth RSSI Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: '#94a3b8'
          }}
          title="HC-05 Bluetooth Signal Strength"
        >
          <span style={{ color: 'var(--cyan-primary)' }}>BT:</span>
          <span>{rssi}dBm</span>
        </div>

        {/* Battery Telemetry */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: battPercent < 20 ? 'var(--red-brake)' : '#cbd5e1'
          }}
          title={`LiPo 2S: ${batteryVoltage}V (${battPercent}%)`}
        >
          <div
            style={{
              width: '24px',
              height: '12px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: 2,
              padding: 1,
              position: 'relative',
              display: 'flex'
            }}
          >
            <div
              style={{
                width: `${battPercent}%`,
                height: '100%',
                backgroundColor: battPercent < 25 ? 'var(--red-brake)' : 'var(--green-ok)',
                borderRadius: 1
              }}
            />
            <div style={{ position: 'absolute', right: -3, top: 3, width: 2, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '0 1px 1px 0' }} />
          </div>
          <span>{battPercent}%</span>
        </div>

        {/* Connection Status Indicator Badge */}
        <div
          onClick={() => {
            soundEngine.playBeep(900, 0.04);
            onCycleConnectionState();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            backgroundColor: 'rgba(16, 22, 34, 0.9)',
            border: `1px solid ${currentStatus.color}`,
            borderRadius: 3,
            boxShadow: `0 0 10px ${currentStatus.glow}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Click to cycle simulated HC-05 connection states"
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: currentStatus.color,
              boxShadow: `0 0 8px ${currentStatus.color}`
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '10px',
              fontWeight: 700,
              color: currentStatus.color,
              letterSpacing: '1px'
            }}
          >
            {currentStatus.label}
          </span>
        </div>

        {/* Audio Mute/Unmute Button */}
        <button
          type="button"
          onClick={onToggleMute}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            borderRadius: 3,
            color: isMuted ? '#64748b' : 'var(--gold-primary)',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isMuted ? 'Unmute Audio Sim' : 'Mute Audio Sim'}
        >
          {isMuted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>

        {/* Hardware Packet Inspector Console Toggle */}
        <button
          type="button"
          onClick={onToggleTerminal}
          style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid var(--border-tech)',
            borderRadius: 3,
            color: 'var(--cyan-primary)',
            padding: '5px 9px',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '1px'
          }}
          title="Toggle Hardware Telemetry & BT Packet Stream"
        >
          [CONSOLE]
        </button>
      </div>
    </header>
  );
}
