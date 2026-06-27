/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DeviceType = 'light' | 'fan' | 'ac' | 'plug' | 'tv';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: boolean;
  nodeId: string;
  roomId: string;
  value: number; // Brightness (0-100), Speed (1-5), Temp (16-30), Volume (0-100), Plug Load (W)
  mode?: string;  // AC mode ('cool' | 'eco' | 'dry')
}

export interface Room {
  id: string;
  name: string;
  icon: string; // Icon name from lucide-react
}

export interface Node {
  id: string;
  name: string;
  status: 'online' | 'offline';
  latency: number; // Ping latency in ms
  signal: number;  // Signal strength in dBm (-90 to -30)
  ip?: string;
  roomId: string;
}

export interface Schedule {
  id: string;
  deviceId: string;
  deviceName: string;
  action: 'on' | 'off';
  time: string; // "HH:MM" 24h format
  days: string[]; // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  enabled: boolean;
}

export interface AlertLog {
  id: string;
  timestamp: string; // "HH:MM:SS" or date
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  nodeId?: string;
}
