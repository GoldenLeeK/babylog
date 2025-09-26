import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { SkeletonCard, SkeletonSummary, SkeletonLoader } from '../components/SkeletonLoader';
import NumberPicker from '../components/NumberPicker';

const TestSkeletonScreen = () => {
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState(3.5);
  const [milkAmount, setMilkAmount] = useState(120);

  useEffect(() => {
    // 模拟加载
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const reload = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.content}>
          {/* 骨架屏标题 */}
          <View style={styles.header}>
            <SkeletonLoader width={200} height={32} borderRadius={16} />
          </View>

          {/* 骨架屏卡片 */}
          <SkeletonCard lines={3} height={120} />
          
          {/* 骨架屏摘要 */}
          <SkeletonSummary items={3} />
          
          {/* 自定义骨架屏 */}
          <View style={styles.section}>
            <SkeletonLoader width={150} height={24} borderRadius={12} />
            <View style={styles.formRow}>
              <SkeletonLoader width={80} height={48} borderRadius={12} />
              <SkeletonLoader width={120} height={48} borderRadius={12} />
              <SkeletonLoader width={60} height={48} borderRadius={12} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>测试页面</Text>
          <TouchableOpacity style={styles.reloadButton} onPress={reload}>
            <Text style={styles.reloadText}>重新加载</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>宝宝体重输入（支持小数）</Text>
          <NumberPicker
            value={weight}
            onChange={setWeight}
            min={1}
            max={20}
            step={0.1}
            unit="kg"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>奶量输入（整数）</Text>
          <NumberPicker
            value={milkAmount}
            onChange={setMilkAmount}
            min={30}
            max={300}
            step={10}
            unit="ml"
            precision={0}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>当前值</Text>
          <Text style={styles.valueText}>宝宝体重: {weight} kg</Text>
          <Text style={styles.valueText}>奶量: {milkAmount} ml</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  reloadButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reloadText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  valueText: {
    fontSize: 16,
    color: '#666',
    marginVertical: 4,
  },
});

export default TestSkeletonScreen;