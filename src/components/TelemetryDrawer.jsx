import React from 'react';
import { HARDWARE_SPEC } from '../services/lamboProtocol';

export default function TelemetryDrawer({
  isOpen,
  onClose,
  packetLogs = [],
  telemetry = {}
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '60px',
        right: '20px',
        width: '380px',
        maxHeight: 'calc(100vh - 80px)',
        backgroundColor: 'rgba(8, 12, 18, 0.96)',
        border: '1px solid var(--border-tech)',
        borderRadius: '6px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.15)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(12px)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-tech)',
          backgroundColor: 'rgba(16, 22, 34, 0.8)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 8, height: 8, backgroundColor: 'var(--cyan-primary)', borderRadius: '50%', boxShadow: '0 0 8px var(--cyan-primary)' }} />
          <span style={{ fontFamily: 'var(--font-brand)', fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>
            HARDWARE TELEMETRY & HC-05 PACKETS
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Hardware Architecture Spec */}
        <div style={{ backgroundColor: 'rgba(12, 16, 24, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '8px 10px' }}>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', marginBottom: 4 }}>
            HARDWARE RIG ARCHITECTURE
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.4' }}>
            <div>• MCU: <span style={{ color: 'var(--cyan-primary)' }}>{HARDWARE_SPEC.mcu}</span></div>
            <div>• DRIVER: <span style={{ color: 'var(--cyan-primary)' }}>{HARDWARE_SPEC.driver}</span></div>
            <div>• MOTORS: <span style={{ color: 'var(--cyan-primary)' }}>{HARDWARE_SPEC.motors}</span></div>
            <div>• BT LINK: <span style={{ color: 'var(--cyan-primary)' }}>{HARDWARE_SPEC.btModule}</span></div>
          </div>
        </div>

        {/* Live Arduino Pin PWM & IO Status */}
        <div style={{ backgroundColor: 'rgba(12, 16, 24, 0.6)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '8px 10px' }}>
          <div style={{ fontFamily: 'var(--font-hud)', fontSize: '11px', fontWeight: 700, color: 'var(--gold-primary)', marginBottom: 6 }}>
            VIRTUAL ARDUINO PIN I/O
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
            <div style={{ color: '#94a3b8' }}>
              D3 [FL PWM]: <span style={{ color: 'var(--green-ok)' }}>{Math.round((Math.abs(telemetry.throttle || 0) / 100) * 255)}</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              D5 [FR PWM]: <span style={{ color: 'var(--green-ok)' }}>{Math.round((Math.abs(telemetry.throttle || 0) / 100) * 255)}</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              D6 [RL PWM]: <span style={{ color: 'var(--green-ok)' }}>{Math.round((Math.abs(telemetry.throttle || 0) / 100) * 255)}</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              D9 [RR PWM]: <span style={{ color: 'var(--green-ok)' }}>{Math.round((Math.abs(telemetry.throttle || 0) / 100) * 255)}</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              D10 [MIST]: <span style={{ color: telemetry.mist ? 'var(--cyan-primary)' : '#64748b' }}>{telemetry.mist ? 'HIGH' : 'LOW'}</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              D11 [LIGHTS]: <span style={{ color: telemetry.headlights ? 'var(--cyan-primary)' : '#64748b' }}>{telemetry.headlights ? 'HIGH' : 'LOW'}</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              D12 [HORN]: <span style={{ color: telemetry.horn ? 'var(--gold-primary)' : '#64748b' }}>{telemetry.horn ? 'HIGH' : 'LOW'}</span>
            </div>
            <div style={{ color: '#94a3b8' }}>
              A4 [SONAR]: <span style={{ color: 'var(--green-ok)' }}>{telemetry.obstacleDistance || 45}cm</span>
            </div>
          </div>
        </div>

        {/* HC-05 Serial Packet Stream Terminal */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-hud)', fontSize: '11px', fontWeight: 700, color: 'var(--cyan-primary)', marginBottom: 4 }}>
            <span>HC-05 SERIAL TRANSMIT BUFFER</span>
            <span style={{ color: '#64748b', fontSize: '9px' }}>9600 BAUD</span>
          </div>

          <div
            style={{
              height: '140px',
              backgroundColor: '#05070a',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: 4,
              padding: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column-reverse',
              gap: '4px'
            }}
          >
            {packetLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#475569' }}>{log.time}</span>
                <span style={{ color: log.direction === 'TX' ? 'var(--cyan-primary)' : 'var(--gold-primary)', fontWeight: 'bold' }}>
                  [{log.direction}]
                </span>
                <span style={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.06)', padding: '0 4px', borderRadius: 2 }}>
                  {log.raw}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '9px' }}>{log.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
