import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, SegmentedButtons, Snackbar, useTheme } from 'react-native-paper';
import apiClient from '../api/client';

export default function AddDeviceScreen({ navigation }) {
  const theme = useTheme();
  
  const [name, setName] = useState('');
  const [type, setType] = useState('light');
  const [loading, setLoading] = useState(false);
  
  // Alert Snackbar states
  const [errorMsg, setErrorMsg] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handleAddDevice = async () => {
    if (!name.trim()) {
      setErrorMsg('Please assign a node identity name.');
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        type: type,
      };

      await apiClient.post('/api/devices', payload);
      
      // Navigate back to the home screen
      navigation.goBack();
    } catch (error) {
      console.error('[AddDevice] Link error:', error);
      const detail = error.response?.data?.detail || 'Handshake failed. Check server status.';
      setErrorMsg(detail);
      setShowSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Node Name Identity</Text>
          <TextInput
            label="e.g. Corridor Light, Bed AC"
            value={name}
            onChangeText={setName}
            mode="outlined"
            maxLength={50}
            textColor="#FFFFFF"
            activeOutlineColor="#22C55E"
            outlineColor="#262626"
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>Node Category</Text>
          <SegmentedButtons
            value={type || 'light'}
            onValueChange={(val) => setType(val || 'light')}
            theme={{
              colors: {
                secondaryContainer: '#22C55E', // active background
                onSecondaryContainer: '#000000', // active text
              }
            }}
            buttons={[
              {
                value: 'light',
                label: 'Light',
                icon: 'lightbulb-outline',
                labelStyle: styles.segmentLabel,
              },
              {
                value: 'fan',
                label: 'Fan',
                icon: 'fan',
                labelStyle: styles.segmentLabel,
              },
              {
                value: 'AC',
                label: 'AC',
                icon: 'air-conditioner',
                labelStyle: styles.segmentLabel,
              },
            ]}
            style={styles.segmentedButtons}
          />

          {/* Clean Submit Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAddDevice}
            disabled={loading}
            style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]}
          >
            <Text style={styles.btnText}>Initialize Link</Text>
          </TouchableOpacity>

          {/* Abort button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            disabled={loading}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>Abort Link</Text>
          </TouchableOpacity>
        </View>

        <Snackbar
          visible={showSnackbar}
          onDismiss={() => setShowSnackbar(false)}
          duration={3000}
          style={{ backgroundColor: '#7F1D1D', borderWidth: 1, borderColor: '#EF4444' }}
          action={{
            label: 'OK',
            textColor: '#FCA5A5',
            onPress: () => setShowSnackbar(false),
          }}
        >
          <Text style={{ color: '#FCA5A5', fontWeight: 'bold' }}>{errorMsg}</Text>
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 120,
  },
  formCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#262626',
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    marginBottom: 24,
    backgroundColor: '#0D0D0D',
  },
  segmentedButtons: {
    marginBottom: 32,
    backgroundColor: '#0D0D0D',
    borderRadius: 8,
    borderColor: '#262626',
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    borderRadius: 8,
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cancelBtn: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#262626',
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#9CA3AF',
    fontWeight: '700',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
