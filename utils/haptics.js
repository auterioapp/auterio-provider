import * as Haptics from 'expo-haptics';

export function pulseTabChange() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
