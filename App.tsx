import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { backgroundTaskService } from './src/services/backgroundTaskService';
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  useEffect(() => {
    // 应用启动时注册后台任务
    const initializeBackgroundTask = async () => {
      try {
        const success = await backgroundTaskService.registerBackgroundTask();
        if (success) {
          console.log('后台任务初始化成功');
        } else {
          console.log('后台任务初始化失败，将使用前台模式');
        }
      } catch (error) {
        console.error('后台任务初始化错误:', error);
      }
    };

    initializeBackgroundTask();

    // 清理函数
    return () => {
      backgroundTaskService.unregisterBackgroundTask();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
