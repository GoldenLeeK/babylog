import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';

// 后台任务名称
const BACKGROUND_FETCH_TASK = 'background-fetch';

// 后台任务处理函数
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('执行后台任务...');
    
    // 这里可以添加需要在后台执行的任务
    // 例如：同步数据、发送通知等
    
    // 返回成功状态
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('后台任务执行失败:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

class BackgroundTaskService {
  private isRegistered = false;

  /**
   * 注册后台任务
   */
  async registerBackgroundTask(): Promise<boolean> {
    try {
      // 检查是否已经注册
      if (this.isRegistered) {
        console.log('后台任务已经注册');
        return true;
      }

      // 检查平台支持
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        console.log('当前平台不支持后台任务');
        return false;
      }

      // 检查后台获取是否可用
      const status = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || 
          status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        console.log('后台获取被限制或拒绝');
        return false;
      }

      // 注册后台任务
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15 * 60 * 1000, // 15分钟
        stopOnTerminate: false, // 应用终止时不停止
        startOnBoot: true, // 设备重启时启动
      });

      this.isRegistered = true;
      console.log('后台任务注册成功');
      return true;
    } catch (error) {
      console.error('注册后台任务失败:', error);
      return false;
    }
  }

  /**
   * 取消注册后台任务
   */
  async unregisterBackgroundTask(): Promise<void> {
    try {
      if (this.isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
        this.isRegistered = false;
        console.log('后台任务取消注册成功');
      }
    } catch (error) {
      console.error('取消注册后台任务失败:', error);
    }
  }

  /**
   * 检查后台任务状态
   */
  async getBackgroundFetchStatus(): Promise<BackgroundFetch.BackgroundFetchStatus> {
    try {
      return await BackgroundFetch.getStatusAsync();
    } catch (error) {
      console.error('获取后台任务状态失败:', error);
      return BackgroundFetch.BackgroundFetchStatus.Denied;
    }
  }

  /**
   * 检查任务是否已注册
   */
  isTaskRegistered(): boolean {
    return this.isRegistered;
  }
}

// 导出单例实例
export const backgroundTaskService = new BackgroundTaskService();
export default backgroundTaskService;