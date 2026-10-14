import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@saahibi/cheat_card_intro_seen';

export async function loadCheatCardIntroSeen() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function saveCheatCardIntroSeen() {
  await AsyncStorage.setItem(STORAGE_KEY, '1');
}
