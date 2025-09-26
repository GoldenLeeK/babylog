import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, Alert, AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { sleepService } from '../services/supabaseService';
import { SleepRecord } from '../types';
import LoadingOverlay from '../components/LoadingOverlay';
import BabySelector from '../components/BabySelector';

interface SleepStatus {
  babyId: string;
  babyName: string;
  isSleeping: boolean;
  startTime: number | null;
  currentSleepId: string | null;
  note: string;
}

const SleepScreen = () => {
  const navigation = useNavigation();
  const [sleepStatuses, setSleepStatuses] = useState<{[babyId: string]: SleepStatus}>({});
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [selectedBabyId, setSelectedBabyId] = useState<string>('');
  const [selectedBabyName, setSelectedBabyName] = useState<string>('');
  const [note, setNote] = useState('');

  const handleBabySelect = (babyId: string, babyName: string) => {
    setSelectedBabyId(babyId);
    setSelectedBabyName(babyName);
    // 同步选中宝宝的备注
    if (sleepStatuses[babyId]) {
      setNote(sleepStatuses[babyId].note);
    } else {
      setNote('');
    }
  };

  // 检查是否有未完成的睡眠记录
  useEffect(() => {
    checkOngoingSleep();
  }, []);

  // 简化睡眠屏幕，移除后台状态监听

  // 实时更新时间（当有宝宝正在睡眠时）
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const hasSleepingBaby = Object.values(sleepStatuses).some(status => status.isSleeping);
    if (hasSleepingBaby) {
      interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000); // 每秒更新一次
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [sleepStatuses]);

  const checkOngoingSleep = async () => {
    try {
      // 获取所有活跃的睡眠记录
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sleep_records')
        .select(`
          *,
          baby_profiles!inner(id, name)
        `)
        .eq('user_id', user.id)
        .is('end_time', null)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('获取活跃睡眠记录失败:', error);
        return;
      }

      if (data && data.length > 0) {
        const newSleepStatuses: {[babyId: string]: SleepStatus} = {};
        
        data.forEach((record: any) => {
          const babyId = record.baby_id || 'unknown';
          const babyName = record.baby_profiles?.name || '未知宝宝';
          newSleepStatuses[babyId] = {
            babyId,
            babyName: babyName,
            isSleeping: true,
            startTime: new Date(record.start_time).getTime(),
            currentSleepId: record.id,
            note: record.note || ''
          };
        });
        
        setSleepStatuses(newSleepStatuses);
        
        // 如果当前选中的宝宝正在睡觉，同步备注
        if (selectedBabyId && newSleepStatuses[selectedBabyId]) {
          setNote(newSleepStatuses[selectedBabyId].note);
        }
      }
    } catch (error) {
      console.error('检查睡眠记录失败:', error);
    }
  };

  const handleStartSleep = async () => {
    if (!selectedBabyId) {
      Alert.alert('提示', '请选择宝宝');
      return;
    }

    // 检查选中的宝宝是否已经在睡觉
    if (sleepStatuses[selectedBabyId]?.isSleeping) {
      Alert.alert('提示', '该宝宝已经在睡觉中');
      return;
    }

    setLoading(true);
    const now = Date.now();
    
    // 创建新的睡眠记录（只有开始时间，endTime为null表示正在睡眠）
    const record: Omit<SleepRecord, 'id'> = {
      startTime: now,
      note: note.trim() || undefined,
      babyId: selectedBabyId,
      babyName: selectedBabyName
    };
    
    try {
      const savedRecord = await sleepService.save(record);
      
      // 更新睡眠状态
      setSleepStatuses(prev => ({
        ...prev,
        [selectedBabyId]: {
          babyId: selectedBabyId,
          babyName: selectedBabyName,
          isSleeping: true,
          startTime: now,
          currentSleepId: savedRecord.id,
          note: note.trim()
        }
      }));
      
      Alert.alert('已开始记录', `${selectedBabyName}开始睡觉了`);
    } catch (error) {
      console.error('保存记录失败:', error);
      Alert.alert('错误', '无法保存睡眠记录');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSleep = async () => {
    const currentStatus = sleepStatuses[selectedBabyId];
    if (!currentStatus || !currentStatus.isSleeping || !currentStatus.startTime || !currentStatus.currentSleepId) {
      Alert.alert('提示', '该宝宝当前没有活跃的睡眠记录');
      return;
    }
    
    setLoading(true);
    try {
      const now = Date.now();
      const duration = Math.floor((now - currentStatus.startTime) / 1000);
      
      // 更新现有记录，设置结束时间和持续时间
      const updatedRecord: SleepRecord = {
        id: currentStatus.currentSleepId,
        startTime: currentStatus.startTime,
        endTime: now,
        duration: duration,
        note: note.trim() || undefined,
        babyId: selectedBabyId,
        babyName: selectedBabyName
      };
      
      await sleepService.update(updatedRecord);
      
      // 更新睡眠状态为清醒
      setSleepStatuses(prev => ({
        ...prev,
        [selectedBabyId]: {
          ...prev[selectedBabyId],
          isSleeping: false,
          startTime: null,
          currentSleepId: null
        }
      }));
      
      // 清空备注输入
      setNote('');
      
      Alert.alert('成功', `${selectedBabyName}的睡眠记录已保存`);
    } catch (error) {
      console.error('保存睡眠记录失败', error);
      Alert.alert('错误', '保存睡眠记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化持续时间为小时、分钟和秒
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      if (minutes > 0 && remainingSeconds > 0) {
        return `${hours}小时${minutes}分${remainingSeconds}秒`;
      } else if (minutes > 0) {
        return `${hours}小时${minutes}分钟`;
      } else if (remainingSeconds > 0) {
        return `${hours}小时${remainingSeconds}秒`;
      } else {
        return `${hours}小时`;
      }
    } else if (minutes > 0) {
      if (remainingSeconds > 0) {
        return `${minutes}分${remainingSeconds}秒`;
      } else {
        return `${minutes}分钟`;
      }
    } else {
      return `${remainingSeconds}秒`;
    }
  };

  // 计算已睡眠时间（如果选中的宝宝正在睡眠）
  const getSleepDuration = (): string => {
    const currentStatus = sleepStatuses[selectedBabyId];
    if (!currentStatus || !currentStatus.isSleeping || !currentStatus.startTime) return '未开始';
    
    const durationSeconds = Math.max(0, Math.floor((currentTime - currentStatus.startTime) / 1000));
    return formatDuration(durationSeconds);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };
  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={loading} message="处理中..." />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>睡眠记录</Text>
      </View>
      
      {/* 显示所有宝宝的睡眠状态 */}
      <View style={styles.allBabiesStatusContainer}>
        <Text style={styles.allBabiesStatusTitle}>所有宝宝状态</Text>
        {Object.values(sleepStatuses).map((status) => (
          <View key={status.babyId} style={styles.babyStatusItem}>
            <Text style={styles.babyName}>{status.babyName}</Text>
            <Text style={[
              styles.babyStatus,
              status.isSleeping ? styles.sleepingText : styles.awakeText
            ]}>
              {status.isSleeping ? '💤 睡觉中' : '👶 清醒'}
            </Text>
            {status.isSleeping && status.startTime && (
              <Text style={styles.sleepDuration}>
                {formatDuration(Math.max(0, Math.floor((currentTime - status.startTime) / 1000)))}
              </Text>
            )}
          </View>
        ))}
        {Object.keys(sleepStatuses).length === 0 && (
          <Text style={styles.noSleepingBabies}>暂无宝宝睡眠记录</Text>
        )}
      </View>

      <View style={styles.sideContainer}>
        <BabySelector
          selectedBabyId={selectedBabyId}
          onBabySelect={handleBabySelect}
        />
      </View>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>状态:</Text>
        <Text style={[
          styles.statusValue, 
          sleepStatuses[selectedBabyId]?.isSleeping ? styles.sleepingStatus : styles.awakeStatus
        ]}>
          {sleepStatuses[selectedBabyId]?.isSleeping ? '正在睡觉' : '清醒'}
        </Text>
        
        {sleepStatuses[selectedBabyId]?.isSleeping && (
          <View style={styles.durationContainer}>
            <Text style={styles.durationLabel}>已睡时间:</Text>
            <Text style={styles.durationValue}>{getSleepDuration()}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.actionContainer}>
        {!sleepStatuses[selectedBabyId]?.isSleeping ? (
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartSleep}
          >
            <Text style={styles.buttonText}>宝宝睡觉了</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.stopButton}
            onPress={handleEndSleep}
          >
            <Text style={styles.buttonText}>宝宝醒了</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.noteContainer}>
        <Text style={styles.sectionTitle}>备注</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="添加备注（可选）"
          placeholderTextColor="#999"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={200}
        />
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#673AB7',
    textAlign: 'left',
  },
  placeholder: {
    width: 50,
  },
  statusContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  statusLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sleepingStatus: {
    color: '#673AB7',
  },
  awakeStatus: {
    color: '#4CAF50',
  },
  durationContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  durationLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  durationValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#673AB7',
  },
  allBabiesStatusContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  allBabiesStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  babyStatusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  babyName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  babyStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 10,
  },
  sleepingText: {
    color: '#4CAF50',
  },
  awakeText: {
    color: '#FF9800',
  },
  sleepDuration: {
    fontSize: 12,
    color: '#666',
    minWidth: 60,
    textAlign: 'right',
  },
  noSleepingBabies: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 10,
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  startButton: {
    backgroundColor: '#673AB7',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '80%',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#F44336',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sideContainer: {
    margin: 16,
  },
  noteContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  noteInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    color: '#333',
    textAlign: 'left',
  },
});

export default SleepScreen;