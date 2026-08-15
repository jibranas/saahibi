import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getDevMachineHost() {
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ?? Constants.manifest?.debuggerHost;
  if (typeof debuggerHost !== 'string' || !debuggerHost) return null;
  const host = debuggerHost.split(':')[0];
  return host || null;
}

export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const devHost = getDevMachineHost();
  if (devHost) {
    return `http://${devHost}:3000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
}
