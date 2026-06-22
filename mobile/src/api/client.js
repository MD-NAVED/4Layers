import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Production Render API base URL
let baseURL = 'https://smartnest-3jr4.onrender.com';

// Dev override (commented out to force production server usage)
/*
if (__DEV__) {
  // Constants.expoConfig?.hostUri has the host IP and port of the development server (e.g. 192.168.1.100:8081)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    baseURL = `http://${ip}:8000`;
  } else if (Platform.OS === 'android') {
    // Standard loopback mapping for Android emulator to access the host
    baseURL = 'http://10.0.2.2:8000';
  }
}
*/

console.log(`[SmartNest API Client] Initialized. Base URL: ${baseURL}`);

const apiClient = axios.create({
  baseURL,
  timeout: 10000,
});

// Add an interceptor to inject the JWT token from AsyncStorage into every outgoing request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('[API Client] Error reading auth token:', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
