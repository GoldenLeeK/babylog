import { supabase, handleSupabaseError } from '../config/supabase';
import authService from './authService';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  description?: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'parent' | 'caregiver' | 'relative' | 'custom';
  custom_role_name?: string;
  is_primary: boolean;
  can_edit: boolean;
  can_invite: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

// 生成邀请码
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 家庭组服务
export const familyService = {
  // 创建家庭组
  async createFamily(name: string, description?: string): Promise<FamilyGroup> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('用户未登录');
      }

      // 首先检查用户是否已经在任何家庭中
      const userFamilies = await this.getUserFamilies();
      if (userFamilies.length > 0) {
        throw new Error('您已经在一个家庭中，请先退出当前家庭');
      }

      // 生成邀请码
      const inviteCode = generateInviteCode();
      
      const { data, error } = await supabase
        .from('family_groups')
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          invite_code: inviteCode,
          created_by: user.id,
        } as any)
        .select()
        .maybeSingle() as any; // ✅ 修复：用户可能没有家庭

      if (error) {
        if (error.code === 'PGRST116') throw new Error('创建家庭组失败：未找到记录');
        console.error('创建家庭组错误:', error);
        throw new Error('创建家庭组失败，请稍后重试');
      }

      // 创建家庭组后，将创建者添加为家庭成员
      await this.addMemberToFamily(data.id, user.id, 'parent', true, true, true);

      return data;
    } catch (error) {
      handleSupabaseError(error, '创建家庭组');
      throw error;
    }
  },

  // 通过邀请码加入家庭组
  async joinFamilyByInviteCode(inviteCode: string, role: 'parent' | 'caregiver' | 'relative' | 'custom' = 'caregiver', customRoleName?: string): Promise<FamilyMember> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('用户未登录');
      }

      // 首先检查用户是否已经在任何家庭中
      const userFamilies = await this.getUserFamilies();
      if (userFamilies.length > 0) {
        throw new Error('您已经在一个家庭中，请先退出当前家庭');
      }

      // 标准化邀请码（转换为大写）
      const normalizedInviteCode = inviteCode.toUpperCase().trim();
      
      console.log('尝试加入家庭，邀请码:', normalizedInviteCode);
      
      // 使用简单的验证函数查询家庭组
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_invite_code_simple', { 
          invite_code_input: normalizedInviteCode 
        } as any) as any;

      console.log('邀请码验证结果:', { validationData, validationError });

      if (validationError) {
        console.error('邀请码验证错误:', validationError);
        throw new Error('邀请码验证失败: ' + validationError.message);
      }

      if (!validationData || (validationData as any).length === 0) {
        throw new Error('邀请码无效或家庭组不存在');
      }

      const validationResult = (validationData as any)[0];
      
      if (!validationResult.is_valid) {
        console.error('邀请码验证失败:', validationResult.message);
        throw new Error(validationResult.message || '邀请码无效或家庭组不存在');
      }

      const family = {
        id: validationResult.family_id,
        name: validationResult.family_name,
        invite_code: normalizedInviteCode
      };

      console.log('找到家庭组:', family);

      // 再次检查用户是否已经是该家庭的成员（双重检查）
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', family.id)
        .eq('user_id', user.id)
        .maybeSingle() as any;

      if (existingMember) {
        throw new Error('您已经是该家庭的成员');
      }

      // 添加用户到家庭组
      return await this.addMemberToFamily(family.id, user.id, role, false, true, false, customRoleName);
    } catch (error) {
      handleSupabaseError(error, '加入家庭组');
      throw error;
    }
  },

  // 添加成员到家庭组
  async addMemberToFamily(
    familyId: string, 
    userId: string, 
    role: 'parent' | 'caregiver' | 'relative' | 'custom',
    isPrimary: boolean = false,
    canEdit: boolean = true,
    canInvite: boolean = false,
    customRoleName?: string
  ): Promise<FamilyMember> {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert({
          family_id: familyId,
          user_id: userId,
          role,
          custom_role_name: customRoleName || null,
          is_primary: isPrimary,
          can_edit: canEdit,
          can_invite: canInvite,
        } as any)
        .select()
        .single() as any; // ✅ 保持single：插入后必须返回数据

      if (error) {
        if (error.code === 'PGRST116') throw new Error('添加家庭成员失败：未找到记录');
        throw error;
      }
      return data;
    } catch (error) {
      handleSupabaseError(error, '添加家庭成员');
      throw error;
    }
  },

  // 获取用户的家庭组
  async getUserFamilies(): Promise<FamilyGroup[]> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('用户未登录');
      }

      // 首先获取用户的家庭成员记录
      const { data: memberRecords, error: memberError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id) as any;

      if (memberError) {
        console.error('获取家庭成员记录失败:', memberError);
        throw memberError;
      }

      if (!memberRecords || memberRecords.length === 0) {
        return [];
      }

      // 获取用户所属的家庭组ID列表
      const familyIds = memberRecords.map((m: any) => m.family_id);

      // 获取这些家庭组的详细信息
      const { data: families, error: familiesError } = await supabase
        .from('family_groups')
        .select('*')
        .in('id', familyIds);

      if (familiesError) {
        console.error('获取家庭组详情失败:', familiesError);
        throw familiesError;
      }

      return families || [];
    } catch (error) {
      handleSupabaseError(error, '获取用户家庭组');
      return [];
    }
  },

  // 获取家庭成员
  async getFamilyMembers(familyId: string): Promise<UserProfile[]> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('用户未登录');
      }

      // 获取家庭成员记录
      const { data: members, error: membersError } = await supabase
        .from('family_members')
        .select('user_id')
        .eq('family_id', familyId) as any;

      if (membersError) {
        console.error('获取家庭成员记录失败:', membersError);
        throw membersError;
      }

      if (!members || members.length === 0) {
        return [];
      }

      // 获取这些用户的个人资料
      const userIds = members.map((m: any) => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('获取用户个人资料失败:', profilesError);
        throw profilesError;
      }

      return profiles || [];
    } catch (error) {
      handleSupabaseError(error, '获取家庭成员');
      return [];
    }
  },

  // 检查用户是否有家庭组
  async checkUserHasFamily(): Promise<boolean> {
    try {
      const families = await this.getUserFamilies();
      return families.length > 0;
    } catch (error) {
      return false;
    }
  },

  // 获取用户的主要家庭ID
  async getUserPrimaryFamilyId(): Promise<string | null> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return null;

      // 获取用户的第一个家庭成员记录
      const { data: member, error } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle() as any; // ✅ 修复：用户可能没有家庭

      if (error || !member) {
        return null;
      }

      return member.family_id;
    } catch (error) {
      console.error('获取主要家庭ID失败:', error);
      return null;
    }
  },
};

export default familyService;