import React, { useState, useRef, useEffect } from 'react';
import { soundEngine } from '../services/soundEngine';

export default function SteeringControl({ steering = 0, onSteerChange }) {
  const [activeSteer, setActiveSteer] = useState(null); // 'left' | 'right' | null
  const activeSteerRef = useRef(null);
  const animFrameRef = useRef(null);

  // Smooth spring return to center when released
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      if (activeSteerRef.current === 'left') {
        const next = Math.max(-100, steering - 320 * dt);
        onSteerChange(next);
      } else if (activeSteerRef.current === 'right') {
        const next = Math.min(100, steering + 320 * dt);
        onSteerChange(next);
      } else {
        // Return to center spring damping
        if (Math.abs(steering) > 0.5) {
          const spring = -steering * 8 * dt;
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
  }, [steering, onSteerChange]);

  const startSteer = (dir) => {
    activeSteerRef.current = dir;
    setActiveSteer(dir);
    soundEngine.playBeep(dir === 'left' ? 750 : 850, 0.04, 'triangle');
  };

  const stopSteer = () => {
    activeSteerRef.current = null;
    setActiveSteer(null);
  };

  // Convert steering (-100 to +100) to visual wheel rotation angle (-45 to +45 deg)
  const rotationDeg = (steering / 100) * 45;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '180px',
        userSelect: 'none',
        position: 'relative'
      }}
    >
      {/* Steering Angle Gauge Display */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '1px',
          color: steering === 0 ? '#94a3b8' : 'var(--gold-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '140px',
          marginBottom: '6px',
          padding: '2px 8px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 3
        }}
      >
        <span style={{ color: steering < -5 ? 'var(--cyan-primary)' : '#64748b' }}>◀ L</span>
        <span style={{ fontWeight: 'bold' }}>
          {steering === 0 ? 'CENTER 0°' : `${Math.abs(Math.round(steering))}% ${steering < 0 ? 'L' : 'R'}`}
        </span>
        <span style={{ color: steering > 5 ? 'var(--cyan-primary)' : '#64748b' }}>R ▶</span>
      </div>

      {/* Main Interactive GT Wheel / Pad */}
      <div
        style={{
          position: 'relative',
          width: '140px',
          height: '140px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Outer Circular Rim with Chamfered Tech Border */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(255, 196, 0, 0.25)',
            boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.8), 0 0 10px rgba(0, 0, 0, 0.5)',
            background: 'radial-gradient(circle, rgba(16, 22, 34, 0.9) 0%, rgba(8, 11, 18, 0.95) 100%)',
            transition: 'transform 0.06s ease-out',
            transform: `rotate(${rotationDeg}deg)`
          }}
        >
          {/* Wheel Grip Textures (Top and Sides) */}
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '16px',
              height: '6px',
              backgroundColor: 'var(--gold-primary)',
              borderRadius: '2px',
              boxShadow: '0 0 8px var(--gold-glow)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '40px',
              left: '4px',
              width: '8px',
              height: '60px',
              backgroundColor: '#1e2636',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '40px',
              right: '4px',
              width: '8px',
              height: '60px',
              backgroundColor: '#1e2636',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />

          {/* Center Hub Yoke Spokes */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '12px',
              right: '12px',
              height: '14px',
              transform: 'translateY(-50%)',
              backgroundColor: '#141a26',
              borderTop: '1px solid rgba(255, 196, 0, 0.3)',
              borderBottom: '1px solid rgba(255, 196, 0, 0.3)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              width: '14px',
              height: '56px',
              transform: 'translateX(-50%)',
              backgroundColor: '#141a26',
              borderLeft: '1px solid rgba(255, 196, 0, 0.3)',
              borderRight: '1px solid rgba(255, 196, 0, 0.3)'
            }}
          />

          {/* Center Emblem */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#0a0d14',
              border: '1.5px solid var(--gold-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(255, 196, 0, 0.3)'
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-brand)',
                fontSize: '9px',
                fontWeight: 900,
                color: 'var(--gold-primary)',
                letterSpacing: '1px'
              }}
            >
              LM
            </span>
          </div>
        </div>

        {/* Tactile Left Steering Trigger Button */}
        <button
          type="button"
          onMouseDown={() => startSteer('left')}
          onMouseUp={stopSteer}
          onMouseLeave={stopSteer}
          onTouchStart={(e) => { e.preventDefault(); startSteer('left'); }}
          onTouchEnd={stopSteer}
          style={{
            position: 'absolute',
            left: '-14px',
            width: '44px',
            height: '68px',
            borderRadius: '10px 0 0 10px',
            backgroundColor: activeSteer === 'left' ? 'rgba(0, 240, 255, 0.3)' : 'rgba(16, 22, 34, 0.95)',
            border: `1.5px solid ${activeSteer === 'left' ? 'var(--cyan-primary)' : 'rgba(0, 240, 255, 0.35)'}`,
            boxShadow: activeSteer === 'left' ? '0 0 18px var(--cyan-glow)' : 'none',
            color: activeSteer === 'left' ? '#ffffff' : 'var(--cyan-primary)',
            fontFamily: 'var(--font-hud)',
            fontSize: '20px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.1s ease'
          }}
          title="Hold to Steer Left (Key: A or Left Arrow)"
        >
          ◀
        </button>

        {/* Tactile Right Steering Trigger Button */}
        <button
          type="button"
          onMouseDown={() => startSteer('right')}
          onMouseUp={stopSteer}
          onMouseLeave={stopSteer}
          onTouchStart={(e) => { e.preventDefault(); startSteer('right'); }}
          onTouchEnd={stopSteer}
          style={{
            position: 'absolute',
            right: '-14px',
            width: '44px',
            height: '68px',
            borderRadius: '0 10px 10px 0',
            backgroundColor: activeSteer === 'right' ? 'rgba(0, 240, 255, 0.3)' : 'rgba(16, 22, 34, 0.95)',
            border: `1.5px solid ${activeSteer === 'right' ? 'var(--cyan-primary)' : 'rgba(0, 240, 255, 0.35)'}`,
            boxShadow: activeSteer === 'right' ? '0 0 18px var(--cyan-glow)' : 'none',
            color: activeSteer === 'right' ? '#ffffff' : 'var(--cyan-primary)',
            fontFamily: 'var(--font-hud)',
            fontSize: '20px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.1s ease'
          }}
          title="Hold to Steer Right (Key: D or Right Arrow)"
        >
          ▶
        </button>
      </div>

      {/* Keyboard Shortcut Subtitle */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#64748b', marginTop: '6px' }}>
        KEYS: [A] / [D] OR [◀] / [▶]
      </div>
    </div>
  );
}
