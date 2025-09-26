import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Share, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabaseService } from '../services/supabaseService';

const ExportScreen = () => {
  const navigation = useNavigation();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // 从Supabase获取所有数据
      const [feedingRecords, diaperRecords, sleepRecords] = await Promise.all([
        supabaseService.feedingService.getAll(),
        supabaseService.diaperService.getAll(),
        supabaseService.sleepService.getAll()
      ]);
      
      const data = {
        feedingRecords,
        diaperRecords,
        sleepRecords,
        exportDate: new Date().toISOString()
      };
      
      const jsonString = JSON.stringify(data, null, 2);
      
      const result = await Share.share({
        message: jsonString,
        title: '宝宝喂养记录数据导出'
      });
      
      if (result.action === Share.sharedAction) {
        Alert.alert('导出成功', '数据已成功导出');
      }
    } catch (error) {
      console.error('导出失败:', error);
      Alert.alert('导出失败', '导出数据时发生错误');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>数据导出</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>数据导出说明</Text>
          <Text style={styles.infoText}>
            • 导出的数据包含所有喂养记录、尿布记录和睡眠记录{'\n'}
            • 数据将以JSON格式导出，可用于备份或分析{'\n'}
            • 您可以通过分享功能将数据发送到其他应用
          </Text>
        </View>
        
        <View style={styles.warningContainer}>
          <Text style={styles.warningTitle}>注意事项</Text>
          <Text style={styles.warningText}>
            • 请妥善保管导出的数据，其中包含宝宝的所有记录信息{'\n'}
            • 导出过程中请勿关闭应用
          </Text>
        </View>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>返回</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.exportButton, isExporting && styles.exportingButton]}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Text style={styles.exportButtonText}>
            {isExporting ? '导出中...' : '导出数据'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  warningContainer: {
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FBC02D',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  warningText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  exportButton: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  exportingButton: {
    backgroundColor: '#81C784',
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default ExportScreen;