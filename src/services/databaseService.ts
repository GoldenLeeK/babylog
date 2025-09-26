import { supabase } from '../config/supabase';
import { FeedingRecord, DiaperRecord, SleepRecord } from '../types';

// 获取当前用户的家庭ID
const getCurrentUserFamilyId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .maybeSingle(); // ✅ 修复：用户可能没有家庭

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        return null; // 用户未加入任何家庭
      }
      console.error('获取用户家庭信息失败:', memberError);
      return null;
    }

    return memberData?.family_id || null;
  } catch (error) {
    console.error('获取用户家庭ID失败:', error);
    return null;
  }
};

// 获取喂养记录
export const getFeedingRecords = async (): Promise<FeedingRecord[]> => {
  try {
    const familyId = await getCurrentUserFamilyId();
    if (!familyId) return [];

    // 获取喂养记录
    const { data, error } = await supabase
      .from('feeding_records')
      .select(`
        *,
        baby_profiles!baby_id (
          id,
          name,
          gender
        )
      `)
      .eq('family_id', familyId)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('获取喂养记录失败:', error);
      return [];
    }

    // 获取所有相关的用户信息
    const userIds = (data || []).map(r => r.user_id).filter(Boolean);
    let userMap = {};
    
    if (userIds.length > 0) {
      const { data: familyMembers, error: membersError } = await supabase
        .from('family_members')
        .select(`
          user_id,
          user_profiles!user_id (
            display_name
          )
        `)
        .in('user_id', userIds)
        .eq('family_id', familyId);

      if (!membersError && familyMembers) {
        userMap = familyMembers.reduce((map, member) => {
          map[member.user_id] = member.user_profiles?.display_name || '未知用户';
          return map;
        }, {});
      }
    }

    return (data || []).map(record => ({
      id: record.id,
      startTime: new Date(record.start_time),
      endTime: new Date(record.end_time),
      duration: record.duration,
      leftDuration: record.left_duration || 0,
      rightDuration: record.right_duration || 0,
      feedingType: record.feeding_type,
      amount: record.amount,
      leftSide: record.left_side,
      rightSide: record.right_side,
      note: record.note || '',
      type: 'feeding' as const,
      babyId: record.baby_id,
      babyName: record.baby_profiles?.name,
      babyGender: record.baby_profiles?.gender,
      createdBy: record.user_id,
      createdByName: userMap[record.user_id] || '未知用户'
    }));
  } catch (error) {
    console.error('获取喂养记录失败:', error);
    return [];
  }
};

