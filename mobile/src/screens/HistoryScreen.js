import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';

export default function HistoryScreen() {
  const theme = useTheme();
  
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [history, setHistory] = useState([]);
  
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user devices list
  const fetchDevices = async () => {
    try {
      const response = await apiClient.get('/api/devices');
      const data = response.data;
      setDevices(data);
      
      // Auto-select the first device if none is selected
      if (data.length > 0) {
        if (!selectedDevice || !data.some(d => d.id === selectedDevice.id)) {
          setSelectedDevice(data[0]);
          fetchDeviceHistory(data[0].id);
        } else {
          // Refresh history of currently selected device
          fetchDeviceHistory(selectedDevice.id);
        }
      } else {
        setSelectedDevice(null);
        setHistory([]);
      }
    } catch (error) {
      console.error('[History] Error fetching devices:', error);
    } finally {
      setLoadingDevices(false);
      setRefreshing(false);
    }
  };

  // Fetch history for a specific device
  const fetchDeviceHistory = async (deviceId) => {
    setLoadingHistory(true);
    try {
      const response = await apiClient.get(`/api/devices/${deviceId}/history`);
      setHistory(response.data);
    } catch (error) {
      console.error('[History] Error fetching device history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDevices();
  };

  // Device selection change handler
  const handleSelectDevice = (device) => {
    setSelectedDevice(device);
    fetchDeviceHistory(device.id);
  };

  // Trigger loading when tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchDevices();
    }, [selectedDevice])
  );

  // Helper to get styled attributes based on log event type
  const getLogStyle = (changeType) => {
    switch (changeType) {
      case 'device_created':
        return {
          label: 'NODE REGISTERED',
          icon: 'plus-circle-outline',
          color: '#10B981', // emerald green
        };
      case 'command_sent':
        return {
          label: 'TRANSMIT TRIGGER',
          icon: 'radiobox-marked',
          color: '#7C3AED', // neon purple
        };
      case 'status_confirmed':
        return {
          label: 'SYNC CONFIRMED',
          icon: 'checkbox-marked-circle-outline',
          color: '#EC4899', // neon pink
        };
      default:
        return {
          label: 'NODE TELEMETRY',
          icon: 'server-network',
          color: '#94A3B8',
        };
    }
  };

  // Helper to format timestamps nicely
  const formatTimestamp = (dateStr) => {
    try {
      const d = new Date(dateStr);
      const pad = (num) => String(num).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch (e) {
      return dateStr;
    }
  };

  if (loadingDevices && devices.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {devices.length === 0 ? (
        // Empty State
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clipboard-alert-outline" size={80} color="rgba(124, 58, 237, 0.15)" />
          <Text style={styles.emptyTitle}>Telemetry Offline</Text>
          <Text style={styles.emptySubtitle}>
            No devices are currently connected. Logs will generate once node triggers execute.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Horizontal scroll selection for devices */}
          <View style={styles.headerSelection}>
            <Text style={styles.selectionLabel}>Select active node:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.deviceSlider}
            >
              {devices.map((device) => {
                const isSelected = selectedDevice && selectedDevice.id === device.id;
                return (
                  <Chip
                    key={device.id}
                    selected={isSelected}
                    onPress={() => handleSelectDevice(device)}
                    style={[
                      styles.deviceChip, 
                      isSelected ? { 
                        backgroundColor: theme.colors.primary,
                        shadowColor: theme.colors.primary,
                        shadowOpacity: 0.5,
                        shadowRadius: 8,
                        elevation: 3,
                      } : {
                        backgroundColor: '#121225'
                      }
                    ]}
                    selectedColor="#F8FAFC"
                    textStyle={[
                      styles.chipText, 
                      isSelected && { fontWeight: 'bold', color: '#F8FAFC' }
                    ]}
                    showSelectedOverlay
                  >
                    {device.name}
                  </Chip>
                );
              })}
            </ScrollView>
          </View>

          {/* Timeline History List */}
          {loadingHistory ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={64} color="rgba(124, 58, 237, 0.1)" />
              <Text style={styles.emptyTitle}>Log Index Empty</Text>
              <Text style={styles.emptySubtitle}>
                No log sequence recorded for {selectedDevice?.name || 'this node'} yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.timelineList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.colors.primary}
                />
              }
              renderItem={({ item, index }) => {
                const logStyle = getLogStyle(item.change_type);
                return (
                  <View style={styles.timelineItem}>
                    {/* Left Timeline Indicator */}
                    <View style={styles.timelineLeft}>
                      <MaterialCommunityIcons name={logStyle.icon} size={26} color={logStyle.color} />
                      {index < history.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    
                    {/* Right Timeline Card Details */}
                    <Card style={styles.timelineCard}>
                      <Card.Content style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                          <Text style={[styles.eventLabel, { color: logStyle.color }]}>
                            {logStyle.label}
                          </Text>
                          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
                        </View>
                        
                        {item.change_type === 'device_created' && (
                          <Text style={styles.eventDesc}>Node handshake complete. Default state: <Text style={styles.offStateText}>OFF</Text></Text>
                        )}

                        {item.change_type === 'command_sent' && (
                          <Text style={styles.eventDesc}>
                            Signal sent: Toggled from{' '}
                            <Text style={item.previous_state === 'ON' ? styles.onStateText : styles.offStateText}>
                              {item.previous_state}
                            </Text>{' '}
                            →{' '}
                            <Text style={item.new_state === 'ON' ? styles.onStateText : styles.offStateText}>
                              {item.new_state}
                            </Text>
                          </Text>
                        )}

                        {item.change_type === 'status_confirmed' && (
                          <Text style={styles.eventDesc}>
                            Node confirmation packet received. Confirmed state: <Text style={item.new_state === 'ON' ? styles.onStateText : styles.offStateText}>{item.new_state}</Text>
                          </Text>
                        )}
                      </Card.Content>
                    </Card>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
  },
  headerSelection: {
    backgroundColor: '#121225',
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#22223B',
  },
  selectionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  deviceSlider: {
    paddingHorizontal: 12,
  },
  deviceChip: {
    marginHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#22223B',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  timelineList: {
    padding: 16,
    paddingBottom: 120, // space to avoid bottom floating pill navigator
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 14,
    width: 26,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#22223B',
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#121225',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#22223B',
    marginBottom: 12,
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  timestamp: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  eventDesc: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
    fontWeight: '500',
  },
  onStateText: {
    color: '#EC4899', // Cyber pink for ON
    fontWeight: 'bold',
  },
  offStateText: {
    color: '#94A3B8', // Slate gray for OFF
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
