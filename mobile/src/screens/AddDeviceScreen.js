import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, SegmentedButtons, Snackbar, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
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
            textColor="#F8FAFC"
            activeOutlineColor="#7C3AED"
            outlineColor="rgba(124, 58, 237, 0.2)"
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>Node Category</Text>
          <SegmentedButtons
            value={type}
            onValueChange={setType}
            theme={{
              colors: {
                secondaryContainer: '#1E1E38', // active background
                onSecondaryContainer: '#F8FAFC', // active text
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

          {/* Gradient Submit Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAddDevice}
            disabled={loading}
            style={styles.submitBtnWrapper}
          >
            <LinearGradient
              colors={['#7C3AED', '#EC4899']}
              style={styles.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.btnText}>Initialize Link</Text>
            </LinearGradient>
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
          style={{ backgroundColor: theme.colors.errorContainer, borderWidth: 1, borderColor: theme.colors.error }}
          action={{
            label: 'OK',
            textColor: theme.colors.onErrorContainer,
            onPress: () => setShowSnackbar(false),
          }}
        >
          <Text style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold' }}>{errorMsg}</Text>
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 120, // space to avoid bottom floating bar
  },
  formCard: {
    backgroundColor: '#121225',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#22223B',
    elevation: 3,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    marginBottom: 24,
    backgroundColor: '#121225',
  },
  segmentedButtons: {
    marginBottom: 32,
    backgroundColor: '#0A0A0F',
    borderRadius: 8,
    borderColor: '#22223B',
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  submitBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 12,
  },
  gradientBtn: {
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cancelBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontWeight: 'bold',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
