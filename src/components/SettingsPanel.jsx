import React, { useState, useEffect } from 'react';
import { soundEngine } from '../services/soundEngine';
import { vehicleEngine } from '../services/vehicleEngine';
import { connectionManager } from '../communication/connectionManager';
import { TRANSPORT_TYPE } from '../communication/connectionState';
import { HARDWARE_SPEC } from '../communication/lamboProtocol';

export default function SettingsPanel({
  isOpen,
  onClose,
  initialTab = 'connection'
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'connection');
  const [vehicleState, setVehicleState] = useState(() => vehicleEngine.state);
  const [packetLogs, setPacketLogs] = useState(() => connectionManager.getPacketLogs());
  const [deviceNameInput, setDeviceNameInput] = useState(connectionManager.deviceName);

  // Volumes
  const [volumes, setVolumes] = useState(() => soundEngine.getVolumes());
  const [isMuted, setIsMuted] = useState(soundEngine.isMuted);

  // Control sensitivities
  const [controlSettings, setControlSettings] = useState({
    steerSensitivity: 85,
    throttleSensitivity: 90,
    brakeSensitivity: 95,
    steerTrim: 0,
    sonarStopThreshold: 15,
    mistPulseSec: 5
  });

  // Subscribe to VehicleEngine state and ConnectionManager logs
  useEffect(() => {
    if (!isOpen) return;

    const unsubVehicle = vehicleEngine.subscribe((updated) => {
      setVehicleState({ ...updated });
    });

    const unsubPacket = connectionManager.onPacket(() => {
      setPacketLogs([...connectionManager.getPacketLogs()]);
    });

    const interval = setInterval(() => {
      setPacketLogs([...connectionManager.getPacketLogs()]);
    }, 600);

    return () => {
      unsubVehicle();
      unsubPacket();
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVolumeChange = (channel, valuePercent) => {
    const val = Number(valuePercent) / 100;
    soundEngine.setVolume(channel, val);
    setVolumes(soundEngine.getVolumes());
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  const handleSaveDeviceName = (e) => {
    e.preventDefault();
    connectionManager.setDeviceName(deviceNameInput.trim());
    soundEngine.playBeep(1100, 0.04);
  };

  const tabs = [
    { id: 'connection', label: 'CONNECTION' },
    { id: 'vehicle', label: 'VEHICLE' },
    { id: 'controls', label: 'CONTROLS' },
    { id: 'driveModes', label: 'DRIVE MODES' },
    { id: 'audio', label: 'AUDIO' },
    { id: 'system', label: 'SYSTEM' }
  ];

  const connMetrics = vehicleState.connectionMetrics || connectionManager.getMetrics();
  const connState = vehicleState.connectionState;

  const statusColors = {
    CONNECTED: 'var(--status-green)',
    CONNECTING: 'var(--accent)',
    RECONNECTING: 'var(--status-amber)',
    DISCONNECTED: 'var(--text-dim)',
    ERROR: 'var(--status-red)'
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 7, 10, 0.95)',
        backdropFilter: 'blur(16px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.2s ease-out',
        padding: 'clamp(10px, 2.5vh, 20px) clamp(14px, 3.5vw, 32px)',
        overflow: 'hidden'
      }}
    >
      {/* Top Bar inside Settings */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-hairline)',
          paddingBottom: '10px',
          marginBottom: '12px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span
            style={{
              fontFamily: 'var(--font-brand)',
              fontSize: '17px',
              fontWeight: 900,
              letterSpacing: '3px',
              color: '#ffffff'
            }}
          >
            SETTINGS & DIAGNOSTICS
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
            LAMBO DRIVE OS // HC-05
          </span>
        </div>

        {/* Back / Close Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playToggle(false);
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '4px',
            padding: '5px 12px',
            color: '#ffffff',
            cursor: 'pointer',
            fontFamily: 'var(--font-hud)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hairline)';
            e.currentTarget.style.color = '#ffffff';
          }}
        >
          <span>✕</span>
          <span>CLOSE</span>
        </button>
      </div>

      {/* Main Settings Body */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: 'clamp(14px, 2.5vw, 28px)',
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        {/* Left Category Tabs Navigation */}
        <div
          style={{
            width: 'clamp(115px, 18vw, 155px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            flexShrink: 0
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  soundEngine.playBeep(1100, 0.03);
                  setActiveTab(tab.id);
                }}
                style={{
                  textAlign: 'left',
                  padding: '9px 12px',
                  borderRadius: '4px',
                  backgroundColor: isActive ? 'var(--accent-dim)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-hud)',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '1.2px',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Settings Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* ========================================================
              1. CONNECTION TAB
              ======================================================== */}
          {activeTab === 'connection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Status Banner */}
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${connState === 'ERROR' ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-hairline)'}`,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: statusColors[connState] || 'var(--text-dim)',
                      boxShadow: `0 0 10px ${statusColors[connState] || 'transparent'}`
                    }}
                  />
                  <div>
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                      BLUETOOTH MODULE: {connState}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                      {connState === 'CONNECTED'
                        ? `Connected to ${connMetrics.deviceName} via ${connMetrics.transportType}`
                        : connState === 'CONNECTING'
                        ? `Scanning and pairing with ${connMetrics.deviceName}...`
                        : connState === 'RECONNECTING'
                        ? 'Link dropped. Auto-reconnecting to HC-05...'
                        : connMetrics.lastError || 'No active Bluetooth connection'}
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {connState !== 'CONNECTED' ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playToggle(true);
                        connectionManager.connect();
                      }}
                      disabled={connState === 'CONNECTING'}
                      style={{
                        padding: '6px 16px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--accent-dim)',
                        border: '1.5px solid var(--accent)',
                        color: 'var(--accent)',
                        fontFamily: 'var(--font-hud)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: connState === 'CONNECTING' ? 'not-allowed' : 'pointer',
                        letterSpacing: '1px'
                      }}
                    >
                      {connState === 'CONNECTING' ? 'CONNECTING...' : 'CONNECT'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playToggle(false);
                        connectionManager.disconnect();
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(244, 63, 94, 0.15)',
                        border: '1px solid var(--status-red)',
                        color: 'var(--status-red)',
                        fontFamily: 'var(--font-hud)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      DISCONNECT
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playBeep(900, 0.04);
                      connectionManager.reconnect();
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-hairline)',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-hud)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    RECONNECT
                  </button>
                </div>
              </div>

              {/* Module Configuration & Transport Switcher */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '12px'
                }}
              >
                {/* Device Name Field */}
                <div style={{ padding: '12px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                    BLUETOOTH DEVICE NAME
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: 8 }}>
                    HC-05 default broadcast SSID or custom alias
                  </div>
                  <form onSubmit={handleSaveDeviceName} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={deviceNameInput}
                      onChange={(e) => setDeviceNameInput(e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: '#07090d',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 3,
                        color: '#fff',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        padding: '6px 8px'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--accent-dim)',
                        border: '1px solid var(--accent)',
                        color: 'var(--accent)',
                        borderRadius: 3,
                        fontFamily: 'var(--font-hud)',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      SAVE
                    </button>
                  </form>
                </div>

                {/* Transport Mode (Mock vs Web Bluetooth) */}
                <div style={{ padding: '12px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                    COMMUNICATION TRANSPORT
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: 8 }}>
                    Switch between hardware simulator and real Bluetooth/Serial
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => connectionManager.setTransportType(TRANSPORT_TYPE.MOCK)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 3,
                        backgroundColor: connMetrics.transportType === TRANSPORT_TYPE.MOCK ? 'var(--accent-dim)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${connMetrics.transportType === TRANSPORT_TYPE.MOCK ? 'var(--accent)' : 'var(--border-hairline)'}`,
                        color: connMetrics.transportType === TRANSPORT_TYPE.MOCK ? 'var(--accent)' : 'var(--text-muted)',
                        fontFamily: 'var(--font-hud)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      MOCK HARDWARE (SIM)
                    </button>
                    <button
                      type="button"
                      onClick={() => connectionManager.setTransportType(TRANSPORT_TYPE.BLUETOOTH)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 3,
                        backgroundColor: connMetrics.transportType === TRANSPORT_TYPE.BLUETOOTH ? 'var(--accent-dim)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${connMetrics.transportType === TRANSPORT_TYPE.BLUETOOTH ? 'var(--accent)' : 'var(--border-hairline)'}`,
                        color: connMetrics.transportType === TRANSPORT_TYPE.BLUETOOTH ? 'var(--accent)' : 'var(--text-muted)',
                        fontFamily: 'var(--font-hud)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      HC-05 BT / SERIAL
                    </button>
                  </div>
                </div>
              </div>

              {/* Connection Diagnostics Card */}
              <div style={{ padding: '12px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                    LINK DIAGNOSTICS & TELEMETRY
                  </div>
                  {/* Test Simulate Link Drop Button */}
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playBeep(450, 0.08, 'sawtooth');
                      connectionManager.simulateConnectionDrop();
                    }}
                    style={{
                      padding: '3px 8px',
                      backgroundColor: 'rgba(244, 63, 94, 0.12)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: 'var(--status-red)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      borderRadius: 2,
                      cursor: 'pointer'
                    }}
                    title="Simulate sudden link drop to test timeout and safety stop handling"
                  >
                    TEST LINK DROP
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px'
                  }}
                >
                  <div style={{ backgroundColor: '#07090d', padding: '6px 8px', borderRadius: 3 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '9px' }}>LAST CONNECTED</div>
                    <div style={{ color: '#fff', marginTop: 2 }}>{connMetrics.lastConnectedTime || 'None'}</div>
                  </div>
                  <div style={{ backgroundColor: '#07090d', padding: '6px 8px', borderRadius: 3 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '9px' }}>PING LATENCY</div>
                    <div style={{ color: 'var(--accent)', marginTop: 2 }}>{connMetrics.latencyMs} ms</div>
                  </div>
                  <div style={{ backgroundColor: '#07090d', padding: '6px 8px', borderRadius: 3 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '9px' }}>SIGNAL / RSSI</div>
                    <div style={{ color: 'var(--status-green)', marginTop: 2 }}>{connMetrics.rssi} dBm (96%)</div>
                  </div>
                  <div style={{ backgroundColor: '#07090d', padding: '6px 8px', borderRadius: 3 }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '9px' }}>TOTAL PACKETS SENT</div>
                    <div style={{ color: '#fff', marginTop: 2 }}>{connMetrics.queueStats?.totalSent || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              2. VEHICLE TAB (SUNROOF, LIGHTS, HORN, MIST, SENSORS)
              ======================================================== */}
          {activeTab === 'vehicle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Sunroof Removable Access Hatch Section */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(16, 20, 27, 0.6)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 4
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                      SUNROOF / ARDUINO NANO ACCESS HATCH
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                      Motorized roof mechanism allows direct physical access to Arduino Nano & wiring
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: 3,
                      backgroundColor: vehicleState.sunroof.state === 'OPEN' ? 'var(--accent-dim)' : 'rgba(255, 255, 255, 0.05)',
                      color: vehicleState.sunroof.state === 'OPEN' ? 'var(--accent)' : 'var(--text-muted)',
                      border: '1px solid var(--border-hairline)'
                    }}
                  >
                    STATE: {vehicleState.sunroof.state}
                  </div>
                </div>

                {/* Sunroof Controls */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => vehicleEngine.setSunroof('OPEN')}
                    disabled={vehicleState.sunroof.state === 'OPEN'}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      borderRadius: 3,
                      backgroundColor: vehicleState.sunroof.state === 'OPEN' ? 'var(--accent-dim)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${vehicleState.sunroof.state === 'OPEN' ? 'var(--accent)' : 'var(--border-hairline)'}`,
                      color: vehicleState.sunroof.state === 'OPEN' ? 'var(--accent)' : '#fff',
                      fontFamily: 'var(--font-hud)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    OPEN ROOF
                  </button>
                  <button
                    type="button"
                    onClick={() => vehicleEngine.setSunroof('CLOSE')}
                    disabled={vehicleState.sunroof.state === 'CLOSED'}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      borderRadius: 3,
                      backgroundColor: vehicleState.sunroof.state === 'CLOSED' ? 'var(--accent-dim)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${vehicleState.sunroof.state === 'CLOSED' ? 'var(--accent)' : 'var(--border-hairline)'}`,
                      color: vehicleState.sunroof.state === 'CLOSED' ? 'var(--accent)' : '#fff',
                      fontFamily: 'var(--font-hud)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    CLOSE ROOF
                  </button>
                  <button
                    type="button"
                    onClick={() => vehicleEngine.setSunroof('STOP')}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-hairline)',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-hud)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    STOP
                  </button>
                </div>
              </div>

              {/* Lighting & Auxiliaries */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px'
                }}
              >
                {/* Headlights & Rear Lights */}
                <div style={{ padding: '12px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                    LIGHTING SYSTEMS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>FRONT PROJECTORS</span>
                      <button
                        type="button"
                        onClick={() => vehicleEngine.toggleHeadlights()}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 3,
                          backgroundColor: vehicleState.headlights ? 'var(--accent-dim)' : 'transparent',
                          border: `1px solid ${vehicleState.headlights ? 'var(--accent)' : 'var(--border-hairline)'}`,
                          color: vehicleState.headlights ? 'var(--accent)' : 'var(--text-dim)',
                          fontFamily: 'var(--font-hud)',
                          fontSize: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        {vehicleState.headlights ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>REAR RUBY MARKERS</span>
                      <button
                        type="button"
                        onClick={() => vehicleEngine.toggleRearLights()}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 3,
                          backgroundColor: vehicleState.rearLights ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                          border: `1px solid ${vehicleState.rearLights ? 'var(--status-red)' : 'var(--border-hairline)'}`,
                          color: vehicleState.rearLights ? 'var(--status-red)' : 'var(--text-dim)',
                          fontFamily: 'var(--font-hud)',
                          fontSize: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        {vehicleState.rearLights ? 'ACTIVE' : 'AUTO'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ultrasonic Sonar Obstacle Detector */}
                <div style={{ padding: '12px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                    HC-SR04 COLLISION SONAR
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: 6 }}>
                    Front Sonar Distance: <strong style={{ color: vehicleState.telemetry.obstacleDetected ? 'var(--status-amber)' : '#fff' }}>{vehicleState.telemetry.obstacleDistance} cm</strong>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    SAFETY STOP: <strong style={{ color: vehicleState.telemetry.safetyStop ? 'var(--status-red)' : 'var(--status-green)' }}>
                      {vehicleState.telemetry.safetyStop ? 'TRIGGERED (<12cm)' : 'ARMED'}
                    </strong>
                  </div>
                </div>

                {/* TCRT5000 3-Sensor IR Rig */}
                <div style={{ padding: '12px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                      3x TCRT5000 IR TRACKERS
                    </div>
                    <button
                      type="button"
                      onClick={() => vehicleEngine.toggleLineFollow()}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 3,
                        backgroundColor: vehicleState.lineFollowMode ? 'var(--accent-dim)' : 'transparent',
                        border: `1px solid ${vehicleState.lineFollowMode ? 'var(--accent)' : 'var(--border-hairline)'}`,
                        color: vehicleState.lineFollowMode ? 'var(--accent)' : 'var(--text-dim)',
                        fontFamily: 'var(--font-hud)',
                        fontSize: '9px',
                        cursor: 'pointer'
                      }}
                    >
                      {vehicleState.lineFollowMode ? 'AUTONOMOUS ACTIVE' : 'LINE FOLLOW OFF'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: 8 }}>
                    {['LEFT', 'CENTER', 'RIGHT'].map((pos) => {
                      const active = vehicleState.telemetry.lineSensors[pos.toLowerCase()];
                      return (
                        <div
                          key={pos}
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '4px',
                            borderRadius: 3,
                            backgroundColor: active ? 'var(--accent-dim)' : '#07090d',
                            border: `1px solid ${active ? 'var(--accent)' : 'var(--border-hairline)'}`,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            color: active ? 'var(--accent)' : 'var(--text-dim)'
                          }}
                        >
                          {pos}: {active ? 'LINE' : '0'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              3. CONTROLS TAB (SENSITIVITIES, CALIBRATION)
              ======================================================== */}
          {activeTab === 'controls' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  STEERING SENSITIVITY: {controlSettings.steerSensitivity}%
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: 6 }}>
                  Adjusts servo response curve and touch spring return rate
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={controlSettings.steerSensitivity}
                  onChange={(e) => setControlSettings((s) => ({ ...s, steerSensitivity: Number(e.target.value) }))}
                  style={{ width: '100%', maxWidth: '380px', accentColor: 'var(--accent)' }}
                />
              </div>

              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  THROTTLE ACCELERATION CURVE: {controlSettings.throttleSensitivity}%
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: 6 }}>
                  Ramp-up velocity curve for TB6612FNG motor PWM
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={controlSettings.throttleSensitivity}
                  onChange={(e) => setControlSettings((s) => ({ ...s, throttleSensitivity: Number(e.target.value) }))}
                  style={{ width: '100%', maxWidth: '380px', accentColor: 'var(--accent)' }}
                />
              </div>

              <div>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                  STEERING TRIM CALIBRATION: {controlSettings.steerTrim > 0 ? `+${controlSettings.steerTrim}°` : `${controlSettings.steerTrim}°`}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', marginBottom: 6 }}>
                  Center alignment calibration for mechanical servo drifting
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  value={controlSettings.steerTrim}
                  onChange={(e) => setControlSettings((s) => ({ ...s, steerTrim: Number(e.target.value) }))}
                  style={{ width: '100%', maxWidth: '380px', accentColor: 'var(--accent)' }}
                />
              </div>
            </div>
          )}

          {/* ========================================================
              4. DRIVE MODES TAB
              ======================================================== */}
          {activeTab === 'driveModes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                SELECT VEHICLE DYNAMICS PROFILE
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {[
                  { id: 'ECO', title: 'ECO MODE', cap: '45 KM/H', desc: 'Smooth torque ramp, maximum 2S LiPo battery longevity.' },
                  { id: 'SPORT', title: 'SPORT MODE', cap: '80 KM/H', desc: 'Balanced throttle response and active traction.' },
                  { id: 'TRACK', title: 'TRACK MODE', cap: '120 KM/H', desc: 'Zero PWM damping, instant torque for high-speed track runs.' }
                ].map((m) => {
                  const isSelected = vehicleState.driveMode === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => vehicleEngine.setDriveMode(m.id)}
                      style={{
                        padding: '14px',
                        borderRadius: 6,
                        backgroundColor: isSelected ? 'var(--accent-dim)' : 'rgba(16, 20, 27, 0.6)',
                        border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border-hairline)'}`,
                        boxShadow: isSelected ? '0 0 16px var(--accent-glow)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontFamily: 'var(--font-brand)', fontSize: '14px', fontWeight: 900, color: isSelected ? '#fff' : 'var(--text-muted)' }}>
                          {m.title}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)' }}>
                          {m.cap}
                        </span>
                      </div>
                      <p style={{ fontFamily: 'var(--font-hud)', fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                        {m.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              5. AUDIO MIXER TAB
              ======================================================== */}
          {activeTab === 'audio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                    MASTER AUDIO SYSTEM
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                    Controls global Web Audio synthesis
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 3,
                    backgroundColor: isMuted ? 'rgba(244, 63, 94, 0.2)' : 'var(--accent-dim)',
                    border: `1px solid ${isMuted ? 'var(--status-red)' : 'var(--accent)'}`,
                    color: isMuted ? 'var(--status-red)' : 'var(--accent)',
                    fontFamily: 'var(--font-hud)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  {isMuted ? 'MUTED' : 'ACTIVE'}
                </button>
              </div>

              {/* Master Volume */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-hud)', fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  <span>MASTER VOLUME</span>
                  <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{Math.round(volumes.master * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(volumes.master * 100)}
                  disabled={isMuted}
                  onChange={(e) => handleVolumeChange('master', e.target.value)}
                  style={{ width: '100%', maxWidth: '380px', accentColor: 'var(--accent)' }}
                />
              </div>

              {/* Individual Channels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {[
                  { key: 'engine', label: 'MOTOR & ENGINE RPM', hint: 'Dynamic pitch follows throttle & velocity' },
                  { key: 'horn', label: 'HORN BLAST', hint: 'Dual-tone sports horn (349Hz + 440Hz)' },
                  { key: 'ui', label: 'UI CLICKS & TACTILE BEEPS', hint: 'Touch, pedal & trigger feedback' },
                  { key: 'startup', label: 'STARTUP BOOT SEQUENCE', hint: 'Turbine spool and power chime' },
                  { key: 'mist', label: 'MIST TRANSDUCER HISS', hint: 'Ultrasonic atomizer audio channel' }
                ].map((ch) => (
                  <div key={ch.key} style={{ padding: '8px 12px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 3 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-hud)', fontSize: '11px', fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                      <span>{ch.label}</span>
                      <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{Math.round((volumes[ch.key] || 0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round((volumes[ch.key] || 0) * 100)}
                      disabled={isMuted}
                      onChange={(e) => handleVolumeChange(ch.key, e.target.value)}
                      style={{ width: '100%', accentColor: 'var(--accent)', height: 4 }}
                    />
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-dim)', marginTop: 2 }}>
                      {ch.hint}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              6. SYSTEM & PACKET MONITOR TAB
              ======================================================== */}
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Emergency Stop Status */}
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: vehicleState.emergencyStopActive ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1.5px solid ${vehicleState.emergencyStopActive ? 'var(--status-red)' : 'var(--border-hairline)'}`,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '14px', fontWeight: 800, color: vehicleState.emergencyStopActive ? 'var(--status-red)' : '#fff' }}>
                    {vehicleState.emergencyStopActive ? 'EMERGENCY SHUTDOWN ENGAGED' : 'SAFETY INTERLOCK NORMAL'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                    {vehicleState.emergencyStopActive
                      ? 'All motor PWM halted. Control inputs locked.'
                      : 'Throttle and steering active. Emergency stop ready.'}
                  </div>
                </div>

                {vehicleState.emergencyStopActive ? (
                  <button
                    type="button"
                    onClick={() => vehicleEngine.resetEmergencyStop()}
                    style={{
                      padding: '5px 12px',
                      backgroundColor: 'var(--accent-dim)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      borderRadius: 3,
                      fontFamily: 'var(--font-hud)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    RESET & RE-ARM
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => vehicleEngine.emergencyStop()}
                    style={{
                      padding: '5px 12px',
                      backgroundColor: 'rgba(244, 63, 94, 0.2)',
                      border: '1px solid var(--status-red)',
                      color: 'var(--status-red)',
                      borderRadius: 3,
                      fontFamily: 'var(--font-hud)',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    TRIGGER EMG STOP
                  </button>
                )}
              </div>

              {/* Hardware Spec */}
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                <div style={{ fontFamily: 'var(--font-brand)', fontSize: '13px', color: 'var(--accent)', marginBottom: 6 }}>
                  HARDWARE ARCHITECTURE SPECIFICATION
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <div>• MCU: {HARDWARE_SPEC.mcu}</div>
                  <div>• DRIVER: {HARDWARE_SPEC.driver}</div>
                  <div>• MOTORS: {HARDWARE_SPEC.motors}</div>
                  <div>• BLUETOOTH: {HARDWARE_SPEC.btModule}</div>
                  <div>• SONAR: {HARDWARE_SPEC.sensors.ultrasonic}</div>
                  <div>• TRACKERS: {HARDWARE_SPEC.sensors.lineTrackers}</div>
                  <div>• SUNROOF: {HARDWARE_SPEC.sensors.sunroof}</div>
                </div>
              </div>

              {/* Live Protocol Packet Monitor */}
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(16, 20, 27, 0.6)', border: '1px solid var(--border-hairline)', borderRadius: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                    LIVE HC-05 PROTOCOL PACKET MONITOR
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-dim)' }}>
                    UART 9600 BAUD (LAST 40 PACKETS)
                  </span>
                </div>

                <div
                  style={{
                    maxHeight: '130px',
                    overflowY: 'auto',
                    backgroundColor: '#05070a',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 3,
                    padding: '6px 8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px'
                  }}
                >
                  {packetLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '12px 0' }}>
                      No packet activity recorded yet
                    </div>
                  ) : (
                    packetLogs.map((p) => {
                      const dirColor = p.direction === 'TX'
                        ? 'var(--accent)'
                        : p.direction === 'RX'
                        ? 'var(--status-green)'
                        : p.direction === 'ERR'
                        ? 'var(--status-red)'
                        : 'var(--text-dim)';
                      return (
                        <div key={p.id} style={{ display: 'flex', gap: '8px', lineHeight: 1.5, borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{p.time}</span>
                          <span style={{ color: dirColor, fontWeight: 'bold', width: '28px' }}>[{p.direction}]</span>
                          <span style={{ color: '#fff', flex: 1 }}>{p.raw}</span>
                          <span style={{ color: 'var(--text-dim)' }}>{p.description}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
