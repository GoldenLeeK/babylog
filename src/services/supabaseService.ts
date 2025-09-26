import { supabase, TABLES, handleSupabaseError } from '../config/supabase';
import { FeedingRecord, DiaperRecord, SleepRecord } from '../types';
import { Database } from '../types/database';
import authService from './authService';

// 宝宝信息类型定义
export interface BabyProfile {
  id: string;
  family_id: string;
  name: string;
  nickname?: string;
  date_of_birth: string;
  gender?: 'male' | 'female';
  birth_weight?: number;
  current_weight?: number;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 获取当前用户ID
const getCurrentUserId = async (): Promise<string> => {
  const user = await authService.getCurrentUser();
  if (!user) {
    throw new Error('用户未登录');
  }
  return user.id;
};

// 获取当前用户的family_id
const getCurrentUserFamilyId = async (): Promise<string> => {
  const userId = await getCurrentUserId();
  
  // 首先尝试从family_members表获取用户的family_id
  const { data: memberData, error: memberError } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .maybeSingle(); // ✅ 正确使用：用户可能没有家庭
  
  if (!memberError && memberData) {
    return memberData.family_id;
  }
  
  // 如果用户不是家庭成员，检查是否是家庭创建者
  const { data: familyData, error: familyError } = await supabase
    .from('family_groups')
    .select('id')
    .eq('created_by', userId)
    .maybeSingle(); // ✅ 正确使用：用户可能没有创建家庭
  
  if (!familyError && familyData) {
    return familyData.id;
  }
  
  // 如果用户既不是成员也不是创建者，使用familyService获取
  try {
    const { familyService } = await import('./familyService');
    return await familyService.getUserPrimaryFamilyId();
  } catch (importError) {
    // 如果导入失败，抛出原始错误
    throw new Error('用户未加入任何家庭组，请先创建或加入家庭');
  }
};

// 类型转换工具函数 - 适配当前数据库结构
const convertFeedingRecordToDb = async (record: FeedingRecord): Promise<Database['public']['Tables']['feeding_records']['Insert']> => {
  const userId = await getCurrentUserId();
  const familyId = await getCurrentUserFamilyId();
  const result: any = {
    user_id: userId,
    family_id: familyId,
    baby_id: record.babyId || null,
    start_time: record.startTime.toISOString(),
    end_time: record.endTime.toISOString(),
    duration: record.duration,
    note: record.note,
    feeding_type: record.feedingType || null,
    amount: record.amount || null,
  };
  
  // 只有当这些列存在时才添加
  if (record.leftDuration !== undefined) {
    result.left_duration = record.leftDuration;
  }
  if (record.rightDuration !== undefined) {
    result.right_duration = record.rightDuration;
  }
  if (record.leftSide !== undefined) {
    result.left_side = record.leftSide;
  }
  if (record.rightSide !== undefined) {
    result.right_side = record.rightSide;
  }
  
  return result;
};

const convertDbToFeedingRecord = (dbRecord: Database['public']['Tables']['feeding_records']['Row']): FeedingRecord => ({
  id: dbRecord.id,
  startTime: new Date(dbRecord.start_time),
  endTime: new Date(dbRecord.end_time),
  duration: dbRecord.duration,
  leftDuration: (dbRecord as any).left_duration || 0,
  rightDuration: (dbRecord as any).right_duration || 0,
  note: dbRecord.note,
  feedingType: dbRecord.feeding_type || undefined,
  amount: dbRecord.amount || undefined,
  leftSide: (dbRecord as any).left_side || undefined,
  rightSide: (dbRecord as any).right_side || undefined,
  babyId: (dbRecord as any).baby_id || undefined,
  createdBy: dbRecord.user_id,
});

const convertDiaperRecordToDb = async (record: DiaperRecord): Promise<Database['public']['Tables']['diaper_records']['Insert']> => {
  const userId = await getCurrentUserId();
  const familyId = await getCurrentUserFamilyId();
  return {
    user_id: userId,
    family_id: familyId,
    baby_id: record.babyId || null,
    time: new Date(record.time).toISOString(),
    type: record.type,
    note: record.note || null,
  };
};

const convertDbToDiaperRecord = (dbRecord: Database['public']['Tables']['diaper_records']['Row']): DiaperRecord => ({
  id: dbRecord.id,
  time: new Date(dbRecord.time).getTime(),
  timestamp: new Date(dbRecord.time).getTime(), // 兼容字段
  type: dbRecord.type,
  note: dbRecord.note || undefined,
  babyId: (dbRecord as any).baby_id || undefined,
  createdBy: dbRecord.user_id,
});

const convertSleepRecordToDb = async (record: SleepRecord): Promise<Database['public']['Tables']['sleep_records']['Insert']> => {
  const userId = await getCurrentUserId();
  const familyId = await getCurrentUserFamilyId();
  return {
    user_id: userId,
    family_id: familyId,
    baby_id: record.babyId || null,
    start_time: new Date(record.startTime).toISOString(),
    end_time: record.endTime ? new Date(record.endTime).toISOString() : null,
    duration: record.duration || null,
    note: record.note || null,
  };
};

const convertDbToSleepRecord = (dbRecord: Database['public']['Tables']['sleep_records']['Row'] | null): SleepRecord | null => {
  if (!dbRecord) return null;
  
  return {
    id: dbRecord.id,
    startTime: new Date(dbRecord.start_time).getTime(),
    endTime: dbRecord.end_time ? new Date(dbRecord.end_time).getTime() : undefined,
    duration: dbRecord.duration || undefined,
    note: dbRecord.note || undefined,
    babyId: (dbRecord as any).baby_id || undefined,
    createdBy: dbRecord.user_id,
  };
};

// 喂养记录服务
export const feedingService = {
  async save(record: Omit<FeedingRecord, 'id'>): Promise<FeedingRecord> {
    try {
      const recordData = await convertFeedingRecordToDb(record as FeedingRecord);
      const { data, error } = await supabase
        .from(TABLES.FEEDING_RECORDS)
        .insert(recordData)
        .select()
        .single(); // ✅ 保持single：插入后必须返回数据

      if (error) {
        if (error.code === 'PGRST116') throw new Error('保存喂养记录失败：未找到记录');
        throw error;
      }
      return convertDbToFeedingRecord(data);
    } catch (error) {
      handleSupabaseError(error, '保存喂养记录');
      throw error;
    }
  },

  async getAll(): Promise<FeedingRecord[]> {
    try {
      const familyId = await getCurrentUserFamilyId();
      const { data, error } = await supabase
        .from(TABLES.FEEDING_RECORDS)
        .select(`
          *,
          baby_profiles!baby_id (
            id,
            name
          ),
          family_groups!family_id (
            id,
            name,
            family_members (
              role,
              user_profiles!user_id (
                display_name
              )
            )
          )
        `)
        .eq('family_id', familyId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data?.map(record => {
        const feedingRecord = convertDbToFeedingRecord(record);
        // 添加宝宝和创建人信息
        if (record.baby_profiles) {
          feedingRecord.babyName = record.baby_profiles.name;
        }
        if (record.family_members && record.family_members.length > 0) {
          const familyMember = record.family_members[0];
          feedingRecord.createdByRole = familyMember.role;
          if (familyMember.user_profiles) {
            feedingRecord.createdByName = familyMember.user_profiles.display_name;
          }
        }
        return feedingRecord;
      }) || [];
    } catch (error) {
      handleSupabaseError(error, '获取喂养记录');
      return [];
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.FEEDING_RECORDS)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, '删除喂养记录');
      throw error;
    }
  },

