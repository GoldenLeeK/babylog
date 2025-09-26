import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { diaperService } from '../services/supabaseService';
import { DiaperRecord } from '../types';
import LoadingOverlay from '../components/LoadingOverlay';
import BabySelector from '../components/BabySelector';

const DiaperScreen = () => {
  const navigation = useNavigation();
  const [type, setType] = useState<'pee' | 'poop' | 'both' | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBabyId, setSelectedBabyId] = useState<string>('');
  const [selectedBabyName, setSelectedBabyName] = useState<string>('');

  const handleBabySelect = (babyId: string, babyName: string) => {
    setSelectedBabyId(babyId);
    setSelectedBabyName(babyName);
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    if (!type) {
      Alert.alert('提示', '请选择尿布类型');
      return;
    }

    if (!selectedBabyId) {
      Alert.alert('提示', '请选择宝宝');
      return;
    }

    setLoading(true);
    try {
      const record: Omit<DiaperRecord, 'id'> = {
        type,
        note: note.trim(),
        time: Date.now(),
        babyId: selectedBabyId,
        babyName: selectedBabyName
      };

      await diaperService.save(record);
      
      Alert.alert('成功', '尿布记录已保存');
      setType('pee');
      setNote('');
      navigation.goBack();
    } catch (error) {
      console.error('保存记录失败:', error);
      Alert.alert('错误', '保存记录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={loading} message="保存中..." />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>尿布记录</Text>
      </View>
      
      <View style={styles.sideContainer}>
        <BabySelector
          selectedBabyId={selectedBabyId}
          onBabySelect={handleBabySelect}
        />
      </View>
      
      <View style={styles.typeContainer}>
        <Text style={styles.sectionTitle}>选择类型</Text>
        <View style={styles.typeButtons}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'pee' && styles.typeButtonActive]}
            onPress={() => setType('pee')}
          >
            <Text style={[styles.typeButtonText, type === 'pee' && styles.typeButtonTextActive]}>
              尿湿
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeButton, type === 'poop' && styles.typeButtonActive]}
            onPress={() => setType('poop')}
          >
            <Text style={[styles.typeButtonText, type === 'poop' && styles.typeButtonTextActive]}>
              便便
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeButton, type === 'both' && styles.typeButtonActive]}
            onPress={() => setType('both')}
          >
            <Text style={[styles.typeButtonText, type === 'both' && styles.typeButtonTextActive]}>
              两者都有
            </Text>
          </TouchableOpacity>
        </View>
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
        style={[styles.saveButton, !type && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!type}
      >
        <Text style={styles.saveButtonText}>保存记录</Text>
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
    color: '#2196F3',
    textAlign: 'left',
  },
  sideContainer: {
    margin: 16,
  },
  typeContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#2196F3',
  },
  typeButtonText: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  noteContainer: {
    margin: 16,
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
  saveButton: {
    backgroundColor: '#2196F3',
    margin: 16,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#BBDEFB',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DiaperScreen;