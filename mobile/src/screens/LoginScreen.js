import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Snackbar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const { signIn } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Alert and Snackbar states
  const [errorMsg, setErrorMsg] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter credentials to initialize sync.');
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // FastAPI login expects x-www-form-urlencoded form data
      const urlEncodedBody = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      
      const response = await apiClient.post('/api/users/login', urlEncodedBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      if (access_token) {
        await signIn(access_token);
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('[Login] Sync Error:', error);
      const detail = error.response?.data?.detail || 'Handshake failed. Check credentials.';
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
        {/* Top Header Section with Glowing Orb */}
        <View style={styles.headerSection}>
          {/* Glowing Sci-Fi Assistant Orb (Microphone Ring Mockup) */}
          <View style={styles.orbOuterRing}>
            <View style={styles.orbMidRing}>
              <LinearGradient
                colors={['#7C3AED', '#EC4899']}
                style={styles.orbCore}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="lan-connect" size={38} color="#F8FAFC" />
              </LinearGradient>
            </View>
          </View>
          
          <Text style={styles.title}>SmartNest</Text>
          <Text style={styles.subtitle}>Futuristic Home Control Panel</Text>
        </View>

        {/* Input Form Section */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Initialize Connection</Text>

          <TextInput
            label="User Identity / Email"
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

          {/* Gradient Connect Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleLogin}
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
                  <Text style={styles.btnText}>Authenticating</Text>
                  <Text style={styles.pulseText}>...</Text>
                </View>
              ) : (
                <Text style={styles.btnText}>Sync Console</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Create Account Prompt */}
          <View style={styles.registerPrompt}>
            <Text style={styles.promptText}>New node controller?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.registerLink, { color: theme.colors.secondary }]}> Register Controller</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Snackbar
          visible={showSnackbar}
          onDismiss={() => setShowSnackbar(false)}
          duration={4000}
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
    justifyContent: 'center',
    padding: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  orbOuterRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.1)',
  },
  orbMidRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.15)',
  },
  orbCore: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EC4899',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
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
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  input: {
    marginBottom: 16,
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
    fontSize: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pulseText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  registerPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  promptText: {
    color: '#64748B',
    fontSize: 14,
  },
  registerLink: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