  async getByDateRange(startDate: Date, endDate: Date): Promise<FeedingRecord[]> {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from(TABLES.FEEDING_RECORDS)
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data?.map(convertDbToFeedingRecord) || [];
    } catch (error) {
      handleSupabaseError(error, '按日期范围获取喂养记录');
      return [];
    }
  },
};

// 尿布记录服务
export const diaperService = {
  async save(record: Omit<DiaperRecord, 'id'>): Promise<DiaperRecord> {
    try {
      const recordData = await convertDiaperRecordToDb(record as DiaperRecord);
      const { data, error } = await supabase
        .from(TABLES.DIAPER_RECORDS)
        .insert(recordData)
        .select()
        .single(); // ✅ 保持single：插入后必须返回数据

      if (error) {
        if (error.code === 'PGRST116') throw new Error('保存尿布记录失败：未找到记录');
        throw error;
      }
      return convertDbToDiaperRecord(data);
    } catch (error) {
      handleSupabaseError(error, '保存尿布记录');
      throw error;
    }
  },

  async getAll(): Promise<DiaperRecord[]> {
    try {
      const familyId = await getCurrentUserFamilyId();
      const { data, error } = await supabase
        .from(TABLES.DIAPER_RECORDS)
        .select(`
          *,
          baby_profiles!baby_id (
            id,
            name
          ),
          family_members!user_id (
            user_id,
            user_profiles!user_id (
              display_name
            )
          ),
          family_groups!family_id (
            id,
            name,
            family_members (
              role
            )
          )
        `)
        .eq('family_id', familyId)
        .order('time', { ascending: false });

      if (error) throw error;
      return data?.map(record => {
        const diaperRecord = convertDbToDiaperRecord(record);
        // 添加宝宝和创建人信息
        if (record.baby_profiles) {
          diaperRecord.babyName = record.baby_profiles.name;
        }
        if (record.family_members?.user_profiles) {
          diaperRecord.createdByName = record.family_members.user_profiles.display_name;
        }
        if (record.family_members && record.family_members.length > 0) {
          diaperRecord.createdByRole = record.family_members[0].role;
        }
        return diaperRecord;
      }) || [];
    } catch (error) {
      handleSupabaseError(error, '获取尿布记录');
      return [];
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.DIAPER_RECORDS)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, '删除尿布记录');
      throw error;
    }
  },

  async getByDateRange(startDate: Date, endDate: Date): Promise<DiaperRecord[]> {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from(TABLES.DIAPER_RECORDS)
        .select('*')
        .eq('user_id', userId)
        .gte('time', startDate.toISOString())
        .lte('time', endDate.toISOString())
        .order('time', { ascending: false });

      if (error) throw error;
      return data?.map(convertDbToDiaperRecord) || [];
    } catch (error) {
      handleSupabaseError(error, '按日期范围获取尿布记录');
      return [];
    }
  },
};

