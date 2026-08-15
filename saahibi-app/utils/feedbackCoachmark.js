import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@saahibi/feedback_coachmark_seen';

export async function loadFeedbackCoachmarkSeen() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function saveFeedbackCoachmarkSeen() {
  await AsyncStorage.setItem(STORAGE_KEY, '1');
}
