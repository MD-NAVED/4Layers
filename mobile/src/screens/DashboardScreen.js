import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import apiClient from "../api/client";
import DeviceCard from "../components/DeviceCard";
import EnergyChart from "../components/EnergyChart";
const TOKENS = {
  bg: "#131313",
  cardBg: "#1E1E1E",
  accent: "#22C55E",
  border: "rgba(255, 255, 255, 0.05)",
  textPrimary: "#DFE2F1",
  textSecondary: "#BBC9CF",
  error: "#EF4444"
};
function CapsuleSwitch({ isEnabled, onToggle }) {
  return (
    <View style={styles.capsuleContainer}>
      <TouchableOpacity
        style={[styles.capsuleButton, isEnabled && styles.capsuleBtnOnActive]}
        onPress={() => !isEnabled && onToggle()}
        activeOpacity={0.8}
      >
        <Text style={[styles.capsuleText, isEnabled ? styles.capsuleTextOnActive : styles.capsuleTextInactive]}>On</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.capsuleButton, !isEnabled && styles.capsuleBtnOffActive]}
        onPress={() => isEnabled && onToggle()}
        activeOpacity={0.8}
      >
        <Text style={[styles.capsuleText, !isEnabled ? styles.capsuleTextOffActive : styles.capsuleTextInactive]}>Off</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const [selectedRoom, setSelectedRoom] = useState("");
  const [isArmed, setIsArmed] = useState(true);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [roomMapping, setRoomMapping] = useState({});
  const [dbRooms, setDbRooms] = useState([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [username, setUsername] = useState("User");

  const fetchRoomsMapping = async () => {
    try {
      const homesRes = await apiClient.get('/api/homes');
      if (homesRes.data && homesRes.data.length > 0) {
        const homeId = homesRes.data[0].id;
        const roomsRes = await apiClient.get(`/api/rooms/home/${homeId}`);
        if (roomsRes.data && roomsRes.data.length > 0) {
          const mapping = {};
          roomsRes.data.forEach(r => {
            mapping[r.id] = r.name;
          });
          setRoomMapping(mapping);
          setDbRooms(roomsRes.data);
          
          // Auto-select first room if none is selected, or if selected room was deleted
          const roomIds = roomsRes.data.map(r => r.id);
          setSelectedRoom(prev => {
            if (!prev || !roomIds.includes(prev)) {
              return roomsRes.data[0].id;
            }
            return prev;
          });
        } else {
          setDbRooms([]);
          setSelectedRoom("");
        }
      }
    } catch (e) {
      console.warn("Failed to fetch room mapping:", e);
    }
  };

  const fetchUnreadAlertsCount = async () => {
    try {
      const res = await apiClient.get('/api/alerts?unread_only=true');
      setUnreadAlertsCount(res.data.length);
    } catch (e) {
      console.warn("Failed to fetch unread alerts count:", e);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get('/api/users/me');
      if (res.data && res.data.username) {
        setUsername(res.data.username);
      }
    } catch (e) {
      console.warn("Failed to fetch user profile name:", e);
    }
  };

  const fetchDevices = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const response = await apiClient.get("/api/devices");
      const data = response.data;
      if (Array.isArray(data)) {
        const formattedList = data.map(d => {
          let mobileType = 'outlet';
          if (d.device_type === 'light') mobileType = 'light';
          else if (d.device_type === 'ac') mobileType = 'thermostat';
          else if (d.device_type === 'fan') mobileType = 'fan';
          else if (d.device_type === 'tv') mobileType = 'outlet';
          else if (d.device_type === 'plug') mobileType = 'outlet';

          return {
            id: d.id,
            name: d.name,
            room_id: d.room_id,
            node_id: d.node_id,
            type: mobileType,
            status: d.current_state?.status === 'ON',
            value: d.current_state?.value !== undefined ? d.current_state.value : (d.device_type === 'ac' ? 72 : 50)
          };
        });
        
        // Sort devices by node_id to ensure stable ordering in the dashboard
        formattedList.sort((a, b) => {
          if (!a.node_id || !b.node_id) return 0;
          return a.node_id.localeCompare(b.node_id, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        setDevices(formattedList);
        setHasError(false);
      } else {
        throw new Error("Returned telemetry data is not a valid list of devices");
      }
    } catch (error) {
      console.warn("API fetch failed:", error);
      setHasError(true);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRoomsMapping();
    fetchUnreadAlertsCount();
    fetchProfile();
  }, []);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const showLoading = !hasLoadedRef.current;
    fetchDevices(showLoading);
    hasLoadedRef.current = true;
    const intervalId = setInterval(() => {
      fetchDevices(false);
      fetchUnreadAlertsCount();
    }, 10000);
    return () => clearInterval(intervalId);
  }, [roomMapping]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchRoomsMapping();
      fetchDevices(true);
      fetchUnreadAlertsCount();
      fetchProfile();
    });
    return unsubscribe;
  }, [navigation, roomMapping]);

  const handleToggleDevice = async (id) => {
    const target = devices.find((d) => d.id === id);
    if (!target) return;
    const nextStatus = !target.status;
    
    setDevices((prev) => prev.map((d) => d.id === id ? { ...d, status: nextStatus } : d));
    
    try {
      await apiClient.post(`/api/devices/${id}/control`, {
        state: { status: nextStatus ? 'ON' : 'OFF' }
      });
      fetchDevices(false);
    } catch (err) {
      console.warn("Failed to sync toggle with server MQTT:", err);
      setDevices((prev) => prev.map((d) => d.id === id ? { ...d, status: !nextStatus } : d));
    }
  };

  const handleAdjustValue = async (id, step) => {
    const target = devices.find((d) => d.id === id);
    if (!target) return;
    const maxVal = target.type === "thermostat" ? 90 : 100;
    const minVal = target.type === "thermostat" ? 60 : 0;
    const nextVal = Math.max(minVal, Math.min(maxVal, target.value + step));
    
    setDevices((prev) => prev.map((d) => d.id === id ? { ...d, value: nextVal } : d));
    
    try {
      await apiClient.post(`/api/devices/${id}/control`, {
        state: { 
          status: target.status ? 'ON' : 'OFF',
          value: nextVal 
        }
      });
      fetchDevices(false);
    } catch (err) {
      console.warn("Failed to sync adjusted value with server:", err);
      setDevices((prev) => prev.map((d) => d.id === id ? { ...d, value: target.value } : d));
    }
  };

  const handleBulkControl = async (turnOn) => {
    const targetState = turnOn ? 'ON' : 'OFF';
    const deviceIds = filteredDevices.map(d => d.id);

    if (deviceIds.length === 0) return;

    setDevices(prev => prev.map(d => deviceIds.includes(d.id) ? { ...d, status: turnOn } : d));

    try {
      await apiClient.post('/api/devices/bulk-control', {
        device_ids: deviceIds,
        state: { status: targetState }
      });
      fetchDevices(false);
    } catch (err) {
      console.warn("Failed bulk control operation:", err);
      fetchDevices(true);
    }
  };

  const filteredDevices = devices.filter((device) => device.room_id === selectedRoom);

  const isSecurityArmed = !!isArmed;
  const ROOM_TABS = dbRooms.map((r) => ({ id: r.id, label: r.name }));

  return <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={TOKENS.bg} />
      
      {/* Premium Custom Top Bar */}
      <View style={styles.customHeader}>
        <View style={styles.logoGroup}>
          <MaterialCommunityIcons name="layers" size={28} color={TOKENS.accent} />
          <Text style={styles.logoText}>4Layers</Text>
        </View>
        <View style={styles.headerRightGroup}>
          {/* Connection Status Badge */}
          <View style={styles.connectionBadge}>
            <View style={[
              styles.connectionDot,
              !hasError ? styles.connectionDotOnline : styles.connectionDotOffline
            ]} />
            <Text style={styles.connectionText}>
              {!hasError ? "Connected" : "Offline"}
            </Text>
          </View>
          {/* Notifications Bell */}
          <TouchableOpacity 
            style={styles.bellButton}
            onPress={() => navigation.navigate("Alerts")}
            accessibilityRole="button"
            accessibilityLabel="System Notifications Center"
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={TOKENS.textPrimary} />
            {unreadAlertsCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadAlertsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Horizontal Room Scroll Selector Row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsScrollContainer}
          style={styles.tabsScrollView}
        >
          {ROOM_TABS.map((tab) => {
            const isActive = selectedRoom === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                activeOpacity={0.7}
                onPress={() => setSelectedRoom(tab.id)}
                style={[
                  styles.tabChip,
                  isActive ? styles.tabChipActive : styles.tabChipInactive
                ]}
                accessibilityRole="tab"
                accessibilityState={isActive ? { selected: true } : void 0}
                accessibilityLabel={`${tab.label} view filter`}
              >
                <Text 
                  numberOfLines={1}
                  style={[
                    styles.tabChipText,
                    isActive ? styles.tabChipTextActive : styles.tabChipTextInactive
                  ]}
                >
                  {tab.label}
                </Text>
                {isActive && (
                  <MaterialCommunityIcons 
                    name="menu-down" 
                    size={16} 
                    color="#002112" 
                    style={{ marginLeft: 2 }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Greeting section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingTitle}>Welcome, {username}</Text>
          <Text style={styles.greetingSubtitle}>All primary systems are online and responsive.</Text>
        </View>

        {/* Real Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statColumn}>
            <Text style={styles.statNumber}>{filteredDevices.length}</Text>
            <Text style={styles.statLabel}>Total Devices</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statColumn}>
            <Text style={styles.statNumber}>{filteredDevices.filter(d => d.status).length}</Text>
            <Text style={styles.statLabel}>Devices ON</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statColumn}>
            <Text style={styles.statNumber}>{dbRooms.length}</Text>
            <Text style={styles.statLabel}>Rooms</Text>
          </View>
        </View>

        {/* Real Master Switch Card */}
        {filteredDevices.length > 0 && (
          <View style={[styles.masterCard, filteredDevices.some(d => d.status) && styles.masterCardActive]}>
            <View style={styles.masterInfoGroup}>
              <MaterialCommunityIcons 
                name="power" 
                size={32} 
                color={filteredDevices.some(d => d.status) ? TOKENS.accent : TOKENS.textSecondary} 
              />
              <View style={styles.masterTextGroup}>
                <Text style={styles.masterTitle}>MASTER SWITCH</Text>
                <Text style={styles.masterSubtitle}>
                  All {selectedRoom === "all" ? "home" : "room"} switches
                </Text>
              </View>
            </View>
            <CapsuleSwitch 
              isEnabled={filteredDevices.some(d => d.status)} 
              onToggle={() => handleBulkControl(!filteredDevices.some(d => d.status))} 
            />
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>SWITCHBOARD CONTROLS</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Rooms")} style={styles.manageLink}>
            <MaterialCommunityIcons name="cog" size={14} color={TOKENS.accent} />
            <Text style={styles.manageLinkText}>Manage</Text>
          </TouchableOpacity>
        </View>
        
        {isLoading ? <View style={styles.statusBox}>
            <View style={styles.activeDot} />
            <Text style={styles.statusText}>Connecting to hardware relays...</Text>
          </View> : hasError ? <View style={[styles.statusBox, styles.statusBoxWarning]}>
            <Text style={styles.statusTitle}>CONNECTION FALLBACK ACTIVE</Text>
            <Text style={styles.statusSubtitle}>FastAPI server is sleeping. Local telemetry simulation running.</Text>
          </View> : filteredDevices.length === 0 ? <View style={styles.statusBox}>
            <Text style={styles.statusText}>No devices in this room yet</Text>
          </View> : <View style={styles.listContainer}>
            {filteredDevices.map((device) => {
              const isEnabled = !!device.status;
              const getDeviceIcon = (type, active) => {
                switch (type) {
                  case 'light':
                    return active ? 'lightbulb' : 'lightbulb-outline';
                  case 'thermostat':
                    return 'thermostat';
                  case 'fan':
                    return 'fan';
                  default:
                    return active ? 'power-plug' : 'power-plug-off';
                }
              };
              
              return (
                <View
                  key={device.id}
                  style={[
                    styles.listItem,
                    !!isEnabled && styles.listItemActive
                  ]}
                >
                  {/* Top Control Row */}
                  <View style={styles.deviceRow}>
                    <View style={styles.deviceLeftGroup}>
                      <MaterialCommunityIcons 
                        name={getDeviceIcon(device.type, isEnabled)} 
                        size={24} 
                        color={isEnabled ? TOKENS.accent : TOKENS.textSecondary} 
                        style={styles.deviceIcon} 
                      />
                      <View style={styles.deviceMeta}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <View style={[
                            styles.statusDot, 
                            { backgroundColor: device.is_online ? TOKENS.accent : TOKENS.error }
                          ]} />
                          <Text style={styles.deviceName} numberOfLines={1}>
                            {device.name}
                          </Text>
                        </View>
                        <Text style={styles.deviceTypeLabel}>
                          {device.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <CapsuleSwitch 
                      isEnabled={isEnabled} 
                      onToggle={() => handleToggleDevice(device.id)} 
                    />
                  </View>

                  {/* Fan Speed Slider Controls */}
                  {device.type === "fan" && (
                    <View style={styles.sliderContainer}>
                      <View style={styles.sliderTrackRow}>
                        <MaterialCommunityIcons name="snowflake" size={14} color={TOKENS.textSecondary} />
                        <View style={styles.sliderTrack}>
                          <View style={[styles.sliderProgress, { width: `${(device.value / 5) * 100}%` }]} />
                        </View>
                        <MaterialCommunityIcons name="air-conditioner" size={14} color={TOKENS.textSecondary} />
                      </View>
                      <View style={styles.sliderAdjuster}>
                        <TouchableOpacity 
                          style={styles.sliderBtn} 
                          onPress={() => handleAdjustValue(device.id, -1)}
                          disabled={!isEnabled}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.sliderBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.sliderValueText}>Speed {device.value}/5</Text>
                        <TouchableOpacity 
                          style={styles.sliderBtn} 
                          onPress={() => handleAdjustValue(device.id, 1)}
                          disabled={!isEnabled}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.sliderBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Light Dimmer/Brightness Slider Controls (Only for LED Strip/Dimmable lights) */}
                  {device.type === "light" && (
                    device.name?.toLowerCase().includes('strip') || 
                    device.name?.toLowerCase().includes('dimmable') || 
                    device.name?.toLowerCase().includes('led') ||
                    device.node_id?.endsWith('_6')
                  ) && (
                    <View style={styles.sliderContainer}>
                      <View style={styles.sliderTrackRow}>
                        <MaterialCommunityIcons name="brightness-5" size={14} color={TOKENS.textSecondary} />
                        <View style={styles.sliderTrack}>
                          <View style={[styles.sliderProgress, { width: `${device.value}%` }]} />
                        </View>
                        <MaterialCommunityIcons name="brightness-7" size={14} color={TOKENS.textSecondary} />
                      </View>
                      <View style={styles.sliderAdjuster}>
                        <TouchableOpacity 
                          style={styles.sliderBtn} 
                          onPress={() => handleAdjustValue(device.id, -10)}
                          disabled={!isEnabled}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.sliderBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.sliderValueText}>Brightness {device.value}%</Text>
                        <TouchableOpacity 
                          style={styles.sliderBtn} 
                          onPress={() => handleAdjustValue(device.id, 10)}
                          disabled={!isEnabled}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.sliderBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Thermostat Controls */}
                  {device.type === "thermostat" && (
                    <View style={styles.sliderContainer}>
                      <View style={styles.sliderAdjuster}>
                        <TouchableOpacity 
                          style={styles.sliderBtn} 
                          onPress={() => handleAdjustValue(device.id, -1)}
                          disabled={!isEnabled}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.sliderBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.sliderValueText}>Temp {device.value}°F</Text>
                        <TouchableOpacity 
                          style={styles.sliderBtn} 
                          onPress={() => handleAdjustValue(device.id, 1)}
                          disabled={!isEnabled}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.sliderBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Outlet Power consumption */}
                  {device.type === "outlet" && (
                    <View style={styles.powerConsumptionRow}>
                      <Text style={styles.powerLabel}>Load Power</Text>
                      <Text style={[styles.powerValue, isEnabled && styles.powerValueActive]}>
                        {isEnabled ? `${device.value} W` : "0 W"}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>}

      </ScrollView>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: TOKENS.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32
  },
  customHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.border,
    backgroundColor: TOKENS.bg
  },
  logoGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  logoText: {
    fontSize: 22,
    fontWeight: "900",
    color: TOKENS.accent,
    letterSpacing: -0.5
  },
  headerRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  connectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: TOKENS.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  connectionDotOnline: {
    backgroundColor: TOKENS.accent,
    shadowColor: TOKENS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3
  },
  connectionDotOffline: {
    backgroundColor: TOKENS.error
  },
  connectionText: {
    fontSize: 10,
    fontWeight: "700",
    color: TOKENS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  greetingSection: {
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: TOKENS.textPrimary
  },
  greetingSubtitle: {
    fontSize: 12,
    color: TOKENS.textSecondary,
    marginTop: 4
  },
  sectionHeader: {
    fontSize: 10,
    fontFamily: "System",
    fontWeight: "800",
    color: TOKENS.textSecondary,
    letterSpacing: 1.5,
    marginTop: 24,
    marginBottom: 12
  },
  card: {
    backgroundColor: TOKENS.cardBg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    borderRadius: 16,
    padding: 18,
    marginTop: 16
  },
  cardActiveBorder: {
    borderColor: TOKENS.accent
  },
  efficiencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "System",
    fontWeight: "700",
    color: TOKENS.textPrimary
  },
  cardSubtitle: {
    fontSize: 9,
    fontFamily: "System",
    fontWeight: "700",
    color: TOKENS.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  trendText: {
    color: TOKENS.accent,
    fontSize: 12,
    fontWeight: "600"
  },
  efficiencyIndicatorRing: {
    alignItems: "center",
    justifyContent: "center"
  },
  circularIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3.5,
    borderColor: TOKENS.accent,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 197, 94, 0.05)"
  },
  circularText: {
    fontSize: 11,
    fontFamily: "System",
    fontWeight: "bold",
    color: TOKENS.textPrimary
  },
  progressContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: TOKENS.border,
    paddingTop: 12,
    gap: 12
  },
  progressRow: {
    gap: 6
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  progressLabel: {
    fontSize: 11,
    color: TOKENS.textSecondary
  },
  progressValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: TOKENS.textPrimary
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: TOKENS.bg,
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: TOKENS.border
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: TOKENS.accent,
    borderRadius: 3
  },
  securityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  securityTextGroup: {
    flex: 1,
    gap: 3
  },
  switchTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: TOKENS.bg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    padding: 2,
    justifyContent: "center"
  },
  switchTrackActive: {
    backgroundColor: "rgba(34, 197, 94, 0.25)",
    borderColor: TOKENS.accent
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: TOKENS.textSecondary
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
    backgroundColor: TOKENS.accent
  },
  tabsScrollView: {
    marginVertical: 12
  },
  tabsScrollContainer: {
    paddingRight: 16,
    gap: 8,
    alignItems: "center",
    height: 40
  },
  tabChip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row"
  },
  tabChipActive: {
    backgroundColor: TOKENS.accent,
    borderColor: TOKENS.accent
  },
  tabChipInactive: {
    backgroundColor: TOKENS.cardBg,
    borderColor: TOKENS.border
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "700"
  },
  tabChipTextActive: {
    color: "#002112"
  },
  tabChipTextInactive: {
    color: TOKENS.textSecondary
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12
  },
  gridItem: {
    width: "48%",
    backgroundColor: TOKENS.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: TOKENS.border,
    gap: 12
  },
  gridItemActive: {
    borderColor: "rgba(34, 197, 94, 0.4)"
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  deviceMeta: {
    flex: 1,
    marginRight: 4
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  deviceName: {
    fontSize: 12,
    fontWeight: "700",
    color: TOKENS.textPrimary
  },
  deviceTypeLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: TOKENS.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2
  },
  deviceSwitchTrack: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: TOKENS.bg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    padding: 1.5,
    justifyContent: "center"
  },
  deviceSwitchTrackActive: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: TOKENS.accent
  },
  deviceSwitchThumb: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: TOKENS.textSecondary
  },
  deviceSwitchThumbActive: {
    transform: [{ translateX: 16 }],
    backgroundColor: TOKENS.accent
  },
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: TOKENS.bg,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  stepButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: TOKENS.cardBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: TOKENS.border
  },
  stepButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: TOKENS.textPrimary
  },
  stepValueText: {
    fontSize: 11,
    fontWeight: "bold",
    color: TOKENS.textPrimary
  },
  disabledText: {
    color: TOKENS.textSecondary,
    opacity: 0.5
  },
  powerInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: TOKENS.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  powerInfoLabel: {
    fontSize: 9,
    color: TOKENS.textSecondary
  },
  powerInfoValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: TOKENS.textSecondary
  },
  powerInfoValueActive: {
    color: TOKENS.accent
  },
  statusBox: {
    backgroundColor: TOKENS.cardBg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginVertical: 8,
    flexDirection: "row",
    gap: 8
  },
  statusBoxWarning: {
    borderColor: "rgba(34, 197, 94, 0.3)",
    backgroundColor: "rgba(34, 197, 94, 0.05)",
    flexDirection: "column",
    gap: 4
  },
  statusTitle: {
    color: TOKENS.accent,
    fontSize: 10,
    fontFamily: "System",
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4
  },
  statusSubtitle: {
    color: TOKENS.textSecondary,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16
  },
  statusText: {
    color: TOKENS.textSecondary,
    fontSize: 11,
    fontStyle: "italic"
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8
  },
  manageLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  manageLinkText: {
    color: TOKENS.accent,
    fontSize: 12,
    fontWeight: "700"
  },
  masterCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: TOKENS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.03)",
    marginTop: 16,
    marginBottom: 16,
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  masterCardActive: {
    borderColor: "rgba(34, 197, 94, 0.25)",
  },
  masterInfoGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8
  },
  masterTextGroup: {
    flex: 1
  },
  masterTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: TOKENS.textPrimary,
    letterSpacing: 0.5
  },
  masterSubtitle: {
    fontSize: 11,
    color: TOKENS.textSecondary,
    marginTop: 2
  },
  capsuleContainer: {
    flexDirection: "row",
    width: 108,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0D0D0D",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden"
  },
  capsuleButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  capsuleBtnOnActive: {
    backgroundColor: "#22C55E",
  },
  capsuleBtnOffActive: {
    backgroundColor: "#1E1E1E",
  },
  capsuleText: {
    fontSize: 11,
    fontWeight: "bold"
  },
  capsuleTextOnActive: {
    color: "#002112",
  },
  capsuleTextOffActive: {
    color: "#dfe2f1",
  },
  capsuleTextInactive: {
    color: "#4B5563"
  },
  listContainer: {
    flexDirection: "column",
    gap: 12,
    width: "100%"
  },
  listItem: {
    width: "100%",
    backgroundColor: TOKENS.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: TOKENS.border,
    flexDirection: "column",
    gap: 12
  },
  listItemActive: {
    borderColor: "rgba(34, 197, 94, 0.25)"
  },
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%"
  },
  deviceLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8
  },
  deviceIcon: {
    marginRight: 2
  },
  sliderContainer: {
    width: "100%",
    marginTop: 4,
    backgroundColor: "#0D0D0D",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)"
  },
  sliderTrackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    marginBottom: 8
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 2,
    overflow: "hidden"
  },
  sliderProgress: {
    height: "100%",
    backgroundColor: TOKENS.accent,
    borderRadius: 2
  },
  sliderAdjuster: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sliderBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center"
  },
  sliderBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: TOKENS.textPrimary
  },
  sliderValueText: {
    fontSize: 12,
    fontWeight: "bold",
    color: TOKENS.textPrimary
  },
  powerConsumptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0D0D0D",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)"
  },
  powerLabel: {
    fontSize: 10,
    color: TOKENS.textSecondary
  },
  powerValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: TOKENS.textSecondary
  },
  powerValueActive: {
    color: TOKENS.accent
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: TOKENS.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.5
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  bellButton: {
    position: "relative",
    padding: 4
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900"
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: TOKENS.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.border,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginTop: 16,
    justifyContent: "space-between",
    alignItems: "center"
  },
  statColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: TOKENS.accent,
    marginBottom: 4
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: TOKENS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: TOKENS.border
  }
});
