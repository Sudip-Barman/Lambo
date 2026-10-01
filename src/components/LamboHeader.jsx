import React from 'react';
import { soundEngine } from '../services/soundEngine';

export default function LamboHeader({
  connectionState = 'CONNECTED',
  onCycleConnectionState,
  onOpenSettings
}) {
  const statusColors = {
    CONNECTED: 'var(--status-green)',
    CONNECTING: 'var(--accent)',
    DISCONNECTED: 'var(--text-dim)',
    ERROR: 'var(--status-red)'
  };

  const statusColor = statusColors[connectionState] || 'var(--status-green)';

  return (
    <header
      style={{
        width: '100%',
        height: 'clamp(38px, 8vh, 46px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 clamp(14px, 2.5vw, 24px)',
        borderBottom: '1px solid var(--border-hairline)',
        backgroundColor: 'rgba(7, 9, 13, 0.96)',
        backdropFilter: 'blur(10px)',
        zIndex: 50,
        flexShrink: 0
      }}
    >
      {/* 1. BRANDING (Left) */}
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

      {/* 2. CONNECTION & SETTINGS (Right) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2.5vw, 20px)' }}>
        {/* Connection status indicator */}
        <div
          onClick={() => {
            soundEngine.playBeep(900, 0.04);
            onCycleConnectionState();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-hairline)'
          }}
          title="Connection Status (Click to test)"
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusColor,
              boxShadow: `0 0 8px ${statusColor}`
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '1px',
              color: 'var(--text-muted)'
            }}
          >
            {connectionState}
          </span>
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
