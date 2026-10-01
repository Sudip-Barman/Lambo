import React from 'react';
import { soundEngine } from '../services/soundEngine';

export default function LamboHeader({
  connectionState = 'DISCONNECTED',
  connectionMetrics = {},
  emergencyStopActive = false,
  batteryPercent = 82,
  batteryVoltage = 7.84,
  onOpenSettings,
  onEmergencyStop,
  onResetEmergencyStop
}) {
  const statusColors = {
    CONNECTED: 'var(--status-green)',
    CONNECTING: 'var(--accent)',
    RECONNECTING: 'var(--status-amber)',
    DISCONNECTED: 'var(--text-dim)',
    ERROR: 'var(--status-red)'
  };

  const statusColor = statusColors[connectionState] || 'var(--text-dim)';
  const isPulsing = connectionState === 'CONNECTING' || connectionState === 'RECONNECTING';
  const deviceName = connectionMetrics.deviceName || 'HC-05_LAMBO';
  const latency = connectionMetrics.latencyMs;

  return (
    <header
      style={{
        width: '100%',
        height: 'clamp(40px, 8vh, 48px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(12px, 2.5vw, 24px)',
        borderBottom: '1px solid var(--border-hairline)',
        backgroundColor: 'rgba(7, 9, 13, 0.96)',
        backdropFilter: 'blur(10px)',
        zIndex: 50,
        flexShrink: 0
      }}
    >
      {/* 1. BRANDING & TELEMETRY HUD (Left) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.8vw, 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: 'clamp(14px, 2.2vw, 17px)',
              fontWeight: 900,
              letterSpacing: '4px',
              color: '#ffffff'
            }}
          >
            LAMBO
          </span>
          <span
            style={{
              fontFamily: 'var(--font-hud)',
              fontSize: '10px',
              letterSpacing: '2px',
              color: 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            DRIVE SYSTEM
          </span>
        </div>

        {/* Battery Telemetry Readout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-hairline)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: batteryPercent <= 20 ? 'var(--status-red)' : 'var(--text-muted)'
          }}
          title={`2S LiPo Battery: ${batteryVoltage}V (${batteryPercent}%)`}
        >
          {/* Battery Icon */}
          <div
            style={{
              width: 14,
              height: 8,
              border: `1px solid ${batteryPercent <= 20 ? 'var(--status-red)' : 'var(--text-muted)'}`,
              borderRadius: 2,
              padding: 1,
              display: 'flex',
              alignItems: 'center',
              position: 'relative'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.max(10, Math.min(100, batteryPercent))}%`,
                backgroundColor: batteryPercent <= 20 ? 'var(--status-red)' : 'var(--status-green)',
                borderRadius: 1
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: -3,
                top: 2,
                width: 2,
                height: 4,
                backgroundColor: batteryPercent <= 20 ? 'var(--status-red)' : 'var(--text-muted)',
                borderRadius: '0 1px 1px 0'
              }}
            />
          </div>
          <span>{batteryPercent}%</span>
          <span style={{ color: 'var(--text-dim)', fontSize: '9px' }}>{batteryVoltage}V</span>
        </div>
      </div>

      {/* 2. CENTER: EMERGENCY STOP BUTTON / SAFETY INDICATOR */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => {
            if (emergencyStopActive) {
              onResetEmergencyStop();
            } else {
              onEmergencyStop();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '4px',
            backgroundColor: emergencyStopActive ? 'rgba(244, 63, 94, 0.3)' : 'rgba(244, 63, 94, 0.08)',
            border: `1.5px solid ${emergencyStopActive ? 'var(--status-red)' : 'rgba(244, 63, 94, 0.4)'}`,
            boxShadow: emergencyStopActive ? '0 0 16px var(--status-red-glow)' : 'none',
            color: '#ffffff',
            cursor: 'pointer',
            fontFamily: 'var(--font-hud)',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1.5px',
            transition: 'all 0.15s ease'
          }}
          title={emergencyStopActive ? 'Emergency Shutdown Active (Click to Re-arm)' : 'Immediate Emergency Stop [EMG_STOP]'}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: 'var(--status-red)',
              boxShadow: '0 0 6px var(--status-red)'
            }}
          />
          <span>{emergencyStopActive ? 'EMG HALTED' : 'EMG STOP'}</span>
        </button>
      </div>

      {/* 3. CONNECTION & SETTINGS (Right) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1.8vw, 16px)' }}>
        {/* Compact Connection Status Indicator (Opens Connection Settings on click) */}
        <div
          onClick={() => {
            soundEngine.playBeep(900, 0.04);
            onOpenSettings('connection');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${connectionState === 'ERROR' ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-hairline)'}`,
            transition: 'border-color 0.15s'
          }}
          title="Connection System Status (Click to open Connection Settings)"
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              boxShadow: `0 0 8px ${statusColor}`,
              animation: isPulsing ? 'pulseGlow 1s infinite alternate' : 'none'
            }}
          />

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '1px',
              color: connectionState === 'CONNECTED' ? 'var(--status-green)' : connectionState === 'ERROR' ? 'var(--status-red)' : 'var(--text-muted)',
              fontWeight: 600
            }}
          >
            {connectionState}
          </span>

          {/* Module name tag when connected */}
          {connectionState === 'CONNECTED' && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--accent)',
                backgroundColor: 'rgba(0, 216, 246, 0.08)',
                padding: '1px 4px',
                borderRadius: '2px',
                letterSpacing: '0.5px'
              }}
            >
              {deviceName}
              {latency ? ` • ${latency}ms` : ''}
            </span>
          )}
        </div>

        {/* Quick Audio Mixer Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playBeep(1100, 0.04);
            onOpenSettings('audio');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: '1px solid var(--border-hairline)',
            borderRadius: '4px',
            padding: '5px 10px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-hud)',
            fontSize: '11px',
            letterSpacing: '1.5px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-hairline)';
          }}
          title="Open Multi-Channel Audio Mixer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
          <span>AUDIO</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playToggle(true);
            onOpenSettings('driving');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: '1px solid var(--border-hairline)',
            borderRadius: '4px',
            padding: '5px 10px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-hud)',
            fontSize: '11px',
            letterSpacing: '1.5px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-hairline)';
          }}
          title="Vehicle & Cockpit Settings"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>SETTINGS</span>
        </button>
      </div>
    </header>
  );
}
