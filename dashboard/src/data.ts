/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Room, Node, Device, Schedule, AlertLog } from './types';

export const initialRooms: Room[] = [
  { id: 'room-all', name: 'All Spaces', icon: 'LayoutDashboard' },
  { id: 'room-living', name: 'Living Room', icon: 'Sofa' },
  { id: 'room-bedroom', name: 'Master Bedroom', icon: 'Bed' },
  { id: 'room-kitchen', name: 'Kitchen', icon: 'CookingPot' },
  { id: 'room-balcony', name: 'Balcony', icon: 'Wind' }
];

export const initialNodes: Node[] = [
  { id: '4L-NODE-001', name: 'Living Room Gateway', status: 'online', latency: 12, signal: -45, ip: '192.168.1.101', roomId: 'room-living' },
  { id: '4L-NODE-002', name: 'Bedroom Controller', status: 'online', latency: 18, signal: -58, ip: '192.168.1.102', roomId: 'room-bedroom' },
  { id: '4L-NODE-003', name: 'Kitchen Power Monitor', status: 'online', latency: 15, signal: -52, ip: '192.168.1.103', roomId: 'room-kitchen' },
  { id: '4L-NODE-004', name: 'Balcony Node', status: 'offline', latency: 0, signal: -88, ip: '192.168.1.104', roomId: 'room-balcony' }
];

export const initialDevices: Device[] = [
  // Living Room Devices
  { id: 'dev-living-light1', name: 'Main Spotlight', type: 'light', status: true, nodeId: '4L-NODE-001', roomId: 'room-living', value: 85 },
  { id: 'dev-living-light2', name: 'Ambience LED strip', type: 'light', status: true, nodeId: '4L-NODE-001', roomId: 'room-living', value: 60 },
  { id: 'dev-living-fan', name: 'Ceiling Fan', type: 'fan', status: true, nodeId: '4L-NODE-001', roomId: 'room-living', value: 3 },
  { id: 'dev-living-ac', name: 'Living AC', type: 'ac', status: false, nodeId: '4L-NODE-001', roomId: 'room-living', value: 24, mode: 'cool' },
  { id: 'dev-living-tv', name: 'Android Smart TV', type: 'tv', status: true, nodeId: '4L-NODE-001', roomId: 'room-living', value: 32 },

  // Bedroom Devices
  { id: 'dev-bedroom-light', name: 'Main Tube Light', type: 'light', status: false, nodeId: '4L-NODE-002', roomId: 'room-bedroom', value: 100 },
  { id: 'dev-bedroom-lamp', name: 'Reading Lamp', type: 'light', status: true, nodeId: '4L-NODE-002', roomId: 'room-bedroom', value: 40 },
  { id: 'dev-bedroom-fan', name: 'High-speed Fan', type: 'fan', status: true, nodeId: '4L-NODE-002', roomId: 'room-bedroom', value: 4 },
  { id: 'dev-bedroom-ac', name: 'Inverter AC', type: 'ac', status: true, nodeId: '4L-NODE-002', roomId: 'room-bedroom', value: 22, mode: 'eco' },

  // Kitchen Devices
  { id: 'dev-kitchen-light', name: 'Ceiling LED Panel', type: 'light', status: false, nodeId: '4L-NODE-003', roomId: 'room-kitchen', value: 100 },
  { id: 'dev-kitchen-fridge', name: 'Refrigerator', type: 'plug', status: true, nodeId: '4L-NODE-003', roomId: 'room-kitchen', value: 145 }, // Watts
  { id: 'dev-kitchen-microwave', name: 'Microwave Plug', type: 'plug', status: false, nodeId: '4L-NODE-003', roomId: 'room-kitchen', value: 0 },

  // Balcony Devices
  { id: 'dev-balcony-light', name: 'Fairy Lights', type: 'light', status: false, nodeId: '4L-NODE-004', roomId: 'room-balcony', value: 90 }
];

export const initialSchedules: Schedule[] = [
  {
    id: 'sched-1',
    deviceId: 'dev-bedroom-ac',
    deviceName: 'Bedroom Inverter AC',
    action: 'off',
    time: '06:00',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    enabled: true
  },
  {
    id: 'sched-2',
    deviceId: 'dev-balcony-light',
    deviceName: 'Balcony Fairy Lights',
    action: 'on',
    time: '18:30',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    enabled: true
  },
  {
    id: 'sched-3',
    deviceId: 'dev-kitchen-microwave',
    deviceName: 'Kitchen Microwave Plug',
    action: 'on',
    time: '07:30',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    enabled: false
  }
];

export const initialAlerts: AlertLog[] = [
  { id: 'alert-1', timestamp: '03:01:22', message: '4Layers SmartNest system initialized successfully.', type: 'success' },
  { id: 'alert-2', timestamp: '03:02:10', message: 'Connected to Supabase PostgreSQL cluster securely.', type: 'success' },
  { id: 'alert-3', timestamp: '03:05:45', message: 'MQTT Client bound to emqx.4layers.local broker.', type: 'info' },
  { id: 'alert-4', timestamp: '03:10:14', message: 'Node 4L-NODE-004 (Balcony) signal dropped below -85dBm.', type: 'warning', nodeId: '4L-NODE-004' },
  { id: 'alert-5', timestamp: '03:12:00', message: 'Node 4L-NODE-004 offline. Ping retry limit exceeded.', type: 'error', nodeId: '4L-NODE-004' },
  { id: 'alert-6', timestamp: '03:15:30', message: 'Master Switch triggered: All Living Room lights enabled.', type: 'info', nodeId: '4L-NODE-001' }
];

export const mockPowerData = [
  { time: '00:00', usage: 120, baseline: 100 },
  { time: '02:00', usage: 95, baseline: 100 },
  { time: '04:00', usage: 85, baseline: 90 },
  { time: '06:00', usage: 140, baseline: 120 },
  { time: '08:00', usage: 310, baseline: 250 },
  { time: '10:00', usage: 480, baseline: 400 },
  { time: '12:00', usage: 520, baseline: 450 },
  { time: '14:00', usage: 450, baseline: 420 },
  { time: '16:00', usage: 390, baseline: 380 },
  { time: '18:00', usage: 610, baseline: 550 },
  { time: '20:00', usage: 780, baseline: 650 },
  { time: '22:00', usage: 420, baseline: 380 }
];
