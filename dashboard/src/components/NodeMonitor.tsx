/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cpu, RefreshCw, PowerOff, CheckCircle2, ShieldAlert, Plus, Radio, Compass, Wifi } from 'lucide-react';
import { Node } from '../types';

interface NodeMonitorProps {
  nodes: Node[];
  existingRooms: { id: string; name: string }[];
  onRebootNode: (id: string) => void;
  onToggleNodeStatus: (id: string) => void;
  onAddCustomNode: (node: Node) => void;
}

export default function NodeMonitor({
  nodes,
  existingRooms,
  onRebootNode,
  onToggleNodeStatus,
  onAddCustomNode
}: NodeMonitorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [nodeId, setNodeId] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [targetRoom, setTargetRoom] = useState(existingRooms[1]?.id || 'room-living');
  const [rebootingNodeId, setRebootingNodeId] = useState<string | null>(null);

  const handleReboot = (id: string) => {
    setRebootingNodeId(id);
    onRebootNode(id);
    setTimeout(() => {
      setRebootingNodeId(null);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeId || !nodeName) return;

    const newNode: Node = {
      id: nodeId.toUpperCase(),
      name: nodeName,
      status: 'online',
      latency: Math.floor(Math.random() * 15) + 8,
      signal: -45 - Math.floor(Math.random() * 20),
      ip: `192.168.1.${Math.floor(Math.random() * 100) + 100}`,
      roomId: targetRoom
    };

    onAddCustomNode(newNode);
    setNodeId('');
    setNodeName('');
    setShowAddForm(false);
  };

  const getSignalStrengthLabel = (dbm: number) => {
    if (dbm > -50) return { text: 'Excellent', color: 'text-emerald-400' };
    if (dbm > -65) return { text: 'Good', color: 'text-brand-green' };
    if (dbm > -80) return { text: 'Fair', color: 'text-amber-400' };
    return { text: 'Poor', color: 'text-red-400' };
  };

  return (
    <div id="node-monitor-card" className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl transition-all duration-300">
      
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-brand-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-brand-green" />
            <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">MQTT Nodes</h3>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">Physical Microcontroller Gateways</p>
        </div>

        <button
          id="toggle-add-node-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-green text-brand-dark text-xs font-semibold hover:bg-brand-green/90 transition-all active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Node
        </button>
      </div>

      {/* ADD NODE FORM */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-brand-dark border border-brand-border rounded-lg p-3.5 mb-4 space-y-3">
          <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5 border-b border-brand-border/40 pb-1.5">
            <Cpu className="h-3 w-3 text-brand-green" />
            Provision New Node ID
          </h4>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Unique Node ID</label>
              <input
                id="form-node-id-input"
                type="text"
                placeholder="e.g. 4L-NODE-010"
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
                className="w-full bg-brand-card border border-brand-border focus:border-brand-green/40 text-xs px-2.5 py-1.5 rounded-lg text-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Node Identifier</label>
              <input
                id="form-node-name-input"
                type="text"
                placeholder="e.g. Balcony Light Controller"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                className="w-full bg-brand-card border border-brand-border focus:border-brand-green/40 text-xs px-2.5 py-1.5 rounded-lg text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Assign Space</label>
            <select
              id="form-node-room-select"
              value={targetRoom}
              onChange={(e) => setTargetRoom(e.target.value)}
              className="w-full bg-brand-card border border-brand-border focus:border-brand-green/40 text-xs px-2.5 py-1.5 rounded-lg text-white"
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

          <div className="flex gap-2 pt-2 border-t border-brand-border/30">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-1.5 border border-brand-border rounded-lg text-xs font-semibold text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="form-node-save-btn"
              className="flex-1 py-1.5 bg-brand-green text-brand-dark rounded-lg text-xs font-bold uppercase hover:bg-brand-green/90"
            >
              Arm Node
            </button>
          </div>
        </form>
      )}

      {/* NODES LIST */}
      <div className="space-y-3">
        {nodes.map((node) => {
          const isRebooting = rebootingNodeId === node.id;
          const sig = getSignalStrengthLabel(node.signal);
          return (
            <div
              key={node.id}
              id={`node-row-${node.id}`}
              className={`p-3 rounded-lg border transition-all ${
                node.status === 'online'
                  ? 'bg-brand-dark/40 border-brand-border hover:border-brand-green/20'
                  : 'bg-brand-dark/15 border-red-900/20 opacity-70'
              }`}
            >
              {/* Node Header Row */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-md border ${
                    node.status === 'online'
                      ? 'bg-brand-green/10 border-brand-green/20 text-brand-green'
                      : 'bg-red-950/25 border-red-900/30 text-red-400'
                  }`}>
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-semibold text-white font-sans">{node.name}</h4>
                      <span className="text-[8px] font-mono font-semibold px-1 bg-brand-dark text-gray-400 border border-brand-border rounded uppercase">
                        {node.id}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                      IP: {node.ip || 'DHCP Allocating...'} | Space:{' '}
                      {existingRooms.find((r) => r.id === node.roomId)?.name || 'Utility'}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      node.status === 'online' ? 'bg-brand-green animate-pulse' : 'bg-red-500'
                    }`} />
                    <span className={`text-[9px] font-mono font-bold uppercase ${
                      node.status === 'online' ? 'text-brand-green' : 'text-red-400'
                    }`}>
                      {node.status}
                    </span>
                  </div>
                  <span className="text-[8px] text-gray-500 font-mono">MQTT Protocol</span>
                </div>
              </div>

              {/* Node Telemetry Section */}
              <div className="grid grid-cols-3 gap-2 mt-2.5 bg-brand-dark/70 border border-brand-border/40 rounded p-2 text-center text-[10px] font-mono">
                <div>
                  <div className="text-gray-500 text-[8px] uppercase">Ping Latency</div>
                  <div id={`node-latency-${node.id}`} className="text-white font-bold mt-0.5">
                    {node.status === 'online' ? `${node.latency} ms` : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-[8px] uppercase">RF Signal</div>
                  <div id={`node-signal-${node.id}`} className={`font-bold mt-0.5 ${node.status === 'online' ? sig.color : 'text-gray-600'}`}>
                    {node.status === 'online' ? `${node.signal} dBm` : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-[8px] uppercase">RF Quality</div>
                  <div id={`node-quality-${node.id}`} className="text-white font-medium mt-0.5">
                    {node.status === 'online' ? sig.text : 'OFFLINE'}
                  </div>
                </div>
              </div>

              {/* Node Command Actions */}
              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-brand-border/20">
                <button
                  id={`node-action-toggle-${node.id}`}
                  onClick={() => onToggleNodeStatus(node.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono font-semibold rounded border transition-all ${
                    node.status === 'online'
                      ? 'bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-950/45'
                      : 'bg-emerald-950/20 border-emerald-900/40 text-brand-green hover:bg-emerald-950/45'
                  }`}
                >
                  <PowerOff className="h-2.5 w-2.5" />
                  {node.status === 'online' ? 'Disconnect' : 'Connect'}
                </button>

                <button
                  id={`node-action-reboot-${node.id}`}
                  onClick={() => handleReboot(node.id)}
                  disabled={node.status !== 'online' || isRebooting}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono font-semibold rounded bg-brand-dark border border-brand-border text-gray-300 hover:text-white hover:border-brand-green/30 transition-all ${
                    node.status !== 'online' ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${isRebooting ? 'animate-spin text-brand-green' : ''}`} />
                  {isRebooting ? 'Resetting...' : 'Reboot Gateway'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
