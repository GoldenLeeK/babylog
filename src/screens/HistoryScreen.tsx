import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { getFeedingRecords, getDiaperRecords, getSleepRecords, deleteFeedingRecord, deleteDiaperRecord, deleteSleepRecord } from '../services/databaseService';
import { FeedingRecord, DiaperRecord, SleepRecord } from '../types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import SwipeableRow from '../components/SwipeableRow';
import { SkeletonLoader, SkeletonCard, SkeletonSummary } from '../components/SkeletonLoader';

type RecordWithType = (FeedingRecord | DiaperRecord | SleepRecord) & { recordType: string };
type FilterType = 'all' | 'feeding' | 'diaper' | 'sleep';

const HistoryScreen = () => {
  const [records, setRecords] = useState<RecordWithType[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RecordWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const navigation = useNavigation();

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    applyFilter();
  }, [filter, records]);

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredRecords(records);
    } else {
      setFilteredRecords(records.filter(record => record.recordType === filter));
    }
  };

  const getFilterButtonStyle = (filterType: FilterType) => {
    if (filter !== filterType) return styles.filterButton;
    
    switch (filterType) {
      case 'all':
        return [styles.filterButton, styles.activeFilterAll];
      case 'feeding':
        return [styles.filterButton, styles.activeFilterFeeding];
      case 'diaper':
        return [styles.filterButton, styles.activeFilterDiaper];
      case 'sleep':
        return [styles.filterButton, styles.activeFilterSleep];
      default:
        return [styles.filterButton, styles.activeFilter];
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const feedingRecords = await getFeedingRecords();
      const diaperRecords = await getDiaperRecords();
      const sleepRecords = await getSleepRecords();
      
      // 添加记录类型标识
      const typedFeedingRecords = feedingRecords.map(record => ({ ...record, recordType: 'feeding' }));
      const typedDiaperRecords = diaperRecords.map(record => ({ ...record, recordType: 'diaper' }));
      const typedSleepRecords = sleepRecords.map(record => ({ ...record, recordType: 'sleep' }));
      
      // 合并所有记录
      const allRecords = [
        ...typedFeedingRecords,
        ...typedDiaperRecords,
        ...typedSleepRecords
      ];
      
      // 按时间倒序排列
      const sortedRecords = allRecords.sort((a, b) => {
        const timeA = a.recordType === 'diaper' ? a.timestamp : a.startTime;
        const timeB = b.recordType === 'diaper' ? b.timestamp : b.startTime;
        return timeB - timeA;
      });
      
      setRecords(sortedRecords);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 格式化时间（年月日时分秒）
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 格式化持续时间（秒），超过60分钟显示为小时格式
  const formatDuration = (seconds: number): string => {
    const totalMinutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    // 如果超过60分钟，显示为小时格式
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours > 0 && minutes > 0 && remainingSeconds > 0) {
        return `${hours}小时${minutes}分${remainingSeconds}秒`;
      } else if (hours > 0 && minutes > 0) {
        return `${hours}小时${minutes}分钟`;
      } else if (hours > 0 && remainingSeconds > 0) {
        return `${hours}小时${remainingSeconds}秒`;
      } else {
        return `${hours}小时`;
      }
    } else {
      // 小于60分钟，保持原有格式
      return `${totalMinutes}分${remainingSeconds}秒`;
    }
  };

  // 格式化时间（精确到秒）
  const formatTimeWithSeconds = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // 添加删除记录的处理函数
  const handleDeleteRecord = async (record: RecordWithType) => {
    try {
      if (record.recordType === 'feeding') {
        await deleteFeedingRecord(record.id);
      } else if (record.recordType === 'diaper') {
        await deleteDiaperRecord(record.id);
      } else if (record.recordType === 'sleep') {
        await deleteSleepRecord(record.id);
      }
      // 删除后重新加载数据
      loadData();
    } catch (error) {
      console.error('删除记录失败:', error);
    }
  };

  // 按日期分组记录
  const groupRecordsByDate = (recordsToGroup = filteredRecords) => {
    const groups: { [date: string]: RecordWithType[] } = {};
    
    recordsToGroup.forEach(record => {
      const timestamp = record.recordType === 'diaper' 
        ? (record as DiaperRecord).timestamp 
        : (record as FeedingRecord | SleepRecord).startTime;
      
      const dateStr = formatDate(timestamp);
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(record);
    });
    
    return Object.entries(groups).map(([date, records]) => ({
      date,
      records,
    }));
  };

  const renderItem = ({ item }: { item: { date: string; records: RecordWithType[] } }) => (
    <View style={styles.dateGroup}>
      <Text style={styles.dateHeader}>{item.date}</Text>
      {item.records.map(record => {
        // 根据记录类型选择不同的样式和内容
        switch(record.recordType) {
          case 'feeding':
             const feedingRecord = record as FeedingRecord & { recordType: string };
             const isBottleFeeding = feedingRecord.feedingType === 'bottle';
             return (
               <SwipeableRow 
                 key={feedingRecord.id} 
                 onDelete={() => handleDeleteRecord(feedingRecord)}
               >
                 <View style={[styles.recordItem, isBottleFeeding ? styles.bottleFeedingRecord : styles.feedingRecord]}>
                   <View style={[styles.recordTypeIndicator, isBottleFeeding && styles.bottleFeedingIndicator]}>
                     <Text style={styles.recordTypeText}>{isBottleFeeding ? '奶瓶' : '母乳'}</Text>
                   </View>
                   <View style={styles.recordDetails}>
                     <View style={styles.recordMainInfo}>
                       <Text style={styles.recordDuration}>
                         {isBottleFeeding ? `${feedingRecord.amount}ml` : formatDuration(feedingRecord.duration)}
                       </Text>
                       <Text style={styles.recordSides}>
                         {isBottleFeeding 
                           ? '奶瓶喂养' 
                           : (feedingRecord.leftSide && feedingRecord.rightSide 
                             ? '双侧喂养' 
                             : feedingRecord.leftSide 
                               ? '左侧喂养' 
                               : '右侧喂养')}
                       </Text>
                       <Text style={styles.recordTime}>{formatTime(feedingRecord.startTime)}</Text>
                       {feedingRecord.note && <Text style={styles.recordNote}>备注: {feedingRecord.note}</Text>}
                     </View>
                     <View style={styles.recordRightInfo}>
                       <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={[
                           styles.genderIcon,
                           feedingRecord.babyGender === 'male' && styles.genderIconMale,
                           feedingRecord.babyGender === 'female' && styles.genderIconFemale
                         ]}>
                           {feedingRecord.babyGender === 'male' ? '👦' : feedingRecord.babyGender === 'female' ? '👧' : ''}
                         </Text>
                         <Text style={[
                           styles.recordBabyName,
                           feedingRecord.babyGender === 'male' && styles.babyBoyName,
                           feedingRecord.babyGender === 'female' && styles.babyGirlName
                         ]}>
                           {feedingRecord.babyName || '宝宝'}
                         </Text>
                       </View>
                       <Text style={styles.recordCreator}>
                         {feedingRecord.createdByName || ''}
                       </Text>
                     </View>
                   </View>
                 </View>
               </SwipeableRow>
             );
             
           case 'diaper':
             const diaperRecord = record as DiaperRecord & { recordType: string };
             const getDiaperTypeText = (type: string) => {
               switch (type) {
                 case 'pee': return '尿湿';
                 case 'poop': return '便便';
                 case 'both': return '尿湿+便便';
                 default: return type;
               }
             };
             
             return (
               <SwipeableRow 
                 key={diaperRecord.id} 
                 onDelete={() => handleDeleteRecord(diaperRecord)}
               >
                 <View style={[styles.recordItem, styles.diaperRecord]}>
                   <View style={[styles.recordTypeIndicator, styles.diaperIndicator]}>
                     <Text style={styles.recordTypeText}>尿布</Text>
                   </View>
                   <View style={styles.recordDetails}>
                     <View style={styles.recordMainInfo}>
                       <Text style={styles.recordDuration}>{getDiaperTypeText(diaperRecord.type)}</Text>
                       <Text style={styles.recordTime}>{formatTime(diaperRecord.timestamp)}</Text>
                       {diaperRecord.note && <Text style={styles.recordNote}>备注: {diaperRecord.note}</Text>}
                     </View>
                     <View style={styles.recordRightInfo}>
                       <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={[
                           styles.genderIcon,
                           diaperRecord.babyGender === 'male' && styles.genderIconMale,
                           diaperRecord.babyGender === 'female' && styles.genderIconFemale
                         ]}>
                           {diaperRecord.babyGender === 'male' ? '👦' : diaperRecord.babyGender === 'female' ? '👧' : ''}
                         </Text>
                         <Text style={[
                           styles.recordBabyName,
                           diaperRecord.babyGender === 'male' && styles.babyBoyName,
                           diaperRecord.babyGender === 'female' && styles.babyGirlName
                         ]}>
                           {diaperRecord.babyName || '宝宝'}
                         </Text>
                       </View>
                       <Text style={styles.recordCreator}>
                         {diaperRecord.createdByName || ''}
                       </Text>
                     </View>
                   </View>
                 </View>
               </SwipeableRow>
             );
             
           case 'sleep':
             const sleepRecord = record as SleepRecord & { recordType: string };
             const now = Date.now();
             const isStillSleeping = !sleepRecord.endTime || sleepRecord.endTime === 0;
             
             let displayDuration = '';
             let endTimeDisplay = '';
             
             if (isStillSleeping) {
               // 正在睡眠中，计算当前时长
               const currentDuration = Math.floor((now - sleepRecord.startTime) / 1000);
               displayDuration = formatDuration(currentDuration);
               endTimeDisplay = '睡眠中';
             } else {
               // 已结束睡眠
               displayDuration = formatDuration(sleepRecord.duration);
               endTimeDisplay = formatTime(sleepRecord.endTime);
             }
             
             return (
               <SwipeableRow 
                 key={sleepRecord.id} 
                 onDelete={() => handleDeleteRecord(sleepRecord)}
               >
                 <View style={[styles.recordItem, styles.sleepRecord]}>
                   <View style={[styles.recordTypeIndicator, styles.sleepIndicator]}>
                     <Text style={styles.recordTypeText}>睡眠</Text>
                   </View>
                   <View style={styles.recordDetails}>
                     <View style={styles.recordMainInfo}>
                       <Text style={styles.recordDuration}>{displayDuration}</Text>
                       <Text style={styles.recordSides}>
                         开始: {formatTime(sleepRecord.startTime)}
                       </Text>
                       <Text style={styles.recordSides}>
                         结束: {endTimeDisplay}
                       </Text>
                       {sleepRecord.note && <Text style={styles.recordNote}>备注: {sleepRecord.note}</Text>}
                     </View>
                     <View style={styles.recordRightInfo}>
                       <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={[
                           styles.genderIcon,
                           sleepRecord.babyGender === 'male' && styles.genderIconMale,
                           sleepRecord.babyGender === 'female' && styles.genderIconFemale
                         ]}>
                           {sleepRecord.babyGender === 'male' ? '👦' : sleepRecord.babyGender === 'female' ? '👧' : ''}
                         </Text>
                         <Text style={[
                           styles.recordBabyName,
                           sleepRecord.babyGender === 'male' && styles.babyBoyName,
                           sleepRecord.babyGender === 'female' && styles.babyGirlName
                         ]}>
                           {sleepRecord.babyName || '宝宝'}
                         </Text>
                       </View>
                       <Text style={styles.recordCreator}>
                         {sleepRecord.createdByName || ''}
                       </Text>
                     </View>
                   </View>
                 </View>
               </SwipeableRow>
             );

          default:
            return null;
        }
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>历史记录</Text>
      </View>
      
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={getFilterButtonStyle('all')} 
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>全部</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={getFilterButtonStyle('feeding')} 
          onPress={() => setFilter('feeding')}
        >
          <Text style={[styles.filterText, filter === 'feeding' && styles.activeFilterText]}>喂养</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={getFilterButtonStyle('diaper')} 
          onPress={() => setFilter('diaper')}
        >
          <Text style={[styles.filterText, filter === 'diaper' && styles.activeFilterText]}>尿布</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={getFilterButtonStyle('sleep')} 
          onPress={() => setFilter('sleep')}
        >
          <Text style={[styles.filterText, filter === 'sleep' && styles.activeFilterText]}>睡眠</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={loading ? [] : groupRecordsByDate()}
        renderItem={renderItem}
        keyExtractor={item => item.date}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          loading ? (
            <View>
              {/* 骨架屏标题 */}
              <View style={styles.skeletonHeader}>
                <SkeletonSummary width={120} height={28} />
              </View>
              
              {/* 骨架屏过滤按钮 */}
              <View style={styles.skeletonFilterContainer}>
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonCard key={i} width={60} height={32} style={styles.skeletonFilterButton} />
                ))}
              </View>
              
              {/* 骨架屏记录列表 */}
              <View style={styles.skeletonList}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.skeletonDateGroup}>
                    <SkeletonSummary width={100} height={18} style={styles.skeletonDateHeader} />
                    {[1, 2, 3].map((j) => (
                      <SkeletonCard key={j} width="100%" height={80} style={styles.skeletonRecordItem} />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无记录</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20, // 为全面屏预留空间
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  skeletonFilterContainer: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    justifyContent: 'space-between',
  },
  skeletonFilterButton: {
    borderRadius: 20,
  },
  skeletonList: {
    padding: 16,
  },
  skeletonDateGroup: {
    marginBottom: 24,
  },
  skeletonDateHeader: {
    marginBottom: 12,
  },
  skeletonRecordItem: {
    marginVertical: 8,
    borderRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    justifyContent: 'space-between',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#9C27B0',
  },
  activeFilterAll: {
    backgroundColor: '#666',
  },
  activeFilterFeeding: {
    backgroundColor: '#4CAF50',
  },
  activeFilterDiaper: {
    backgroundColor: '#2196F3',
  },
  activeFilterSleep: {
    backgroundColor: '#9C27B0',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
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
  skeletonHeader: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  listContent: {
    padding: 16,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  recordItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
    paddingTop: 20,
  },
  feedingRecord: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  bottleFeedingRecord: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  diaperRecord: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  sleepRecord: {
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  recordTypeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderTopLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  bottleFeedingIndicator: {
    backgroundColor: '#FFC107',
  },
  diaperIndicator: {
    backgroundColor: '#2196F3',
  },
  sleepIndicator: {
    backgroundColor: '#9C27B0',
  },
  recordTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recordTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recordDuration: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recordDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  recordMainInfo: {
    flex: 1,
  },
  recordRightInfo: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  recordBabyName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  babyBoyName: {
    color: '#2196F3', // 蓝色
  },
  babyGirlName: {
    color: '#E91E63', // 粉色
  },
  genderIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  genderIconMale: {
    color: '#2196F3',
  },
  genderIconFemale: {
    color: '#E91E63',
  },
  recordCreator: {
    fontSize: 12,
    color: '#666',
  },
  recordSides: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  recordNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 12,
  },
});

export default HistoryScreen;