import { supabase } from '../config/supabase';

// 用户类型定义
export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// 认证服务
export const authService = {
  // 获取当前用户
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('获取当前用户失败:', error);
        return null;
      }
      
      if (!session?.user) {
        return null;
      }
      
      return {
        id: session.user.id,
        email: session.user.email || '',
        createdAt: new Date(session.user.created_at),
      };
    } catch (error) {
      console.error('获取当前用户异常:', error);
      return null;
    }
  },

  // 用户注册
  async signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        // 增强错误处理，确保错误信息不为空
        let errorMessage = error.message;
        if (!errorMessage || errorMessage.trim() === '') {
          // 根据错误码提供更有意义的错误信息
          switch (error.code) {
            case 'user_already_exists':
              errorMessage = '该邮箱已被注册';
              break;
            case 'invalid_email':
              errorMessage = '邮箱格式不正确';
              break;
            case 'weak_password':
              errorMessage = '密码强度不够，请使用更复杂的密码';
              break;
            default:
              errorMessage = '注册失败，请检查输入信息';
          }
        }
        return { user: null, error: errorMessage };
      }
      
      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          createdAt: new Date(data.user.created_at),
        };
        return { user, error: null };
      }
      
      return { user: null, error: '注册失败' };
    } catch (error: any) {
      return { user: null, error: error.message || '注册异常' };
    }
  },

  // 用户登录
  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // 增强错误处理，确保错误信息不为空
        let errorMessage = error.message;
        if (!errorMessage || errorMessage.trim() === '') {
          // 根据错误码提供更有意义的错误信息
          switch (error.code) {
            case 'invalid_credentials':
              errorMessage = '邮箱或密码错误';
              break;
            case 'email_not_confirmed':
              errorMessage = '邮箱未验证，请检查邮箱中的验证链接';
              break;
            case 'too_many_requests':
              errorMessage = '请求过于频繁，请稍后再试';
              break;
            default:
              errorMessage = '登录失败，请检查邮箱和密码是否正确';
          }
        }
        return { user: null, error: errorMessage };
      }
      
      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          createdAt: new Date(data.user.created_at),
        };
        return { user, error: null };
      }
      
      return { user: null, error: '登录失败' };
    } catch (error: any) {
      return { user: null, error: error.message || '登录异常' };
    }
  },

  // 用户登出
  async signOut(): Promise<{ error: string | null }> {
    try {
      // 清除自动登录配置
      const { error } = await supabase.auth.signOut();
      
      // 清除本地存储的自动登录信息
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('savedEmail');
        localStorage.removeItem('savedPassword');
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('autoLogin');
      }
      
      // 清除AsyncStorage中的自动登录配置（React Native）
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.multiRemove(['savedEmail', 'savedPassword', 'rememberMe', 'autoLogin']);
      } catch (storageError) {
        // AsyncStorage可能不存在，忽略错误
        console.log('AsyncStorage not available, skipped');
      }
      
      return { error: error?.message || null };
    } catch (error: any) {
      return { error: error.message || '登出异常' };
    }
  },

  // 监听认证状态变化
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            createdAt: new Date(session.user.created_at),
          };
          callback(user);
        } else {
          callback(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  },

  // 重置密码
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      return { error: error?.message || null };
    } catch (error: any) {
      return { error: error.message || '重置密码异常' };
    }
  },

  // 更新用户密码
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      return { error: error?.message || null };
    } catch (error: any) {
      return { error: error.message || '更新密码异常' };
    }
  },
};

export default authService;