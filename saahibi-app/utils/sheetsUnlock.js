import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@saahibi/sheets_unlocked';
const LEGACY_UNLOCKED_SHEET = 'jam-saalim-muslim';

function sheetKeys(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((key) => typeof key === 'string' && key.length > 0);
}

export async function loadCollectedSheetKeys() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    if (raw === '1') return [LEGACY_UNLOCKED_SHEET];
    return sheetKeys(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveCollectedSheetKeys(keys) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sheetKeys(keys)));
}