// 睡眠记录服务
export const sleepService = {
  async save(record: Omit<SleepRecord, 'id'>): Promise<SleepRecord> {
    try {
      const recordData = await convertSleepRecordToDb(record as SleepRecord);
      const { data, error } = await supabase
        .from(TABLES.SLEEP_RECORDS)
        .insert(recordData)
        .select()
        .single(); // ✅ 保持single：插入后必须返回数据

      if (error) throw error;
      return convertDbToSleepRecord(data);
    } catch (error) {
      handleSupabaseError(error, '保存睡眠记录');
      throw error;
    }
  },

  async getAll(): Promise<SleepRecord[]> {
    try {
      const familyId = await getCurrentUserFamilyId();
      const { data, error } = await supabase
        .from(TABLES.SLEEP_RECORDS)
        .select(`
          *,
          baby_profiles!inner(id, name),
          family_members!user_id (
            user_id,
            user_profiles!user_id (
              display_name
            )
          ),
          family_groups!family_id (
            id,
            name,
            family_members (
              role
            )
          )
        `)
        .eq('family_id', familyId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      
      return data?.map(record => ({
        ...convertDbToSleepRecord(record),
        babyName: (record as any).baby_profiles?.name,
        createdByName: (record as any).family_members?.user_profiles?.display_name,
        createdByRole: (record as any).family_members?.role
      })) || [];
    } catch (error) {
      handleSupabaseError(error, '获取睡眠记录');
      return [];
    }
  },

  async update(record: SleepRecord): Promise<SleepRecord> {
    try {
      const recordData = await convertSleepRecordToDb(record);
      const { data, error } = await supabase
        .from(TABLES.SLEEP_RECORDS)
        .update(recordData)
        .eq('id', record.id)
        .select()
        .single(); // ✅ 保持single：更新特定ID的记录理论上必须存在

      if (error) {
        if (error.code === 'PGRST116') throw new Error('更新睡眠记录失败：未找到记录');
        throw error;
      }
      return convertDbToSleepRecord(data);
    } catch (error) {
      handleSupabaseError(error, '更新睡眠记录');
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(TABLES.SLEEP_RECORDS)
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, '删除睡眠记录');
      throw error;
    }
  },

  async getByDateRange(startDate: Date, endDate: Date): Promise<SleepRecord[]> {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from(TABLES.SLEEP_RECORDS)
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data?.map(convertDbToSleepRecord) || [];
    } catch (error) {
      handleSupabaseError(error, '按日期范围获取睡眠记录');
      return [];
    }
  },

  async getActiveSleepRecord(): Promise<SleepRecord | null> {
    try {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from(TABLES.SLEEP_RECORDS)
        .select('*')
        .eq('user_id', userId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle(); // ✅ 修复：可能没有活跃的睡眠记录

      if (error) {
        if (error.code === 'PGRST116') return null; // 未找到记录
        throw error;
      }
      return convertDbToSleepRecord(data);
    } catch (error) {
      handleSupabaseError(error, '获取活跃睡眠记录');
      return null;
    }
  },
};

