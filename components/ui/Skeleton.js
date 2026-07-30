import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';

// Opacity-pulse placeholder, not a gradient shimmer — no extra native dep
// (expo-linear-gradient isn't in either app yet) and this reads fine for the
// row/card-shaped skeletons these screens need. width/height/style let a
// caller shape it into a text line, an avatar circle, a card block, etc.
export default function Skeleton({ width = '100%', height = 16, borderRadius = radius.sm, style }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.base, { width, height, borderRadius, opacity }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.border },
});
