import React, { useState, useRef, useEffect } from 'react';
import { soundEngine } from '../services/soundEngine';

export default function PedalControls({
  throttle = 0,
  speedKmh = 0,
  onThrottleChange,
  onBrakeStateChange
}) {
  const [activePedal, setActivePedal] = useState(null); // 'throttle' | 'brake' | null
  const activePedalRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      if (activePedalRef.current === 'throttle') {
        // Build acceleration smoothly up to 100%
        const next = Math.min(100, Math.max(0, throttle) + 160 * dt);
        onThrottleChange(next);
        onBrakeStateChange(false);
      } else if (activePedalRef.current === 'brake') {
        onBrakeStateChange(true);
        if (speedKmh > 1) {
          // Braking forward motion
          const next = Math.max(0, throttle - 300 * dt);
          onThrottleChange(next);
        } else {
          // Stopped: Engage Reverse (negative throttle down to -75%)
          const next = Math.max(-75, throttle - 100 * dt);
          onThrottleChange(next);
        }
      } else {
        // Natural coasting / friction when pedals released
        onBrakeStateChange(false);
        if (throttle > 0) {
          const next = Math.max(0, throttle - 120 * dt);
          onThrottleChange(next);
        } else if (throttle < 0) {
          const next = Math.min(0, throttle + 120 * dt);
          onThrottleChange(next);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [throttle, speedKmh, onThrottleChange, onBrakeStateChange]);

  const startPedal = (pedal) => {
    activePedalRef.current = pedal;
    setActivePedal(pedal);
    soundEngine.playBeep(pedal === 'throttle' ? 650 : 450, 0.04, 'sawtooth');
  };

  const stopPedal = () => {
    activePedalRef.current = null;
    setActivePedal(null);
  };

  const throttlePercent = Math.max(0, Math.min(100, throttle));
  const isReverse = throttle < -5;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '190px',
        userSelect: 'none'
      }}
    >
      {/* Telemetry Bar (Power Output / RPM Bar) */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '1px',
          color: isReverse ? 'var(--cyan-primary)' : throttlePercent > 0 ? 'var(--gold-primary)' : '#94a3b8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '160px',
          marginBottom: '6px',
          padding: '2px 8px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 3
        }}
      >
        <span>OUTPUT</span>
        <span style={{ fontWeight: 'bold' }}>
          {isReverse
            ? `REV ${Math.abs(Math.round(throttle))}%`
            : `${Math.round(throttlePercent)}% PWM`}
        </span>
      </div>

      {/* Pedals Container (Brake on Left, Throttle on Right) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '14px',
          height: '140px',
          paddingBottom: '4px'
        }}
      >
        {/* BRAKE / REVERSE PEDAL */}
        <div
          onMouseDown={() => startPedal('brake')}
          onMouseUp={stopPedal}
          onMouseLeave={stopPedal}
          onTouchStart={(e) => { e.preventDefault(); startPedal('brake'); }}
          onTouchEnd={stopPedal}
          style={{
            width: '68px',
            height: '105px',
            borderRadius: '6px',
            backgroundColor: activePedal === 'brake' ? 'rgba(255, 30, 66, 0.35)' : 'rgba(20, 24, 34, 0.95)',
            border: `2px solid ${activePedal === 'brake' ? 'var(--red-brake)' : 'rgba(255, 30, 66, 0.45)'}`,
            boxShadow: activePedal === 'brake'
              ? '0 0 25px var(--red-glow), inset 0 0 15px rgba(255, 30, 66, 0.4)'
              : 'inset 0 0 15px rgba(0, 0, 0, 0.7)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 4px',
            transform: activePedal === 'brake' ? 'scale(0.96) translateY(4px)' : 'none',
            transition: 'transform 0.08s ease, background 0.1s ease',
            position: 'relative'
          }}
          title="Hold to Brake / Reverse (Key: S or Down Arrow)"
        >
          {/* Drilled Racing Pedal Holes */}
          <div style={{ display: 'flex', gap: '5px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-brand)',
                fontSize: '12px',
                fontWeight: 900,
                color: activePedal === 'brake' ? '#fff' : 'var(--red-brake)',
                letterSpacing: '1px'
              }}
            >
              BRAKE
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: '#94a3b8',
                marginTop: 2
              }}
            >
              / REVERSE
            </div>
          </div>

          {/* Rubber Grip Ribs */}
          <div style={{ width: '80%', height: 4, backgroundColor: '#11141c', borderRadius: 2 }} />
        </div>

        {/* THROTTLE / ACCELERATOR PEDAL (Taller, Sleeker) */}
        <div
          onMouseDown={() => startPedal('throttle')}
          onMouseUp={stopPedal}
          onMouseLeave={stopPedal}
          onTouchStart={(e) => { e.preventDefault(); startPedal('throttle'); }}
          onTouchEnd={stopPedal}
          style={{
            width: '60px',
            height: '135px',
            borderRadius: '6px',
            backgroundColor: activePedal === 'throttle' ? 'rgba(255, 196, 0, 0.35)' : 'rgba(20, 24, 34, 0.95)',
            border: `2px solid ${activePedal === 'throttle' ? 'var(--gold-primary)' : 'rgba(255, 196, 0, 0.45)'}`,
            boxShadow: activePedal === 'throttle'
              ? '0 0 25px var(--gold-glow), inset 0 0 15px rgba(255, 196, 0, 0.4)'
              : 'inset 0 0 15px rgba(0, 0, 0, 0.7)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 4px',
            transform: activePedal === 'throttle' ? 'scale(0.96) translateY(5px)' : 'none',
            transition: 'transform 0.08s ease, background 0.1s ease',
            position: 'relative'
          }}
          title="Hold to Accelerate (Key: W or Up Arrow)"
        >
          {/* Real-time Throttle Level LED Fill */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${throttlePercent}%`,
              backgroundColor: 'rgba(255, 196, 0, 0.25)',
              borderRadius: '0 0 4px 4px',
              pointerEvents: 'none',
              transition: 'height 0.05s linear'
            }}
          />

          {/* Drilled Holes */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          <div style={{ textAlign: 'center', zIndex: 2 }}>
            <div
              style={{
                fontFamily: 'var(--font-brand)',
                fontSize: '11px',
                fontWeight: 900,
                color: activePedal === 'throttle' ? '#fff' : 'var(--gold-primary)',
                letterSpacing: '1px'
              }}
            >
              DRIVE
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: '#94a3b8',
                marginTop: 2
              }}
            >
              GAS
            </div>
          </div>

          {/* Grip Ribs */}
          <div style={{ width: '75%', height: 4, backgroundColor: '#11141c', borderRadius: 2 }} />
        </div>
      </div>

      {/* Keyboard Shortcut Subtitle */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#64748b', marginTop: '6px' }}>
        KEYS: [W] / [S] OR [▲] / [▼]
      </div>
    </div>
  );
}
