/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bluetooth, Wifi, Cpu, Loader2, Check, RefreshCw, Key, ShieldCheck, HelpCircle } from 'lucide-react';
import { Node, Device } from '../types';

interface BluetoothScannerProps {
  onNodeAdded: (node: Node, devices: Device[]) => void;
  existingRooms: { id: string; name: string }[];
}

interface ScanDevice {
  id: string;
  name: string;
  rssi: number;
  mac: string;
}

export default function BluetoothScanner({ onNodeAdded, existingRooms }: BluetoothScannerProps) {
  const [step, setStep] = useState<'idle' | 'scanning' | 'list' | 'setup' | 'progress' | 'success'>('idle');
  const [devices, setDevices] = useState<ScanDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ScanDevice | null>(null);

  // Form Inputs
  const [nodeName, setNodeName] = useState('');
  const [customNodeId, setCustomNodeId] = useState('');
  const [targetRoom, setTargetRoom] = useState('');
  const [wifiSsid, setWifiSsid] = useState('4Layers_Premium_5G');
  const [wifiPass, setWifiPass] = useState('••••••••••••');
  const [nodePin, setNodePin] = useState('4L2026');

  // Provisioning steps simulation
  const [provStep, setProvStep] = useState(0);
  const provLogs = [
    'Opening GATT connection to BLE service...',
    'Exchanging Elliptic-curve Diffie-Hellman keys...',
    'Transmitting encrypted SSID & MQTT credentials...',
    'Awaiting Node handshake with EMQX Broker (192.168.1.5)...',
    'Registering unique Node ID to Supabase cluster...'
  ];

  // Start Radar Scan
  const startScan = () => {
    setStep('scanning');
    setDevices([]);
    setSelectedDevice(null);

    setTimeout(() => {
      setDevices([
        { id: 'ble-node-1', name: '4Layers_BLE_Node_7F', rssi: -62, mac: '24:0A:C4:8B:7F:10' },
        { id: 'ble-node-2', name: '4Layers_BLE_Node_9C', rssi: -74, mac: '24:0A:C4:8B:9C:3E' },
        { id: 'ble-node-3', name: 'SmartNode_Unconfigured', rssi: -82, mac: 'A4:CF:12:F3:51:7A' }
      ]);
      setStep('list');
    }, 2500);
  };

  const handleSelectDevice = (dev: ScanDevice) => {
    setSelectedDevice(dev);
    setNodeName(`${dev.name.replace('4Layers_BLE_', '')} Gateway`);
    const hex = Math.floor(Math.random() * 900) + 100;
    setCustomNodeId(`4L-NODE-${hex}`);
    // Default room to the first valid one
    const firstRoom = existingRooms.find(r => r.id !== 'room-all');
    setTargetRoom(firstRoom ? firstRoom.id : 'room-living');
    setStep('setup');
  };

  // Run Provisioning sequence
  const startProvisioning = () => {
    setStep('progress');
    setProvStep(0);
  };

  useEffect(() => {
    if (step !== 'progress') return;

    const interval = setInterval(() => {
      setProvStep((prev) => {
        if (prev < provLogs.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          completeProvisioning();
          return prev;
        }
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [step]);

  const completeProvisioning = () => {
    const randomIp = `192.168.1.${Math.floor(Math.random() * 150) + 110}`;
    
    // Create new node object
    const newNode: Node = {
      id: customNodeId || '4L-NODE-NEW',
      name: nodeName || 'New BLE Node',
      status: 'online',
      latency: 14,
      signal: selectedDevice ? selectedDevice.rssi : -60,
      ip: randomIp,
      roomId: targetRoom
    };

    // Auto generate 2 default devices for this node
    const newDevices: Device[] = [
      {
        id: `dev-${newNode.id.toLowerCase()}-light`,
        name: 'Accent Light',
        type: 'light',
        status: false,
        nodeId: newNode.id,
        roomId: targetRoom,
        value: 100
      },
      {
        id: `dev-${newNode.id.toLowerCase()}-plug`,
        name: 'Power Plug',
        type: 'plug',
        status: false,
        nodeId: newNode.id,
        roomId: targetRoom,
        value: 0
      }
    ];

    onNodeAdded(newNode, newDevices);
    setStep('success');
  };

  return (
    <div id="ble-provisioning-card" className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl relative overflow-hidden transition-all duration-300">
      
      {/* Bluetooth watermark background */}
      <div className="absolute right-[-20px] top-[-20px] text-brand-green/[0.02] pointer-events-none select-none">
        <Bluetooth className="h-44 w-44" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border/40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-brand-dark border border-brand-border">
            <Bluetooth className="h-4 w-4 text-brand-green animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">BLE Node Provisioner</h3>
            <p className="text-[10px] text-gray-500 font-mono">Bluetooth LE GATT Handshake Emulator</p>
          </div>
        </div>
        <span className="text-[10px] bg-brand-green/10 text-brand-green border border-brand-green/30 px-2 py-0.5 rounded-full font-mono font-medium">
          LOCAL OTA
        </span>
      </div>

      {/* STEPS ROUTER */}
      
      {/* 1. IDLE STATE */}
      {step === 'idle' && (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-brand-dark border border-brand-border text-gray-400 mb-3">
            <Bluetooth className="h-5 w-5 text-brand-green" />
          </div>
          <h4 className="text-sm font-medium text-white">Unprovisioned Hardware Detected?</h4>
          <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
            Scan for nearby 4Layers ESP32/BLE hardware nodes to configure credentials and assign room hubs.
          </p>
          <button
            id="start-ble-scan-btn"
            onClick={startScan}
            className="mt-4 px-4 py-2 rounded-lg bg-brand-green text-brand-dark text-xs font-semibold uppercase tracking-wider hover:bg-brand-green/90 active:scale-95 transition-all flex items-center gap-1.5 mx-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Start BLE Scan
          </button>
        </div>
      )}

      {/* 2. SCANNING RADAR */}
      {step === 'scanning' && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative h-20 w-20 flex items-center justify-center mb-4">
            <div className="absolute inset-0 rounded-full bg-brand-green/10 animate-ping border border-brand-green/40" />
            <div className="absolute inset-2 rounded-full bg-brand-green/20 animate-pulse" />
            <div className="h-10 w-10 rounded-full bg-brand-dark border border-brand-green/60 flex items-center justify-center">
              <Bluetooth className="h-5 w-5 text-brand-green animate-spin" />
            </div>
          </div>
          <h4 className="text-xs font-mono text-gray-300">Searching BLE Frequencies...</h4>
          <p className="text-[10px] text-gray-500 font-mono mt-1">Listening on channel 37, 38, 39</p>
        </div>
      )}

      {/* 3. DISCOVERY LIST */}
      {step === 'list' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-gray-500 uppercase">Available Nodes ({devices.length})</span>
            <button
              onClick={startScan}
              className="text-[10px] text-brand-green flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="h-2.5 w-2.5" /> Scan again
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {devices.map((dev) => (
              <div
                key={dev.id}
                id={`ble-dev-${dev.id}`}
                onClick={() => handleSelectDevice(dev)}
                className="flex items-center justify-between p-2.5 rounded bg-brand-dark/80 hover:bg-brand-dark border border-brand-border hover:border-brand-green/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-brand-green/10 border border-brand-green/20 flex items-center justify-center group-hover:bg-brand-green/20">
                    <Cpu className="h-3.5 w-3.5 text-brand-green" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-brand-green transition-colors">{dev.name}</div>
                    <div className="text-[9px] text-gray-500 font-mono">{dev.mac}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono font-medium text-brand-green">{dev.rssi} dBm</div>
                  <div className="text-[8px] text-gray-500 uppercase font-mono">Strong Signal</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SETUP FORM */}
      {step === 'setup' && selectedDevice && (
        <div className="space-y-3">
          <div className="bg-brand-dark/40 border border-brand-border p-2 rounded-lg text-xs flex justify-between items-center">
            <span className="text-gray-400 font-medium">Selected Device:</span>
            <span className="font-mono text-brand-green">{selectedDevice.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Node Identifier</label>
              <input
                id="input-node-id"
                type="text"
                placeholder="e.g. 4L-NODE-005"
                value={customNodeId}
                onChange={(e) => setCustomNodeId(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/50 text-xs px-2.5 py-1.5 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Descriptive Name</label>
              <input
                id="input-node-name"
                type="text"
                placeholder="e.g. Guest Gateway"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/50 text-xs px-2.5 py-1.5 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Home Area Room</label>
              <select
                id="select-node-room"
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/50 text-xs px-2.5 py-1.5 rounded-lg text-white font-sans"
              >
                {existingRooms
                  .filter((r) => r.id !== 'room-all')
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">OTA BLE Security PIN</label>
              <div className="relative">
                <input
                  id="input-node-pin"
                  type="text"
                  placeholder="PIN"
                  value={nodePin}
                  onChange={(e) => setNodePin(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/50 text-xs px-2.5 py-1.5 rounded-lg text-white font-mono"
                />
                <Key className="absolute right-2.5 top-2 h-3 w-3 text-gray-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">WiFi SSID & Passkey</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                id="input-wifi-ssid"
                type="text"
                placeholder="WiFi SSID"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/50 text-xs px-2.5 py-1.5 rounded-lg text-white font-mono"
              />
              <input
                id="input-wifi-pass"
                type="password"
                placeholder="Passkey"
                value={wifiPass}
                onChange={(e) => setWifiPass(e.target.value)}
                className="w-full bg-brand-dark border border-brand-border focus:border-brand-green/50 text-xs px-2.5 py-1.5 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1.5">
            <button
              onClick={() => setStep('list')}
              className="flex-1 py-1.5 text-xs text-center border border-brand-border rounded-lg text-gray-400 hover:text-white"
            >
              Back
            </button>
            <button
              id="provision-start-btn"
              onClick={startProvisioning}
              className="flex-1 py-1.5 text-xs font-semibold text-center rounded-lg bg-brand-green text-brand-dark hover:bg-brand-green/90 uppercase"
            >
              Deploy Node
            </button>
          </div>
        </div>
      )}

      {/* 5. PROGRESS DEPLOYMENT */}
      {step === 'progress' && (
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-brand-green animate-spin" />
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Flashing Node OTA...</h4>
          </div>

          <div className="space-y-2">
            {provLogs.map((log, idx) => {
              const isDone = idx < provStep;
              const isCurrent = idx === provStep;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 text-[10px] font-mono transition-opacity ${
                    isDone ? 'text-gray-400' : isCurrent ? 'text-brand-green font-medium' : 'text-gray-600 opacity-50'
                  }`}
                >
                  <div className="mt-0.5">
                    {isDone ? (
                      <Check className="h-3 w-3 text-brand-green" />
                    ) : isCurrent ? (
                      <Loader2 className="h-3 w-3 text-brand-green animate-spin" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-700 mx-1 mt-1" />
                    )}
                  </div>
                  <span>{log}</span>
                </div>
              );
            })}
          </div>

          {/* Graphical progress bar */}
          <div className="w-full h-1 bg-brand-dark rounded-full overflow-hidden border border-brand-border">
            <div
              className="h-full bg-brand-green glow-green transition-all duration-300"
              style={{ width: `${((provStep + 1) / provLogs.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 6. SUCCESS STATE */}
      {step === 'success' && (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-brand-green/15 border border-brand-green/40 text-brand-green mb-3 glow-green">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-white">4Layers Node Armed!</h4>
          <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
            Telemetry is verified and transmitting. 1 Spotlight Light & 1 Smart Plug assigned.
          </p>

          <div className="bg-brand-dark/85 border border-brand-border rounded-lg p-2.5 mt-3 text-left space-y-1 text-[10px] font-mono max-w-xs mx-auto">
            <div className="flex justify-between"><span className="text-gray-500">Node ID:</span><span className="text-white font-bold">{customNodeId}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">DH Signature:</span><span className="text-brand-green">EC-GATT-SHA256</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Broker:</span><span className="text-white">smartnest-3jr4.onrender</span></div>
          </div>

          <div className="flex gap-2 justify-center mt-4">
            <button
              id="provision-finish-btn"
              onClick={() => setStep('idle')}
              className="px-4 py-1.5 rounded-lg bg-brand-green text-brand-dark font-semibold text-xs uppercase"
            >
              Provision Another
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
