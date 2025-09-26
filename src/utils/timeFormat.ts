// 时间格式化工具函数

// 将秒数转换为小时+分钟格式
export const formatSecondsToHoursMinutes = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
};

// 将分钟数转换为小时+分钟格式
export const formatMinutesToHoursMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (hours > 0) {
    return `${hours}小时${remainingMinutes}分钟`;
  } else {
    return `${remainingMinutes}分钟`;
  }
};

// 将小时数转换为小时+分钟格式
export const formatHoursToHoursMinutes = (hours: number): string => {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (wholeHours > 0) {
    return `${wholeHours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
};

// 将总分钟数转换为小时+分钟格式（用于睡眠统计）
export const formatTotalMinutesToHoursMinutes = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
};