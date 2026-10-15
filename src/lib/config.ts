import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppConfig {
  tvIp: string;
  tvMac: string;
  tvName: string;
  proxyUrl: string; // wird nicht mehr für die Fire-TV-Steuerung benötigt, bleibt für spätere Erweiterungen
  fireTvHost: string; // Heim-IP oder DynDNS-Hostname
  fireTvPort: number; // extern weitergeleiteter Port (Router leitet ihn intern auf 5555 um)
  favoriteUrls: string[];
}

const STORAGE_KEY = 'tvremote.config.v1';

export const defaultConfig: AppConfig = {
  tvIp: '',
  tvMac: '',
  tvName: 'Wohnzimmer TV',
  proxyUrl: '',
  fireTvHost: '',
  fireTvPort: 58231,
  favoriteUrls: ['https://www.youtube.com', 'https://www.google.com'],
};

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig;
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return defaultConfig;
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
