import React, { useState, useEffect } from 'react';
import BootScreen from './components/BootScreen';
import DriveCockpit from './pages/DriveCockpit';

export default function App() {
  const [appState, setAppState] = useState('BOOT'); // 'BOOT' | 'DRIVE'
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if width is significantly smaller than height and screen is mobile-sized
      const portrait = window.innerHeight > window.innerWidth && window.innerWidth < 640;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 1. STARTUP / BOOT SEQUENCE */}
      {appState === 'BOOT' && (
        <BootScreen onBootComplete={() => setAppState('DRIVE')} />
      )}

      {/* 2. MAIN DRIVING INTERFACE */}
      <DriveCockpit />

      {/* 3. MOBILE PORTRAIT WARNING OVERLAY */}
      {isPortrait && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(6, 8, 12, 0.96)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            color: '#fff',
            fontFamily: 'var(--font-hud)'
          }}
        >
          <div
            style={{
              width: 50,
              height: 80,
              border: '2px solid var(--gold-primary)',
              borderRadius: 8,
              marginBottom: 20,
              animation: 'spinPhone 2s infinite ease-in-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{ width: 12, height: 4, backgroundColor: 'var(--gold-primary)', borderRadius: 2 }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-brand)', fontSize: '20px', color: 'var(--gold-primary)', letterSpacing: '2px', margin: '0 0 10px 0' }}>
            ROTATE DEVICE
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '280px', lineHeight: 1.5 }}>
            LAMBO Digital Cockpit is optimized for landscape horizontal orientation.
          </p>
        </div>
      )}
    </div>
  );
}
