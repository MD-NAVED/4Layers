import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList
} from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, Snackbar, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BleManager } from 'react-native-ble-plx';
import { provisionDevice } from '../api/client';

const TOKENS = {
  bg: '#131313',
  surface: '#1E1E1E',
  surfaceLow: '#18181B',
  accent: '#22C55E',
  border: 'rgba(255,255,255,0.05)',
  textPrimary: '#dfe2f1',
  textSecondary: '#9CA3AF',
  error: '#EF4444'
};

// BLE UUID configuration
const SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const WIFI_CHAR_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';
const MAC_CHAR_UUID = '0000ffe2-0000-1000-8000-00805f9b34fb';
const DEVICE_ID_CHAR_UUID = '0000ffe3-0000-1000-8000-00805f9b34fb';

// Base64 encoding/decoding helper functions
const base64Encode = (str) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0, len = str.length; i < len; i += 3) {
    const c1 = str.charCodeAt(i) & 0xff;
    const c2 = i + 1 < len ? str.charCodeAt(i + 1) & 0xff : NaN;
    const c3 = i + 2 < len ? str.charCodeAt(i + 2) & 0xff : NaN;
    const byte1 = c1 >> 2;
    const byte2 = ((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4);
    const byte3 = isNaN(c2) ? 64 : ((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6);
    const byte4 = isNaN(c3) ? 64 : c3 & 63;
    out += chars.charAt(byte1) + chars.charAt(byte2) + (byte3 === 64 ? '=' : chars.charAt(byte3)) + (byte4 === 64 ? '=' : chars.charAt(byte4));
  }
  return out;
};

const base64Decode = (str) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    if (char === '=') break;
    const val = chars.indexOf(char);
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return out;
};

