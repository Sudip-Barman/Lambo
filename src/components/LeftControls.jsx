import React, { useState, useRef, useEffect } from 'react';
import { soundEngine } from '../services/soundEngine';

export default function LeftControls({
  throttle = 0,
  speedKmh = 0,
  emergencyStopActive = false,
  isOffline = false,
  onThrottleChange,
  onBrakeStateChange
}) {
  const [activePedal, setActivePedal] = useState(null); // 'throttle' | 'brake' | null
  const pedalRef = useRef(null);
  const animFrameRef = useRef(null);

  // Smooth continuous throttle & brake loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = Math.min(0.08, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      if (emergencyStopActive || isOffline) {
        onBrakeStateChange(false);
        if (throttle !== 0) onThrottleChange(0);
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (pedalRef.current === 'throttle') {
        // Build acceleration smoothly up to 100%
        const next = Math.min(100, Math.max(0, throttle) + 160 * dt);
        onThrottleChange(next);
        onBrakeStateChange(false);
      } else if (pedalRef.current === 'brake') {
        onBrakeStateChange(true);
        if (speedKmh > 1) {
          // Braking forward motion
          const next = Math.max(0, throttle - 320 * dt);
          onThrottleChange(next);
        } else {
          // Stationary -> Reverse gear
          const next = Math.max(-75, throttle - 110 * dt);
          onThrottleChange(next);
        }
      } else {
        // Natural coasting / friction when released
        onBrakeStateChange(false);
        if (throttle > 0) {
          const next = Math.max(0, throttle - 110 * dt);
          onThrottleChange(next);
        } else if (throttle < 0) {
          const next = Math.min(0, throttle + 110 * dt);
          onThrottleChange(next);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [throttle, speedKmh, emergencyStopActive, isOffline, onThrottleChange, onBrakeStateChange]);

  const startPedal = (type) => {
    if (emergencyStopActive || isOffline) return;
    pedalRef.current = type;
    setActivePedal(type);
    soundEngine.playBeep(type === 'throttle' ? 620 : 420, 0.04, 'sawtooth');
  };

  const stopPedal = () => {
    pedalRef.current = null;
    setActivePedal(null);
  };

  const throttlePercent = Math.max(0, Math.min(100, throttle));
  const isReverse = throttle < -5;

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
      {/* Top Output Readout */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: emergencyStopActive
            ? 'var(--status-red)'
            : isReverse
            ? 'var(--status-red)'
            : throttlePercent > 0
            ? 'var(--accent)'
            : 'var(--text-dim)',
          marginBottom: '8px',
          letterSpacing: '1px'
        }}
      >
        {emergencyStopActive
          ? 'MOTORS HALTED'
          : isOffline
          ? 'OFFLINE / NO LINK'
          : isReverse
          ? `REV ${Math.abs(Math.round(throttle))}%`
          : `THROTTLE ${Math.round(throttlePercent)}%`}
      </div>

      {/* Main Pedals (Left Hand Driving Area) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 'clamp(10px, 2vw, 18px)',
          width: '100%',
          maxHeight: 'clamp(145px, 35vh, 195px)'
        }}
      >
        {/* THROTTLE / ACCELERATOR PEDAL */}
        <div
          onMouseDown={() => startPedal('throttle')}
          onMouseUp={stopPedal}
          onMouseLeave={stopPedal}
          onTouchStart={(e) => { e.preventDefault(); startPedal('throttle'); }}
          onTouchEnd={stopPedal}
          style={{
            flex: '1 1 54%',
            maxWidth: 'clamp(72px, 11vw, 96px)',
            height: '100%',
            borderRadius: '6px',
            backgroundColor: activePedal === 'throttle' ? 'var(--accent-dim)' : 'rgba(16, 20, 27, 0.95)',
            border: `1.5px solid ${activePedal === 'throttle' ? 'var(--accent)' : 'var(--border-hairline)'}`,
            boxShadow: activePedal === 'throttle' ? '0 0 18px var(--accent-glow)' : 'none',
            cursor: emergencyStopActive || isOffline ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 6px',
            position: 'relative',
            overflow: 'hidden',
            transform: activePedal === 'throttle' ? 'scale(0.97) translateY(4px)' : 'none',
            transition: 'all 0.08s ease'
          }}
          title="Hold to Accelerate [Key: W or ▲]"
        >
          {/* Dynamic Throttle Fill Gauge */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${throttlePercent}%`,
              backgroundColor: 'rgba(0, 216, 246, 0.25)',
              borderTop: '2px solid var(--accent)',
              transition: 'height 0.05s linear',
              pointerEvents: 'none'
            }}
          />

          {/* Level Scale Ticks */}
          <div style={{ position: 'absolute', left: '6px', top: '12px', bottom: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', zIndex: 1 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>- 100</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>- 50</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>- 0</span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: 'clamp(11px, 2vw, 13px)',
              fontWeight: 900,
              color: activePedal === 'throttle' ? '#ffffff' : 'var(--accent)',
              letterSpacing: '1px',
              zIndex: 2
            }}
          >
            DRIVE
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 'bold',
              color: activePedal === 'throttle' ? '#ffffff' : 'var(--text-muted)',
              zIndex: 2
            }}
          >
            {Math.round(throttlePercent)}%
          </div>

          <div style={{ width: '70%', height: 3, backgroundColor: '#07090d', borderRadius: 1, zIndex: 2 }} />
        </div>

        {/* BRAKE / REVERSE PEDAL */}
        <div
          onMouseDown={() => startPedal('brake')}
          onMouseUp={stopPedal}
          onMouseLeave={stopPedal}
          onTouchStart={(e) => { e.preventDefault(); startPedal('brake'); }}
          onTouchEnd={stopPedal}
          style={{
            flex: '1 1 44%',
            maxWidth: 'clamp(62px, 9vw, 82px)',
            height: 'clamp(100px, 24vh, 132px)',
            borderRadius: '6px',
            backgroundColor: activePedal === 'brake' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(16, 20, 27, 0.95)',
            border: `1.5px solid ${activePedal === 'brake' ? 'var(--status-red)' : 'rgba(244, 63, 94, 0.35)'}`,
            boxShadow: activePedal === 'brake' ? '0 0 16px var(--status-red-glow)' : 'none',
            cursor: emergencyStopActive || isOffline ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 6px',
            transform: activePedal === 'brake' ? 'scale(0.97) translateY(3px)' : 'none',
            transition: 'all 0.08s ease'
          }}
          title="Brake / Reverse [Key: S or ▼]"
        >
          {/* Drilled Holes */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#07090d', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#07090d', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-brand)',
                fontSize: 'clamp(11px, 2vw, 13px)',
                fontWeight: 900,
                color: activePedal === 'brake' ? '#ffffff' : 'var(--status-red)',
                letterSpacing: '1px'
              }}
            >
              BRAKE
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-dim)',
                marginTop: '2px'
              }}
            >
              REVERSE
            </div>
          </div>

          <div style={{ width: '70%', height: 3, backgroundColor: '#07090d', borderRadius: 1 }} />
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)', marginTop: '8px' }}>
        LEFT HAND: [W] DRIVE / [S] BRAKE
      </div>
    </div>
  );
}
