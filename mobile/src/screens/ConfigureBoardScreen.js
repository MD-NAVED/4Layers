import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';

const TOKENS = {
  bg: '#0D0D0D',
  surface: '#151515',
  surfaceLow: '#1A1A1A',
  accent: '#22C55E',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  error: '#EF4444'
};

export default function ConfigureBoardScreen({ route, navigation }) {
  const { macAddress } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deviceList, setDeviceList] = useState([]);

  // Fetch all channels corresponding to this board from the backend on load
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await apiClient.get('/api/devices');
        const allDevices = response.data;
        if (Array.isArray(allDevices)) {
          // Filter matching MAC address (case-insensitive)
          const targetMac = macAddress ? macAddress.trim().toUpperCase() : '';
          const matching = allDevices.filter(d => 
            d.mac_address && d.mac_address.toUpperCase() === targetMac
          );
          
          // Sort by suffix to keep L1 -> L7 ordered
          matching.sort((a, b) => {
            const aSuf = a.node_id.split('_')[1] || '';
            const bSuf = b.node_id.split('_')[1] || '';
            return aSuf.localeCompare(bSuf, undefined, { numeric: true });
          });

          // Initialize states with DB values
          const formatted = matching.map(d => ({
            id: d.id,
            node_id: d.node_id,
            suffix: d.node_id.split('_')[1] || '?',
            name: d.name,
            type: d.device_type, // 'light', 'fan', 'outlet'
            status: d.current_state?.status === 'ON'
          }));

          setDeviceList(formatted);
        }
      } catch (err) {
        console.error('[ConfigureBoard] Fetch failed:', err);
        Alert.alert('Error', 'Failed to retrieve channels from server.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, [macAddress]);

  // Test switch toggle in real-time
  const handleTestToggle = async (index) => {
    const updatedList = [...deviceList];
    const device = updatedList[index];
    const newStatus = !device.status;

    // Optimistic UI update
    device.status = newStatus;
    setDeviceList(updatedList);

    try {
      await apiClient.post(`/api/devices/${device.id}/control`, {
        status: newStatus ? 'ON' : 'OFF'
      });
    } catch (err) {
      console.warn('[ConfigureBoard] Test toggle failed:', err);
      // Revert status on failure
      device.status = !newStatus;
      setDeviceList([...updatedList]);
      Alert.alert('Testing Failed', 'Check if the board is powered on and connected to internet.');
    }
  };

  // Handle local state edits
  const handleNameChange = (index, value) => {
    const updated = [...deviceList];
    updated[index].name = value;
    setDeviceList(updated);
  };

  const handleTypeChange = (index, value) => {
    const updated = [...deviceList];
    updated[index].type = value;
    setDeviceList(updated);
  };

  // Submit all edits to the backend
  const handleSaveAndComplete = async () => {
    setIsSaving(true);
    try {
      const updatePromises = deviceList.map(d => 
        apiClient.put(`/api/devices/${d.id}`, {
          name: d.name.trim(),
          device_type: d.type
        })
      );
      await Promise.all(updatePromises);
      
      Alert.alert(
        'Setup Complete',
        'All switches have been configured successfully!',
        [
          { 
            text: 'Go to Dashboard', 
            onPress: () => navigation.navigate('DevicesHome') 
          }
        ]
      );
    } catch (err) {
      console.error('[ConfigureBoard] Save edits failed:', err);
      Alert.alert('Saving Failed', 'Some switches could not be updated. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TOKENS.accent} />
        <Text style={styles.loadingText}>Retrieving board configuration...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={TOKENS.bg} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Configure Switches</Text>
          <Text style={styles.subtitle}>
            Test each switch to identify what it controls, rename it, and select the device type.
          </Text>
        </View>

        {deviceList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No channels found for this board.</Text>
            <Button mode="contained" onPress={() => navigation.navigate('DevicesHome')} style={styles.completeButton}>
              Go Home
            </Button>
          </View>
        ) : (
          <>
            {deviceList.map((device, idx) => (
              <View key={device.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons 
                      name={device.type === 'fan' ? 'fan' : (device.type === 'light' ? 'lightbulb' : 'power-plug')} 
                      size={20} 
                      color={device.status ? TOKENS.accent : TOKENS.textSecondary} 
                    />
                    <Text style={styles.channelLabel}>Channel {device.suffix}</Text>
                  </View>
                  
                  {/* Test Switch Trigger */}
                  <TouchableOpacity 
                    style={[styles.testButton, device.status && styles.testButtonActive]} 
                    onPress={() => handleTestToggle(idx)}
                  >
                    <MaterialCommunityIcons 
                      name="power" 
                      size={14} 
                      color={device.status ? '#000000' : TOKENS.accent} 
                    />
                    <Text style={[styles.testButtonText, device.status && styles.testButtonTextActive]}>
                      {device.status ? 'Testing (ON)' : 'Test Switch'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Edit Form */}
                <View style={styles.form}>
                  <Text style={styles.label}>Switch Name</Text>
                  <TextInput
                    value={device.name}
                    onChangeText={(val) => handleNameChange(idx, val)}
                    mode="outlined"
                    textColor="#FFFFFF"
                    theme={{ colors: { primary: TOKENS.accent, background: TOKENS.surfaceLow } }}
                    style={styles.input}
                    placeholder={`e.g. Switch ${device.suffix}`}
                    placeholderTextColor={TOKENS.textSecondary}
                  />

                  {/* Device Type Select */}
                  <Text style={[styles.label, { marginTop: 8 }]}>Device Type</Text>
                  <SegmentedButtons
                    value={device.type}
                    onValueChange={(val) => handleTypeChange(idx, val)}
                    theme={{
                      colors: {
                        secondaryContainer: TOKENS.accent,
                        onSecondaryContainer: '#000000',
                        outline: TOKENS.border
                      }
                    }}
                    buttons={[
                      {
                        value: 'light',
                        label: 'Light',
                        showSelectedCheck: true,
                        style: device.type === 'light' ? styles.segmentedActive : styles.segmentedInactive,
                        labelStyle: device.type === 'light' ? styles.labelActive : styles.labelInactive
                      },
                      {
                        value: 'fan',
                        label: 'Fan',
                        showSelectedCheck: true,
                        style: device.type === 'fan' ? styles.segmentedActive : styles.segmentedInactive,
                        labelStyle: device.type === 'fan' ? styles.labelActive : styles.labelInactive
                      },
                      {
                        value: 'outlet',
                        label: 'Outlet',
                        showSelectedCheck: true,
                        style: device.type === 'outlet' ? styles.segmentedActive : styles.segmentedInactive,
                        labelStyle: device.type === 'outlet' ? styles.labelActive : styles.labelInactive
                      }
                    ]}
                  />
                </View>
              </View>
            ))}

            {/* Complete Setup */}
            <TouchableOpacity 
              style={[styles.completeButton, isSaving && styles.completeButtonDisabled]}
              onPress={handleSaveAndComplete}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.completeButtonText}>Save and Complete Setup</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.bg
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: TOKENS.bg,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: TOKENS.textSecondary,
    fontSize: 14,
    marginTop: 12
  },
  header: {
    marginBottom: 20
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  subtitle: {
    color: TOKENS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    color: TOKENS.textSecondary,
    marginBottom: 16
  },
  card: {
    backgroundColor: TOKENS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TOKENS.border,
    padding: 16,
    marginBottom: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.border,
    paddingBottom: 10,
    marginBottom: 12
  },
  channelLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: TOKENS.accent,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  testButtonActive: {
    backgroundColor: TOKENS.accent,
    borderColor: TOKENS.accent
  },
  testButtonText: {
    color: TOKENS.accent,
    fontSize: 11,
    fontWeight: 'bold'
  },
  testButtonTextActive: {
    color: '#000000'
  },
  form: {
    gap: 6
  },
  label: {
    color: TOKENS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  input: {
    height: 44,
    fontSize: 14,
    backgroundColor: TOKENS.surfaceLow
  },
  segmentedActive: {
    backgroundColor: TOKENS.accent
  },
  segmentedInactive: {
    backgroundColor: TOKENS.surfaceLow
  },
  labelActive: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold'
  },
  labelInactive: {
    color: '#FFFFFF',
    fontSize: 12
  },
  completeButton: {
    backgroundColor: TOKENS.accent,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12
  },
  completeButtonDisabled: {
    opacity: 0.6
  },
  completeButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5
  }
});