// 保存喂养记录
export const saveFeedingRecord = async (record: FeedingRecord): Promise<void> => {
  try {
    const familyId = await getCurrentUserFamilyId();
    if (!familyId) throw new Error('用户未加入任何家庭');

    const { error } = await supabase
      .from('feeding_records')
      .insert({
        family_id: familyId,
        start_time: record.startTime.toISOString(),
        end_time: record.endTime.toISOString(),
        duration: record.duration,
        left_duration: record.leftDuration,
        right_duration: record.rightDuration,
        feeding_type: record.feedingType,
        amount: record.amount,
        left_side: record.leftSide,
        right_side: record.rightSide,
        note: record.note
      });

    if (error) {
      console.error('保存喂养记录失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('保存喂养记录失败:', error);
    throw error;
  }
};

// 获取尿布记录
export const getDiaperRecords = async (): Promise<DiaperRecord[]> => {
  try {
    const familyId = await getCurrentUserFamilyId();
    if (!familyId) return [];

    // 获取尿布记录
    const { data, error } = await supabase
      .from('diaper_records')
      .select(`
        *,
        baby_profiles!baby_id (
          id,
          name,
          gender
        )
      `)
      .eq('family_id', familyId)
      .order('time', { ascending: false });

    if (error) {
      console.error('获取尿布记录失败:', error);
      return [];
    }

    // 获取所有相关的用户信息
    const userIds = (data || []).map(r => r.user_id).filter(Boolean);
    let userMap = {};
    
    if (userIds.length > 0) {
      const { data: familyMembers, error: membersError } = await supabase
        .from('family_members')
        .select(`
          user_id,
          user_profiles!user_id (
            display_name
          )
        `)
        .in('user_id', userIds)
        .eq('family_id', familyId);

      if (!membersError && familyMembers) {
        userMap = familyMembers.reduce((map, member) => {
          map[member.user_id] = member.user_profiles?.display_name || '未知用户';
          return map;
        }, {});
      }
    }

    return (data || []).map(record => ({
      id: record.id,
      timestamp: new Date(record.time),
      type: record.type,
      note: record.note || '',
      recordType: 'diaper' as const,
      babyId: record.baby_id,
      babyName: record.baby_profiles?.name,
      babyGender: record.baby_profiles?.gender,
      createdBy: record.user_id,
      createdByName: userMap[record.user_id] || '未知用户'
    }));
  } catch (error) {
    console.error('获取尿布记录失败:', error);
    return [];
  }
};

// 保存尿布记录
export const saveDiaperRecord = async (record: DiaperRecord): Promise<void> => {
  try {
    const familyId = await getCurrentUserFamilyId();
    if (!familyId) throw new Error('用户未加入任何家庭');

    const { error } = await supabase
      .from('diaper_records')
      .insert({
        family_id: familyId,
        time: record.timestamp.toISOString(),
        type: record.type,
        note: record.note
      });

    if (error) {
      console.error('保存尿布记录失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('保存尿布记录失败:', error);
    throw error;
  }
};

// 获取睡眠记录
export const getSleepRecords = async (): Promise<SleepRecord[]> => {
  try {
    const familyId = await getCurrentUserFamilyId();
    if (!familyId) return [];

    // 获取睡眠记录
    const { data, error } = await supabase
      .from('sleep_records')
      .select(`
        *,
        baby_profiles!baby_id (
          id,
          name,
          gender
        )
      `)
      .eq('family_id', familyId)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('获取睡眠记录失败:', error);
      return [];
    }

    // 获取所有相关的用户信息
    const userIds = (data || []).map(r => r.user_id).filter(Boolean);
    let userMap = {};
    
    if (userIds.length > 0) {
      const { data: familyMembers, error: membersError } = await supabase
        .from('family_members')
        .select(`
          user_id,
          user_profiles!user_id (
            display_name
          )
        `)
        .in('user_id', userIds)
        .eq('family_id', familyId);

      if (!membersError && familyMembers) {
        userMap = familyMembers.reduce((map, member) => {
          map[member.user_id] = member.user_profiles?.display_name || '未知用户';
          return map;
        }, {});
      }
    }

    return (data || []).map(record => ({
      id: record.id,
      startTime: new Date(record.start_time),
      endTime: record.end_time ? new Date(record.end_time) : null,
      duration: record.duration || 0,
      note: record.note || '',
      type: 'sleep' as const,
      babyId: record.baby_id,
      babyName: record.baby_profiles?.name,
      babyGender: record.baby_profiles?.gender,
      createdBy: record.user_id,
      createdByName: userMap[record.user_id] || '未知用户'
    }));
  } catch (error) {
    console.error('获取睡眠记录失败:', error);
    return [];
  }
};

// 保存睡眠记录
export const saveSleepRecord = async (record: SleepRecord): Promise<void> => {
  try {
    const familyId = await getCurrentUserFamilyId();
    if (!familyId) throw new Error('用户未加入任何家庭');

    const { error } = await supabase
      .from('sleep_records')
      .insert({
        family_id: familyId,
        start_time: record.startTime.toISOString(),
        end_time: record.endTime?.toISOString() || null,
        duration: record.duration,
        note: record.note
      });

    if (error) {
      console.error('保存睡眠记录失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('保存睡眠记录失败:', error);
    throw error;
  }
};

// 删除喂养记录
export const deleteFeedingRecord = async (recordId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('feeding_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('删除喂养记录失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('删除喂养记录失败:', error);
    throw error;
  }
};

// 删除尿布记录
export const deleteDiaperRecord = async (recordId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('diaper_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('删除尿布记录失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('删除尿布记录失败:', error);
    throw error;
  }
};

// 删除睡眠记录
export const deleteSleepRecord = async (recordId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('sleep_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('删除睡眠记录失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('删除睡眠记录失败:', error);
    throw error;
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