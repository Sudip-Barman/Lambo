import React, { useState, useEffect } from 'react';
import { soundEngine } from '../services/soundEngine';

export default function BootScreen({ onBootComplete }) {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    soundEngine.playStartupSound();

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 45);

    const timer = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => {
        onBootComplete();
      }, 350);
    }, 1300);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onBootComplete]);

  const handleSkip = () => {
    soundEngine.playToggle(true);
    setIsFading(true);
    setTimeout(() => {
      onBootComplete();
    }, 150);
  };

  return (
    <div
      onClick={handleSkip}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#07080a',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s ease',
        opacity: isFading ? 0 : 1,
        transform: isFading ? 'scale(1.03)' : 'scale(1)'
      }}
      className="cockpit-ambient-texture"
    >
      <div style={{ textAlign: 'center', maxWidth: '320px', width: '85%' }}>
        {/* Minimal Shield Line */}
        <div style={{ width: '32px', height: '2px', backgroundColor: 'var(--accent)', margin: '0 auto 16px auto' }} />

        <h1
          style={{
            fontFamily: 'var(--font-brand)',
            fontSize: 'clamp(28px, 6vw, 42px)',
            fontWeight: 900,
            letterSpacing: '10px',
            color: '#ffffff',
            margin: 0,
            textIndent: '10px'
          }}
        >
          LAMBO
        </h1>

        <div
          style={{
            fontFamily: 'var(--font-hud)',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
            letterSpacing: '4px',
            color: 'var(--text-muted)',
            marginTop: '8px',
            textTransform: 'uppercase',
            fontWeight: 600
          }}
        >
          DRIVE SYSTEM
        </div>

        {/* Minimal Progress Line */}
        <div
          style={{
            width: '100%',
            height: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            marginTop: '28px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${progress}%`,
              backgroundColor: 'var(--accent)',
              boxShadow: '0 0 8px var(--accent)',
              transition: 'width 0.05s linear'
            }}
          />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-dim)',
            marginTop: '12px',
            letterSpacing: '2px'
          }}
        >
          INITIALIZING... {progress}%
        </div>
      </div>
    </div>
  );
}
