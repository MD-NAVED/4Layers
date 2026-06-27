/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Clock, Calendar, Plus, Trash2, Check, BellRing, ChevronRight, ListCollapse } from 'lucide-react';
import { Schedule, Device } from '../types';

interface ScheduleManagerProps {
  schedules: Schedule[];
  devices: Device[];
  onAddSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (id: string) => void;
  onToggleSchedule: (id: string) => void;
}

export default function ScheduleManager({
  schedules,
  devices,
  onAddSchedule,
  onDeleteSchedule,
  onToggleSchedule
}: ScheduleManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form fields
  const [selectedDevice, setSelectedDevice] = useState(devices[0]?.id || '');
  const [action, setAction] = useState<'on' | 'off'>('on');
  const [time, setTime] = useState('08:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleToggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetDev = devices.find(d => d.id === selectedDevice);
    if (!targetDev) return;

    const newSched: Schedule = {
      id: `sched-${Date.now()}`,
      deviceId: selectedDevice,
      deviceName: targetDev.name,
      action,
      time,
      days: selectedDays,
      enabled: true
    };

    onAddSchedule(newSched);
    setShowAddForm(false);
    // Reset defaults
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  };

  return (
    <div id="schedule-manager-card" className="bg-brand-card border border-brand-border rounded-3xl p-5 shadow-xl transition-all duration-300">
      
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-brand-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-green" />
            <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">Automated Timers</h3>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mt-0.5">Scheduled MQTT On/Off Rules</p>
        </div>

        <button
          id="toggle-schedule-form-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-green text-brand-dark text-xs font-semibold hover:bg-brand-green/90 transition-all active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Schedule
        </button>
      </div>

      {/* NEW RULE FORM */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-brand-dark border border-brand-border rounded-lg p-3.5 mb-4 space-y-3">
          <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5 border-b border-brand-border/40 pb-1.5">
            <BellRing className="h-3 w-3 text-brand-green" />
            Configure Automated Action
          </h4>

          <div>
            <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Target Smart Appliance</label>
            <select
              id="schedule-device-select"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full bg-brand-card border border-brand-border focus:border-brand-green/40 text-xs px-2.5 py-1.5 rounded-lg text-white"
              required
            >
              {devices.map((dev) => (
                <option key={dev.id} value={dev.id}>
                  {dev.name} ({dev.nodeId.substring(0, 10)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Action Trigger</label>
              <div className="flex bg-brand-card p-1 rounded-lg border border-brand-border">
                <button
                  type="button"
                  id="schedule-action-on-btn"
                  onClick={() => setAction('on')}
                  className={`flex-1 py-1 text-xs rounded font-medium transition-all ${
                    action === 'on' 
                      ? 'bg-brand-green text-brand-dark' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Turn ON
                </button>
                <button
                  type="button"
                  id="schedule-action-off-btn"
                  onClick={() => setAction('off')}
                  className={`flex-1 py-1 text-xs rounded font-medium transition-all ${
                    action === 'off' 
                      ? 'bg-brand-green text-brand-dark' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Turn OFF
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Time (24h format)</label>
              <input
                id="schedule-time-input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-brand-card border border-brand-border focus:border-brand-green/40 text-xs px-2.5 py-1 rounded-lg text-white font-mono h-[30px]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Repeat Days</label>
            <div className="flex flex-wrap gap-1">
              {daysOfWeek.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    id={`day-select-${day}`}
                    onClick={() => handleToggleDay(day)}
                    className={`h-7 w-8 rounded text-[10px] font-mono font-bold transition-all border ${
                      isSelected 
                        ? 'bg-brand-green border-brand-green text-brand-dark' 
                        : 'bg-brand-card border-brand-border text-gray-400 hover:text-white'
                    }`}
                  >
                    {day.substring(0, 2)}
                  </button>
                );
              })}
            </div>
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
              id="schedule-save-btn"
              className="flex-1 py-1.5 bg-brand-green text-brand-dark rounded-lg text-xs font-bold uppercase hover:bg-brand-green/90"
            >
              Commit Rule
            </button>
          </div>
        </form>
      )}

      {/* SCHEDULES LIST */}
      <div className="space-y-2.5">
        {schedules.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500 font-mono">
            No active schedules configured. Use "Add Schedule" above.
          </div>
        ) : (
          schedules.map((sched) => (
            <div
              key={sched.id}
              id={`schedule-row-${sched.id}`}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                sched.enabled 
                  ? 'bg-brand-dark/40 border-brand-border hover:border-brand-green/30' 
                  : 'bg-brand-dark/10 border-brand-border/40 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded border ${
                  sched.enabled 
                    ? sched.action === 'on' 
                      ? 'bg-emerald-950/20 border-emerald-900/60 text-brand-green' 
                      : 'bg-red-950/20 border-red-900/60 text-red-400' 
                    : 'bg-brand-dark border-brand-border text-gray-500'
                }`}>
                  <Clock className="h-4 w-4" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-bold text-white tracking-wider">{sched.time}</span>
                    <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded uppercase ${
                      sched.action === 'on' ? 'bg-emerald-950 text-brand-green' : 'bg-red-950/80 text-red-400'
                    }`}>
                      {sched.action === 'on' ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300 font-medium truncate max-w-[160px]">{sched.deviceName}</div>
                  
                  {/* Active days list */}
                  <div className="flex gap-0.5 mt-1">
                    {daysOfWeek.map((day) => {
                      const isActive = sched.days.includes(day);
                      return (
                        <span
                          key={day}
                          className={`text-[8px] font-mono font-bold px-1 rounded ${
                            isActive 
                              ? 'text-brand-green bg-brand-green/10' 
                              : 'text-gray-600'
                          }`}
                        >
                          {day.substring(0, 1)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Toggle Enable & Delete */}
              <div className="flex items-center gap-2">
                <button
                  id={`schedule-toggle-enabled-${sched.id}`}
                  onClick={() => onToggleSchedule(sched.id)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    sched.enabled ? 'bg-brand-green' : 'bg-brand-dark border-brand-border'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      sched.enabled ? 'translate-x-4 bg-brand-dark' : 'translate-x-0'
                    }`}
                  />
                </button>

                <button
                  id={`schedule-delete-${sched.id}`}
                  onClick={() => onDeleteSchedule(sched.id)}
                  className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-brand-dark/80 transition-all border border-transparent hover:border-red-900/40"
                  title="Delete schedule"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
