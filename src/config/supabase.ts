import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Supabase 配置
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 配置未设置，请设置 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// 创建 Supabase 客户端
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  db: {
    schema: 'public',
  },
});

// 数据库表名常量
export const TABLES = {
  FEEDING_RECORDS: 'feeding_records',
  DIAPER_RECORDS: 'diaper_records',
  SLEEP_RECORDS: 'sleep_records',
} as const;

// 错误处理工具函数
export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase ${operation} 失败:`, error);
  
  if (error?.code === 'PGRST116') {
    throw new Error('未找到数据');
  } else if (error?.code === '23505') {
    throw new Error('数据已存在');
  } else if (error?.code === '23503') {
    throw new Error('关联数据不存在');
  } else if (error?.message?.includes('JWT')) {
    throw new Error('认证失败，请重新登录');
  } else {
    throw new Error(`数据库操作失败: ${error?.message || '未知错误'}`);
  }
};

// 网络连接检查
export const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('feeding_records').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('数据库连接检查失败:', error);
    return false;
  }
};