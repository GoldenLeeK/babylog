import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, Alert, AppState, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Timer from '../components/Timer';
import SideSelector from '../components/SideSelector';
import BabySelector from '../components/BabySelector';
import { feedingService } from '../services/supabaseService';
import { FeedingRecord } from '../types';

const TimerScreen = () => {
  const navigation = useNavigation();
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [leftSelected, setLeftSelected] = useState(false);
  const [rightSelected, setRightSelected] = useState(false);
  const [leftStartTime, setLeftStartTime] = useState<number | null>(null);
  const [rightStartTime, setRightStartTime] = useState<number | null>(null);
  const [leftDuration, setLeftDuration] = useState(0);
  const [rightDuration, setRightDuration] = useState(0);
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedBabyId, setSelectedBabyId] = useState<string>('');
  const [selectedBabyName, setSelectedBabyName] = useState<string>('');

  // 简化后的TimerScreen，移除临时记录功能
  useEffect(() => {
    // 初始化逻辑
  }, []);

  const handleBabySelect = (babyId: string, babyName: string) => {
    setSelectedBabyId(babyId);
    setSelectedBabyName(babyName);
  };

  const handleStart = async () => {
    const now = Date.now();
    setIsRunning(true);
    setStartTime(now);
  };

  const handleStop = async () => {
    if (!isRunning || !startTime || isSaving) return;

    if (!selectedBabyId) {
      Alert.alert('提示', '请选择宝宝');
      return;
    }

    setIsSaving(true);
    const now = Date.now();
    
    // 计算总的喂养时长（从开始到现在的总时间）
    const totalSessionDuration = Math.floor((now - startTime) / 1000);
    
    let finalLeftDuration = leftDuration;
    let finalRightDuration = rightDuration;

    // 计算当前正在进行的侧别时长
    if (leftSelected && leftStartTime) {
      finalLeftDuration += Math.floor((now - leftStartTime) / 1000);
    }
    if (rightSelected && rightStartTime) {
      finalRightDuration += Math.floor((now - rightStartTime) / 1000);
    }

    // 如果没有选择任何侧别，但有计时时间，则将时间分配给左侧
    if (finalLeftDuration === 0 && finalRightDuration === 0 && totalSessionDuration > 0) {
      finalLeftDuration = totalSessionDuration;
    }
    
    const finalTotalDuration = Math.max(totalSessionDuration, finalLeftDuration + finalRightDuration);
    
    if (finalTotalDuration === 0) {
      Alert.alert('提示', '请至少进行一些时间的喂养');
      setIsSaving(false);
      return;
    }

    const record: FeedingRecord = {
      id: Date.now().toString(),
      startTime: new Date(startTime),
      endTime: new Date(now),
      duration: finalTotalDuration,
      leftDuration: finalLeftDuration,
      rightDuration: finalRightDuration,
      note: note.trim(),
      feedingType: 'breast',
      leftSide: finalLeftDuration > 0,
      rightSide: finalRightDuration > 0,
      babyId: selectedBabyId,
      babyName: selectedBabyName
    };

    try {
      await feedingService.save(record);
      
      // 重置状态
      setIsRunning(false);
      setStartTime(null);
      setLeftSelected(false);
      setRightSelected(false);
      setLeftStartTime(null);
      setRightStartTime(null);
      setLeftDuration(0);
      setRightDuration(0);
      setNote('');
      setIsSaving(false);
      
      navigation.goBack();
    } catch (error) {
      Alert.alert('错误', '保存记录失败，请重试');
      setIsSaving(false);
    }
  };

  const handleLeftPress = () => {
    if (!isRunning) return;
    const now = Date.now();
    
    if (leftSelected) {
      // 如果左侧已选中，停止左侧计时
      if (leftStartTime) {
        const leftDurationToAdd = Math.floor((now - leftStartTime) / 1000);
        setLeftDuration(prev => prev + leftDurationToAdd);
      }
      setLeftStartTime(null);
      setLeftSelected(false);
    } else {
      // 开始左侧计时
      setLeftSelected(true);
      setLeftStartTime(now);
    }
  };

  const handleRightPress = () => {
    if (!isRunning) return;
    const now = Date.now();
    
    if (rightSelected) {
      // 如果右侧已选中，停止右侧计时
      if (rightStartTime) {
        const rightDurationToAdd = Math.floor((now - rightStartTime) / 1000);
        setRightDuration(prev => prev + rightDurationToAdd);
      }
      setRightStartTime(null);
      setRightSelected(false);
    } else {
      // 开始右侧计时
      setRightSelected(true);
      setRightStartTime(now);
    }
  };

  const handleBothPress = () => {
    if (!isRunning) return;
    const now = Date.now();
    
    if (leftSelected && rightSelected) {
      // 如果两侧都在计时，停止两侧
      if (leftStartTime) {
        const leftDurationToAdd = Math.floor((now - leftStartTime) / 1000);
        setLeftDuration(prev => prev + leftDurationToAdd);
      }
      if (rightStartTime) {
        const rightDurationToAdd = Math.floor((now - rightStartTime) / 1000);
        setRightDuration(prev => prev + rightDurationToAdd);
      }
      setLeftSelected(false);
      setRightSelected(false);
      setLeftStartTime(null);
      setRightStartTime(null);
    } else {
      // 否则选中两侧并开始计时
      setLeftSelected(true);
      setRightSelected(true);
      setLeftStartTime(now);
      setRightStartTime(now);
    }
  };

  const handleGoBack = async () => {
    // 如果正在计时，保存临时记录
    if (isRunning) {
      await saveTempRecord();
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>母乳喂养</Text>
      </View>
      
      <View style={styles.sideContainer}>
        <BabySelector
          selectedBabyId={selectedBabyId}
          onBabySelect={handleBabySelect}
        />
      </View>
      
      <View style={styles.statusContainer}>
        <Timer 
          isRunning={isRunning} 
          onStart={handleStart} 
          onStop={handleStop}
          startTime={startTime || undefined}
          disabled={isSaving}
          leftDuration={leftDuration}
          rightDuration={rightDuration}
          leftSelected={leftSelected}
          rightSelected={rightSelected}
          leftStartTime={leftStartTime}
          rightStartTime={rightStartTime}
        />
      </View>
      
      <View style={styles.sideContainer}>
        <Text style={styles.sectionTitle}>选择喂养侧别</Text>
        <SideSelector
          leftSelected={leftSelected}
          rightSelected={rightSelected}
          onLeftPress={handleLeftPress}
          onRightPress={handleRightPress}
          disabled={!isRunning}
        />
        <TouchableOpacity 
          style={[
            styles.bothButton, 
            !isRunning && styles.bothButtonDisabled,
            (leftSelected && rightSelected) && styles.bothButtonActive
          ]}
          onPress={handleBothPress}
          disabled={!isRunning}
        >
          <Text style={styles.bothButtonText}>
            {leftSelected && rightSelected ? '取消两侧' : '同时选择两侧'}
          </Text>
        </TouchableOpacity>
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

      <TouchableOpacity 
        style={[
          styles.saveButton, 
          (!isRunning || isSaving) && styles.saveButtonDisabled
        ]}
        onPress={handleStop}
        disabled={!isRunning || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.saveButtonText}>停止并保存</Text>
        )}
      </TouchableOpacity>
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
    color: '#4CAF50',
    textAlign: 'left',
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  bothButton: {
    backgroundColor: '#673AB7',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bothButtonDisabled: {
    backgroundColor: '#D1C4E9',
  },
  bothButtonActive: {
    backgroundColor: '#4CAF50',
  },
  bothButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sideContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  noteContainer: {
    margin: 16,
  },
  noteInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    color: '#333',
    textAlign: 'left',
  },
  saveButton: {
    backgroundColor: '#F44336',
    margin: 16,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TimerScreen;