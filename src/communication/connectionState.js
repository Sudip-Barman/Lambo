// Connection states & error categories for Lambo RC Communication Architecture

export const CONNECTION_STATE = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  ERROR: 'ERROR'
};

export const CONNECTION_ERROR = {
  NONE: null,
  TIMEOUT: 'Connection attempt timed out',
  DEVICE_NOT_FOUND: 'HC-05 module not found or out of range',
  LINK_LOST: 'Bluetooth link lost unexpectedly',
  AUTH_FAILED: 'PIN / Pairing authentication failed',
  UNSUPPORTED: 'Web Bluetooth / Serial not supported in this browser',
  MANUAL_DISCONNECT: 'Disconnected by operator',
  STALE_HEARTBEAT: 'Vehicle telemetry heartbeat timed out',
  COMMAND_TIMEOUT: 'Arduino packet acknowledgement timeout'
};

export const TRANSPORT_TYPE = {
  MOCK: 'MOCK',
  BLUETOOTH: 'BLUETOOTH'
};