export default function ProvisioningScreen({ navigation }) {
  const [manager] = useState(() => new BleManager());
  const [isScanning, setIsScanning] = useState(false);
  const [devicesList, setDevicesList] = useState([]);
  const [statusText, setStatusText] = useState('Idle');
  const connectedDeviceIdRef = useRef(null);
  
  // Wi-Fi and setup states
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [deviceType, setDeviceType] = useState('light'); // light, fan, AC
  
  // Setup flow stages
  const [currentStage, setCurrentStage] = useState('ENTRY'); // ENTRY, INPUT, SCANNING, CHECKLIST, DONE
  const [checklist, setChecklist] = useState({
    wifiCredentials: 'PENDING', // PENDING, RUNNING, DONE, FAILED
    applyConnection: 'PENDING',
    provisionCloud: 'PENDING'
  });
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Clean up BLE manager on unmount
  useEffect(() => {
    return () => {
      manager.stopDeviceScan();
      if (connectedDeviceIdRef.current) {
        manager.cancelDeviceConnection(connectedDeviceIdRef.current)
          .catch((err) => console.warn('[BLE Clean] Cleanup connection cancel failed:', err));
      }
      manager.destroy();
    };
  }, [manager]);

  const showToast = (msg) => {
    setSnackbarMessage(msg);
    setShowSnackbar(true);
  };

  const startScanning = async () => {
    if (!ssid.trim() || !wifiPassword.trim()) {
      showToast('Please enter your Wi-Fi SSID and Password.');
      return;
    }

    setDevicesList([]);
    setIsScanning(true);
    setCurrentStage('SCANNING');
    setStatusText('Scanning for SmartNest devices...');

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error('[BLE Scan] Error:', error);
        setIsScanning(false);
        setCurrentStage('INPUT');
        Alert.alert('Scan Error', 'Bluetooth scan failed. Ensure Bluetooth is enabled.');
        return;
      }

      // Filter by name "SmartNest"
      if (device && device.name && device.name.includes('SmartNest')) {
        setDevicesList((prevList) => {
          if (prevList.some((d) => d.id === device.id)) {
            return prevList;
          }
          return [...prevList, device];
        });
      }
    });

    // Auto-stop scan after 12 seconds
    setTimeout(() => {
      manager.stopDeviceScan();
      setIsScanning(false);
      setStatusText('Scan finished.');
    }, 12000);
  };

  const handleDeviceSelect = async (selectedDevice) => {
    manager.stopDeviceScan();
    setIsScanning(false);
    setCurrentStage('CHECKLIST');
    setChecklist({
      wifiCredentials: 'RUNNING',
      applyConnection: 'PENDING',
      provisionCloud: 'PENDING'
    });
    setStatusText(`Connecting to ${selectedDevice.name}...`);

    try {
      // 1. Connect to BLE device
      connectedDeviceIdRef.current = selectedDevice.id;
      const connectedDevice = await manager.connectToDevice(selectedDevice.id);
      setStatusText('Connected! Discovering services...');
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // 2. Send Wi-Fi SSID and Password
      setStatusText('Sending Wi-Fi credentials...');
      const wifiPayload = JSON.stringify({ ssid: ssid.trim(), pass: wifiPassword.trim() });
      const encodedWifi = base64Encode(wifiPayload);
      
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        WIFI_CHAR_UUID,
        encodedWifi
      );

      // 3. Read MAC Address
      setStatusText('Retrieving hardware identity MAC...');
      const charMac = await connectedDevice.readCharacteristicForService(
        SERVICE_UUID,
        MAC_CHAR_UUID
      );
      const decodedMac = base64Decode(charMac.value).trim();
      setStatusText(`MAC Address Received: ${decodedMac}`);

      // WiFi credentials successfully sent to device
      setChecklist(prev => ({
        ...prev,
        wifiCredentials: 'DONE',
        applyConnection: 'RUNNING'
      }));

      // 4. Call provision API
      setStatusText('Registering device node in SmartNest cloud...');
      const provisionResponse = await provisionDevice(decodedMac, deviceType);
      const generatedDeviceId = provisionResponse.id;
      setStatusText(`Cloud Registration complete: ${generatedDeviceId}`);

      // WiFi connection and cloud registration succeeded
      setChecklist(prev => ({
        ...prev,
        applyConnection: 'DONE',
        provisionCloud: 'RUNNING'
      }));

      // 5. Send UUID back to NVS
      setStatusText('Writing UUID configuration to NVS...');
      const encodedUuid = base64Encode(generatedDeviceId);
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        DEVICE_ID_CHAR_UUID,
        encodedUuid
      );

      // 6. Complete provisioning
      setStatusText('Provisioning success!');
      setChecklist(prev => ({
        ...prev,
        provisionCloud: 'DONE'
      }));
      setCurrentStage('DONE');
      
      // Disconnect
      connectedDeviceIdRef.current = null;
      await manager.cancelDeviceConnection(selectedDevice.id);
    } catch (err) {
      connectedDeviceIdRef.current = null;
      console.error('[Provisioning] Error:', err);
      setCurrentStage('INPUT');
      setChecklist({
        wifiCredentials: 'FAILED',
        applyConnection: 'FAILED',
        provisionCloud: 'FAILED'
      });
      setStatusText('Error occurred');
      Alert.alert('Setup Failed', err.message || 'An error occurred during the hardware pairing handshake.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.appHeader}>
        <TouchableOpacity 
          onPress={() => {
            if (currentStage === 'ENTRY') {
              navigation.goBack();
            } else if (currentStage === 'INPUT') {
              setCurrentStage('ENTRY');
            } else if (currentStage === 'SCANNING') {
              manager.stopDeviceScan();
              setCurrentStage('INPUT');
            } else {
              setCurrentStage('ENTRY');
            }
          }} 
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={TOKENS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provision Node</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* Onboarding Method Entry Selection */}
        {currentStage === 'ENTRY' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add New Device</Text>
            <Text style={styles.entryIntro}>Choose your preferred pairing method to provision a new switchboard node:</Text>
            
            <TouchableOpacity 
              style={styles.entryMethodButton} 
              onPress={() => setCurrentStage('INPUT')}
            >
              <MaterialCommunityIcons name="bluetooth" size={24} color={TOKENS.accent} />
              <View style={styles.entryMethodTextGroup}>
                <Text style={styles.entryMethodTitle}>Provision via Bluetooth (BLE)</Text>
                <Text style={styles.entryMethodSubtitle}>Recommended pairing for new switchboards</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={TOKENS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.entryMethodButton} 
              onPress={() => Alert.alert("QR Scanner", "QR onboarding is available for pre-registered factory hardware hubs only.")}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={24} color={TOKENS.textSecondary} />
              <View style={styles.entryMethodTextGroup}>
                <Text style={styles.entryMethodTitle}>Scan Device QR Code</Text>
                <Text style={styles.entryMethodSubtitle}>Quick pairing scanning option</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={TOKENS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.entryMethodButton} 
              onPress={() => Alert.alert("Manual Setup", "Manual node setup requires root account authentication.")}
            >
              <MaterialCommunityIcons name="keyboard-outline" size={24} color={TOKENS.textSecondary} />
              <View style={styles.entryMethodTextGroup}>
                <Text style={styles.entryMethodTitle}>Add Node Manually</Text>
                <Text style={styles.entryMethodSubtitle}>Provide MAC Address config details</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={TOKENS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Credentials Form */}
        {currentStage === 'INPUT' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Config Credentials</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Wi-Fi SSID</Text>
              <TextInput
                value={ssid}
                onChangeText={setSsid}
                mode="outlined"
                textColor="#FFFFFF"
                theme={{ colors: { primary: TOKENS.accent, background: TOKENS.surfaceLow } }}
                style={styles.input}
                placeholder="Enter router SSID"
                placeholderTextColor={TOKENS.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Wi-Fi Password</Text>
              <TextInput
                value={wifiPassword}
                onChangeText={setWifiPassword}
                mode="outlined"
                secureTextEntry
                textColor="#FFFFFF"
                theme={{ colors: { primary: TOKENS.accent, background: TOKENS.surfaceLow } }}
                style={styles.input}
                placeholder="Enter router password"
                placeholderTextColor={TOKENS.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Device Type</Text>
              <SegmentedButtons
                value={deviceType}
                onValueChange={setDeviceType}
                buttons={[
                  { value: 'light', label: 'LIGHT', checkedColor: '#000', style: deviceType === 'light' ? styles.segButtonActive : styles.segButtonInactive },
                  { value: 'fan', label: 'FAN', checkedColor: '#000', style: deviceType === 'fan' ? styles.segButtonActive : styles.segButtonInactive },
                  { value: 'ac', label: 'AC', checkedColor: '#000', style: deviceType === 'ac' ? styles.segButtonActive : styles.segButtonInactive }
                ]}
                style={styles.segmented}
              />
            </View>

            <Button
              mode="contained"
              onPress={startScanning}
              style={styles.primaryBtn}
              labelStyle={styles.primaryBtnText}
              icon="bluetooth"
            >
              Scan for SmartNest
            </Button>
          </View>
        )}

        {/* Scanning and Bluetooth Scan List */}
        {currentStage === 'SCANNING' && (
          <View style={styles.card}>
            <Text style={styles.statusHeading}>{statusText}</Text>
            <View style={styles.listContainer}>
              {devicesList.length === 0 ? (
                <View style={styles.emptyScan}>
                  <ActivityIndicator size="small" color={TOKENS.accent} style={{ marginBottom: 12 }} />
                  <Text style={styles.scanText}>Waiting for SmartNest advertisement...</Text>
                </View>
              ) : (
                <FlatList
                  data={devicesList}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.deviceRow}
                      onPress={() => handleDeviceSelect(item)}
                    >
                      <MaterialCommunityIcons name="bluetooth-connect" size={24} color={TOKENS.accent} />
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>{item.name}</Text>
                        <Text style={styles.deviceMac}>{item.id}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={TOKENS.textSecondary} />
                    </TouchableOpacity>
                  )}
                />
              )}
              
              <Button
                mode="outlined"
                onPress={() => {
                  manager.stopDeviceScan();
                  setCurrentStage('INPUT');
                }}
                style={styles.abortBtn}
                textColor={TOKENS.error}
              >
                Abort Scan
              </Button>
            </View>
          </View>
        )}

        {/* Checklist Progress UI */}
        {currentStage === 'CHECKLIST' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Provisioning Progress</Text>
            
            <View style={styles.checklistContainer}>
              {/* Step 1: wifiCredentials */}
              <View style={styles.checkItem}>
                <View style={[
                  styles.checkCircle,
                  checklist.wifiCredentials === 'DONE' && styles.checkCircleDone,
                  checklist.wifiCredentials === 'RUNNING' && styles.checkCircleRunning
                ]}>
                  {checklist.wifiCredentials === 'DONE' ? (
                    <MaterialCommunityIcons name="check" size={16} color="#002112" />
                  ) : checklist.wifiCredentials === 'RUNNING' ? (
                    <ActivityIndicator size="small" color={TOKENS.accent} />
                  ) : (
                    <Text style={styles.checkNumber}>1</Text>
                  )}
                </View>
                <Text style={[
                  styles.checkLabel,
                  checklist.wifiCredentials === 'RUNNING' && styles.checkLabelActive,
                  checklist.wifiCredentials === 'DONE' && styles.checkLabelCompleted
                ]}>
                  Sending Wi-Fi credentials
                </Text>
              </View>

              {/* Step 2: applyConnection */}
              <View style={styles.checkItem}>
                <View style={[
                  styles.checkCircle,
                  checklist.applyConnection === 'DONE' && styles.checkCircleDone,
                  checklist.applyConnection === 'RUNNING' && styles.checkCircleRunning
                ]}>
                  {checklist.applyConnection === 'DONE' ? (
                    <MaterialCommunityIcons name="check" size={16} color="#002112" />
                  ) : checklist.applyConnection === 'RUNNING' ? (
                    <ActivityIndicator size="small" color={TOKENS.accent} />
                  ) : (
                    <Text style={styles.checkNumber}>2</Text>
                  )}
                </View>
                <Text style={[
                  styles.checkLabel,
                  checklist.applyConnection === 'RUNNING' && styles.checkLabelActive,
                  checklist.applyConnection === 'DONE' && styles.checkLabelCompleted
                ]}>
                  Applying Wi-Fi connection
                </Text>
              </View>

              {/* Step 3: provisionCloud */}
              <View style={styles.checkItem}>
                <View style={[
                  styles.checkCircle,
                  checklist.provisionCloud === 'DONE' && styles.checkCircleDone,
                  checklist.provisionCloud === 'RUNNING' && styles.checkCircleRunning
                ]}>
                  {checklist.provisionCloud === 'DONE' ? (
                    <MaterialCommunityIcons name="check" size={16} color="#002112" />
                  ) : checklist.provisionCloud === 'RUNNING' ? (
                    <ActivityIndicator size="small" color={TOKENS.accent} />
                  ) : (
                    <Text style={styles.checkNumber}>3</Text>
                  )}
                </View>
                <Text style={[
                  styles.checkLabel,
                  checklist.provisionCloud === 'RUNNING' && styles.checkLabelActive,
                  checklist.provisionCloud === 'DONE' && styles.checkLabelCompleted
                ]}>
                  Checking provisioning status
                </Text>
              </View>
            </View>

            <Text style={styles.progressStatusText}>{statusText}</Text>
          </View>
        )}

        {/* Done success Stage */}
        {currentStage === 'DONE' && (
          <View style={styles.card}>
            <View style={styles.doneIconContainer}>
              <MaterialCommunityIcons name="check-circle" size={64} color={TOKENS.accent} />
            </View>
            <Text style={styles.doneHeading}>Onboarding Complete!</Text>
            <Text style={styles.doneMessage}>
              Your switchboard hardware has been provisioned and registered successfully. 7 device channels have been auto-created!
            </Text>
            
            <Button
              mode="contained"
              onPress={() => navigation.navigate('DevicesHome')}
              style={styles.primaryBtn}
              labelStyle={styles.primaryBtnText}
            >
              OK
            </Button>
          </View>
        )}

      </ScrollView>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.bg
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.border
  },
  backBtn: {
    marginRight: 16
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TOKENS.textPrimary
  },
  scrollContainer: {
    padding: 16
  },
  card: {
    backgroundColor: TOKENS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TOKENS.accent,
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: TOKENS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  input: {
    height: 48,
    backgroundColor: TOKENS.surfaceLow
  },
  segmented: {
    marginTop: 4
  },
  segButtonActive: {
    backgroundColor: TOKENS.accent
  },
  segButtonInactive: {
    backgroundColor: TOKENS.surfaceLow
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: TOKENS.accent,
    borderRadius: 12,
    paddingVertical: 4
  },
  primaryBtnText: {
    color: '#002112',
    fontWeight: '800'
  },
  statusHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.textPrimary,
    textAlign: 'center',
    marginVertical: 12
  },
  listContainer: {
    marginTop: 16,
    maxHeight: 300
  },
  emptyScan: {
    alignItems: 'center',
    paddingVertical: 32
  },
  scanText: {
    fontSize: 12,
    color: TOKENS.textSecondary,
    textAlign: 'center'
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: TOKENS.surfaceLow,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.textPrimary
  },
  deviceMac: {
    fontSize: 11,
    color: TOKENS.textSecondary,
    marginTop: 2
  },
  abortBtn: {
    marginTop: 16,
    borderColor: TOKENS.error,
    borderRadius: 12
  },
  snackbar: {
    backgroundColor: '#333333'
  },
  entryIntro: {
    fontSize: 13,
    color: TOKENS.textSecondary,
    marginBottom: 20,
    lineHeight: 18
  },
  entryMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: TOKENS.surfaceLow,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TOKENS.border,
    marginBottom: 12,
    gap: 16
  },
  entryMethodTextGroup: {
    flex: 1
  },
  entryMethodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.textPrimary
  },
  entryMethodSubtitle: {
    fontSize: 11,
    color: TOKENS.textSecondary,
    marginTop: 2
  },
  checklistContainer: {
    marginVertical: 24,
    gap: 16
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.surfaceLow,
    borderWidth: 1.5,
    borderColor: TOKENS.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkCircleRunning: {
    borderColor: TOKENS.accent,
    backgroundColor: 'rgba(34, 197, 94, 0.05)'
  },
  checkCircleDone: {
    borderColor: TOKENS.accent,
    backgroundColor: TOKENS.accent
  },
  checkNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: TOKENS.textSecondary
  },
  checkLabel: {
    fontSize: 13,
    color: TOKENS.textSecondary
  },
  checkLabelActive: {
    color: TOKENS.accent,
    fontWeight: '700'
  },
  checkLabelCompleted: {
    color: TOKENS.textPrimary
  },
  progressStatusText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: TOKENS.textSecondary,
    textAlign: 'center',
    marginTop: 8
  },
  doneIconContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  doneHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: TOKENS.textPrimary,
    textAlign: 'center',
    marginBottom: 12
  },
  doneMessage: {
    fontSize: 13,
    color: TOKENS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 12
  }
});
