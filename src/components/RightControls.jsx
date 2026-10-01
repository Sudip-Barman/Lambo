import React, { useState, useRef, useEffect } from 'react';
import { soundEngine } from '../services/soundEngine';

export default function RightControls({
  steering = 0,
  isRotating360 = false,
  emergencyStopActive = false,
  isOffline = false,
  headlights = false,
  horn = false,
  mist = false,
  onSteerChange,
  onTrigger360Rotation,
  onToggleHeadlights,
  onHornStart,
  onHornStop,
  onToggleMist
}) {
  const [activeSteerDir, setActiveSteerDir] = useState(null); // 'left' | 'right' | null
  const steerRef = useRef(null);
  const animFrameRef = useRef(null);

  // Smooth continuous steering loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = Math.min(0.08, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      if (emergencyStopActive || isOffline) {
        if (steering !== 0) onSteerChange(0);
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (steerRef.current === 'left') {
        const next = Math.max(-100, steering - 280 * dt);
        onSteerChange(next);
      } else if (steerRef.current === 'right') {
        const next = Math.min(100, steering + 280 * dt);
        onSteerChange(next);
      } else {
        // Smooth return-to-center spring
        if (Math.abs(steering) > 0.5) {
          const spring = -steering * 9 * dt;
          const next = Math.abs(spring) > Math.abs(steering) ? 0 : steering + spring;
          onSteerChange(Math.round(next * 10) / 10);
        } else if (steering !== 0) {
          onSteerChange(0);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [steering, emergencyStopActive, isOffline, onSteerChange]);

  const startSteer = (dir) => {
    if (emergencyStopActive || isOffline) return;
    steerRef.current = dir;
    setActiveSteerDir(dir);
    soundEngine.playBeep(dir === 'left' ? 700 : 800, 0.03, 'triangle');
  };

  const stopSteer = () => {
    steerRef.current = null;
    setActiveSteerDir(null);
  };

  const handleCenterClick = (e) => {
    e.stopPropagation();
    if (emergencyStopActive || isOffline) return;
    if (onTrigger360Rotation) {
      onTrigger360Rotation();
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'clamp(8px, 2vh, 16px) clamp(8px, 1.5vw, 16px)',
        userSelect: 'none',
        opacity: emergencyStopActive ? 0.45 : isOffline ? 0.6 : 1,
        transition: 'opacity 0.2s ease'
      }}
    >
      {/* 1. STEERING CONTROL (Right Hand Primary Control) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          width: '100%'
        }}
      >
        {/* Angle Readout */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: isRotating360
              ? 'var(--accent)'
              : steering === 0
              ? 'var(--text-dim)'
              : 'var(--accent)',
            marginBottom: '8px',
            letterSpacing: '1px'
          }}
        >
          {isRotating360
            ? '360° PIVOT ACTIVE'
            : steering === 0
            ? 'STEER 0°'
            : `${steering < 0 ? '◀ LEFT' : 'RIGHT ▶'} ${Math.abs(Math.round(steering))}%`}
        </div>

        {/* Steering Wheel / Pad */}
        <div
          style={{
            position: 'relative',
            width: 'clamp(120px, 18vw, 150px)',
            height: 'clamp(120px, 18vw, 150px)',
            maxWidth: '150px',
            maxHeight: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Rotating Ring with Steering Angle */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.08)',
              background: 'radial-gradient(circle, #0e121a 0%, #07090d 95%)',
              boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.9)',
              transform: `rotate(${(steering / 100) * 45}deg)`,
              transition: 'transform 0.06s ease-out',
              pointerEvents: 'none'
            }}
          >
            {/* Top Center Neutral Indicator */}
            <div
              style={{
                position: 'absolute',
                top: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '14px',
                height: '4px',
                backgroundColor: isRotating360 ? 'var(--status-amber)' : 'var(--accent)',
                borderRadius: '2px',
                boxShadow: `0 0 6px ${isRotating360 ? 'var(--status-amber)' : 'var(--accent-glow)'}`
              }}
            />
          </div>

          {/* CENTER 360° PIVOT TRIGGER ACTION BUTTON */}
          <button
            type="button"
            onClick={handleCenterClick}
            disabled={emergencyStopActive || isOffline}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: isRotating360 ? 'rgba(0, 216, 246, 0.25)' : '#07090d',
              border: `1.5px solid ${isRotating360 ? 'var(--accent)' : 'var(--border-hairline)'}`,
              boxShadow: isRotating360
                ? '0 0 18px var(--accent), inset 0 0 10px var(--accent-glow)'
                : 'inset 0 0 8px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: emergencyStopActive || isOffline ? 'not-allowed' : 'pointer',
              zIndex: 20,
              padding: 0,
              transition: 'all 0.15s ease'
            }}
            title="360° Center Pivot Rotation (Click to activate 4WD in-place rotation)"
          >
            <div
              style={{
                fontFamily: 'var(--font-brand)',
                fontSize: '9px',
                fontWeight: 900,
                color: isRotating360 ? '#ffffff' : 'var(--accent)',
                letterSpacing: '0.5px',
                lineHeight: 1
              }}
            >
              360°
            </div>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: isRotating360 ? 'var(--accent)' : 'var(--text-dim)',
                marginTop: 2,
                boxShadow: isRotating360 ? '0 0 6px var(--accent)' : 'none'
              }}
            />
          </button>

          {/* Left Steering Trigger */}
          <button
            type="button"
            onMouseDown={() => startSteer('left')}
            onMouseUp={stopSteer}
            onMouseLeave={stopSteer}
            onTouchStart={(e) => { e.preventDefault(); startSteer('left'); }}
            onTouchEnd={stopSteer}
            style={{
              position: 'absolute',
              left: '-10px',
              width: 'clamp(44px, 6vw, 54px)',
              height: 'clamp(68px, 16vh, 84px)',
              borderRadius: '8px 0 0 8px',
              backgroundColor: activeSteerDir === 'left' ? 'var(--accent-dim)' : 'rgba(16, 20, 27, 0.95)',
              border: `1.5px solid ${activeSteerDir === 'left' ? 'var(--accent)' : 'var(--border-hairline)'}`,
              boxShadow: activeSteerDir === 'left' ? '0 0 14px var(--accent-glow)' : 'none',
              color: activeSteerDir === 'left' ? '#ffffff' : 'var(--text-muted)',
              fontFamily: 'var(--font-hud)',
              fontSize: '20px',
              fontWeight: 900,
              cursor: emergencyStopActive || isOffline ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'all 0.1s ease'
            }}
            title="Steer Left [Key: A or ◀]"
          >
            ◀
          </button>

          {/* Right Steering Trigger */}
          <button
            type="button"
            onMouseDown={() => startSteer('right')}
            onMouseUp={stopSteer}
            onMouseLeave={stopSteer}
            onTouchStart={(e) => { e.preventDefault(); startSteer('right'); }}
            onTouchEnd={stopSteer}
            style={{
              position: 'absolute',
              right: '-10px',
              width: 'clamp(44px, 6vw, 54px)',
              height: 'clamp(68px, 16vh, 84px)',
              borderRadius: '0 8px 8px 0',
              backgroundColor: activeSteerDir === 'right' ? 'var(--accent-dim)' : 'rgba(16, 20, 27, 0.95)',
              border: `1.5px solid ${activeSteerDir === 'right' ? 'var(--accent)' : 'var(--border-hairline)'}`,
              boxShadow: activeSteerDir === 'right' ? '0 0 14px var(--accent-glow)' : 'none',
              color: activeSteerDir === 'right' ? '#ffffff' : 'var(--text-muted)',
              fontFamily: 'var(--font-hud)',
              fontSize: '20px',
              fontWeight: 900,
              cursor: emergencyStopActive || isOffline ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'all 0.1s ease'
            }}
            title="Steer Right [Key: D or ▶]"
          >
            ▶
          </button>
        </div>
      </div>

      {/* 2. SECONDARY AUXILIARY CONTROLS (Right Hand Reach: Headlights, Horn, Mist) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(6px, 1.2vw, 12px)',
          width: '100%',
          marginTop: '6px'
        }}
      >
        {/* Headlight */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playToggle(!headlights);
            onToggleHeadlights();
          }}
          disabled={emergencyStopActive}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 4px',
            borderRadius: '4px',
            backgroundColor: headlights ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            border: `1px solid ${headlights ? 'var(--accent)' : 'var(--border-hairline)'}`,
            color: headlights ? 'var(--accent)' : 'var(--text-muted)',
            cursor: emergencyStopActive ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Toggle Headlights [Key: L]"
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: headlights ? 'var(--accent)' : 'var(--text-dim)', marginBottom: 3, boxShadow: headlights ? '0 0 6px var(--accent)' : 'none' }} />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14" />
            <path d="M12 5a7 7 0 0 0 0 14" />
            <path d="M4 8l3 2" />
            <path d="M3 12h4" />
            <path d="M4 16l3-2" />
          </svg>
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '9px', fontWeight: 700, marginTop: '2px', letterSpacing: '0.5px' }}>
            LIGHTS
          </span>
        </button>

        {/* Horn */}
        <button
          type="button"
          onMouseDown={() => {
            onHornStart();
          }}
          onMouseUp={() => {
            onHornStop();
          }}
          onMouseLeave={() => {
            onHornStop();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            onHornStart();
          }}
          onTouchEnd={() => {
            onHornStop();
          }}
          disabled={emergencyStopActive}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 4px',
            borderRadius: '4px',
            backgroundColor: horn ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            border: `1px solid ${horn ? 'var(--accent)' : 'var(--border-hairline)'}`,
            color: horn ? '#ffffff' : 'var(--text-muted)',
            cursor: emergencyStopActive ? 'not-allowed' : 'pointer',
            transform: horn ? 'scale(0.96)' : 'none',
            transition: 'all 0.08s ease'
          }}
          title="Hold Horn [Key: H]"
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: horn ? '#ffffff' : 'var(--text-dim)', marginBottom: 3 }} />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '9px', fontWeight: 700, marginTop: '2px', letterSpacing: '0.5px' }}>
            HORN
          </span>
        </button>

        {/* Mist */}
        <button
          type="button"
          onClick={() => {
            onToggleMist();
          }}
          disabled={emergencyStopActive}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px 4px',
            borderRadius: '4px',
            backgroundColor: mist ? 'var(--accent-dim)' : 'var(--bg-elevated)',
            border: `1px solid ${mist ? 'var(--accent)' : 'var(--border-hairline)'}`,
            color: mist ? 'var(--accent)' : 'var(--text-muted)',
            cursor: emergencyStopActive ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Toggle Ultrasonic Mist Atomizer [Key: M]"
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: mist ? 'var(--accent)' : 'var(--text-dim)', marginBottom: 3, boxShadow: mist ? '0 0 6px var(--accent)' : 'none' }} />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M8 19v1" />
            <path d="M12 19v2" />
          </svg>
          <span style={{ fontFamily: 'var(--font-hud)', fontSize: '9px', fontWeight: 700, marginTop: '2px', letterSpacing: '0.5px' }}>
            MIST
          </span>
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginTop: '8px' }}>
        STEER: [A]/[D] • CENTER [360° PIVOT] • [L]/[H]/[M] AUX
      </div>
    </div>
  );
}
