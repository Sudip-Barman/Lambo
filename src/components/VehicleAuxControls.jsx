import React from 'react';
import { soundEngine } from '../services/soundEngine';

export default function VehicleAuxControls({
  headlights = false,
  horn = false,
  mist = false,
  driveMode = 'SPORT',
  onToggleHeadlights,
  onHornStart,
  onHornStop,
  onToggleMist,
  onCycleDriveMode,
  onEmergencyStop
}) {
  const modeColors = {
    ECO: { color: '#00ff88', glow: 'rgba(0, 255, 136, 0.4)' },
    SPORT: { color: '#ffc400', glow: 'rgba(255, 196, 0, 0.4)' },
    TRACK: { color: '#00f0ff', glow: 'rgba(0, 240, 255, 0.4)' }
  };

  const currentModeStyle = modeColors[driveMode] || modeColors.SPORT;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '10px 18px',
        backgroundColor: 'rgba(12, 16, 24, 0.85)',
        border: '1px solid var(--border-tech)',
        borderRadius: '6px',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(0, 240, 255, 0.05)',
        userSelect: 'none'
      }}
    >
      {/* 1. HEADLIGHT TOGGLE BUTTON */}
      <button
        type="button"
        onClick={() => {
          soundEngine.playToggle(!headlights);
          onToggleHeadlights();
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '68px',
          height: '62px',
          borderRadius: '4px',
          backgroundColor: headlights ? 'rgba(0, 240, 255, 0.22)' : 'rgba(18, 24, 36, 0.8)',
          border: `1.5px solid ${headlights ? 'var(--cyan-primary)' : 'rgba(255, 255, 255, 0.12)'}`,
          boxShadow: headlights ? '0 0 18px var(--cyan-glow)' : 'none',
          color: headlights ? 'var(--cyan-primary)' : '#94a3b8',
          cursor: 'pointer',
          transition: 'all 0.18s ease'
        }}
        title="Toggle Headlights [Key: L]"
      >
        {/* Headlight Icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="M12 5a7 7 0 0 0 0 14" />
          <path d="M4 8l3 2" />
          <path d="M3 12h4" />
          <path d="M4 16l3-2" />
        </svg>
        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '10px', fontWeight: 700, marginTop: '4px', letterSpacing: '1px' }}>
          LIGHTS
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: headlights ? 'var(--cyan-primary)' : '#64748b' }}>
          {headlights ? 'HIGH ON' : 'OFF [L]'}
        </span>
      </button>

      {/* 2. HORN TACTILE BUTTON (Press & Hold) */}
      <button
        type="button"
        onMouseDown={() => {
          soundEngine.startHorn();
          onHornStart();
        }}
        onMouseUp={() => {
          soundEngine.stopHorn();
          onHornStop();
        }}
        onMouseLeave={() => {
          soundEngine.stopHorn();
          onHornStop();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          soundEngine.startHorn();
          onHornStart();
        }}
        onTouchEnd={() => {
          soundEngine.stopHorn();
          onHornStop();
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '68px',
          height: '62px',
          borderRadius: '4px',
          backgroundColor: horn ? 'rgba(255, 196, 0, 0.3)' : 'rgba(18, 24, 36, 0.8)',
          border: `1.5px solid ${horn ? 'var(--gold-primary)' : 'rgba(255, 255, 255, 0.12)'}`,
          boxShadow: horn ? '0 0 22px var(--gold-glow)' : 'none',
          color: horn ? '#ffffff' : 'var(--gold-primary)',
          cursor: 'pointer',
          transform: horn ? 'scale(0.96)' : 'none',
          transition: 'all 0.1s ease'
        }}
        title="Press & Hold Horn [Key: H]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '10px', fontWeight: 700, marginTop: '4px', letterSpacing: '1px' }}>
          HORN
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: horn ? '#fff' : '#64748b' }}>
          {horn ? 'BLAST' : 'HOLD [H]'}
        </span>
      </button>

      {/* 3. ULTRASONIC MIST GENERATOR TOGGLE */}
      <button
        type="button"
        onClick={() => {
          soundEngine.playToggle(!mist);
          if (!mist) soundEngine.startMist();
          else soundEngine.stopMist();
          onToggleMist();
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '68px',
          height: '62px',
          borderRadius: '4px',
          backgroundColor: mist ? 'rgba(0, 240, 255, 0.25)' : 'rgba(18, 24, 36, 0.8)',
          border: `1.5px solid ${mist ? '#00f0ff' : 'rgba(255, 255, 255, 0.12)'}`,
          boxShadow: mist ? '0 0 20px rgba(0, 240, 255, 0.5)' : 'none',
          color: mist ? '#00f0ff' : '#94a3b8',
          cursor: 'pointer',
          transition: 'all 0.18s ease'
        }}
        title="Toggle Ultrasonic Mist Atomizer [Key: M]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
          <path d="M8 19v1" />
          <path d="M12 19v2" />
          <path d="M16 19v1" />
        </svg>
        <span style={{ fontFamily: 'var(--font-hud)', fontSize: '10px', fontWeight: 700, marginTop: '4px', letterSpacing: '1px' }}>
          MIST
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: mist ? 'var(--cyan-primary)' : '#64748b' }}>
          {mist ? 'ACTIVE' : 'OFF [M]'}
        </span>
      </button>

      {/* 4. DRIVE MODE SELECTOR */}
      <button
        type="button"
        onClick={() => {
          soundEngine.playBeep(1100, 0.05);
          onCycleDriveMode();
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '74px',
          height: '62px',
          borderRadius: '4px',
          backgroundColor: 'rgba(18, 24, 36, 0.8)',
          border: `1.5px solid ${currentModeStyle.color}`,
          boxShadow: `0 0 12px ${currentModeStyle.glow}`,
          color: currentModeStyle.color,
          cursor: 'pointer',
          transition: 'all 0.18s ease'
        }}
        title="Cycle Drive Mode (ECO / SPORT / TRACK)"
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#94a3b8', letterSpacing: '1px' }}>
          MODE
        </div>
        <div style={{ fontFamily: 'var(--font-brand)', fontSize: '12px', fontWeight: 900, letterSpacing: '1px', marginTop: '2px' }}>
          {driveMode}
        </div>
        <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
          <div style={{ width: 5, height: 3, backgroundColor: driveMode === 'ECO' ? currentModeStyle.color : '#334155' }} />
          <div style={{ width: 5, height: 3, backgroundColor: driveMode === 'SPORT' ? currentModeStyle.color : '#334155' }} />
          <div style={{ width: 5, height: 3, backgroundColor: driveMode === 'TRACK' ? currentModeStyle.color : '#334155' }} />
        </div>
      </button>

      {/* 5. EMERGENCY KILL SWITCH */}
      <button
        type="button"
        onClick={() => {
          soundEngine.playBeep(350, 0.15, 'sawtooth');
          onEmergencyStop();
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '62px',
          borderRadius: '4px',
          backgroundColor: 'rgba(255, 30, 66, 0.18)',
          border: '1.5px solid var(--red-brake)',
          boxShadow: '0 0 14px var(--red-glow)',
          color: 'var(--red-brake)',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        title="Emergency Brake & Motor Cutoff [Spacebar]"
      >
        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--red-brake)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 6, height: 6, backgroundColor: 'var(--red-brake)', borderRadius: '50%' }} />
        </div>
        <span style={{ fontFamily: 'var(--font-brand)', fontSize: '9px', fontWeight: 900, marginTop: '4px', letterSpacing: '1px' }}>
          E-STOP
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: '#ff8093' }}>
          [SPACE]
        </span>
      </button>
    </div>
  );
}
