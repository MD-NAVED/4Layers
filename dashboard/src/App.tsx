/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sofa, 
  Bed, 
  CookingPot, 
  Wind, 
  LayoutDashboard, 
  Power, 
  Plus, 
  Clock, 
  Cpu, 
  Bluetooth, 
  Activity, 
  Database, 
  Globe, 
  Sliders, 
  Settings, 
  Bell, 
  X, 
  RefreshCw,
  Sparkles,
  Search,
  ArrowRight
} from 'lucide-react';

import { Device, Room, Node, Schedule, AlertLog } from './types';
import { 
  initialRooms, 
  initialNodes, 
  initialDevices, 
  initialSchedules, 
  initialAlerts 
} from './data';

import DeviceControlCard from './components/DeviceControlCard';
import PowerChart from './components/PowerChart';
import BluetoothScanner from './components/BluetoothScanner';
import ScheduleManager from './components/ScheduleManager';
import NodeMonitor from './components/NodeMonitor';

export default function App() {
  // Primary State Managers
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [alerts, setAlerts] = useState<AlertLog[]>(initialAlerts);
  
  // Navigation & Filtering
  const [selectedRoomId, setSelectedRoomId] = useState<string>('room-all');
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  // Connection Diagnostics State
  const [backendUrl, setBackendUrl] = useState('https://smartnest-3jr4.onrender.com');
  const [backendStatus, setBackendStatus] = useState<'idle' | 'checking' | 'online' | 'offline' | 'sleeping'>('idle');
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([
    'Diagnostics Engine Offline. Click "Test Connection" to sync live APIs.'
  ]);

  // Form states for new appliances
  const [newDevName, setNewDevName] = useState('');
  const [newDevType, setNewDevType] = useState<'light' | 'fan' | 'ac' | 'plug' | 'tv'>('light');
  const [newDevNode, setNewDevNode] = useState(nodes[0]?.id || '');
  const [newDevRoom, setNewDevRoom] = useState('room-living');

  // Real-time Clock Uptime
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Quick Action Handlers
  const addAlert = (message: string, type: AlertLog['type'] = 'info', nodeId?: string) => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];
    const newAlert: AlertLog = {
      id: `alert-${Date.now()}`,
      timestamp,
      message,
      type,
      nodeId
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  // Master switch to toggle all devices in the current space (or whole house)
  const handleMasterSwitch = (targetStatus: boolean) => {
    const targetedDevices = selectedRoomId === 'room-all' 
      ? devices 
      : devices.filter(d => d.roomId === selectedRoomId);
    
    const activeNodeIds = nodes.filter(n => n.status === 'online').map(n => n.id);

    const updatedDevices = devices.map(dev => {
      // Only toggle devices in the current room group and whose nodes are ONLINE
      const isInTargetedGroup = selectedRoomId === 'room-all' || dev.roomId === selectedRoomId;
      const isNodeOnline = activeNodeIds.includes(dev.nodeId);
      
      if (isInTargetedGroup && isNodeOnline) {
        return { 
          ...dev, 
          status: targetStatus,
          value: dev.type === 'plug' ? (targetStatus ? 120 : 0) : dev.value
        };
      }
      return dev;
    });

    setDevices(updatedDevices);
    const roomName = rooms.find(r => r.id === selectedRoomId)?.name || 'Home Spaces';
    addAlert(
      `Master Switch: All devices in ${roomName} turned ${targetStatus ? 'ON' : 'OFF'} via global payload.`,
      targetStatus ? 'success' : 'info'
    );
  };

  // Device CRUD / Value Adjustments
  const handleUpdateDevice = (updated: Device) => {
    setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
    
    // Simulate MQTT alert log
    const prevStatus = devices.find(d => d.id === updated.id)?.status;
    if (prevStatus !== updated.status) {
      addAlert(
        `MQTT command sent: ${updated.name} turned ${updated.status ? 'ON' : 'OFF'}. [Node: ${updated.nodeId}]`,
        'info',
        updated.nodeId
      );
    } else {
      addAlert(
        `MQTT delta broadcast: ${updated.name} parameter updated to ${updated.value}.`,
        'success',
        updated.nodeId
      );
    }
  };

  const handleCreateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevName) return;

    const newDevice: Device = {
      id: `dev-${Date.now()}`,
      name: newDevName,
      type: newDevType,
      status: false,
      nodeId: newDevNode,
      roomId: newDevRoom,
      value: newDevType === 'ac' ? 24 : newDevType === 'fan' ? 3 : 100,
      mode: newDevType === 'ac' ? 'cool' : undefined
    };

    setDevices(prev => [...prev, newDevice]);
    setNewDevName('');
    setShowAddDeviceModal(false);
    
    addAlert(
      `Registered Device: ${newDevice.name} mapped to cluster node ${newDevice.nodeId}.`,
      'success',
      newDevice.nodeId
    );
  };

  // Node Actions
  const handleRebootNode = (nodeId: string) => {
    addAlert(`Soft Reboot payload dispatched to Node ${nodeId}. Handshaking...`, 'info', nodeId);
    
    // Simulate node going offline temporarily, then reconnecting with randomized fresh latencies
    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, status: 'offline' } : node));
    
    setTimeout(() => {
      setNodes(prev => prev.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            status: 'online',
            latency: Math.floor(Math.random() * 8) + 10,
            signal: -45 - Math.floor(Math.random() * 15)
          };
        }
        return node;
      }));
      addAlert(`Node ${nodeId} reconnected successfully. MQTT channel established.`, 'success', nodeId);
    }, 1500);
  };

  const handleToggleNodeStatus = (nodeId: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        const nextStatus = node.status === 'online' ? 'offline' : 'online';
        addAlert(
          `Node ${nodeId} physically ${nextStatus === 'online' ? 'reconnected' : 'disconnected'}.`,
          nextStatus === 'online' ? 'success' : 'error',
          nodeId
        );
        return { ...node, status: nextStatus };
      }
      return node;
    }));
  };

  const handleAddCustomNode = (newNode: Node) => {
    setNodes(prev => [...prev, newNode]);
    addAlert(`Registered Unique Node ID ${newNode.id} with secure handshake key.`, 'success', newNode.id);
  };

  // BLE Node Provisioning Integration
  const handleBleNodeAdded = (newNode: Node, newDevList: Device[]) => {
    // Add the new physical node
    setNodes(prev => [...prev, newNode]);
    // Append the newly provisioned devices
    setDevices(prev => [...prev, ...newDevList]);
    
    addAlert(`BLE Handshake completed: Provisioned Node ${newNode.id} on network.`, 'success', newNode.id);
    addAlert(`Added ${newDevList.length} appliances automatically mapped to Node ${newNode.id}.`, 'info');
  };

  // Schedule Management
  const handleAddSchedule = (newSched: Schedule) => {
    setSchedules(prev => [...prev, newSched]);
    addAlert(`Cron Timer Rule committed: Trigger ${newSched.deviceName} ${newSched.action.toUpperCase()} at ${newSched.time}.`, 'success');
  };

  const handleDeleteSchedule = (id: string) => {
    const sched = schedules.find(s => s.id === id);
    setSchedules(prev => prev.filter(s => s.id !== id));
    if (sched) {
      addAlert(`Removed automated schedule rule for ${sched.deviceName}.`, 'info');
    }
  };

  const handleToggleSchedule = (id: string) => {
    setSchedules(prev => prev.map(s => {
      if (s.id === id) {
        const nextEnabled = !s.enabled;
        addAlert(
          `Timer rule for ${s.deviceName} turned ${nextEnabled ? 'ON' : 'OFF'}.`,
          nextEnabled ? 'success' : 'info'
        );
        return { ...s, enabled: nextEnabled };
      }
      return s;
    }));
  };

  // FastAPI live diagnostic test
  const testBackendConnection = async () => {
    setBackendStatus('checking');
    setDiagnosticLogs(prev => [
      'Triggering live diagnostics trace...',
      `Testing endpoint: ${backendUrl}/docs ...`,
      ...prev
    ]);

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000); // 6s timeout

      // Render can have extreme cold starts, so we catch timeouts as a "sleeping" indicator
      const response = await fetch(`${backendUrl}/docs`, { 
        method: 'GET',
        mode: 'no-cors', // avoid cors blockage for status checks
        signal: controller.signal
      });
      clearTimeout(id);

      setBackendStatus('online');
      setDiagnosticLogs(prev => [
        '✔ Handshake healthy! Live API synced.',
        `Server connected: ${backendUrl}`,
        ...prev
      ]);
      addAlert(`API Connection Diagnostics: 4Layers FastAPI server is ONLINE.`, 'success');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setBackendStatus('sleeping');
        setDiagnosticLogs(prev => [
          '⌛ WARNING: Render instance is currently COLD-STARTING.',
          'Render web services automatically spin down after 15 mins of dormancy.',
          'Please wait up to 45 seconds for Render to wake the Docker container.',
          ...prev
        ]);
        addAlert(`API Connection: Render container cold-starting. Waking container...`, 'warning');
      } else {
        setBackendStatus('offline');
        setDiagnosticLogs(prev => [
          '❌ API unreachable. Gateway returned status: OFFLINE.',
          `Detail: Connection failed to ${backendUrl}`,
          ...prev
        ]);
        addAlert(`API Connection failure. Verify database pooler & Render logs.`, 'error');
      }
    }
  };

  // Filter devices based on chosen Space
  const filteredDevices = selectedRoomId === 'room-all' 
    ? devices 
    : devices.filter(d => d.roomId === selectedRoomId);

  // Helper mapping room icon strings to Lucide components
  const renderRoomIcon = (iconName: string, active: boolean) => {
    const iconClass = `h-4 w-4 ${active ? 'text-brand-green' : 'text-gray-400 group-hover:text-white'}`;
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className={iconClass} />;
      case 'Sofa': return <Sofa className={iconClass} />;
      case 'Bed': return <Bed className={iconClass} />;
      case 'CookingPot': return <CookingPot className={iconClass} />;
      case 'Wind': return <Wind className={iconClass} />;
      default: return <LayoutDashboard className={iconClass} />;
    }
  };

  // Uptime analytics
  const totalWatts = devices
    .filter(d => d.status)
    .reduce((sum, d) => sum + (d.type === 'plug' ? d.value : d.type === 'light' ? Math.round(d.value * 0.15) : d.type === 'fan' ? d.value * 12 : 120), 0);

  const activeNodesCount = nodes.filter(n => n.status === 'online').length;

  return (
    <div id="app-root-workspace" className="min-h-screen bg-brand-dark bg-grid text-gray-100 flex flex-col font-sans selection:bg-brand-green selection:text-brand-dark">
      
      {/* 1. TOP STATUS / HERO METRICS HEADER */}
      <header className="bg-brand-card/90 backdrop-blur-md border-b border-brand-border px-5 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-40">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-dark border-2 border-brand-green flex items-center justify-center glow-green-sm group hover:scale-105 transition-transform">
            <Sliders className="h-5 w-5 text-brand-green" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-white text-lg tracking-wider uppercase m-0">
                4Layers
              </h1>
              <span className="text-[9px] bg-brand-green/10 border border-brand-green/30 text-brand-green px-1.5 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                IoT OS v3.5
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-mono tracking-tight m-0">
              SMARTNEST INTERACTIVE TELEMETRY STATION
            </p>
          </div>
        </div>

        {/* Global Hub Quick Stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-mono">
          <div className="bg-brand-dark border border-brand-border px-3 py-1.5 rounded-lg">
            <span className="text-gray-500 text-[9px] block">LOAD DRAW</span>
            <span id="load-draw-stats" className="font-bold text-brand-green text-glow flex items-center gap-1 mt-0.5">
              <Activity className="h-3 w-3 animate-pulse" />
              {totalWatts} W
            </span>
          </div>

          <div className="bg-brand-dark border border-brand-border px-3 py-1.5 rounded-lg">
            <span className="text-gray-500 text-[9px] block">ACTIVE CLUSTER</span>
            <span id="active-cluster-stats" className="font-bold text-white mt-0.5 block">
              {activeNodesCount} / {nodes.length} Nodes
            </span>
          </div>

          <div className="bg-brand-dark border border-brand-border px-3 py-1.5 rounded-lg">
            <span className="text-gray-500 text-[9px] block">ONLINE APPLIANCES</span>
            <span id="online-appliances-stats" className="font-bold text-white mt-0.5 block">
              {devices.filter(d => d.status).length} On Standby
            </span>
          </div>

          {/* Clock */}
          <div className="bg-brand-dark border border-brand-border px-3 py-1.5 rounded-lg hidden sm:block">
            <span className="text-gray-500 text-[9px] block">UTC TIMELINE</span>
            <span className="font-bold text-gray-300 flex items-center gap-1.5 mt-0.5">
              <Clock className="h-3 w-3 text-brand-green" />
              {currentTime || '03:16 UTC'}
            </span>
          </div>
        </div>

        {/* Header Right Master switches */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            id="global-switch-off-btn"
            onClick={() => handleMasterSwitch(false)}
            className="flex-1 md:flex-none px-3.5 py-1.5 rounded-lg border border-brand-border bg-brand-dark text-[11px] font-mono font-bold text-gray-400 hover:text-white hover:border-red-900/60 transition-all uppercase flex items-center justify-center gap-1.5"
          >
            <Power className="h-3 w-3 text-red-500" />
            Kill All
          </button>
          
          <button
            id="global-switch-on-btn"
            onClick={() => handleMasterSwitch(true)}
            className="flex-1 md:flex-none px-3.5 py-1.5 rounded-lg bg-brand-green text-brand-dark text-[11px] font-mono font-bold hover:bg-brand-green/90 transition-all uppercase flex items-center justify-center gap-1.5 glow-green"
          >
            <Power className="h-3 w-3" />
            Engage All
          </button>

          {/* Alarm Notifications Toggle */}
          <button
            id="notification-bell-btn"
            onClick={() => setShowNotificationCenter(!showNotificationCenter)}
            className="h-8 w-8 rounded-lg border border-brand-border bg-brand-dark hover:border-brand-green/30 flex items-center justify-center text-gray-400 hover:text-white relative"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-brand-green glow-green" />
          </button>
        </div>
      </header>

      {/* 2. CORE WORKSPACE LAYOUT */}
      <main className="flex-1 p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1600px] w-full mx-auto">
        
        {/* SIDE BAR / LEFT NAV (3 Columns) */}
        <section className="lg:col-span-3 space-y-4">
          
          {/* Space filter card */}
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl">
            <h3 className="font-display font-semibold text-xs uppercase text-gray-400 tracking-wider mb-3">
              Home Areas & Spaces
            </h3>
            
            <nav className="space-y-1.5" id="room-nav-sidebar">
              {rooms.map((room) => {
                const isActive = selectedRoomId === room.id;
                const devInRoom = room.id === 'room-all' ? devices : devices.filter(d => d.roomId === room.id);
                const activeCount = devInRoom.filter(d => d.status).length;
                
                return (
                  <button
                    key={room.id}
                    id={`sidebar-room-btn-${room.id}`}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all group ${
                      isActive 
                        ? 'bg-brand-green text-brand-dark font-bold shadow-sm' 
                        : 'text-gray-400 hover:text-white hover:bg-brand-dark/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {renderRoomIcon(room.icon, isActive)}
                      <span>{room.name}</span>
                    </div>

                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive 
                        ? 'bg-brand-dark text-brand-green font-bold' 
                        : 'bg-brand-dark/40 text-gray-500 font-medium'
                    }`}>
                      {activeCount}/{devInRoom.length} Active
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Live REST API Diagnostics Control center */}
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-brand-green" />
                <h3 className="font-display font-semibold text-xs uppercase text-white tracking-wider">
                  REST Diagnostics
                </h3>
              </div>
              <button
                id="ping-api-btn"
                onClick={testBackendConnection}
                disabled={backendStatus === 'checking'}
                className="text-[10px] font-mono text-brand-green flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${backendStatus === 'checking' ? 'animate-spin' : ''}`} />
                Test Sync
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] text-gray-400 font-mono">
                Instance Host URL:
                <input
                  id="api-host-input"
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/40 text-[10px] px-2 py-1 rounded text-white font-mono mt-1"
                />
              </div>

              {/* Status Indicator */}
              <div className="flex items-center justify-between bg-brand-dark border border-brand-border rounded p-2 text-[10px] font-mono">
                <span className="text-gray-500">Live API Status:</span>
                <span id="backend-status-badge" className={`font-bold uppercase flex items-center gap-1 ${
                  backendStatus === 'online' ? 'text-brand-green' : 
                  backendStatus === 'sleeping' ? 'text-amber-400 animate-pulse' : 
                  backendStatus === 'offline' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {backendStatus === 'checking' && 'Testing...'}
                  {backendStatus === 'online' && 'ONLINE (Synced)'}
                  {backendStatus === 'sleeping' && 'SLEEPING (Waking)'}
                  {backendStatus === 'offline' && 'UNREACHABLE'}
                  {backendStatus === 'idle' && 'READY'}
                </span>
              </div>

              {/* Console Logs */}
              <div className="bg-brand-dark/90 border border-brand-border/60 rounded p-2 h-24 overflow-y-auto text-[9px] font-mono text-gray-500 space-y-1">
                {diagnosticLogs.map((log, idx) => (
                  <div key={idx} className="leading-normal">{log}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick specs / credits */}
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl text-[10px] text-gray-500 font-mono space-y-1.5">
            <div className="font-bold text-white uppercase text-[9px] tracking-wide pb-1 border-b border-brand-border/40">Hardware Stack Overview</div>
            <div>Database: Supabase postgresql pooler</div>
            <div>Broker Protocol: MQTT v3.1.1 EMQX Client</div>
            <div>Broker Port: 1883 TCP (Local)</div>
            <div>Device Provisioning: Bluetooth GATT OTA</div>
            <div className="text-[8px] text-brand-green border-t border-brand-border/30 pt-1.5 text-right">Crafted for 4Layers Integration</div>
          </div>

        </section>

        {/* WORKSPACE CONTENT AREA (5 Columns) */}
        <section className="lg:col-span-5 space-y-4">
          
          {/* Room Workspace Title Header card */}
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl flex justify-between items-center">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-green" />
                <span className="text-[10px] font-mono text-gray-500 uppercase">ACTIVE CONTAINER DESK</span>
              </div>
              <h2 id="room-workspace-title" className="text-base font-display font-extrabold text-white uppercase tracking-wider mt-0.5">
                {rooms.find(r => r.id === selectedRoomId)?.name} Appliances
              </h2>
            </div>

            <button
              id="open-add-device-btn"
              onClick={() => setShowAddDeviceModal(true)}
              className="px-3 py-1.5 rounded-lg border border-brand-border bg-brand-dark text-xs font-semibold hover:border-brand-green/30 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 text-brand-green" />
              Register Appliance
            </button>
          </div>

          {/* ADD APPLIANCE MODAL / FORM INLINE */}
          {showAddDeviceModal && (
            <div className="bg-brand-card border border-brand-green/30 rounded-3xl p-6 relative shadow-2xl">
              <button
                id="close-add-device-modal"
                onClick={() => setShowAddDeviceModal(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="font-display font-semibold text-sm uppercase text-white tracking-wide mb-3 flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-brand-green" /> Register Appliance Mapping
              </h3>

              <form onSubmit={handleCreateDevice} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Appliance Name</label>
                  <input
                    id="new-device-name-input"
                    type="text"
                    placeholder="e.g. Balcony Decorative LED"
                    value={newDevName}
                    onChange={(e) => setNewDevName(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/50 text-xs px-2.5 py-1.5 rounded-lg text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Appliance Category</label>
                    <select
                      id="new-device-type-select"
                      value={newDevType}
                      onChange={(e) => setNewDevType(e.target.value as any)}
                      className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/50 text-xs px-2.5 py-1.5 rounded-lg text-white"
                    >
                      <option value="light">Smart Bulb / LED</option>
                      <option value="fan">Ceiling / Exhaust Fan</option>
                      <option value="ac">Air Conditioner (AC)</option>
                      <option value="plug">Power Plug / Socket</option>
                      <option value="tv">Television Panel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Assigned Area Space</label>
                    <select
                      id="new-device-room-select"
                      value={newDevRoom}
                      onChange={(e) => setNewDevRoom(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/50 text-xs px-2.5 py-1.5 rounded-lg text-white"
                    >
                      {rooms.filter(r => r.id !== 'room-all').map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Microcontroller Gateway Node</label>
                  <select
                    id="new-device-node-select"
                    value={newDevNode}
                    onChange={(e) => setNewDevNode(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/50 text-xs px-2.5 py-1.5 rounded-lg text-white font-mono"
                  >
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.id} ({node.name})
                      </option>
                    ))}
                  </select>
                  <span className="text-[9px] text-gray-500 block font-mono mt-1">
                    Ensures commands are packetized through the correct EMQX MQTT node ID topics.
                  </span>
                </div>

                <div className="flex gap-2 pt-2 border-t border-brand-border/30">
                  <button
                    type="button"
                    onClick={() => setShowAddDeviceModal(false)}
                    className="flex-1 py-2 border border-brand-border rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="submit-register-appliance-btn"
                    className="flex-1 py-2 bg-brand-green text-brand-dark font-bold text-xs rounded-lg uppercase hover:bg-brand-green/90"
                  >
                    Deploy Appliance
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SMART DEVICES CARD CONTROLS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="devices-controls-grid">
            {filteredDevices.length === 0 ? (
              <div className="col-span-full bg-brand-card/30 border border-dashed border-brand-border rounded-xl p-8 text-center text-xs text-gray-500 font-mono">
                No active smart appliances registered in this space. Click "Register Appliance" above.
              </div>
            ) : (
              filteredDevices.map((device) => {
                const associatedNode = nodes.find(n => n.id === device.nodeId);
                const nodeStatus = associatedNode ? associatedNode.status : 'offline';

                return (
                  <DeviceControlCard
                    key={device.id}
                    device={device}
                    nodeStatus={nodeStatus}
                    onUpdateDevice={handleUpdateDevice}
                  />
                );
              })
            )}
          </div>

          {/* Quick workspace hints */}
          <div className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl text-[10px] text-gray-500 font-mono flex items-center justify-between gap-2">
            <span>
              💡 Try toggling a Node offline in the <b>MQTT Nodes</b> table on the right. Online states instantly guard device relays!
            </span>
            <ArrowRight className="h-4 w-4 text-brand-green shrink-0" />
          </div>

        </section>

        {/* ANALYTICS & HUB (4 Columns) */}
        <section className="lg:col-span-4 space-y-4">
          
          {/* Telemetry Chart Component */}
          <PowerChart />

          {/* BLE Node provisioner scanner */}
          <BluetoothScanner 
            existingRooms={rooms}
            onNodeAdded={handleBleNodeAdded} 
          />

          {/* Scheduled timers manager */}
          <ScheduleManager
            schedules={schedules}
            devices={devices}
            onAddSchedule={handleAddSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onToggleSchedule={handleToggleSchedule}
          />

          {/* Node cluster supervisor table */}
          <NodeMonitor
            nodes={nodes}
            existingRooms={rooms}
            onRebootNode={handleRebootNode}
            onToggleNodeStatus={handleToggleNodeStatus}
            onAddCustomNode={handleAddCustomNode}
          />

        </section>

      </main>

      {/* 3. FLOATING LOGS / NOTIFICATION CENTER CONSOLE */}
      {showNotificationCenter && (
        <div id="alert-logs-drawer" className="fixed bottom-0 right-5 w-full max-w-md bg-brand-card border border-brand-border rounded-t-3xl shadow-2xl z-50 overflow-hidden transition-all duration-300">
          <div className="bg-brand-dark px-4 py-3 border-b border-brand-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-green animate-bounce" />
              <h3 className="font-display font-semibold text-xs uppercase text-white tracking-wider m-0">
                4Layers Syslogs feed
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                id="clear-logs-btn"
                onClick={() => setAlerts([])}
                className="text-[9px] font-mono text-gray-500 hover:text-white uppercase hover:underline"
              >
                Clear logs
              </button>
              <button
                id="close-logs-drawer-btn"
                onClick={() => setShowNotificationCenter(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-3 max-h-72 overflow-y-auto space-y-2 font-mono text-[10px]">
            {alerts.length === 0 ? (
              <div className="text-center py-6 text-gray-500 italic">No system warnings in pool.</div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  id={`alert-log-${alert.id}`}
                  className="p-2 rounded bg-brand-dark/60 border border-brand-border/40 flex items-start gap-2.5 leading-relaxed"
                >
                  <span className="text-gray-500 text-[9px] mt-0.5">{alert.timestamp}</span>
                  
                  <div className="flex-1">
                    <span className={`font-semibold mr-1.5 uppercase text-[9px] ${
                      alert.type === 'success' ? 'text-brand-green' :
                      alert.type === 'warning' ? 'text-amber-400' :
                      alert.type === 'error' ? 'text-red-400' : 'text-cyan-400'
                    }`}>
                      [{alert.type}]
                    </span>
                    <span className="text-gray-300">{alert.message}</span>
                    {alert.nodeId && (
                      <span className="block text-[8px] text-gray-600 uppercase mt-0.5">
                        Topic: /4layers/nodes/{alert.nodeId}/tx
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mini alerts activator indicator bottom-right */}
      {!showNotificationCenter && (
        <button
          id="activator-bell-floating-btn"
          onClick={() => setShowNotificationCenter(true)}
          className="fixed bottom-5 right-5 h-10 w-10 bg-brand-card hover:bg-brand-card-hover border border-brand-border hover:border-brand-green/30 rounded-full flex items-center justify-center text-gray-300 hover:text-white shadow-2xl z-40 transition-all active:scale-90"
        >
          <Bell className="h-4 w-4 text-brand-green" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-brand-green animate-ping" />
        </button>
      )}

    </div>
  );
}
