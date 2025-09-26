import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { FeedingRecord, DiaperRecord, SleepRecord } from '../types';
import SwipeableRow from '../components/SwipeableRow';
import { SkeletonCard, SkeletonSummary, SkeletonLoader } from '../components/SkeletonLoader';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [todayRecords, setTodayRecords] = useState<(FeedingRecord | DiaperRecord | SleepRecord)[]>([]);
  const [todayStats, setTodayStats] = useState({
    feedingCount: 0,
    diaperCount: 0,
    sleepCount: 0,
    totalDuration: 0,
    leftDuration: 0,
    rightDuration: 0,
    avgDuration: 0,
    lastFeeding: null as FeedingRecord | null,
    timeSinceLastFeeding: '-',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // 页面聚焦时刷新数据
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('用户未登录');
        setLoading(false);
        return;
      }

      // 获取用户的家庭ID
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .maybeSingle(); // ✅ 修复：用户可能没有家庭

      if (memberError) {
        if (memberError.code === 'PGRST116') {
          console.log('用户未加入任何家庭');
          setLoading(false); // ✅ 修复：确保设置加载状态为false
          return;
        }
        console.error('获取用户家庭信息失败:', memberError);
        setLoading(false); // ✅ 修复：确保设置加载状态为false
        return;
      }

      if (!memberData) {
        console.log('用户未加入任何家庭');
        setLoading(false); // ✅ 修复：确保设置加载状态为false
        return;
      }

      const familyId = memberData.family_id;

      // 获取最近24小时的时间戳
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      const oneDayAgoISO = oneDayAgo.toISOString();

      // 获取喂养记录
      console.log('查询喂养记录，familyId:', familyId, '时间范围:', oneDayAgoISO);
      const { data: feedingRecords, error: feedingError } = await supabase
        .from('feeding_records')
        .select(`
          *,
          baby_profiles!baby_id (
            id,
            name,
            gender
          )
        `)
        .eq('family_id', familyId)
        .gte('start_time', oneDayAgoISO)
        .order('start_time', { ascending: false });
      
      if (feedingError) {
        console.error('喂养记录查询失败:', feedingError);
      } else {
        console.log('喂养记录查询成功，数量:', feedingRecords?.length);
      }

      // 获取尿布记录
      const { data: diaperRecords, error: diaperError } = await supabase
        .from('diaper_records')
        .select(`
          *,
          baby_profiles!baby_id (
            id,
            name,
            gender
          )
        `)
        .eq('family_id', familyId)
        .gte('time', oneDayAgoISO)
        .order('time', { ascending: false });
      
      if (diaperError) {
        console.error('尿布记录查询失败:', diaperError);
      } else {
        console.log('尿布记录查询成功，数量:', diaperRecords?.length);
      }

      // 获取睡眠记录
      const { data: sleepRecords, error: sleepError } = await supabase
        .from('sleep_records')
        .select(`
          *,
          baby_profiles!baby_id (
            id,
            name,
            gender
          )
        `)
        .eq('family_id', familyId)
        .gte('start_time', oneDayAgoISO)
        .order('start_time', { ascending: false });
      
      if (sleepError) {
        console.error('睡眠记录查询失败:', sleepError);
      } else {
        console.log('睡眠记录查询成功，数量:', sleepRecords?.length);
      }

      // 获取所有相关的用户信息
      const userIds = [
        ...(feedingRecords || []).map(r => r.user_id),
        ...(diaperRecords || []).map(r => r.user_id),
        ...(sleepRecords || []).map(r => r.user_id)
      ].filter(Boolean);

      let userMap = {};
      if (userIds.length > 0) {
        const { data: familyMembers, error: membersError } = await supabase
          .from('family_members')
          .select(`
            user_id,
            user_profiles!user_id (
              display_name
            )
          `)
          .in('user_id', userIds)
          .eq('family_id', familyId);

        if (!membersError && familyMembers) {
          userMap = familyMembers.reduce((map, member) => {
            map[member.user_id] = member.user_profiles?.display_name || '未知用户';
            return map;
          }, {});
        }
      }

      // 处理数据格式
      const processedFeedingRecords = (feedingRecords || []).map(record => ({
        ...record,
        id: record.id,
        startTime: new Date(record.start_time),
        endTime: new Date(record.end_time),
        duration: record.duration,
        leftDuration: record.left_duration || 0,
        rightDuration: record.right_duration || 0,
        feedingType: record.feeding_type,
        amount: record.amount,
        leftSide: record.left_side,
        rightSide: record.right_side,
        note: record.note || '',
        type: 'feeding' as const,
        babyName: record.baby_profiles?.name,
        babyGender: record.baby_profiles?.gender,
        createdByName: userMap[record.user_id] || '未知用户'
      }));

      const processedDiaperRecords = (diaperRecords || []).map(record => ({
        ...record,
        id: record.id,
        timestamp: new Date(record.time),
        type: record.type,
        note: record.note || '',
        recordType: 'diaper' as const,
        babyName: record.baby_profiles?.name,
        babyGender: record.baby_profiles?.gender,
        createdByName: userMap[record.user_id] || '未知用户'
      }));

      const processedSleepRecords = (sleepRecords || []).map(record => ({
        ...record,
        id: record.id,
        startTime: new Date(record.start_time),
        endTime: record.end_time ? new Date(record.end_time) : null,
        duration: record.duration || 0,
        note: record.note || '',
        type: 'sleep' as const,
        babyName: record.baby_profiles?.name,
        babyGender: record.baby_profiles?.gender,
        createdByName: userMap[record.user_id] || '未知用户'
      }));

      // 合并所有记录
      const allRecords = [
        ...processedFeedingRecords,
        ...processedDiaperRecords,
        ...processedSleepRecords
      ];

      // 按时间排序
      allRecords.sort((a, b) => {
        const timeA = 'startTime' in a ? a.startTime.getTime() : 
                     'timestamp' in a ? a.timestamp.getTime() : 0;
        const timeB = 'startTime' in b ? b.startTime.getTime() : 
                     'timestamp' in b ? b.timestamp.getTime() : 0;
        return timeB - timeA;
      });

      setTodayRecords(allRecords);

      // 计算统计数据
      const feedingCount = processedFeedingRecords.length;
      const diaperCount = processedDiaperRecords.length;
      const sleepCount = processedSleepRecords.length;

      const totalDuration = processedFeedingRecords.reduce((sum, record) => sum + record.duration, 0);
      const leftDuration = processedFeedingRecords.reduce((sum, record) => sum + (record.leftDuration || 0), 0);
      const rightDuration = processedFeedingRecords.reduce((sum, record) => sum + (record.rightDuration || 0), 0);
      const avgDuration = feedingCount > 0 ? Math.round(totalDuration / feedingCount) : 0;

      const lastFeeding = processedFeedingRecords.length > 0 ? processedFeedingRecords[0] : null;
      let timeSinceLastFeeding = '-';
      
      if (lastFeeding) {
        const now = new Date();
        const diffMs = now.getTime() - lastFeeding.startTime.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        timeSinceLastFeeding = `${diffHours}小时${diffMinutes}分钟前`;
      }

      setTodayStats({
        feedingCount,
        diaperCount,
        sleepCount,
        totalDuration,
        leftDuration,
        rightDuration,
        avgDuration,
        lastFeeding,
        timeSinceLastFeeding,
      });

      setLoading(false);
    } catch (error) {
      console.error('加载数据失败:', error);
      Alert.alert('数据加载失败', '请检查网络连接或重新登录');
      setLoading(false);
    }
  };

  const formatTime = (timestamp: number | Date): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0分钟';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    let result = '';
    if (hours > 0) {
      result += `${hours}小时`;
    }
    if (minutes > 0) {
      result += `${minutes}分钟`;
    }
    if (remainingSeconds > 0 && hours === 0) {
      result += `${remainingSeconds}秒`;
    }
    
    return result || '0分钟';
  };

  const handleDeleteRecord = async (record: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let error;
      if (record.type === 'feeding') {
        ({ error } = await supabase
          .from('feeding_records')
          .delete()
          .eq('id', record.id));
      } else if (record.recordType === 'diaper') {
        ({ error } = await supabase
          .from('diaper_records')
          .delete()
          .eq('id', record.id));
      } else if (record.type === 'sleep') {
        ({ error } = await supabase
          .from('sleep_records')
          .delete()
          .eq('id', record.id));
      }

      if (error) {
        console.error('删除记录失败:', error);
      } else {
        // 重新加载数据
        loadData();
      }
    } catch (error) {
      console.error('删除记录失败:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <SkeletonLoader width={80} height={32} borderRadius={16} />
          </View>
          <SkeletonSummary items={3} />
          <View style={styles.buttonsContainer}>
            <SkeletonLoader width="48%" height={60} borderRadius={30} />
            <SkeletonLoader width="48%" height={60} borderRadius={30} />
          </View>
          <View style={styles.buttonsContainer}>
            <SkeletonLoader width="48%" height={60} borderRadius={30} />
            <SkeletonLoader width="48%" height={60} borderRadius={30} />
          </View>
          <View style={styles.recentRecords}>
            <SkeletonLoader width={120} height={24} borderRadius={12} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={3} />
          </View>
        </ScrollView>
      )}
      {!loading && (
        <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>首页</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>总数据摘要</Text>
        <View style={styles.summaryContent}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{todayStats.feedingCount}</Text>
            <Text style={styles.summaryLabel}>次喂养</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{todayStats.diaperCount}</Text>
            <Text style={styles.summaryLabel}>次尿布</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{todayStats.sleepCount}</Text>
            <Text style={styles.summaryLabel}>次睡眠</Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.summaryContent}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatDuration(todayStats.totalDuration)}</Text>
            <Text style={styles.summaryLabel}>喂养总时长</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{todayStats.timeSinceLastFeeding}</Text>
            <Text style={styles.summaryLabel}>距上次喂养</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => navigation.navigate('Timer' as never)}
        >
          <Text style={styles.startButtonText}>母乳喂养</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.bottleButton}
          onPress={() => navigation.navigate('BottleFeeding' as never)}
        >
          <Text style={styles.bottleButtonText}>奶瓶喂养</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={styles.diaperButton}
          onPress={() => navigation.navigate('Diaper' as never)}
        >
          <Text style={styles.diaperButtonText}>尿布记录</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.sleepButton}
          onPress={() => navigation.navigate('Sleep' as never)}
        >
          <Text style={styles.sleepButtonText}>睡眠记录</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.recentRecords}>
        <Text style={styles.recentTitle}>最近24小时记录</Text>
        <ScrollView style={styles.recordsList}>
          {todayRecords.length > 0 ? (
            todayRecords.map((record, index) => {
              let recordStyle = styles.feedingRecord;
              let displayTime = '';
              let displayDuration = '';
              let endTimeDisplay = '';
              
              if (record.type === 'feeding') {
                const feedingRecord = record as any;
                recordStyle = styles.feedingRecord;
                displayTime = formatTime(feedingRecord.startTime);
                displayDuration = formatDuration(feedingRecord.duration);
                endTimeDisplay = formatTime(feedingRecord.endTime);
              } else if (record.recordType === 'diaper') {
                const diaperRecord = record as any;
                recordStyle = styles.diaperRecord;
                displayTime = formatTime(diaperRecord.timestamp);
                displayDuration = diaperRecord.type === 'pee' ? '尿湿' : 
                                diaperRecord.type === 'poop' ? '便便' : '尿湿+便便';
              } else if (record.type === 'sleep') {
                const sleepRecord = record as any;
                recordStyle = styles.sleepRecord;
                displayTime = formatTime(sleepRecord.startTime);
                
                if (!sleepRecord.endTime) {
                  // 正在睡眠中
                  displayDuration = '睡眠中';
                  endTimeDisplay = '睡眠中';
                } else {
                  // 已结束睡眠
                  displayDuration = formatDuration(sleepRecord.duration);
                  endTimeDisplay = formatTime(sleepRecord.endTime);
                }
              }
              
              return (
                <SwipeableRow 
                  key={record.id} 
                  onDelete={() => handleDeleteRecord(record)}
                >
                  <View style={[styles.recordItem, recordStyle]}>
                    <View style={[
                      styles.recordTypeIndicator,
                      record.recordType === 'diaper' && styles.diaperIndicator,
                      record.type === 'sleep' && styles.sleepIndicator
                    ]}>
                      <Text style={styles.recordTypeText}>
                        {record.type === 'feeding' ? '喂' : 
                         record.recordType === 'diaper' ? '尿' : '睡'}
                      </Text>
                    </View>
                    <View style={styles.recordDetails}>
                      <View style={styles.recordMainInfo}>
                        <Text style={styles.recordDuration}>{displayDuration}</Text>
                        <Text style={styles.recordSides}>
                          {record.recordType === 'diaper' ? `时间: ${displayTime}` : `开始: ${displayTime}`}
                        </Text>
                        {endTimeDisplay && record.recordType !== 'diaper' && (
                          <Text style={styles.recordSides}>
                            结束: {endTimeDisplay}
                          </Text>
                        )}
                        <Text style={styles.recordNotes}>
                          {record.note ? `备注: ${record.note}` : ''}
                        </Text>
                      </View>
                      <View style={styles.recordRightInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={[
                            styles.genderIcon,
                            record.babyGender === 'male' && styles.genderIconMale,
                            record.babyGender === 'female' && styles.genderIconFemale
                          ]}>
                            {record.babyGender === 'male' ? '👦' : record.babyGender === 'female' ? '👧' : ''}
                          </Text>
                          <Text style={[
                            styles.recordBabyName,
                            record.babyGender === 'male' && styles.babyBoyName,
                            record.babyGender === 'female' && styles.babyGirlName
                          ]}>
                            {record.babyName || '宝宝'}
                          </Text>
                        </View>
                        <Text style={styles.recordCreator}>
                          {record.createdByName || ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                </SwipeableRow>
              );
            })
          ) : (
            <Text style={styles.emptyText}>最近24小时内没有记录</Text>
          )}
        </ScrollView>
      </View>
        </>
      )}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    flex: 1,
    marginRight: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottleButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    flex: 1,
    marginLeft: 8,
  },
  bottleButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  diaperButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    flex: 1,
    marginRight: 8,
  },
  diaperButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sleepButton: {
    backgroundColor: '#673AB7',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    flex: 1,
    marginLeft: 8,
  },
  sleepButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recentRecords: {
    flex: 1,
    margin: 16,
    marginTop: 24,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  recordsList: {
    flex: 1,
  },
  recordItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  feedingRecord: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  diaperRecord: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  sleepRecord: {
    borderLeftWidth: 4,
    borderLeftColor: '#673AB7',
  },
  recordTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  recordTypeIndicator: {
    backgroundColor: '#4CAF50',
    width: 36,
    height: 36,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  diaperIndicator: {
    backgroundColor: '#2196F3',
  },
  sleepIndicator: {
    backgroundColor: '#673AB7',
  },
  recordTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recordDetails: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordMainInfo: {
    flex: 1,
  },
  recordDuration: {
    fontSize: 16,
    fontWeight: '500',
  },
  recordSides: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  recordNotes: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontStyle: 'italic',
  },
  recordRightInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
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
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
});

export default HomeScreen;