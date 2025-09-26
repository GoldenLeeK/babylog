// 定义应用中使用的类型

export interface FeedingRecord {
  id: string;
  startTime: Date; // 修改为Date类型
  endTime: Date; // 修改为Date类型
  duration: number; // 秒数
  leftDuration: number; // 左侧喂养时长（秒）
  rightDuration: number; // 右侧喂养时长（秒）
  note: string;
  feedingType?: 'breast' | 'bottle'; // 喂养类型：母乳或奶瓶
  amount?: number; // 奶瓶喂养的毫升数
  leftSide?: boolean; // 是否使用左侧
  rightSide?: boolean; // 是否使用右侧
}

export interface DiaperRecord {
  id: string;
  time: number; // 时间戳
  type: 'pee' | 'poop' | 'both';
  note?: string;
}

export interface SleepRecord {
  id: string;
  startTime: number; // 时间戳
  endTime?: number; // 时间戳
  duration?: number; // 秒数
  note?: string;
}

// 通知配置相关类型
export interface NotificationConfig {
  id: string;
  type: 1 | 2 | 3; // 1: 喂奶, 2: 换尿布, 3: 自定义
  customName?: string; // 自定义类型的名称
  hours: number; // 小时
  minutes: number; // 分钟
  enabled: boolean; // 是否启用
  createdAt: Date; // 创建时间
  lastTriggered?: Date; // 最后触发时间
}

export type NotificationType = 1 | 2 | 3;

export type RecordType = 'feeding' | 'diaper' | 'sleep';