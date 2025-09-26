import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style
}) => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: fadeAnim,
        },
        style
      ]}
    />
  );
};

interface SkeletonCardProps {
  lines?: number;
  height?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3, height = 120 }) => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.headerText}>
          <SkeletonLoader width={120} height={20} />
          <SkeletonLoader width={80} height={16} style={{ marginTop: 4 }} />
        </View>
      </View>
      <View style={styles.cardContent}>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLoader
            key={index}
            width={index === lines - 1 ? '60%' : '100%'}
            height={18}
            style={{ marginBottom: 8 }}
          />
        ))}
      </View>
    </View>
  );
};

interface SkeletonGridProps {
  items?: number;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ items = 4 }) => {
  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: items }).map((_, index) => (
        <View key={index} style={styles.gridItem}>
          <SkeletonLoader width="100%" height={80} borderRadius={8} />
          <SkeletonLoader width="80%" height={16} style={{ marginTop: 8, alignSelf: 'center' }} />
        </View>
      ))}
    </View>
  );
};

interface SkeletonSummaryProps {
  items?: number;
}

export const SkeletonSummary: React.FC<SkeletonSummaryProps> = ({ items = 3 }) => {
  return (
    <View style={styles.summaryContainer}>
      {Array.from({ length: items }).map((_, index) => (
        <View key={index} style={styles.summaryItem}>
          <SkeletonLoader width={60} height={24} borderRadius={12} />
          <SkeletonLoader width={80} height={16} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  cardContent: {
    marginTop: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryItem: {
    alignItems: 'center',
  },
});

export { SkeletonLoader };
export default SkeletonLoader;