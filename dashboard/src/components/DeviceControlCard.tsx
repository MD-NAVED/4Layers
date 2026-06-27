/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Lightbulb, 
  Fan, 
  Tv, 
  Power, 
  Zap, 
  Sun, 
  Volume2, 
  Thermometer, 
  Compass, 
  Wind,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Device } from '../types';

interface DeviceControlCardProps {
  key?: string | number;
  device: Device;
  onUpdateDevice: (updated: Device) => void;
  nodeStatus?: 'online' | 'offline';
}

export default function DeviceControlCard({ device, onUpdateDevice, nodeStatus = 'online' }: DeviceControlCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const isOffline = nodeStatus === 'offline';

  const handleToggle = () => {
    if (isOffline) return;
    setIsUpdating(true);
    // Mimic real network delay for MQTT broker handshake
    setTimeout(() => {
      onUpdateDevice({
        ...device,
        status: !device.status,
        // Set dynamic watts on plug
        value: device.type === 'plug' ? (!device.status ? 150 : 0) : device.value
      });
      setIsUpdating(false);
    }, 400);
  };

  const handleValueChange = (newValue: number) => {
    if (isOffline || !device.status) return;
    onUpdateDevice({
      ...device,
      value: newValue
    });
  };

  const handleACModeChange = (mode: string) => {
    if (isOffline || !device.status) return;
    onUpdateDevice({
      ...device,
      mode
    });
  };

  // Helper to render icon based on device type
  const getDeviceIcon = () => {
    const iconClass = `h-5 w-5 transition-transform duration-500 ${
      device.status && !isOffline ? 'scale-110' : ''
    }`;

    switch (device.type) {
      case 'light':
        return <Lightbulb className={`${iconClass} ${device.status && !isOffline ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'text-gray-500'}`} />;
      case 'fan':
        return <Fan className={`${iconClass} ${device.status && !isOffline ? 'text-cyan-400 animate-spin' : 'text-gray-500'}`} style={{ animationDuration: device.status ? `${6 - device.value}s` : '0s' }} />;
      case 'ac':
        return <Wind className={`${iconClass} ${device.status && !isOffline ? 'text-blue-400 animate-pulse' : 'text-gray-500'}`} />;
      case 'plug':
        return <Zap className={`${iconClass} ${device.status && !isOffline ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-gray-500'}`} />;
      case 'tv':
        return <Tv className={`${iconClass} ${device.status && !isOffline ? 'text-purple-400' : 'text-gray-500'}`} />;
      default:
        return <Lightbulb className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div 
      id={`device-card-${device.id}`}
      className={`relative bg-brand-card border rounded-3xl p-5 transition-all duration-300 shadow-xl ${
        isOffline 
          ? 'border-red-900/30 opacity-60' 
          : device.status 
            ? 'border-brand-green/30 shadow-[0_0_20px_rgba(34,197,94,0.08)] hover:bg-brand-card-hover' 
            : 'border-brand-border/80 hover:border-brand-border hover:bg-brand-card-hover'
      }`}
    >
      {/* Device Status Glow Indicator */}
      {device.status && !isOffline && (
        <span className="absolute top-0 right-10 h-1.5 w-16 bg-brand-green rounded-b-full shadow-[0_0_8px_#22C55E]" />
      )}

      {/* Header Info */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-[9px] font-mono font-medium text-gray-500 tracking-wider block uppercase mb-0.5">
            Node: {device.nodeId}
          </span>
          <h4 id={`device-title-${device.id}`} className="text-sm font-semibold text-white tracking-wide truncate max-w-[130px]">
            {device.name}
          </h4>
        </div>

        {/* Dynamic Power Switch */}
        <button
          id={`device-toggle-${device.id}`}
          onClick={handleToggle}
          disabled={isOffline || isUpdating}
          className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all ${
            isOffline 
              ? 'bg-brand-dark border-brand-border text-gray-600 cursor-not-allowed'
              : device.status 
                ? 'bg-brand-green border-brand-green text-brand-dark shadow-[0_0_10px_rgba(34,197,94,0.25)] hover:scale-105' 
                : 'bg-brand-dark border-brand-border text-gray-400 hover:text-white hover:border-brand-green/40 hover:bg-brand-dark/80'
          }`}
        >
          {isUpdating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-dark" />
          ) : (
            <Power className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Primary Icon Container */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-lg border transition-all ${
          isOffline 
            ? 'bg-brand-dark border-brand-border'
            : device.status 
              ? 'bg-brand-dark border-brand-green/10' 
              : 'bg-brand-dark/40 border-brand-border/60'
        }`}>
          {getDeviceIcon()}
        </div>

        {/* Quick state stats */}
        <div className="text-xs">
          {isOffline ? (
            <div className="flex items-center gap-1 text-red-500 font-mono text-[10px]">
              <ShieldAlert className="h-3 w-3" />
              NODE OFFLINE
            </div>
          ) : !device.status ? (
            <span className="text-gray-500 font-mono text-[10px]">STANDBY</span>
          ) : (
            <div className="font-mono text-white text-[11px] font-semibold flex items-center gap-1.5">
              {device.type === 'light' && (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Brightness: {device.value}%</span>
                </>
              )}
              {device.type === 'fan' && (
                <>
                  <Fan className="h-3.5 w-3.5 text-cyan-400 animate-spin" style={{ animationDuration: `${6 - device.value}s` }} />
                  <span>Speed: {device.value} / 5</span>
                </>
              )}
              {device.type === 'ac' && (
                <>
                  <Thermometer className="h-3.5 w-3.5 text-blue-400" />
                  <span>{device.value}°C • {device.mode?.toUpperCase()}</span>
                </>
              )}
              {device.type === 'plug' && (
                <>
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Load: {device.value} W</span>
                </>
              )}
              {device.type === 'tv' && (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                  <span>Volume: {device.value}%</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Type Specific Controls (Slide / Adjusters) */}
      <div className="border-t border-brand-border/30 pt-3">
        {isOffline ? (
          <div className="text-[10px] text-gray-500 italic font-mono text-center">
            GATT communication failure. Power cycling node recommended.
          </div>
        ) : !device.status ? (
          <div className="text-[10px] text-gray-500 font-mono text-center py-1 uppercase">
            Turn device ON to modify states
          </div>
        ) : (
          <div className="space-y-2.5">
            
            {/* LIGHT BRIGHTNESS SLIDER */}
            {device.type === 'light' && (
              <div>
                <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
                  <span>BRIGHTNESS</span>
                  <span>{device.value}%</span>
                </div>
                <input
                  id={`slider-light-${device.id}`}
                  type="range"
                  min="10"
                  max="100"
                  value={device.value}
                  onChange={(e) => handleValueChange(parseInt(e.target.value))}
                  className="w-full accent-brand-green h-1 bg-brand-dark rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* FAN SPEED SELECTOR */}
            {device.type === 'fan' && (
              <div>
                <span className="block text-[10px] font-mono text-gray-400 mb-1.5 uppercase">FAN SPEED STEP</span>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((speed) => (
                    <button
                      key={speed}
                      id={`fan-btn-${device.id}-${speed}`}
                      onClick={() => handleValueChange(speed)}
                      className={`py-1 text-xs font-mono font-bold rounded border transition-all ${
                        device.value === speed 
                          ? 'bg-brand-green border-brand-green text-brand-dark' 
                          : 'bg-brand-dark border-brand-border text-gray-400 hover:text-white'
                      }`}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AIR CONDITIONER (AC) CONTROLS */}
            {device.type === 'ac' && (
              <div className="space-y-3">
                {/* Temp controls */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
                    <span>THERMOSTAT</span>
                    <span>{device.value}°C</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id={`ac-temp-down-${device.id}`}
                      onClick={() => handleValueChange(Math.max(16, device.value - 1))}
                      className="px-2 py-0.5 rounded bg-brand-dark border border-brand-border text-white hover:border-brand-green font-mono text-xs"
                    >
                      -
                    </button>
                    <input
                      id={`slider-ac-${device.id}`}
                      type="range"
                      min="16"
                      max="30"
                      value={device.value}
                      onChange={(e) => handleValueChange(parseInt(e.target.value))}
                      className="flex-1 accent-brand-green h-1 bg-brand-dark rounded-lg appearance-none cursor-pointer"
                    />
                    <button
                      id={`ac-temp-up-${device.id}`}
                      onClick={() => handleValueChange(Math.min(30, device.value + 1))}
                      className="px-2 py-0.5 rounded bg-brand-dark border border-brand-border text-white hover:border-brand-green font-mono text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Mode Selectors */}
                <div>
                  <span className="block text-[10px] font-mono text-gray-400 mb-1 uppercase">AC OPERATING MODE</span>
                  <div className="grid grid-cols-3 gap-1">
                    {['cool', 'eco', 'dry'].map((mode) => (
                      <button
                        key={mode}
                        id={`ac-mode-btn-${device.id}-${mode}`}
                        onClick={() => handleACModeChange(mode)}
                        className={`py-1 text-[10px] font-mono rounded border transition-all uppercase ${
                          device.mode === mode 
                            ? 'bg-brand-green border-brand-green text-brand-dark font-semibold' 
                            : 'bg-brand-dark border-brand-border text-gray-400 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SMART PLUGS */}
            {device.type === 'plug' && (
              <div>
                <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
                  <span>WATTAGE SIMULATOR</span>
                  <span>{device.value} W</span>
                </div>
                <input
                  id={`slider-plug-${device.id}`}
                  type="range"
                  min="5"
                  max="500"
                  value={device.value}
                  onChange={(e) => handleValueChange(parseInt(e.target.value))}
                  className="w-full accent-brand-green h-1 bg-brand-dark rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[8px] text-gray-500 block font-mono mt-1 text-right">
                  Equivalent load: ~{(device.value / 230).toFixed(2)} Amps (230V AC)
                </span>
              </div>
            )}

            {/* SMART TELEVISION */}
            {device.type === 'tv' && (
              <div>
                <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-1">
                  <span>AUDIO LEVEL</span>
                  <span>Volume: {device.value}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-3.5 w-3.5 text-gray-400" />
                  <input
                    id={`slider-tv-${device.id}`}
                    type="range"
                    min="0"
                    max="100"
                    value={device.value}
                    onChange={(e) => handleValueChange(parseInt(e.target.value))}
                    className="flex-1 accent-brand-green h-1 bg-brand-dark rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