// 宝宝信息服务
export const babyService = {
  async getAll(): Promise<BabyProfile[]> {
    try {
      const familyId = await getCurrentUserFamilyId();
      const { data, error } = await supabase
        .from('baby_profiles')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      handleSupabaseError(error, '获取宝宝信息');
      return [];
    }
  },

  async getById(id: string): Promise<BabyProfile | null> {
    try {
      const { data, error } = await supabase
        .from('baby_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // ✅ 修复：查询的宝宝ID可能不存在

      if (error) {
        if (error.code === 'PGRST116') return null; // 未找到记录
        throw error;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, '获取宝宝信息');
      return null;
    }
  },

  async save(baby: Omit<BabyProfile, 'id' | 'family_id' | 'created_at' | 'updated_at'>): Promise<BabyProfile> {
    try {
      const familyId = await getCurrentUserFamilyId();
      const { data, error } = await supabase
        .from('baby_profiles')
        .insert({
          ...baby,
          family_id: familyId,
        })
        .select()
        .single(); // ✅ 保持single：插入后必须返回数据

      if (error) {
        if (error.code === 'PGRST116') throw new Error('保存宝宝信息失败：未找到记录');
        throw error;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, '保存宝宝信息');
      throw error;
    }
  },

  async update(id: string, updates: Partial<BabyProfile>): Promise<BabyProfile> {
    try {
      const { data, error } = await supabase
        .from('baby_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single(); // ✅ 保持single：更新特定ID的记录理论上必须存在

      if (error) {
        if (error.code === 'PGRST116') throw new Error('更新宝宝信息失败：未找到记录');
        throw error;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, '更新宝宝信息');
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('baby_profiles')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, '删除宝宝信息');
      throw error;
    }
  },
};

// 数据导出服务
export const exportService = {
  async exportAllData() {
    try {
      const [feedingRecords, diaperRecords, sleepRecords] = await Promise.all([
        feedingService.getAll(),
        diaperService.getAll(),
        sleepService.getAll(),
      ]);

      return {
        feedingRecords,
        diaperRecords,
        sleepRecords,
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
      };
    } catch (error) {
      handleSupabaseError(error, '导出数据');
      throw error;
    }
  },
};

// 实时订阅功能
export const subscribeToChanges = async (
  tableName: keyof typeof TABLES,
  callback: (payload: any) => void
) => {
  const userId = await getCurrentUserId();
  return supabase
    .channel(`${tableName}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLES[tableName],
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

// 统一导出服务对象
export const supabaseService = {
  feedingService,
  diaperService,
  sleepService,
  babyService,
  exportService,
  subscribeToChanges,
};