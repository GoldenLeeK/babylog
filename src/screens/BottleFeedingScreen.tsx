import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { feedingService } from '../services/supabaseService';
import { FeedingRecord } from '../types';
import LoadingOverlay from '../components/LoadingOverlay';
import BabySelector from '../components/BabySelector';
import NumberPicker from '../components/NumberPicker';

const BottleFeedingScreen = () => {
  const navigation = useNavigation();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBabyId, setSelectedBabyId] = useState<string>('');
  const [selectedBabyName, setSelectedBabyName] = useState<string>('');

  const handleBabySelect = (babyId: string, babyName: string) => {
    setSelectedBabyId(babyId);
    setSelectedBabyName(babyName);
  };

  const handleSave = async () => {
    if (!selectedBabyId) {
      Alert.alert('提示', '请选择宝宝');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('提示', '请输入有效的奶量（毫升）');
      return;
    }

    setLoading(true);
    const now = new Date();
    const record: FeedingRecord = {
      id: Date.now().toString(),
      startTime: now,
      endTime: now,
      duration: 0, // 奶瓶喂养不需要计时
      leftDuration: 0,
      rightDuration: 0,
      leftSide: false,
      rightSide: false,
      note: note.trim(),
      feedingType: 'bottle',
      amount: Number(amount),
      babyId: selectedBabyId,
      babyName: selectedBabyName
    };

    try {
      await feedingService.save(record);
      navigation.goBack();
    } catch (error) {
      Alert.alert('错误', '保存记录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={loading} message="保存中..." />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>奶瓶喂养</Text>
      </View>
      <View style={styles.amountContainer}>
        <BabySelector
          selectedBabyId={selectedBabyId}
          onBabySelect={handleBabySelect}
        />
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>奶量（毫升）</Text>
          <NumberPicker
            value={parseInt(amount) || 0}
            onValueChange={(value) => setAmount(value.toString())}
            min={0}
            max={999}
            step={10}
            allowDecimals={false}
            unit="ml"
            placeholder="请输入奶量"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>备注</Text>
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
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>保存记录</Text>
        </TouchableOpacity>
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
    color: '#FF9800',
    textAlign: 'left',
  },
  amountContainer: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    textAlign: 'center',
    textAlignVertical: 'center',
    height: 44,
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
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BottleFeedingScreen;