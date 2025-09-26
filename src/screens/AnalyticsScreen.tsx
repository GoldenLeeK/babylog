import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, SafeAreaView } from 'react-native';
import { getFeedingRecords, getDiaperRecords, getSleepRecords } from '../services/databaseService';
import { FeedingRecord, DiaperRecord, SleepRecord } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { formatMinutesToHoursMinutes, formatHoursToHoursMinutes, formatTotalMinutesToHoursMinutes } from '../utils/timeFormat';
import { SkeletonLoader, SkeletonCard, SkeletonSummary } from '../components/SkeletonLoader';

const screenWidth = Dimensions.get('window').width;

const AnalyticsScreen = ({ navigation }) => {
  const [feedingData, setFeedingData] = useState([]);
  const [diaperData, setDiaperData] = useState([]);
  const [sleepData, setSleepData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const feedingRecords = await getFeedingRecords();
        const diaperRecords = await getDiaperRecords();
        const sleepRecords = await getSleepRecords();
        
        setFeedingData(feedingRecords);
        setDiaperData(diaperRecords);
        setSleepData(sleepRecords);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        try {
          const feedingRecords = await getFeedingRecords();
          const diaperRecords = await getDiaperRecords();
          const sleepRecords = await getSleepRecords();
          
          setFeedingData(feedingRecords);
          setDiaperData(diaperRecords);
          setSleepData(sleepRecords);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }, [])
  );

  // 获取最近30天的日期（倒序排列）
  const getLast30Days = () => {
    const dates = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(formatDate(date));
    }
    return dates;
  };

  // 格式化日期为 YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 格式化日期标签为 MM/DD
  const formatDateLabel = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  // 按日期分组记录
  const groupRecordsByDate = (records) => {
    return records.reduce((groups, record) => {
      const date = formatDate(new Date(record.timestamp || record.startTime));
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(record);
      return groups;
    }, {});
  };

  // 计算喂奶统计数据
  const calculateFeedingStats = () => {
    const dates = getLast30Days();
    const groupedByDate = groupRecordsByDate(feedingData);
    
    return dates.map(date => {
      const records = groupedByDate[date] || [];
      const totalDuration = records.reduce((total, record) => total + record.duration, 0);
      
      // 计算奶瓶喂养相关统计
      const bottleRecords = records.filter(record => record.feedingType === 'bottle');
      const totalBottleAmount = bottleRecords.reduce((total, record) => total + (record.amount || 0), 0);
      const avgBottleAmount = bottleRecords.length > 0 ? parseFloat((totalBottleAmount / bottleRecords.length).toFixed(2)) : 0;
      
      return {
        date: formatDateLabel(date),
        count: records.length,
        totalDuration: Math.round(totalDuration / 60),
        avgDuration: records.length > 0 ? parseFloat((totalDuration / records.length / 60).toFixed(2)) : 0,
        totalBottleAmount: totalBottleAmount,
        avgBottleAmount: avgBottleAmount
      };
    });
  };

  // 计算尿布统计数据
  const calculateDiaperStats = () => {
    const dates = getLast30Days();
    const groupedByDate = groupRecordsByDate(diaperData);
    
    return dates.map(date => {
      const records = groupedByDate[date] || [];
      const wetCount = records.filter(r => r.type === 'wet').length;
      const dirtyCount = records.filter(r => r.type === 'dirty').length;
      const bothCount = records.filter(r => r.type === 'both').length;
      
      return {
        date: formatDateLabel(date),
        total: records.length,
        wet: wetCount,
        dirty: dirtyCount,
        both: bothCount
      };
    });
  };

  // 计算睡眠统计数据
  const calculateSleepStats = () => {
    const dates = getLast30Days();
    const groupedByDate = groupRecordsByDate(sleepData);
    
    return dates.map(date => {
      const records = groupedByDate[date] || [];
      let totalDuration = 0;
      let completedRecords = 0;
      
      records.forEach(record => {
        if (record.endTime) {
          const duration = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / (1000 * 60 * 60);
          totalDuration += duration;
          completedRecords++;
        }
      });
      
      const avgDuration = completedRecords > 0 ? parseFloat((totalDuration / completedRecords).toFixed(2)) : 0;
      
      return {
        date: formatDateLabel(date),
        count: records.length,
        totalHours: parseFloat(totalDuration.toFixed(2)),
        totalMinutes: Math.round(totalDuration * 60),
        avgHours: avgDuration,
        avgMinutes: Math.round(avgDuration * 60)
      };
    });
  };

  // 计算总体统计
  const calculateTotalStats = () => {
    // 喂奶总次数和平均时长
    const totalFeedings = feedingData.length;
    const avgFeedingDuration = totalFeedings > 0 
      ? parseFloat((feedingData.reduce((sum, record) => sum + record.duration, 0) / totalFeedings / 60).toFixed(2))
      : 0;
    
    // 尿布总次数和类型分布
    const totalDiapers = diaperData.length;
    const wetDiapers = diaperData.filter(r => r.type === 'wet').length;
    const dirtyDiapers = diaperData.filter(r => r.type === 'dirty').length;
    const bothDiapers = diaperData.filter(r => r.type === 'both').length;
    
    // 睡眠总次数和平均时长
    const totalSleeps = sleepData.length;
    let totalSleepHours = 0;
    let completedSleeps = 0;
    
    sleepData.forEach(record => {
      if (record.endTime) {
        const duration = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / (1000 * 60 * 60);
        totalSleepHours += duration;
        completedSleeps++;
      }
    });
    
    const avgSleepHours = completedSleeps > 0 
      ? parseFloat((totalSleepHours / completedSleeps).toFixed(2))
      : 0;
    
    return {
      feeding: {
        total: totalFeedings,
        avgDuration: avgFeedingDuration
      },
      diaper: {
        total: totalDiapers,
        wet: wetDiapers,
        dirty: dirtyDiapers,
        both: bothDiapers
      },
      sleep: {
        total: totalSleeps,
        completed: completedSleeps,
        avgHours: avgSleepHours
      }
    };
  };

  

  const totalStats = calculateTotalStats();
  const feedingStats = calculateFeedingStats();
  const diaperStats = calculateDiaperStats();
  const sleepStats = calculateSleepStats();

  // 计算睡眠时长分布
  const calculateSleepDurationDistribution = () => {
    const completedSleeps = sleepData.filter(record => record.endTime);
    let shortSleeps = 0;
    let mediumSleeps = 0;
    let longSleeps = 0;

    completedSleeps.forEach(record => {
      const duration = (new Date(record.endTime!).getTime() - new Date(record.startTime).getTime()) / (1000 * 60 * 60);
      if (duration < 2) {
        shortSleeps++;
      } else if (duration >= 2 && duration < 4) {
        mediumSleeps++;
      } else {
        longSleeps++;
      }
    });

    return {
      shortSleeps,
      mediumSleeps,
      longSleeps,
      total: completedSleeps.length
    };
  };

  const sleepDistribution = calculateSleepDurationDistribution();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>数据分析</Text>
      </View>
      <ScrollView style={styles.scrollContainer}>
        {loading ? (
          // 在内容容器内部显示骨架屏，类似历史记录页面
          <SkeletonLoader>
            <View>
              {/* 骨架屏标题 */}
              <View style={styles.skeletonHeader}>
                <SkeletonSummary width={120} height={28} />
              </View>
              
              {/* 骨架屏统计卡片 */}
              <View style={styles.sectionContainer}>
                <SkeletonSummary width={100} height={18} style={styles.skeletonSectionTitle} />
                <View style={styles.statRow}>
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} width={screenWidth > 350 ? '30%' : '45%'} height={80} style={styles.skeletonStatCard} />
                  ))}
                </View>
              </View>
              
              {/* 骨架屏喂奶数据 */}
              <View style={styles.sectionContainer}>
                <SkeletonSummary width={150} height={18} style={styles.skeletonSectionTitle} />
                <SkeletonCard width="100%" height={200} style={styles.skeletonTable} />
              </View>
              
              {/* 骨架屏睡眠数据 */}
              <View style={styles.sectionContainer}>
                <SkeletonSummary width={150} height={18} style={styles.skeletonSectionTitle} />
                <SkeletonCard width="100%" height={200} style={styles.skeletonTable} />
                <SkeletonCard width="100%" height={120} style={styles.skeletonPieChart} />
              </View>
              
              {/* 骨架屏尿布数据 */}
              <View style={styles.sectionContainer}>
                <SkeletonSummary width={150} height={18} style={styles.skeletonSectionTitle} />
                <SkeletonCard width="100%" height={200} style={styles.skeletonTable} />
                <SkeletonCard width="100%" height={120} style={styles.skeletonPieChart} />
              </View>
            </View>
          </SkeletonLoader>
        ) : (
          <>
            {/* 总体统计 */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>总体统计</Text>
              
              <View style={styles.statRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>喂奶总次数</Text>
                  <Text style={styles.statValue}>{totalStats.feeding.total}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>平均喂奶时长</Text>
                  <Text style={styles.statValue}>{formatMinutesToHoursMinutes(totalStats.feeding.avgDuration)}</Text>
                </View>
              </View>
              
              <View style={styles.statRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>尿布总次数</Text>
                  <Text style={styles.statValue}>{totalStats.diaper.total}</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>平均睡眠时长</Text>
                  <Text style={styles.statValue}>{formatHoursToHoursMinutes(totalStats.sleep.avgHours)}</Text>
                </View>
              </View>
            </View>

            {/* 喂奶数据 */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>喂奶记录（最近7天）</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>日期</Text>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>次数</Text>
                    <Text style={[styles.tableHeaderCell, { width: 120 }]}>总时长</Text>
                    <Text style={[styles.tableHeaderCell, { width: 120 }]}>平均时长</Text>
                    <Text style={[styles.tableHeaderCell, { width: 100 }]}>总奶瓶奶量(ml)</Text>
                    <Text style={[styles.tableHeaderCell, { width: 100 }]}>平均奶瓶奶量(ml)</Text>
                  </View>
                  {feedingStats.slice(0, 7).map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { width: 60 }]}>{item.date}</Text>
                      <Text style={[styles.tableCell, { width: 60 }]}>{item.count}</Text>
                      <Text style={[styles.tableCell, { width: 120 }]}>{formatMinutesToHoursMinutes(item.totalDuration)}</Text>
                      <Text style={[styles.tableCell, { width: 120 }]}>{formatMinutesToHoursMinutes(item.avgDuration)}</Text>
                      <Text style={[styles.tableCell, { width: 100 }]}>{item.totalBottleAmount}</Text>
                      <Text style={[styles.tableCell, { width: 100 }]}>{item.avgBottleAmount}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* 睡眠数据 */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>睡眠记录（最近7天）</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>日期</Text>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>次数</Text>
                    <Text style={[styles.tableHeaderCell, { width: 120 }]}>总时长</Text>
                    <Text style={[styles.tableHeaderCell, { width: 120 }]}>平均时长</Text>
                  </View>
                  {sleepStats.slice(0, 7).map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { width: 60 }]}>{item.date}</Text>
                      <Text style={[styles.tableCell, { width: 60 }]}>{item.count}</Text>
                      <Text style={[styles.tableCell, { width: 120 }]}>{formatTotalMinutesToHoursMinutes(item.totalMinutes)}</Text>
                      <Text style={[styles.tableCell, { width: 120 }]}>{formatTotalMinutesToHoursMinutes(item.avgMinutes)}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
              
              {/* 睡眠时长分布 */}
              <View style={styles.pieContainer}>
                <Text style={styles.pieTitle}>睡眠时长分布</Text>
                <View style={styles.pieStats}>
                  <Text style={styles.pieLabel}>短睡眠(&lt;2h): {sleepDistribution.shortSleeps} ({sleepDistribution.total > 0 ? Math.round(sleepDistribution.shortSleeps / sleepDistribution.total * 100) : 0}%)</Text>
                  <Text style={styles.pieLabel}>中等睡眠(2-4h): {sleepDistribution.mediumSleeps} ({sleepDistribution.total > 0 ? Math.round(sleepDistribution.mediumSleeps / sleepDistribution.total * 100) : 0}%)</Text>
                  <Text style={styles.pieLabel}>长睡眠(≥4h): {sleepDistribution.longSleeps} ({sleepDistribution.total > 0 ? Math.round(sleepDistribution.longSleeps / sleepDistribution.total * 100) : 0}%)</Text>
                </View>
              </View>
            </View>

            {/* 尿布数据 */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>尿布记录（最近7天）</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tableContainer}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>日期</Text>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>总数</Text>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>湿</Text>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>脏</Text>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>混合</Text>
                  </View>
                  {diaperStats.slice(0, 7).map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { width: 60 }]}>{item.date}</Text>
                      <Text style={[styles.tableCell, { width: 60 }]}>{item.total}</Text>
                      <Text style={[styles.tableCell, { width: 60 }]}>{item.wet}</Text>
                      <Text style={[styles.tableCell, { width: 60 }]}>{item.dirty}</Text>
                      <Text style={[styles.tableCell, { width: 60 }]}>{item.both}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
              
              <View style={styles.pieContainer}>
                <Text style={styles.pieTitle}>尿布类型分布</Text>
                <View style={styles.pieStats}>
                  <View style={styles.pieStat}>
                    <View style={[styles.pieIndicator, { backgroundColor: '#36A2EB' }]} />
                    <Text style={styles.pieLabel}>湿: {totalStats.diaper.wet} ({totalStats.diaper.total > 0 ? Math.round(totalStats.diaper.wet / totalStats.diaper.total * 100) : 0}%)</Text>
                  </View>
                  <View style={styles.pieStat}>
                    <View style={[styles.pieIndicator, { backgroundColor: '#FFCE56' }]} />
                    <Text style={styles.pieLabel}>脏: {totalStats.diaper.dirty} ({totalStats.diaper.total > 0 ? Math.round(totalStats.diaper.dirty / totalStats.diaper.total * 100) : 0}%)</Text>
                  </View>
                  <View style={styles.pieStat}>
                    <View style={[styles.pieIndicator, { backgroundColor: '#FF6384' }]} />
                    <Text style={styles.pieLabel}>混合: {totalStats.diaper.both} ({totalStats.diaper.total > 0 ? Math.round(totalStats.diaper.both / totalStats.diaper.total * 100) : 0}%)</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    paddingTop: 20, // 为全面屏预留空间
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    flex: 1,
    padding: 12,
  },
  sectionContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: 12,
    width: '100%',
  },
  statCard: {
    width: screenWidth > 350 ? '30%' : '45%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 4,
    marginBottom: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tableContainer: {
    marginTop: 8,
    minWidth: screenWidth * 0.9,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableHeaderCell: {
    padding: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: screenWidth < 350 ? 13 : 14,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableCell: {
    padding: 8,
    textAlign: 'center',
    fontSize: screenWidth < 350 ? 12 : 14,
  },
  pieContainer: {
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  pieTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pieStats: {
    width: '100%',
    flexDirection: screenWidth > 350 ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  pieStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: screenWidth > 350 ? '30%' : '100%',
  },
  pieIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  skeletonHeader: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  skeletonSectionTitle: {
    marginBottom: 14,
  },
  skeletonStatCard: {
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 8,
  },
  skeletonTable: {
    marginTop: 8,
    borderRadius: 8,
  },
  skeletonPieChart: {
    marginTop: 12,
    borderRadius: 8,
  },
  pieLabel: {
    fontSize: screenWidth < 350 ? 12 : 14,
  },
});

export default AnalyticsScreen;