import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/client';
import { 
  Power, Cpu, Activity, Plus, Trash2, ShieldCheck, 
  Lightbulb, Fan, AirVent, RefreshCw, Terminal, 
  LogOut, LayoutDashboard, History, Settings
} from 'lucide-react';
import logoImg from '../assets/logo.jpg';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
  BarChart, Bar, XAxis, YAxis 
} from 'recharts';

const formatTimestamp = (isoString) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch (e) {
    return isoString;
  }
};

export default function Dashboard({ onLogout }) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [history, setHistory] = useState([]);

  const devicesRef = useRef([]);
  const historyRef = useRef([]);
  const selectedDeviceRef = useRef(null);

  useEffect(() => {
    selectedDeviceRef.current = selectedDevice;
  }, [selectedDevice]);
  
  // Uptime states
  const [startTime] = useState(Date.now());
  const [uptime, setUptime] = useState('00:00:00');

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Date.now() - startTime;
      const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setUptime(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);
  
  // Status states
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [username, setUsername] = useState('Admin');
  const [syncStatus, setSyncStatus] = useState('syncing'); // 'syncing' | 'online' | 'offline'

  // Active Tab/Menu state for sidebar navigation
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // Fetch admin profile details
  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/api/users/me');
      if (response.data && response.data.username) {
        setUsername(response.data.username.toUpperCase());
      }
    } catch (e) {
      console.error('[Dashboard] Error fetching profile:', e);
    }
  };

  // Fetch history logs for the active device
  const fetchHistory = useCallback(async (deviceId, showLoading = true) => {
    if (showLoading) setLoadingHistory(true);
    try {
      const response = await apiClient.get(`/api/devices/${deviceId}/history`);
      const data = response.data;
      if (JSON.stringify(historyRef.current) !== JSON.stringify(data)) {
        historyRef.current = data;
        setHistory(data);
      }
    } catch (e) {
      console.error('[Dashboard] Error fetching history:', e);
    } finally {
      if (showLoading) setLoadingHistory(false);
    }
  }, []);

  // Fetch device list from Render API
  const fetchDevices = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await apiClient.get('/api/devices');
      const data = response.data;
      
      if (JSON.stringify(devicesRef.current) !== JSON.stringify(data)) {
        devicesRef.current = data;
        setDevices(data);
      }
      setSyncStatus('online');

      const currentSelected = selectedDeviceRef.current;
      if (data.length > 0) {
        if (!currentSelected || !data.some(d => d.id === currentSelected.id)) {
          setSelectedDevice(data[0]);
          fetchHistory(data[0].id, true);
        } else {
          fetchHistory(currentSelected.id, false);
        }
      } else {
        setSelectedDevice(null);
        setHistory([]);
        historyRef.current = [];
      }
    } catch (e) {
      console.error('[Dashboard] Error fetching devices:', e);
      setSyncStatus('offline');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [fetchHistory]);

  // Pulling interval (every 10 seconds)
  useEffect(() => {
    fetchProfile();
    fetchDevices(true);

    const interval = setInterval(() => {
      fetchDevices(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchDevices]);

  // Update history whenever selected device changes
  useEffect(() => {
    if (selectedDevice) {
      fetchHistory(selectedDevice.id, true);
    }
  }, [selectedDevice, fetchHistory]);

  // Handle device toggle (optimistic UI render)
  const handleToggle = async (device) => {
    const newVal = !device.status;
    const targetState = newVal ? 'ON' : 'OFF';

    // Optimistic update
    setDevices(prev => {
      const updated = prev.map(d => d.id === device.id ? { ...d, status: newVal } : d);
      devicesRef.current = updated;
      return updated;
    });

    try {
      await apiClient.post(`/api/devices/${device.id}/control`, {
        status: targetState,
      });
      fetchDevices(false);
    } catch (e) {
      console.error('[Dashboard] Control toggle failed:', e);
      // Revert on error
      setDevices(prev => {
        const updated = prev.map(d => d.id === device.id ? { ...d, status: !newVal } : d);
        devicesRef.current = updated;
        return updated;
      });
      setSyncStatus('offline');
    }
  };

  // Delete device
  const handleDelete = async (deviceId, e) => {
    e.stopPropagation(); // prevent card click triggers
    if (!confirm('Are you sure you want to delete this hardware link?')) return;
    try {
      await apiClient.delete(`/api/devices/${deviceId}`);
      setDevices(prev => {
        const updated = prev.filter(d => d.id !== deviceId);
        devicesRef.current = updated;
        return updated;
      });
      if (selectedDevice && selectedDevice.id === deviceId) {
        setSelectedDevice(null);
        setHistory([]);
        historyRef.current = [];
      }
    } catch (e) {
      console.error('[Dashboard] Deletion failed:', e);
    }
  };

  // Recharts Data Computations (Using modern green palette)
  const getPieData = () => {
    const lights = devices.filter(d => d.type === 'light').length;
    const fans = devices.filter(d => d.type === 'fan').length;
    const acs = devices.filter(d => d.type === 'AC').length;
    return [
      { name: 'Lights', value: lights, color: '#22C55E' },
      { name: 'Fans', value: fans, color: '#4ADE80' },
      { name: 'AC Units', value: acs, color: '#15803D' }
    ].filter(item => item.value > 0);
  };

  const getBarData = () => {
    const active = devices.filter(d => d.status).length;
    const inactive = devices.filter(d => !d.status).length;
    return [
      { name: 'Active (ON)', count: active, fill: '#22C55E' },
      { name: 'Inactive (OFF)', count: inactive, fill: '#262626' }
    ];
  };

  // Helper for timeline icon and coloring
  const getLogStyle = (changeType) => {
    switch (changeType) {
      case 'device_created':
        return { label: 'REGISTERED', color: '#22C55E', text: 'Node handshake complete.' };
      case 'command_sent':
        return { label: 'TRANSMIT', color: '#9CA3AF', text: 'Signal trigger sent.' };
      case 'status_confirmed':
        return { label: 'SYNCED', color: '#22C55E', text: 'Confirmed via MQTT.' };
      default:
        return { label: 'LOG', color: '#64748B', text: 'Log entry.' };
    }
  };

  return (
    <div style={styles.dashboardContainer}>
      {/* Sidebar Navigation Panel */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarBrand}>
          <img src={logoImg} alt="4Layers Logo" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #262626' }} />
          <span style={styles.sidebarBrandName}>4Layers</span>
        </div>

        <nav style={styles.sidebarNav}>
          <button 
            onClick={() => setActiveMenu('dashboard')}
            style={{
              ...styles.sidebarNavItem,
              backgroundColor: activeMenu === 'dashboard' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
              color: activeMenu === 'dashboard' ? '#22C55E' : '#9CA3AF',
              borderColor: activeMenu === 'dashboard' ? '#22C55E' : 'transparent',
            }}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveMenu('devices')}
            style={{
              ...styles.sidebarNavItem,
              backgroundColor: activeMenu === 'devices' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
              color: activeMenu === 'devices' ? '#22C55E' : '#9CA3AF',
              borderColor: activeMenu === 'devices' ? '#22C55E' : 'transparent',
            }}
          >
            <Cpu size={18} />
            <span>Devices</span>
          </button>

          <button 
            onClick={() => setActiveMenu('logs')}
            style={{
              ...styles.sidebarNavItem,
              backgroundColor: activeMenu === 'logs' ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
              color: activeMenu === 'logs' ? '#22C55E' : '#9CA3AF',
              borderColor: activeMenu === 'logs' ? '#22C55E' : 'transparent',
            }}
          >
            <History size={18} />
            <span>History Logs</span>
          </button>

          <button 
            disabled
            style={{
              ...styles.sidebarNavItem,
              opacity: 0.4,
              cursor: 'not-allowed',
            }}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.profileBadge}>
            <span style={styles.profileText}>OPERATOR</span>
            <span style={styles.profileName}>{username}</span>
          </div>
          <button onClick={onLogout} style={styles.logoutBtn}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div style={styles.mainContent}>
        {/* Header bar */}
        <header style={styles.header}>
          <div style={styles.headerTitleGroup}>
            <h1 style={styles.headerTitle}>
              {activeMenu === 'dashboard' && 'Console Dashboard'}
              {activeMenu === 'devices' && 'Hardware Matrix'}
              {activeMenu === 'logs' && 'Operations Terminal Logs'}
            </h1>
            <span style={styles.headerSubtitle}>4Layers Premium IoT Control Center</span>
          </div>
          
          <div style={styles.headerStatus}>
            <span style={{
              ...styles.pulseDot,
              backgroundColor: syncStatus === 'online' ? '#22C55E' : '#EF4444',
            }} />
            <span style={{
              color: syncStatus === 'online' ? '#22C55E' : '#EF4444',
              fontWeight: '600',
              fontSize: '13px',
              textTransform: 'uppercase',
            }}>
              System {syncStatus}
            </span>
          </div>
        </header>

        {/* Dashboard Panels Grid */}
        <div style={styles.gridContainer}>
          {/* Row 1: Telemetry Stats */}
          <section style={styles.statsRow}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Linked Nodes</span>
              <div style={styles.statValueRow}>
                <span style={styles.statValue}>{devices.length}</span>
                <Cpu size={20} color="#22C55E" />
              </div>
            </div>

            <div style={styles.statCard}>
              <span style={styles.statLabel}>Active Nodes (ON)</span>
              <div style={styles.statValueRow}>
                <span style={styles.statValue}>{devices.filter(d => d.status).length}</span>
                <Power size={20} color="#22C55E" />
              </div>
            </div>

            <div style={styles.statCard}>
              <span style={styles.statLabel}>Session Uptime</span>
              <div style={styles.statValueRow}>
                <span style={{ ...styles.statValue, color: '#22C55E' }}>{uptime}</span>
                <Activity size={20} color="#22C55E" />
              </div>
            </div>
          </section>

          {/* Row 2: Double Split Column */}
          <div style={styles.mainContentSplit}>
            
            {/* Left Column: Device matrix & System Status */}
            <div style={styles.leftPane}>
              {/* System Status Section */}
              <div style={styles.panelCard}>
                <h3 style={styles.panelTitle}>System Status</h3>
                <div style={styles.statusGrid}>
                  <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>MQTT Broker</span>
                    <div style={styles.statusValueGroup}>
                      <span style={{
                        ...styles.statusIndicator,
                        backgroundColor: syncStatus === 'online' ? '#22C55E' : '#EF4444',
                      }} />
                      <span style={styles.statusValue}>
                        {syncStatus === 'online' ? 'CONNECTED' : 'DISCONNECTED'}
                      </span>
                    </div>
                    <span style={styles.statusSubtext}>broker.emqx.io:1883</span>
                  </div>

                  <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>Render API Endpoint</span>
                    <div style={styles.statusValueGroup}>
                      <span style={{
                        ...styles.statusIndicator,
                        backgroundColor: syncStatus === 'online' ? '#22C55E' : '#EF4444',
                      }} />
                      <span style={styles.statusValue}>
                        {syncStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                    <span style={styles.statusSubtext}>smartnest-3jr4.onrender.com</span>
                  </div>
                </div>
              </div>

              {/* Grid Control Matrix Board */}
              <div style={{ ...styles.panelCard, position: 'relative' }}>
                <h3 style={styles.panelTitle}>Device Matrix Board</h3>
                
                {loading && devices.length === 0 ? (
                  <div style={styles.centered}>
                    <RefreshCw size={24} style={styles.spinner} />
                    <span style={{ marginLeft: '8px', fontSize: '14px', color: '#9CA3AF' }}>Connecting matrix...</span>
                  </div>
                ) : devices.length === 0 ? (
                  <div style={styles.centered}>
                    <Terminal size={36} color="#262626" />
                    <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '12px' }}>Matrix empty. Link nodes via mobile app.</p>
                  </div>
                ) : (
                  <div style={{ position: 'relative', transition: 'opacity 0.3s ease', opacity: loading ? 0.6 : 1 }}>
                    <div style={styles.devicesGrid}>
                      {devices.map((device) => {
                        const isSelected = selectedDevice && selectedDevice.id === device.id;
                        const isActive = device.status;
                        const deviceColor = isActive ? '#22C55E' : '#262626';

                        return (
                          <div
                            key={device.id}
                            onClick={() => handleToggle(device)}
                            style={{
                              ...styles.deviceCard,
                              backgroundColor: '#1A1A1A',
                              borderColor: isActive ? '#22C55E' : '#262626',
                            }}
                          >
                            {/* Selected Indicator */}
                            {isSelected && <div style={styles.selectedIndicator} />}
                            
                            <div style={styles.cardHeaderActions}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDevice(device);
                                }}
                                style={{
                                  ...styles.cardActionBtn,
                                  color: isSelected ? '#22C55E' : '#9CA3AF'
                                }}
                                title="Inspect logs"
                              >
                                <Terminal size={14} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(device.id, e)}
                                style={{ ...styles.cardActionBtn, color: '#EF4444' }}
                                title="Delete node"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div style={styles.cardIconWrapper}>
                              {device.type === 'light' && <Lightbulb size={28} color={isActive ? '#22C55E' : '#9CA3AF'} />}
                              {device.type === 'fan' && <Fan size={28} color={isActive ? '#22C55E' : '#9CA3AF'} style={isActive ? styles.rotateAnim : {}} />}
                              {device.type === 'AC' && <AirVent size={28} color={isActive ? '#22C55E' : '#9CA3AF'} />}
                            </div>

                            <span style={styles.cardName}>{device.name}</span>
                            <span style={styles.cardType}>{device.type.toUpperCase()}</span>
                            
                            <span style={{
                              ...styles.statusText,
                              color: isActive ? '#22C55E' : '#9CA3AF'
                            }}>
                              {isActive ? 'ACTIVE' : 'OFFLINE'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Telemetry logs timeline & Analytics charts */}
            <div style={styles.rightPane}>
              {/* Timeline logs */}
              <div style={styles.panelCard}>
                <h3 style={styles.panelTitle}>
                  Telemetry Logs: {selectedDevice ? selectedDevice.name.toUpperCase() : 'NO NODE SELECTED'}
                </h3>
                
                {!selectedDevice ? (
                  <div style={styles.logsEmpty}>
                    <Terminal size={24} color="#262626" />
                    <span style={{ color: '#9CA3AF', fontSize: '13px', marginLeft: '8px' }}>Select a node card terminal to view logs.</span>
                  </div>
                ) : (
                  <div style={{ position: 'relative', minHeight: '240px' }}>
                    {/* Loader */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: 'rgba(26, 26, 26, 0.7)',
                      zIndex: 10,
                      opacity: loadingHistory ? 1 : 0,
                      pointerEvents: loadingHistory ? 'auto' : 'none',
                      transition: 'opacity 0.3s ease',
                      borderRadius: '8px',
                    }}>
                      <RefreshCw size={18} style={styles.spinner} />
                      <span style={{ color: '#9CA3AF', fontSize: '13px', marginLeft: '8px' }}>Retrieving logs...</span>
                    </div>

                    <div style={{ 
                      opacity: loadingHistory ? 0.3 : 1, 
                      transition: 'opacity 0.3s ease',
                      height: '100%' 
                    }}>
                      {history.length === 0 ? (
                        <div style={styles.logsEmpty}>
                          <span style={{ color: '#9CA3AF', fontSize: '13px' }}>Node linked, but no packets logged yet.</span>
                        </div>
                      ) : (
                        <div style={styles.historyTimeline}>
                          {history.map((log) => {
                            const style = getLogStyle(log.change_type);
                            return (
                              <div key={log.id} style={styles.timelineItem}>
                                <div style={{ ...styles.timelineDot, backgroundColor: style.color }} />
                                <div style={styles.timelineContent}>
                                  <div style={styles.timelineHeader}>
                                    <span style={{ ...styles.timelineType, color: style.color }}>{style.label}</span>
                                    <span style={styles.timelineTime}>{formatTimestamp(log.timestamp)}</span>
                                  </div>
                                  <p style={styles.timelineText}>
                                    {style.text}{' '}
                                    {log.change_type === 'command_sent' && (
                                      <span>
                                        Requested: <strong style={{ color: '#22C55E' }}>{log.new_state}</strong>
                                      </span>
                                    )}
                                    {log.change_type === 'status_confirmed' && (
                                      <span>
                                        Status Verified: <strong style={{ color: '#22C55E' }}>{log.new_state}</strong>
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Analytics row */}
              {devices.length > 0 && (
                <div style={styles.chartsContainer}>
                  {/* Distribution pie */}
                  <div style={styles.chartPanel}>
                    <h4 style={styles.chartTitle}>Node Distribution</h4>
                    <div style={{ width: '100%', height: '150px' }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={getPieData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={55}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {getPieData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={styles.chartTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div style={styles.chartLegend}>
                      {getPieData().map((entry) => (
                        <div key={entry.name} style={styles.legendItem}>
                          <span style={{ ...styles.legendDot, backgroundColor: entry.color }} />
                          <span>{entry.name}: {entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metrics bar */}
                  <div style={styles.chartPanel}>
                    <h4 style={styles.chartTitle}>State Metrics</h4>
                    <div style={{ width: '100%', height: '180px' }}>
                      <ResponsiveContainer>
                        <BarChart data={getBarData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} contentStyle={styles.chartTooltip} />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {getBarData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  dashboardContainer: {
    minHeight: '100vh',
    display: 'flex',
    backgroundColor: '#0D0D0D',
  },
  sidebar: {
    width: '260px',
    backgroundColor: '#1A1A1A',
    borderRight: '1.5px solid #262626',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
  },
  sidebarBrand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '36px',
    width: '100%',
  },
  sidebarBrandName: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '-0.5px',
    textAlign: 'center',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  sidebarNavItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1.5px solid transparent',
    color: '#9CA3AF',
    backgroundColor: 'transparent',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  sidebarFooter: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    borderTop: '1px solid #262626',
    paddingTop: '20px',
  },
  profileBadge: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingLeft: '8px',
  },
  profileText: {
    fontSize: '9px',
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: '0.8px',
  },
  profileName: {
    fontSize: '14px',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: 'transparent',
    border: '1.5px solid #262626',
    borderRadius: '8px',
    color: '#FFFFFF',
    padding: '10px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  mainContent: {
    flex: 1,
    marginLeft: '260px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #262626',
    paddingBottom: '20px',
    marginBottom: '24px',
  },
  headerTitleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#FFFFFF',
    margin: 0,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#9CA3AF',
  },
  headerStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #262626',
    borderRadius: '24px',
    padding: '6px 14px',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },
  statCard: {
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #262626',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  mainContentSplit: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 1fr',
    gap: '24px',
  },
  leftPane: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightPane: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  panelCard: {
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #262626',
    borderRadius: '16px',
    padding: '24px',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFFFFF',
    margin: '0 0 20px 0',
    fontFamily: "'Space Grotesk', sans-serif",
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderLeft: '3px solid #22C55E',
    paddingLeft: '10px',
  },
  centered: {
    height: '200px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    color: '#22C55E',
    animation: 'spin 1.5s infinite linear',
  },
  devicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
    gap: '16px',
  },
  deviceCard: {
    borderRadius: '12px',
    border: '1.5px solid #262626',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    willChange: 'opacity',
  },
  selectedIndicator: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#22C55E',
  },
  cardHeaderActions: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    display: 'flex',
    gap: '4px',
  },
  cardActionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
  },
  cardIconWrapper: {
    margin: '16px 0 12px 0',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#0D0D0D',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardType: {
    fontSize: '9px',
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: '4px',
    letterSpacing: '0.5px',
  },
  statusText: {
    fontSize: '9px',
    fontWeight: '700',
    marginTop: '12px',
    letterSpacing: '0.5px',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  statusItem: {
    backgroundColor: '#0D0D0D',
    border: '1.5px solid #262626',
    borderRadius: '12px',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  statusIndicator: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  statusValueGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusValue: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  statusSubtext: {
    fontSize: '9px',
    color: '#9CA3AF',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logsEmpty: {
    height: '140px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTimeline: {
    height: '200px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingRight: '6px',
  },
  timelineItem: {
    display: 'flex',
    gap: '14px',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  timelineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '6px',
    flexShrink: '0',
    transition: 'all 0.2s ease',
  },
  timelineContent: {
    flex: '1',
    backgroundColor: '#0D0D0D',
    border: '1px solid #262626',
    borderRadius: '8px',
    padding: '10px 14px',
    transition: 'all 0.2s ease',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  timelineType: {
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  timelineTime: {
    fontSize: '9px',
    color: '#9CA3AF',
  },
  timelineText: {
    margin: '0',
    fontSize: '12px',
    color: '#FFFFFF',
    lineHeight: '16px',
  },
  chartsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  chartPanel: {
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #262626',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  chartTitle: {
    alignSelf: 'flex-start',
    fontSize: '11px',
    fontWeight: '600',
    color: '#9CA3AF',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  chartTooltip: {
    backgroundColor: '#1A1A1A',
    border: '1.5px solid #22C55E',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '12px',
  },
  chartLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '12px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#9CA3AF',
    fontWeight: '600',
  },
  legendDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  rotateAnim: {
    animation: 'spin 4s infinite linear',
  },
};

// Inject keyframe rotation styles to document for fan icon
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
