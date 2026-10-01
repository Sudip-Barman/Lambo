import React, { useState, useEffect, useRef, useCallback } from 'react';
import LamboHeader from '../components/LamboHeader';
import LeftControls from '../components/LeftControls';
import CarVisualization from '../components/CarVisualization';
import RightControls from '../components/RightControls';
import SettingsPanel from '../components/SettingsPanel';
import { lamboProtocol } from '../services/lamboProtocol';
import { soundEngine } from '../services/soundEngine';

export default function DriveCockpit() {
  const [telemetry, setTelemetry] = useState(lamboProtocol.state);
  const [connectionState, setConnectionState] = useState(lamboProtocol.connectionState);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('audio');

  // Dynamic Physical Velocity (km/h)
  const [speedKmh, setSpeedKmh] = useState(0);
  const [isBraking, setIsBraking] = useState(false);
  const [gear, setGear] = useState('D');

  const keysPressed = useRef({});

  // Subscribe to protocol
  useEffect(() => {
    const unsubscribe = lamboProtocol.subscribe((updated) => {
      setTelemetry({ ...updated });
      setConnectionState(updated.connectionState);
    });
    return unsubscribe;
  }, []);

  // Initialize motor audio engine
  useEffect(() => {
    soundEngine.startMotor();
  }, []);

  // Update engine sound pitch with speed & throttle
  useEffect(() => {
    soundEngine.updateMotorSpeed(speedKmh, telemetry.throttle < 0);
  }, [speedKmh, telemetry.throttle]);

  // Main Vehicle Physics Loop (60 FPS)
  useEffect(() => {
    let lastTime = performance.now();
    let animId;

    const physicsLoop = (currentTime) => {
      const dt = Math.min(0.08, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      setSpeedKmh((prevSpeed) => {
        const throttle = telemetry.throttle;
        const mode = telemetry.driveMode;

        const topSpeeds = { ECO: 45, SPORT: 80, TRACK: 120 };
        const maxSpeed = topSpeeds[mode] || 80;

        let nextSpeed = prevSpeed;

        if (isBraking) {
          if (nextSpeed > 0) {
            nextSpeed = Math.max(0, nextSpeed - 130 * dt);
          } else if (nextSpeed < 0) {
            nextSpeed = Math.min(0, nextSpeed + 130 * dt);
          }
        } else if (throttle > 0) {
          const target = (throttle / 100) * maxSpeed;
          const accel = (maxSpeed * 0.95) * dt;
          nextSpeed = Math.min(target, nextSpeed + accel);
        } else if (throttle < 0) {
          const target = (throttle / 100) * 32;
          const accel = 40 * dt;
          nextSpeed = Math.max(target, nextSpeed - accel);
        } else {
          // Friction deceleration
          if (Math.abs(nextSpeed) > 0.2) {
            const drag = (nextSpeed > 0 ? -1 : 1) * 24 * dt;
            nextSpeed = Math.abs(drag) > Math.abs(nextSpeed) ? 0 : nextSpeed + drag;
          } else {
            nextSpeed = 0;
          }
        }

        // Automatic Transmission Gear
        if (Math.abs(nextSpeed) < 0.5 && throttle === 0) {
          setGear('P');
        } else if (nextSpeed < -0.5 || throttle < -5) {
          setGear('R');
        } else {
          setGear('D');
        }

        return nextSpeed;
      });

      animId = requestAnimationFrame(physicsLoop);
    };

    animId = requestAnimationFrame(physicsLoop);

    return () => cancelAnimationFrame(animId);
  }, [telemetry.throttle, telemetry.driveMode, isBraking]);

  // Actions
  const handleSteerChange = useCallback((value) => {
    lamboProtocol.handleControl('steering', value);
  }, []);

  const handleThrottleChange = useCallback((value) => {
    lamboProtocol.handleControl('throttle', value);
  }, []);

  const handleBrakeStateChange = useCallback((braking) => {
    setIsBraking(braking);
  }, []);

  const handleToggleHeadlights = useCallback(() => {
    lamboProtocol.handleControl('headlight');
  }, []);

  const handleHornStart = useCallback(() => {
    lamboProtocol.handleControl('horn', true);
  }, []);

  const handleHornStop = useCallback(() => {
    lamboProtocol.handleControl('horn', false);
  }, []);

  const handleToggleMist = useCallback(() => {
    lamboProtocol.handleControl('mist');
  }, []);

  const handleCycleConnectionState = useCallback(() => {
    const states = ['CONNECTED', 'CONNECTING', 'DISCONNECTED', 'ERROR'];
    const next = states[(states.indexOf(connectionState) + 1) % states.length];
    lamboProtocol.setConnectionState(next);
  }, [connectionState]);

  // Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const code = e.code;
      if (keysPressed.current[code]) return;
      keysPressed.current[code] = true;

      if (code === 'KeyW' || code === 'ArrowUp') {
        handleThrottleChange(85);
      }
      if (code === 'KeyS' || code === 'ArrowDown') {
        setIsBraking(true);
        if (speedKmh <= 1) {
          handleThrottleChange(-60);
        }
      }
      if (code === 'KeyA' || code === 'ArrowLeft') {
        handleSteerChange(-85);
      }
      if (code === 'KeyD' || code === 'ArrowRight') {
        handleSteerChange(85);
      }
      if (code === 'KeyL') {
        handleToggleHeadlights();
      }
      if (code === 'KeyH') {
        soundEngine.startHorn();
        handleHornStart();
      }
      if (code === 'KeyM') {
        handleToggleMist();
      }
    };

    const handleKeyUp = (e) => {
      const code = e.code;
      keysPressed.current[code] = false;

      if (code === 'KeyW' || code === 'ArrowUp') {
        handleThrottleChange(0);
      }
      if (code === 'KeyS' || code === 'ArrowDown') {
        setIsBraking(false);
        handleThrottleChange(0);
      }
      if (code === 'KeyA' || code === 'ArrowLeft' || code === 'KeyD' || code === 'ArrowRight') {
        handleSteerChange(0);
      }
      if (code === 'KeyH') {
        soundEngine.stopHorn();
        handleHornStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleThrottleChange, handleSteerChange, handleToggleHeadlights, handleHornStart, handleHornStop, handleToggleMist, speedKmh]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#07090d',
        overflow: 'hidden',
        position: 'relative'
      }}
      className="cockpit-ambient-grid"
    >
      {/* 1. MINIMAL TOP BAR */}
      <LamboHeader
        connectionState={connectionState}
        onCycleConnectionState={handleCycleConnectionState}
        onOpenSettings={(tab) => {
          setSettingsTab(tab || 'driving');
          setIsSettingsOpen(true);
        }}
      />

      {/* 2. THREE-ZONE COCKPIT STAGE: [ LEFT CONTROLS ] | [ CENTER HERO CAR ] | [ RIGHT CONTROLS ] */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          position: 'relative',
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        {/* LEFT ZONE: ACCELERATOR & BRAKE / REVERSE (LEFT HAND) */}
        <section
          aria-label="Left Driving Controls (Accelerator & Brake)"
          style={{
            flex: '0 0 clamp(160px, 27vw, 240px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid var(--border-hairline)',
            position: 'relative',
            zIndex: 10,
            overflow: 'hidden'
          }}
        >
          <LeftControls
            throttle={telemetry.throttle}
            speedKmh={speedKmh}
            onThrottleChange={handleThrottleChange}
            onBrakeStateChange={handleBrakeStateChange}
          />
        </section>

        {/* CENTER ZONE: THE CAR HERO VISUALIZATION */}
        <section
          aria-label="Vehicle Centerpiece"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            minWidth: 0,
            overflow: 'hidden'
          }}
          className="center-car-aura"
        >
          <CarVisualization
            throttle={telemetry.throttle}
            steering={telemetry.steering}
            headlights={telemetry.headlights}
            horn={telemetry.horn}
            mist={telemetry.mist}
            speedKmh={speedKmh}
            isBraking={isBraking}
            gear={gear}
          />
        </section>

        {/* RIGHT ZONE: STEERING & AUXILIARY CONTROLS (RIGHT HAND) */}
        <section
          aria-label="Right Driving Controls (Steering & Aux)"
          style={{
            flex: '0 0 clamp(160px, 27vw, 240px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderLeft: '1px solid var(--border-hairline)',
            position: 'relative',
            zIndex: 10,
            overflow: 'hidden'
          }}
        >
          <RightControls
            steering={telemetry.steering}
            headlights={telemetry.headlights}
            horn={telemetry.horn}
            mist={telemetry.mist}
            onSteerChange={handleSteerChange}
            onToggleHeadlights={handleToggleHeadlights}
            onHornStart={handleHornStart}
            onHornStop={handleHornStop}
            onToggleMist={handleToggleMist}
          />
        </section>
      </main>

      {/* 3. SETTINGS MODAL OVERLAY */}
      <SettingsPanel
        key={`${isSettingsOpen}_${settingsTab}`}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        connectionState={connectionState}
        onCycleConnectionState={handleCycleConnectionState}
      />
    </div>
  );
}
