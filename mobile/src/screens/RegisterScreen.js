import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Snackbar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../api/client';

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Alert Snackbar states
  const [snackMsg, setSnackMsg] = useState('');
  const [snackIsError, setSnackIsError] = useState(true);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const validateEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setSnackMsg('Please fill all validation matrix values.');
      setSnackIsError(true);
      setShowSnackbar(true);
      return;
    }

    if (username.length < 3) {
      setSnackMsg('User handle must be at least 3 characters.');
      setSnackIsError(true);
      setShowSnackbar(true);
      return;
    }

    if (!validateEmail(email)) {
      setSnackMsg('Invalid communication email protocol.');
      setSnackIsError(true);
      setShowSnackbar(true);
      return;
    }

    if (password.length < 6) {
      setSnackMsg('Passkey length must be 6+ bits.');
      setSnackIsError(true);
      setShowSnackbar(true);
      return;
    }

    if (password !== confirmPassword) {
      setSnackMsg('Passkey verification mismatch.');
      setSnackIsError(true);
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    setSnackMsg('');

    try {
      const registerPayload = {
        username: username.trim(),
        email: email.trim(),
        password: password
      };

      await apiClient.post('/api/users/register', registerPayload);

      // Success
      setSnackIsError(false);
      setSnackMsg('Controller registration initialized! Redirecting...');
      setShowSnackbar(true);
      
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (error) {
      console.error('[Register] Initialization Error:', error);
      const detail = error.response?.data?.detail || 'Sync registry failed. Handle/email taken.';
      setSnackIsError(true);
      setSnackMsg(detail);
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
        {/* Top Header Section with Glowing Orb */}
        <View style={styles.headerSection}>
          <View style={styles.orbOuterRing}>
            <View style={styles.orbMidRing}>
              <LinearGradient
                colors={['#7C3AED', '#EC4899']}
                style={styles.orbCore}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="account-plus" size={38} color="#F8FAFC" />
              </LinearGradient>
            </View>
          </View>
          
          <Text style={styles.title}>SmartNest</Text>
          <Text style={styles.subtitle}>Register Console Controller</Text>
        </View>

        {/* Input Form Section */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Initialize Registry</Text>

          <TextInput
            label="User Identity Handle"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            autoCapitalize="none"
            textColor="#F8FAFC"
            activeOutlineColor="#7C3AED"
            outlineColor="rgba(124, 58, 237, 0.2)"
            left={<TextInput.Icon icon="account" iconColor="rgba(148, 163, 184, 0.6)" />}
            style={styles.input}
          />

          <TextInput
            label="Email Address Protocol"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            textColor="#F8FAFC"
            activeOutlineColor="#7C3AED"
            outlineColor="rgba(124, 58, 237, 0.2)"
            left={<TextInput.Icon icon="email" iconColor="rgba(148, 163, 184, 0.6)" />}
            style={styles.input}
          />

          <TextInput
            label="Security Passkey"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textColor="#F8FAFC"
            activeOutlineColor="#7C3AED"
            outlineColor="rgba(124, 58, 237, 0.2)"
            left={<TextInput.Icon icon="shield-lock" iconColor="rgba(148, 163, 184, 0.6)" />}
            right={
              <TextInput.Icon 
                icon={showPassword ? 'eye-off' : 'eye'} 
                iconColor="rgba(148, 163, 184, 0.6)"
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
          />

          <TextInput
            label="Verify Security Passkey"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textColor="#F8FAFC"
            activeOutlineColor="#7C3AED"
            outlineColor="rgba(124, 58, 237, 0.2)"
            left={<TextInput.Icon icon="shield-lock" iconColor="rgba(148, 163, 184, 0.6)" />}
            style={styles.input}
          />

          {/* Gradient Connect Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRegister}
            disabled={loading}
            style={styles.gradientBtnWrapper}
          >
            <LinearGradient
              colors={['#7C3AED', '#EC4899']}
              style={styles.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <View style={styles.loaderRow}>
                  <Text style={styles.btnText}>Compiling Node Registry</Text>
                  <Text style={styles.pulseText}>...</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Register Controller</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Sync Account Prompt */}
          <View style={styles.loginPrompt}>
            <Text style={styles.promptText}>Already registered?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: theme.colors.secondary }]}> Sync Console</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Snackbar
          visible={showSnackbar}
          onDismiss={() => setShowSnackbar(false)}
          duration={3000}
          style={{ backgroundColor: snackIsError ? theme.colors.errorContainer : '#10B981', borderWidth: 1, borderColor: snackIsError ? theme.colors.error : '#059669' }}
          action={{
            label: 'OK',
            textColor: snackIsError ? theme.colors.onErrorContainer : '#FFFFFF',
            onPress: () => setShowSnackbar(false),
          }}
        >
          <Text style={{ color: snackIsError ? theme.colors.onErrorContainer : '#FFFFFF', fontWeight: 'bold' }}>
            {snackMsg}
          </Text>
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
    justifyContent: 'center',
    padding: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  orbOuterRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.1)',
  },
  orbMidRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.15)',
  },
  orbCore: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EC4899',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#121225',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#22223B',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#121225',
  },
  gradientBtnWrapper: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  gradientBtn: {
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pulseText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  promptText: {
    color: '#64748B',
    fontSize: 14,
  },
  loginLink: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
