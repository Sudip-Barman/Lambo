import React, { useState, useRef, useEffect } from 'react';
import { soundEngine } from '../services/soundEngine';

export default function DriveControlPanel({
  steering = 0,
  throttle = 0,
  speedKmh = 0,
  headlights = false,
  horn = false,
  mist = false,
  onSteerChange,
  onThrottleChange,
  onBrakeStateChange,
  onToggleHeadlights,
  onHornStart,
  onHornStop,
  onToggleMist
}) {
  const [activeSteerDir, setActiveSteerDir] = useState(null); // 'left' | 'right' | null
  const [activePedal, setActivePedal] = useState(null);       // 'throttle' | 'brake' | null

  const steerRef = useRef(null);
  const pedalRef = useRef(null);
  const animFrameRef = useRef(null);

  // Smooth continuous control loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = Math.min(0.08, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      // 1. Steering Handling
      if (steerRef.current === 'left') {
        const next = Math.max(-100, steering - 280 * dt);
        onSteerChange(next);
      } else if (steerRef.current === 'right') {
        const next = Math.min(100, steering + 280 * dt);
        onSteerChange(next);
      } else {
        // Return to center spring
        if (Math.abs(steering) > 0.5) {
          const spring = -steering * 9 * dt;
          const next = Math.abs(spring) > Math.abs(steering) ? 0 : steering + spring;
          onSteerChange(Math.round(next * 10) / 10);
        } else if (steering !== 0) {
          onSteerChange(0);
        }
      }

      // 2. Throttle & Brake Handling
      if (pedalRef.current === 'throttle') {
        const next = Math.min(100, Math.max(0, throttle) + 160 * dt);
        onThrottleChange(next);
        onBrakeStateChange(false);
      } else if (pedalRef.current === 'brake') {
        onBrakeStateChange(true);
        if (speedKmh > 1) {
          // Braking while moving forward
          const next = Math.max(0, throttle - 320 * dt);
          onThrottleChange(next);
        } else {
          // Stationary -> Reverse (down to -75%)
          const next = Math.max(-75, throttle - 110 * dt);
          onThrottleChange(next);
        }
      } else {
        // Natural coasting when released
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
  }, [steering, throttle, speedKmh, onSteerChange, onThrottleChange, onBrakeStateChange]);

  // Steer actions
  const startSteer = (dir) => {
    steerRef.current = dir;
    setActiveSteerDir(dir);
    soundEngine.playBeep(dir === 'left' ? 700 : 800, 0.03, 'triangle');
  };

  const stopSteer = () => {
    steerRef.current = null;
    setActiveSteerDir(null);
  };

  // Pedal actions
  const startPedal = (type) => {
    pedalRef.current = type;
    setActivePedal(type);
    soundEngine.playBeep(type === 'throttle' ? 620 : 420, 0.04, 'sawtooth');
  };

  const stopPedal = () => {
    pedalRef.current = null;
    setActivePedal(null);
  };

  // Throttle bar visual fill percent
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
        padding: 'clamp(10px, 2.5vh, 16px) clamp(12px, 2.5vw, 20px)',
        position: 'relative'
      }}
    >
      {/* TOP/MAIN ROW: STEERING (LEFT) + ACCEL / BRAKE (RIGHT) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          gap: 'clamp(10px, 2vw, 24px)',
          minHeight: 0
        }}
      >
        {/* ========================================================
            1. STEERING CONTROL (Large, tactile automotive thumb yoke)
            ======================================================== */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none'
          }}
        >
          {/* Angle Readout */}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: steering === 0 ? 'var(--text-dim)' : 'var(--accent)',
              marginBottom: '6px',
              letterSpacing: '1px'
            }}
          >
            {steering === 0
              ? 'STEER 0°'
              : `${steering < 0 ? '◀ LEFT' : 'RIGHT ▶'} ${Math.abs(Math.round(steering))}%`}
          </div>

          {/* Steering Control Body */}
          <div
            style={{
              position: 'relative',
              width: 'clamp(115px, 28vw, 155px)',
              height: 'clamp(115px, 28vw, 155px)',
              maxWidth: '155px',
              maxHeight: '155px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Center Visual Ring with Dynamic Steering Angle */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.08)',
                background: 'radial-gradient(circle, #10131b 0%, #07090d 95%)',
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
                  backgroundColor: 'var(--accent)',
                  borderRadius: '2px',
                  boxShadow: '0 0 6px var(--accent)'
                }}
              />

              {/* Minimal Center Core */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#0a0d13',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent)' }} />
              </div>
            </div>

            {/* Tactile Left Steering Trigger */}
            <button
              type="button"
              onMouseDown={() => startSteer('left')}
              onMouseUp={stopSteer}
              onMouseLeave={stopSteer}
              onTouchStart={(e) => { e.preventDefault(); startSteer('left'); }}
              onTouchEnd={stopSteer}
              style={{
                position: 'absolute',
                left: '-12px',
                width: 'clamp(46px, 11vw, 56px)',
                height: 'clamp(70px, 18vh, 88px)',
                borderRadius: '10px 0 0 10px',
                backgroundColor: activeSteerDir === 'left' ? 'var(--accent-dim)' : 'rgba(18, 22, 32, 0.95)',
                border: `1.5px solid ${activeSteerDir === 'left' ? 'var(--accent)' : 'var(--border-hairline)'}`,
                boxShadow: activeSteerDir === 'left' ? '0 0 14px var(--accent-glow)' : 'none',
                color: activeSteerDir === 'left' ? '#ffffff' : 'var(--text-muted)',
                fontFamily: 'var(--font-hud)',
                fontSize: '22px',
                fontWeight: 900,
                cursor: 'pointer',
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

            {/* Tactile Right Steering Trigger */}
            <button
              type="button"
              onMouseDown={() => startSteer('right')}
              onMouseUp={stopSteer}
              onMouseLeave={stopSteer}
              onTouchStart={(e) => { e.preventDefault(); startSteer('right'); }}
              onTouchEnd={stopSteer}
              style={{
                position: 'absolute',
                right: '-12px',
                width: 'clamp(46px, 11vw, 56px)',
                height: 'clamp(70px, 18vh, 88px)',
                borderRadius: '0 10px 10px 0',
                backgroundColor: activeSteerDir === 'right' ? 'var(--accent-dim)' : 'rgba(18, 22, 32, 0.95)',
                border: `1.5px solid ${activeSteerDir === 'right' ? 'var(--accent)' : 'var(--border-hairline)'}`,
                boxShadow: activeSteerDir === 'right' ? '0 0 14px var(--accent-glow)' : 'none',
                color: activeSteerDir === 'right' ? '#ffffff' : 'var(--text-muted)',
                fontFamily: 'var(--font-hud)',
                fontSize: '22px',
                fontWeight: 900,
                cursor: 'pointer',
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

        {/* ========================================================
            2. THROTTLE & BRAKE CONTROLS (Vertical Racing Pedals)
            ======================================================== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 'clamp(10px, 2vw, 18px)',
            height: 'clamp(130px, 32vh, 175px)'
          }}
        >
          {/* BRAKE / REVERSE CONTROL */}
          <div
            onMouseDown={() => startPedal('brake')}
            onMouseUp={stopPedal}
            onMouseLeave={stopPedal}
            onTouchStart={(e) => { e.preventDefault(); startPedal('brake'); }}
            onTouchEnd={stopPedal}
            style={{
              width: 'clamp(58px, 13vw, 76px)',
              height: 'clamp(95px, 24vh, 125px)',
              borderRadius: '6px',
              backgroundColor: activePedal === 'brake' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(18, 22, 32, 0.9)',
              border: `1.5px solid ${activePedal === 'brake' ? 'var(--status-red)' : 'rgba(239, 68, 68, 0.3)'}`,
              boxShadow: activePedal === 'brake' ? '0 0 16px var(--status-red-glow)' : 'none',
              cursor: 'pointer',
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
            <span
              style={{
                fontFamily: 'var(--font-brand)',
                fontSize: 'clamp(11px, 2.5vw, 13px)',
                fontWeight: 900,
                color: activePedal === 'brake' ? '#fff' : 'var(--status-red)',
                letterSpacing: '1px'
              }}
            >
              BRAKE
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-dim)',
                letterSpacing: '0.5px'
              }}
            >
              REVERSE
            </span>
          </div>

          {/* THROTTLE / GAS CONTROL (Taller with 0-100% scale) */}
          <div
            onMouseDown={() => startPedal('throttle')}
            onMouseUp={stopPedal}
            onMouseLeave={stopPedal}
            onTouchStart={(e) => { e.preventDefault(); startPedal('throttle'); }}
            onTouchEnd={stopPedal}
            style={{
              position: 'relative',
              width: 'clamp(62px, 14vw, 84px)',
              height: '100%',
              borderRadius: '6px',
              backgroundColor: activePedal === 'throttle' ? 'var(--accent-dim)' : 'rgba(18, 22, 32, 0.9)',
              border: `1.5px solid ${activePedal === 'throttle' ? 'var(--accent)' : 'var(--border-hairline)'}`,
              boxShadow: activePedal === 'throttle' ? '0 0 16px var(--accent-glow)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 6px',
              overflow: 'hidden',
              transform: activePedal === 'throttle' ? 'scale(0.97) translateY(4px)' : 'none',
              transition: 'all 0.08s ease'
            }}
            title="Accelerate / Gas [Key: W or ▲]"
          >
            {/* Throttle Fill Gauge */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${throttlePercent}%`,
                backgroundColor: 'rgba(245, 158, 11, 0.25)',
                borderTop: '2px solid var(--accent)',
                transition: 'height 0.05s linear',
                pointerEvents: 'none'
              }}
            />

            {/* Level notches (100%, 50%, 0%) */}
            <div style={{ position: 'absolute', left: '6px', top: '12px', bottom: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>- 100</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>- 50</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)' }}>- 0</span>
            </div>

            <span
              style={{
                fontFamily: 'var(--font-brand)',
                fontSize: 'clamp(11px, 2.5vw, 13px)',
                fontWeight: 900,
                color: activePedal === 'throttle' ? '#fff' : 'var(--accent)',
                letterSpacing: '1px',
                zIndex: 2
              }}
            >
              DRIVE
            </span>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 'bold',
                color: isReverse ? 'var(--status-red)' : throttlePercent > 0 ? 'var(--accent)' : 'var(--text-dim)',
                zIndex: 2
              }}
            >
              {isReverse ? `REV ${Math.abs(Math.round(throttle))}%` : `${Math.round(throttlePercent)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. SECONDARY CONTROLS (Headlights, Horn, Mist)
          Clean minimal icon buttons, easy to tap, zero clutter
          ======================================================== */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(10px, 2.5vw, 16px)',
          marginTop: '6px'
        }}
      >
        {/* HEADLIGHTS */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playToggle(!headlights);
            onToggleHeadlights();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px clamp(10px, 2.5vw, 16px)',
            borderRadius: '4px',
            backgroundColor: headlights ? 'var(--accent-dim)' : 'var(--bg-subtle)',
            border: `1px solid ${headlights ? 'var(--accent)' : 'var(--border-hairline)'}`,
            color: headlights ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-hud)',
            fontSize: '11px',
            letterSpacing: '1px',
            transition: 'all 0.15s ease'
          }}
          title="Toggle Headlights [Key: L]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14" />
            <path d="M12 5a7 7 0 0 0 0 14" />
            <path d="M4 8l3 2" />
            <path d="M3 12h4" />
            <path d="M4 16l3-2" />
          </svg>
          <span>LIGHTS</span>
        </button>

        {/* HORN */}
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
            alignItems: 'center',
            gap: '6px',
            padding: '7px clamp(10px, 2.5vw, 16px)',
            borderRadius: '4px',
            backgroundColor: horn ? 'var(--accent-dim)' : 'var(--bg-subtle)',
            border: `1px solid ${horn ? 'var(--accent)' : 'var(--border-hairline)'}`,
            color: horn ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-hud)',
            fontSize: '11px',
            letterSpacing: '1px',
            transform: horn ? 'scale(0.96)' : 'none',
            transition: 'all 0.08s ease'
          }}
          title="Press & Hold Horn [Key: H]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          <span>HORN</span>
        </button>

        {/* MIST */}
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
            alignItems: 'center',
            gap: '6px',
            padding: '7px clamp(10px, 2.5vw, 16px)',
            borderRadius: '4px',
            backgroundColor: mist ? 'var(--accent-dim)' : 'var(--bg-subtle)',
            border: `1px solid ${mist ? 'var(--accent)' : 'var(--border-hairline)'}`,
            color: mist ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-hud)',
            fontSize: '11px',
            letterSpacing: '1px',
            transition: 'all 0.15s ease'
          }}
          title="Toggle Ultrasonic Mist [Key: M]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M8 19v1" />
            <path d="M12 19v2" />
          </svg>
          <span>MIST</span>
        </button>
      </div>
    </div>
  );
}
