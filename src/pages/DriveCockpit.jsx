import React, { useState, useEffect, useRef, useCallback } from 'react';
import LamboHeader from '../components/LamboHeader';
import LeftControls from '../components/LeftControls';
import CarVisualization from '../components/CarVisualization';
import RightControls from '../components/RightControls';
import SettingsPanel from '../components/SettingsPanel';
import { vehicleEngine } from '../services/vehicleEngine';
import { soundEngine } from '../services/soundEngine';

export default function DriveCockpit() {
  const [vehicleState, setVehicleState] = useState(() => vehicleEngine.state);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('connection');

  // Dynamic Physical Velocity (km/h) & Gear
  const [speedKmh, setSpeedKmh] = useState(0);
  const [isBraking, setIsBraking] = useState(false);
  const [gear, setGear] = useState('P');

  const keysPressed = useRef({});

  // Subscribe to Vehicle Control Engine
  useEffect(() => {
    const unsubscribe = vehicleEngine.subscribe((updated) => {
      setVehicleState({ ...updated });
    });
    return unsubscribe;
  }, []);

  // Initialize motor audio engine on mount
  useEffect(() => {
    soundEngine.startMotor();
  }, []);

  // Update engine sound pitch with speed & throttle
  useEffect(() => {
    soundEngine.updateMotorSpeed(speedKmh, vehicleState.throttle < 0);
  }, [speedKmh, vehicleState.throttle]);

  // Main Vehicle Physics Loop (60 FPS)
  useEffect(() => {
    let lastTime = performance.now();
    let animId;

    const physicsLoop = (currentTime) => {
      const dt = Math.min(0.08, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      setSpeedKmh((prevSpeed) => {
        // If emergency stop is engaged or in 360 pivot, speed drops to 0 rapidly
        if (vehicleState.emergencyStopActive || vehicleState.isRotating360) {
          const stopped = Math.abs(prevSpeed) < 1 ? 0 : prevSpeed * 0.85;
          setGear(stopped === 0 ? 'P' : prevSpeed < 0 ? 'R' : 'D');
          vehicleEngine.updatePhysicsState(stopped, stopped === 0 ? 'P' : prevSpeed < 0 ? 'R' : 'D');
          return stopped;
        }

        const throttle = vehicleState.throttle;
        const mode = vehicleState.driveMode;

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
        let nextGear = 'D';
        if (Math.abs(nextSpeed) < 0.5 && throttle === 0) {
          nextGear = 'P';
        } else if (nextSpeed < -0.5 || throttle < -5) {
          nextGear = 'R';
        } else {
          nextGear = 'D';
        }
        setGear(nextGear);
        vehicleEngine.updatePhysicsState(nextSpeed, nextGear);

        return nextSpeed;
      });

      animId = requestAnimationFrame(physicsLoop);
    };

    animId = requestAnimationFrame(physicsLoop);

    return () => cancelAnimationFrame(animId);
  }, [vehicleState.throttle, vehicleState.driveMode, vehicleState.emergencyStopActive, vehicleState.isRotating360, isBraking]);

  // Action Dispatchers
  const handleSteerChange = useCallback((value) => {
    vehicleEngine.setSteering(value);
  }, []);

  const handleThrottleChange = useCallback((value) => {
    vehicleEngine.setThrottle(value);
  }, []);

  const handleBrakeStateChange = useCallback((braking) => {
    setIsBraking(braking);
    vehicleEngine.setBraking(braking);
  }, []);

  const handleTrigger360Rotation = useCallback(() => {
    vehicleEngine.trigger360Rotation();
  }, []);

  const handleToggleHeadlights = useCallback(() => {
    vehicleEngine.toggleHeadlights();
  }, []);

  const handleHornStart = useCallback(() => {
    vehicleEngine.startHorn();
  }, []);

  const handleHornStop = useCallback(() => {
    vehicleEngine.stopHorn();
  }, []);

  const handleToggleMist = useCallback(() => {
    vehicleEngine.toggleMist();
  }, []);

  const handleEmergencyStop = useCallback(() => {
    vehicleEngine.emergencyStop();
  }, []);

  const handleResetEmergencyStop = useCallback(() => {
    vehicleEngine.resetEmergencyStop();
  }, []);

  // Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in settings input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      const code = e.code;
      if (keysPressed.current[code]) return;
      keysPressed.current[code] = true;

      // Spacebar: Emergency Stop
      if (code === 'Space') {
        e.preventDefault();
        if (vehicleState.emergencyStopActive) {
          handleResetEmergencyStop();
        } else {
          handleEmergencyStop();
        }
        return;
      }

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
      if (code === 'KeyR') {
        handleTrigger360Rotation();
      }
      if (code === 'KeyL') {
        handleToggleHeadlights();
      }
      if (code === 'KeyH') {
        handleHornStart();
      }
      if (code === 'KeyM') {
        handleToggleMist();
      }
      if (code === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else {
          handleEmergencyStop();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

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
        handleHornStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    handleThrottleChange,
    handleSteerChange,
    handleTrigger360Rotation,
    handleToggleHeadlights,
    handleHornStart,
    handleHornStop,
    handleToggleMist,
    handleEmergencyStop,
    handleResetEmergencyStop,
    speedKmh,
    isSettingsOpen,
    vehicleState.emergencyStopActive
  ]);

  const isOffline = vehicleState.connectionState === 'DISCONNECTED' || vehicleState.connectionState === 'ERROR';

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
      {/* 1. TOP HEADER & HUD */}
      <LamboHeader
        connectionState={vehicleState.connectionState}
        connectionMetrics={vehicleState.connectionMetrics}
        emergencyStopActive={vehicleState.emergencyStopActive}
        batteryPercent={vehicleState.telemetry.batteryPercent}
        batteryVoltage={vehicleState.telemetry.batteryVoltage}
        onOpenSettings={(tab) => {
          setSettingsTab(tab || 'connection');
          setIsSettingsOpen(true);
        }}
        onEmergencyStop={handleEmergencyStop}
        onResetEmergencyStop={handleResetEmergencyStop}
      />

      {/* EMERGENCY STOP SAFETY BANNER */}
      {vehicleState.emergencyStopActive && (
        <div
          style={{
            position: 'absolute',
            top: 'clamp(46px, 9vh, 54px)',
            left: 0,
            right: 0,
            zIndex: 45,
            backgroundColor: 'rgba(244, 63, 94, 0.94)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '6px 16px',
            boxShadow: '0 4px 20px rgba(244, 63, 94, 0.4)'
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '2px',
              color: '#ffffff'
            }}
          >
            ⚠ EMERGENCY SHUTDOWN ACTIVE — MOTORS HALTED
          </span>
          <button
            type="button"
            onClick={handleResetEmergencyStop}
            style={{
              backgroundColor: '#ffffff',
              border: 'none',
              borderRadius: '3px',
              padding: '4px 12px',
              color: '#07090d',
              fontFamily: 'var(--font-hud)',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '1px',
              cursor: 'pointer'
            }}
          >
            RESET & RE-ARM
          </button>
        </div>
      )}

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
        {/* LEFT ZONE: ACCELERATOR & BRAKE / REVERSE */}
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
            throttle={vehicleState.throttle}
            speedKmh={speedKmh}
            emergencyStopActive={vehicleState.emergencyStopActive}
            isOffline={isOffline}
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
            throttle={vehicleState.throttle}
            steering={vehicleState.steering}
            headlights={vehicleState.headlights}
            horn={vehicleState.horn}
            mist={vehicleState.mist}
            speedKmh={speedKmh}
            isBraking={isBraking}
            gear={gear}
            isRotating360={vehicleState.isRotating360}
            rotationAngle={vehicleState.rotationAngle}
            sunroof={vehicleState.sunroof}
            telemetry={vehicleState.telemetry}
            emergencyStopActive={vehicleState.emergencyStopActive}
          />
        </section>

        {/* RIGHT ZONE: STEERING (WITH 360 PIVOT CENTER TRIGGER) & AUXILIARY CONTROLS */}
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
            steering={vehicleState.steering}
            isRotating360={vehicleState.isRotating360}
            emergencyStopActive={vehicleState.emergencyStopActive}
            isOffline={isOffline}
            headlights={vehicleState.headlights}
            horn={vehicleState.horn}
            mist={vehicleState.mist}
            onSteerChange={handleSteerChange}
            onTrigger360Rotation={handleTrigger360Rotation}
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
      />
    </div>
  );
}
