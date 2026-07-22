import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../appStyles';

function Tab({ icon, label, active, badge }) {
  return (
    <View style={styles.tabItem} pointerEvents="none">
      <View>
        <Ionicons name={icon} size={24} color={active ? '#F04416' : '#17191D'} />
        {!!badge && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{badge}</Text></View>}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default Tab;
