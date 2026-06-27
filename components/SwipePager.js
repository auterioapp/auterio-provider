import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

function pulseTabChange() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export default function SwipePager({ tabs, activeKey, onChange, children, tabBarStyle, tabStyle, tabTextStyle, activeTextStyle, indicatorStyle, pagerStyle, pageStyle }) {
  const pages = Array.isArray(children) ? children : [children];
  const [pagerWidth, setPagerWidth] = useState(0);
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const activeIndex = Math.max(0, tabs.findIndex(tab => tab.key === activeKey));
  const tactileIndexRef = useRef(activeIndex);
  const tabWidth = tabBarWidth ? (tabBarWidth - 6) / tabs.length : 0;

  useEffect(() => {
    if (!pagerWidth) return;
    tactileIndexRef.current = activeIndex;
    scrollRef.current?.scrollTo({ x: activeIndex * pagerWidth, animated: true });
  }, [activeIndex, pagerWidth]);

  const pulseCrossedPage = (event) => {
    if (!pagerWidth) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.max(0, Math.min(tabs.length - 1, Math.round(offsetX / pagerWidth)));
    if (nextIndex !== tactileIndexRef.current) {
      tactileIndexRef.current = nextIndex;
      pulseTabChange();
    }
  };

  const syncActivePage = (event) => {
    if (!pagerWidth) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.max(0, Math.min(tabs.length - 1, Math.round(offsetX / pagerWidth)));
    tactileIndexRef.current = nextIndex;
    if (nextIndex !== activeIndex) onChange(tabs[nextIndex].key);
  };

  const selectTab = (tabKey) => {
    if (tabKey !== activeKey) pulseTabChange();
    onChange(tabKey);
  };

  return (
    <View>
      <View style={tabBarStyle} onLayout={event => setTabBarWidth(event.nativeEvent.layout.width)}>
        {!!tabWidth && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.swipeTabsIndicator,
              indicatorStyle,
              {
                width: tabWidth,
                transform: [{
                  translateX: scrollX.interpolate({
                    inputRange: tabs.map((_, index) => index * Math.max(1, pagerWidth)),
                    outputRange: tabs.map((_, index) => index * tabWidth),
                    extrapolate: 'clamp',
                  }),
                }],
              },
            ]}
          />
        )}
        {tabs.map((tab) => {
          const tabIndex = tabs.findIndex(t => t.key === tab.key);
          const activeOpacity = scrollX.interpolate({
            inputRange: [
              (tabIndex - 1) * Math.max(1, pagerWidth),
              tabIndex * Math.max(1, pagerWidth),
              (tabIndex + 1) * Math.max(1, pagerWidth),
            ],
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });
          const inactiveOpacity = scrollX.interpolate({
            inputRange: [
              (tabIndex - 1) * Math.max(1, pagerWidth),
              tabIndex * Math.max(1, pagerWidth),
              (tabIndex + 1) * Math.max(1, pagerWidth),
            ],
            outputRange: [1, 0, 1],
            extrapolate: 'clamp',
          });
          return (
            <TouchableOpacity key={tab.key} style={tabStyle} onPress={() => selectTab(tab.key)} activeOpacity={0.84}>
              {!!tab.icon && <Ionicons name={tab.icon} size={13} color={tab.iconColor || tab.color || '#5E646D'} />}
              <View style={styles.swipeTabLabelWrap}>
                <Animated.Text style={[tabTextStyle, styles.swipeTabLabelSizer]}>{tab.label}</Animated.Text>
                <Animated.Text pointerEvents="none" style={[tabTextStyle, styles.swipeTabLabelLayer, { opacity: inactiveOpacity }]}>{tab.label}</Animated.Text>
                <Animated.Text pointerEvents="none" style={[tabTextStyle, styles.swipeTabMaskedText, activeTextStyle, styles.swipeTabLabelLayer, { opacity: activeOpacity }]}>{tab.label}</Animated.Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.swipePager, pagerStyle]} onLayout={event => setPagerWidth(event.nativeEvent.layout.width)}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          contentContainerStyle={styles.swipePagerTrack}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true, listener: pulseCrossedPage }
          )}
          onMomentumScrollEnd={syncActivePage}
        >
          {pages.map((page, index) => (
            <View key={tabs[index]?.key || index} style={[styles.swipePagerPage, pageStyle, pagerWidth ? { width: pagerWidth } : null]}>
              {page}
            </View>
          ))}
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeTabsIndicator: { position: 'absolute', left: 3, top: 3, bottom: 3, borderRadius: 18, backgroundColor: '#17191D' },
  swipeTabLabelWrap: { alignItems: 'center', justifyContent: 'center' },
  swipeTabLabelSizer: { opacity: 0 },
  swipeTabLabelLayer: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  swipeTabMaskedText: { color: '#FFFFFF' },
  swipePager: { overflow: 'hidden' },
  swipePagerTrack: { flexDirection: 'row', alignItems: 'flex-start' },
  swipePagerPage: { flexShrink: 0 },
});
