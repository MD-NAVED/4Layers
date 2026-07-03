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
  
  // Wi-Fi and setup states
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [deviceType, setDeviceType] = useState('light'); // light, fan, AC
  
  // Setup flow stages
  const [currentStage, setCurrentStage] = useState('INPUT'); // INPUT, SCANNING, CONNECTING, PROVISIONING, DONE
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Clean up BLE manager on unmount
  useEffect(() => {
    return () => {
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
    setCurrentStage('CONNECTING');
    setStatusText(`Connecting to ${selectedDevice.name}...`);

    try {
      // 1. Connect to BLE device
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

      // 4. Call provision API
      setCurrentStage('PROVISIONING');
      setStatusText('Registering device node in SmartNest cloud...');
      const provisionResponse = await provisionDevice(decodedMac, deviceType);
      const generatedDeviceId = provisionResponse.id;
      setStatusText(`Cloud Registration complete: ${generatedDeviceId}`);

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
      setCurrentStage('DONE');
      
      // Disconnect
      await manager.cancelDeviceConnection(selectedDevice.id);
      
      Alert.alert('Success', 'Device has been successfully configured and linked to the cloud.', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (err) {
      console.error('[Provisioning] Error:', err);
      setCurrentStage('INPUT');
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={TOKENS.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provision Node</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
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

        {(currentStage === 'SCANNING' || currentStage === 'CONNECTING' || currentStage === 'PROVISIONING' || currentStage === 'DONE') && (
          <View style={styles.card}>
            <Text style={styles.statusHeading}>{statusText}</Text>
            {currentStage !== 'SCANNING' && currentStage !== 'DONE' && (
              <ActivityIndicator size="large" color={TOKENS.accent} style={{ marginVertical: 24 }} />
            )}

            {currentStage === 'SCANNING' && (
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
            )}
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
  }
});
