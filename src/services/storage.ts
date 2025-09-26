import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedingRecord, DiaperRecord, SleepRecord, NotificationConfig } from '../types';

const FEEDING_RECORDS_KEY = 'feeding_records';
const DIAPER_RECORDS_KEY = 'diaper_records';
const SLEEP_RECORDS_KEY = 'sleep_records';
const TEMP_FEEDING_KEY = 'temp_feeding_record';
const NOTIFICATION_CONFIGS_KEY = 'notification_configs';

// 保存喂养记录
export const saveFeedingRecord = async (record: FeedingRecord): Promise<void> => {
  try {
    const records = await getFeedingRecords();
    records.push(record);
    await AsyncStorage.setItem(FEEDING_RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('保存喂养记录失败:', error);
    throw error;
  }
};

// 获取所有喂养记录
export const getFeedingRecords = async (): Promise<FeedingRecord[]> => {
  try {
    const recordsJson = await AsyncStorage.getItem(FEEDING_RECORDS_KEY);
    if (!recordsJson) return [];
    
    const records = JSON.parse(recordsJson);
    // 将字符串日期转换回Date对象
    return records.map((record: any) => ({
      ...record,
      startTime: new Date(record.startTime),
      endTime: new Date(record.endTime)
    }));
  } catch (error) {
    console.error('获取喂养记录失败:', error);
    return [];
  }
};

// 保存尿布记录
export const saveDiaperRecord = async (record: DiaperRecord): Promise<void> => {
  try {
    const records = await getDiaperRecords();
    records.push(record);
    await AsyncStorage.setItem(DIAPER_RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('保存尿布记录失败:', error);
    throw error;
  }
};

// 获取所有尿布记录
export const getDiaperRecords = async (): Promise<DiaperRecord[]> => {
  try {
    const recordsJson = await AsyncStorage.getItem(DIAPER_RECORDS_KEY);
    return recordsJson ? JSON.parse(recordsJson) : [];
  } catch (error) {
    console.error('获取尿布记录失败:', error);
    return [];
  }
};

// 保存睡眠记录
export const saveSleepRecord = async (record: SleepRecord): Promise<void> => {
  try {
    const records = await getSleepRecords();
    const existingIndex = records.findIndex(r => r.id === record.id);
    
    if (existingIndex >= 0) {
      // 更新现有记录
      records[existingIndex] = record;
    } else {
      // 添加新记录
      records.push(record);
    }
    
    await AsyncStorage.setItem(SLEEP_RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('保存睡眠记录失败:', error);
    throw error;
  }
};

// 获取所有睡眠记录
export const getSleepRecords = async (): Promise<SleepRecord[]> => {
  try {
    const recordsJson = await AsyncStorage.getItem(SLEEP_RECORDS_KEY);
    return recordsJson ? JSON.parse(recordsJson) : [];
  } catch (error) {
    console.error('获取睡眠记录失败:', error);
    return [];
  }
};

// 导出所有数据
export const exportAllData = async () => {
  try {
    const feedingRecords = await getFeedingRecords();
    const diaperRecords = await getDiaperRecords();
    const sleepRecords = await getSleepRecords();
    
    return {
      feedingRecords,
      diaperRecords,
      sleepRecords,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0'
    };
  } catch (error) {
    console.error('导出数据失败:', error);
    throw error;
  }
};

// 删除喂养记录
export const deleteFeedingRecord = async (recordId: string): Promise<void> => {
  try {
    const records = await getFeedingRecords();
    const filteredRecords = records.filter(record => record.id !== recordId);
    await AsyncStorage.setItem(FEEDING_RECORDS_KEY, JSON.stringify(filteredRecords));
  } catch (error) {
    console.error('删除喂养记录失败:', error);
    throw error;
  }
};

// 删除尿布记录
export const deleteDiaperRecord = async (recordId: string): Promise<void> => {
  try {
    const records = await getDiaperRecords();
    const filteredRecords = records.filter(record => record.id !== recordId);
    await AsyncStorage.setItem(DIAPER_RECORDS_KEY, JSON.stringify(filteredRecords));
  } catch (error) {
    console.error('删除尿布记录失败:', error);
    throw error;
  }
};

// 删除睡眠记录
export const deleteSleepRecord = async (recordId: string): Promise<void> => {
  try {
    const records = await getSleepRecords();
    const filteredRecords = records.filter(record => record.id !== recordId);
    await AsyncStorage.setItem(SLEEP_RECORDS_KEY, JSON.stringify(filteredRecords));
  } catch (error) {
    console.error('删除睡眠记录失败:', error);
    throw error;
  }
};

// 临时喂养记录相关函数
export interface TempFeedingData {
  startTime: number;
  leftSelected: boolean;
  rightSelected: boolean;
  leftStartTime: number | null;
  rightStartTime: number | null;
  leftDuration: number;
  rightDuration: number;
  note: string;
}

// 保存临时喂养记录
export const saveTempFeedingRecord = async (data: TempFeedingData): Promise<void> => {
  try {
    await AsyncStorage.setItem(TEMP_FEEDING_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('保存临时喂养记录失败:', error);
    throw error;
  }
};

// 获取临时喂养记录
export const getTempFeedingRecord = async (): Promise<TempFeedingData | null> => {
  try {
    const dataJson = await AsyncStorage.getItem(TEMP_FEEDING_KEY);
    return dataJson ? JSON.parse(dataJson) : null;
  } catch (error) {
    console.error('获取临时喂养记录失败:', error);
    return null;
  }
};

// 清除临时喂养记录
export const clearTempFeedingRecord = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TEMP_FEEDING_KEY);
  } catch (error) {
    console.error('清除临时喂养记录失败:', error);
    throw error;
  }
};

// 通知配置相关函数

// 保存通知配置
export const saveNotificationConfig = async (config: NotificationConfig): Promise<void> => {
  try {
    const configs = await getNotificationConfigs();
    const existingIndex = configs.findIndex(c => c.id === config.id);
    
    if (existingIndex >= 0) {
      // 更新现有配置
      configs[existingIndex] = config;
    } else {
      // 添加新配置
      configs.push(config);
    }
    
    await AsyncStorage.setItem(NOTIFICATION_CONFIGS_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error('保存通知配置失败:', error);
    throw error;
  }
};

// 获取所有通知配置
export const getNotificationConfigs = async (): Promise<NotificationConfig[]> => {
  try {
    const configsJson = await AsyncStorage.getItem(NOTIFICATION_CONFIGS_KEY);
    if (!configsJson) return [];
    
    const configs = JSON.parse(configsJson);
    // 将字符串日期转换回Date对象
    return configs.map((config: any) => ({
      ...config,
      createdAt: new Date(config.createdAt),
      lastTriggered: config.lastTriggered ? new Date(config.lastTriggered) : null
    }));
  } catch (error) {
    console.error('获取通知配置失败:', error);
    return [];
  }
};

// 删除通知配置
export const deleteNotificationConfig = async (configId: string): Promise<void> => {
  try {
    const configs = await getNotificationConfigs();
    const filteredConfigs = configs.filter(config => config.id !== configId);
    await AsyncStorage.setItem(NOTIFICATION_CONFIGS_KEY, JSON.stringify(filteredConfigs));
  } catch (error) {
    console.error('删除通知配置失败:', error);
    throw error;
  }
};

// 更新通知配置的最后触发时间
export const updateNotificationLastTriggered = async (configId: string, lastTriggered: Date): Promise<void> => {
  try {
    const configs = await getNotificationConfigs();
    const configIndex = configs.findIndex(c => c.id === configId);
    
    if (configIndex >= 0) {
      configs[configIndex].lastTriggered = lastTriggered;
      await AsyncStorage.setItem(NOTIFICATION_CONFIGS_KEY, JSON.stringify(configs));
    }
  } catch (error) {
    console.error('更新通知配置最后触发时间失败:', error);
    throw error;
  }
};