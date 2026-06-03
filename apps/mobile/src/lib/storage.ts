import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  MODE: '@paperape_mode',
  SETTINGS: '@paperape_settings',
  LAST_TOKEN: '@paperape_last_token',
} as const;

export async function getMode(): Promise<'beginner' | 'pro'> {
  const val = await AsyncStorage.getItem(KEYS.MODE);
  return val === 'pro' ? 'pro' : 'beginner';
}

export async function setMode(mode: 'beginner' | 'pro') {
  await AsyncStorage.setItem(KEYS.MODE, mode);
}

export interface AppSettings {
  soundEnabled: boolean;
  confirmTrades: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  priorityFee: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  confirmTrades: true,
  autoRefresh: true,
  refreshInterval: 10,
  priorityFee: 0.005,
};

export async function getSettings(): Promise<AppSettings> {
  const val = await AsyncStorage.getItem(KEYS.SETTINGS);
  if (!val) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(val) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>) {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
  return merged;
}

export async function getLastToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.LAST_TOKEN);
}

export async function setLastToken(address: string) {
  await AsyncStorage.setItem(KEYS.LAST_TOKEN, address);
}
