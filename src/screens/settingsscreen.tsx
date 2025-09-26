import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import familyService from '../services/familyService';
import NumberPicker from '../components/NumberPicker';

// 基于数据库表结构的接口定义
interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

interface FamilyGroup {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  invite_code: string;
  created_by: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'parent' | 'father' | 'mother' | 'caregiver' | 'grandparent' | 'grandfather' | 'grandmother' | 'relative' | 'custom';
  custom_role_name?: string;
  is_primary: boolean;
  can_edit: boolean;
  can_invite: boolean;
  joined_at: Date;
}

interface BabyProfile {
  id: string;
  family_id: string;
  name: string;
  nickname?: string;
  date_of_birth: Date;
  gender: 'male' | 'female';
  birth_weight?: number; // 公斤
  current_weight?: number; // 公斤
  avatar_url?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SettingsScreen = () => {
  const { signOut } = useAuth();
  const navigation = useNavigation();
  // 个人信息（单个，跟随账户）
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // 用户所属的家庭组（只能有一个）
  const [userFamily, setUserFamily] = useState<FamilyGroup | null>(null);
  const [userFamilyMember, setUserFamilyMember] = useState<FamilyMember | null>(null);
  
  // 当前家庭组的宝宝列表
  const [familyBabies, setFamilyBabies] = useState<BabyProfile[]>([]);
  
  // 模态框状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState<'profile' | 'family' | 'baby' | 'join_family' | 'change_password' | 'create_family'>('profile');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // 邀请码相关
  const [inviteCode, setInviteCode] = useState('');
  
  // 密码修改相关
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // 加载状态
  const [loading, setLoading] = useState(true);
  
  // 折叠状态 - 默认折叠
  const [isFamilySectionExpanded, setIsFamilySectionExpanded] = useState(false);
  const [isMembersSectionExpanded, setIsMembersSectionExpanded] = useState(false);
  const [isBabiesSectionExpanded, setIsBabiesSectionExpanded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('错误', '用户未登录');
        setLoading(false);
        return;
      }

      // 加载个人信息
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // ✅ 修复：用户可能没有个人信息

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('加载个人信息失败:', profileError);
      } else if (profile) {
        setUserProfile({
          ...profile,
          created_at: new Date(profile.created_at),
          updated_at: new Date(profile.updated_at)
        });
      }

      // 加载用户的家庭成员信息
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select(`
          *,
          family_groups (*)
        `)
        .eq('user_id', user.id)
        .maybeSingle(); // ✅ 修复：用户可能没有家庭

      if (memberError && memberError.code !== 'PGRST116') {
        console.error('加载家庭成员信息失败:', memberError);
      } else if (memberData) {
        setUserFamilyMember({
          ...memberData,
          joined_at: new Date(memberData.joined_at)
        });
        
        if (memberData.family_groups) {
          setUserFamily({
            ...memberData.family_groups,
            created_at: new Date(memberData.family_groups.created_at),
            updated_at: new Date(memberData.family_groups.updated_at)
          });
          
          // 加载家庭的宝宝信息
          loadFamilyBabies(memberData.family_groups.id);
          // 加载家庭成员列表
          loadFamilyMembers(memberData.family_groups.id);
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      Alert.alert('错误', '加载设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载家庭成员列表
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  const loadFamilyMembers = async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select(`
          *,
          user_profiles (
            display_name,
            email
          )
        `)
        .eq('family_id', familyId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('加载家庭成员失败:', error);
      } else {
        setFamilyMembers(data || []);
      }
    } catch (error) {
      console.error('加载家庭成员失败:', error);
    }
  };

  const loadFamilyBabies = async (familyId: string) => {
    try {
      const { data: babies, error } = await supabase
        .from('baby_profiles')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('加载宝宝信息失败:', error);
      } else {
        const processedBabies = babies.map(baby => ({
          ...baby,
          date_of_birth: new Date(baby.date_of_birth),
          created_at: new Date(baby.created_at),
          updated_at: new Date(baby.updated_at)
        }));
        setFamilyBabies(processedBabies);
      }
    } catch (error) {
      console.error('加载宝宝信息失败:', error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN');
  };

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // 个人信息修改
  const editUserProfile = () => {
    if (userProfile) {
      setEditingItem({ ...userProfile });
      setEditType('profile');
      setIsCreating(false);
      setEditModalVisible(true);
    } else {
      // 如果没有个人信息，创建一个默认的
      createUserProfile();
    }
  };

  const createUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('错误', '用户未登录');
        return;
      }

      const newProfile: UserProfile = {
        id: '',
        user_id: user.id,
        email: user.email || '',
        display_name: '',
        avatar_url: '',
        created_at: new Date(),
        updated_at: new Date()
      };
      setEditingItem(newProfile);
      setEditType('profile');
      setIsCreating(true);
      setEditModalVisible(true);
    } catch (error) {
      console.error('创建个人信息失败:', error);
      Alert.alert('错误', '创建个人信息失败');
    }
  };

  const changePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setEditType('change_password');
    setEditModalVisible(true);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('错误', '请填写新密码');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('错误', '两次输入的密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('错误', '密码长度至少6位');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        Alert.alert('错误', `修改密码失败: ${error.message}`);
      } else {
        Alert.alert('成功', '密码修改成功');
        setEditModalVisible(false);
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      Alert.alert('错误', '修改密码失败');
    }
  };

  // 家庭组操作
  const createFamily = () => {
    const newFamily: FamilyGroup = {
      id: '',
      name: '',
      description: '',
      avatar_url: '',
      invite_code: generateInviteCode(),
      created_by: '',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    setEditingItem(newFamily);
    setEditType('create_family');
    setIsCreating(true);
    setEditModalVisible(true);
  };

  const editFamily = () => {
    if (userFamily && userFamilyMember && userFamily.created_by === userFamilyMember.user_id) {
      setEditingItem({ ...userFamily });
      setEditType('family');
      setIsCreating(false);
      setEditModalVisible(true);
    } else {
      Alert.alert('提示', '只有家庭创建者可以修改家庭信息');
    }
  };

  const joinFamilyByCode = () => {
    setEditType('join_family');
    setInviteCode('');
    setEditModalVisible(true);
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('错误', '请输入邀请码');
      return;
    }

    try {
      // 检查用户是否已经在家庭中
      if (userFamily) {
        Alert.alert('提示', '您已经在一个家庭中，请先退出当前家庭');
        return;
      }

      // 使用家庭服务加入家庭
      await familyService.joinFamilyByInviteCode(inviteCode.trim(), 'parent');

      Alert.alert('成功', '已成功加入家庭');
      setEditModalVisible(false);
      loadSettings(); // 重新加载设置
      
    } catch (error: any) {
      console.error('加入家庭失败:', error);
      Alert.alert('错误', error.message || '加入家庭失败');
    }
  };

  const handleCreateFamily = async () => {
    if (!editingItem?.name?.trim()) {
      Alert.alert('错误', '请输入家庭名称');
      return;
    }

    try {
      // 检查用户是否已经在家庭中
      if (userFamily) {
        Alert.alert('提示', '您已经在一个家庭中，请先退出当前家庭');
        return;
      }

      // 使用家庭服务创建家庭组
      const newFamily = await familyService.createFamily(
        editingItem.name,
        editingItem.description
      );

      Alert.alert('成功', `家庭"${newFamily.name}"创建成功！\n邀请码：${newFamily.invite_code}`);
      setEditModalVisible(false);
      loadSettings(); // 重新加载设置
      
    } catch (error: any) {
      console.error('创建家庭失败:', error);
      Alert.alert('错误', error.message || '创建家庭失败');
    }
  };

  const leaveFamily = () => {
    if (!userFamily || !userFamilyMember) return;

    Alert.alert(
      '确认退出',
      '确定要退出当前家庭吗？退出后将无法查看家庭数据。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            try {
              // 首先检查是否是家庭创建者
              if (userFamilyMember.role === 'creator') {
                Alert.alert(
                  '无法退出',
                  '您是家庭创建者，无法直接退出家庭。请先转让家庭所有权或删除家庭。'
                );
                return;
              }

              // 先删除用户相关的所有记录（喂养、尿布、睡眠记录）
              const userId = userFamilyMember.user_id;
              const familyId = userFamily.family_id || userFamily.id;
              
              // 删除喂养记录
              await supabase
                .from('feeding_records')
                .delete()
                .eq('user_id', userId)
                .eq('family_id', familyId);
              
              // 删除尿布记录
              await supabase
                .from('diaper_records')
                .delete()
                .eq('user_id', userId)
                .eq('family_id', familyId);
              
              // 删除睡眠记录
              await supabase
                .from('sleep_records')
                .delete()
                .eq('user_id', userId)
                .eq('family_id', familyId);

              // 删除家庭成员记录
              const { error } = await supabase
                .from('family_members')
                .delete()
                .eq('id', userFamilyMember.id);

              if (error) {
                console.error('退出家庭数据库错误:', error);
                // 提供更详细的错误信息
                let errorMessage = '退出家庭失败';
                if (error.code === '23503') {
                  errorMessage = '无法退出家庭：您还有关联的数据未处理';
                } else if (error.code === 'PGRST116') {
                  errorMessage = '家庭成员记录不存在';
                } else if (error.message) {
                  errorMessage = `退出家庭失败: ${error.message}`;
                }
                Alert.alert('错误', errorMessage);
              } else {
                Alert.alert('成功', '已退出家庭');
                // 清除本地状态
                setUserFamily(null);
                setUserFamilyMember(null);
                setFamilyBabies([]);
                // 延迟导航以确保状态更新完成
                setTimeout(() => {
                  navigation.replace('FamilySetup');
                }, 100);
              }
            } catch (error) {
              console.error('退出家庭失败:', error);
              Alert.alert('错误', '退出家庭时发生未知错误，请重试');
            }
          }
        }
      ]
    );
  };

  // 宝宝操作
  const createBaby = () => {
    if (!userFamily) {
      Alert.alert('提示', '请先加入或创建一个家庭');
      return;
    }

    const newBaby: BabyProfile = {
      id: '',
      family_id: userFamily.id,
      name: '',
      nickname: '',
      date_of_birth: new Date(),
      gender: 'male',
      birth_weight: 0,
      current_weight: 0,
      avatar_url: '',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    setEditingItem(newBaby);
    setEditType('baby');
    setIsCreating(true);
    setEditModalVisible(true);
  };

  const editBaby = (baby: BabyProfile) => {
    setEditingItem({ ...baby });
    setEditType('baby');
    setIsCreating(false);
    setEditModalVisible(true);
  };

  const deleteBaby = (babyId: string) => {
    Alert.alert(
      '确认删除',
      '确定要删除这个宝宝信息吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('baby_profiles')
                .update({ is_active: false })
                .eq('id', babyId);

              if (error) {
                Alert.alert('错误', `删除失败: ${error.message}`);
              } else {
                Alert.alert('成功', '宝宝信息已删除');
                if (userFamily) {
                  loadFamilyBabies(userFamily.id);
                }
              }
            } catch (error) {
              console.error('删除宝宝失败:', error);
              Alert.alert('错误', '删除宝宝失败');
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      '确认退出',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // 只清除自动登录设置，保留记住密码的缓存
              await AsyncStorage.setItem('autoLogin', 'false');
              // 导航到登录页面
              navigation.replace('Login');
            } catch (error) {
              console.error('退出登录失败:', error);
              Alert.alert('错误', '退出登录失败');
            }
          }
        }
      ]
    );
  };

  const saveItem = async () => {
    if (!editingItem) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('错误', '用户未登录');
        return;
      }

      if (editType === 'profile') {
        if (isCreating) {
          // 创建新的个人信息
          const { error } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              email: user.email || '',
              display_name: editingItem.display_name
            });

          if (error) {
            Alert.alert('错误', `创建失败: ${error.message}`);
          } else {
            Alert.alert('成功', '个人信息已创建');
            setEditModalVisible(false);
            loadSettings();
          }
        } else {
          // 更新现有个人信息
          const { error } = await supabase
            .from('user_profiles')
            .update({
              display_name: editingItem.display_name,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (error) {
            Alert.alert('错误', `保存失败: ${error.message}`);
          } else {
            Alert.alert('成功', '个人信息已更新');
            setEditModalVisible(false);
            loadSettings();
          }
        }
      } else if (editType === 'family') {
        const { error } = await supabase
          .from('family_groups')
          .update({
            name: editingItem.name,
            description: editingItem.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id);

        if (error) {
          Alert.alert('错误', `保存失败: ${error.message}`);
        } else {
          Alert.alert('成功', '家庭信息已更新');
          setEditModalVisible(false);
          loadSettings();
        }
      } else if (editType === 'baby') {
        if (isCreating) {
          const { error } = await supabase
            .from('baby_profiles')
            .insert({
              family_id: editingItem.family_id,
              name: editingItem.name,
              nickname: editingItem.nickname,
              date_of_birth: editingItem.date_of_birth.toISOString().split('T')[0],
              gender: editingItem.gender,
              birth_weight: editingItem.birth_weight,
              current_weight: editingItem.current_weight,
              is_active: true
            });

          if (error) {
            Alert.alert('错误', `保存失败: ${error.message}`);
          } else {
            Alert.alert('成功', '宝宝信息已添加');
            setEditModalVisible(false);
            if (userFamily) {
              loadFamilyBabies(userFamily.id);
            }
          }
        } else {
          const { error } = await supabase
            .from('baby_profiles')
            .update({
              name: editingItem.name,
              nickname: editingItem.nickname,
              date_of_birth: editingItem.date_of_birth.toISOString().split('T')[0],
              gender: editingItem.gender,
              birth_weight: editingItem.birth_weight,
              current_weight: editingItem.current_weight,
              updated_at: new Date().toISOString()
            })
            .eq('id', editingItem.id);

          if (error) {
            Alert.alert('错误', `保存失败: ${error.message}`);
          } else {
            Alert.alert('成功', '宝宝信息已更新');
            setEditModalVisible(false);
            if (userFamily) {
              loadFamilyBabies(userFamily.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('错误', '保存失败');
    }
  };

  // 渲染函数
  const renderUserProfile = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>个人信息</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={editUserProfile}
          >
            <Text style={styles.editButtonText}>编辑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.passwordButton}
            onPress={changePassword}
          >
            <Text style={styles.passwordButtonText}>改密码</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {userProfile ? (
        <>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>显示名称:</Text>
            <Text style={styles.infoValue}>{userProfile.display_name || '未设置'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>邮箱:</Text>
            <Text style={styles.infoValue}>{userProfile.email}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>创建时间:</Text>
            <Text style={styles.infoValue}>{formatDate(userProfile.created_at)}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.emptyText}>加载中...</Text>
      )}
    </View>
  );

  const renderFamilyGroup = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>家庭组</Text>
        {userFamily ? (
          <View style={styles.headerButtons}>
            {userFamily.created_by === userFamilyMember?.user_id && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={editFamily}
              >
                <Text style={styles.editButtonText}>编辑</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={leaveFamily}
            >
              <Text style={styles.leaveButtonText}>退出</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={joinFamilyByCode}
            >
              <Text style={styles.joinButtonText}>加入</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={createFamily}
            >
              <Text style={styles.addButtonText}>创建</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {userFamily ? (
        <>
          {/* 家庭基本信息 - 可折叠 */}
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setIsFamilySectionExpanded(!isFamilySectionExpanded)}
          >
            <Text style={styles.sectionTitle}>基本信息</Text>
            <Text style={styles.expandIcon}>
              {isFamilySectionExpanded ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
          
          {isFamilySectionExpanded && (
            <>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>家庭名称:</Text>
                <Text style={styles.infoValue}>{userFamily.name}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>邀请码:</Text>
                <TouchableOpacity
                  style={styles.invitationCodeContainer}
                  onPress={() => {
                    Clipboard.setString(userFamily.invite_code);
                    Alert.alert('提示', '邀请码已复制到剪贴板');
                  }}
                >
                  <Text style={styles.infoValue}>{userFamily.invite_code}</Text>
                  <Text style={styles.copyHint}>点击复制</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>我的角色:</Text>
                <Text style={styles.infoValue}>
                  {userFamilyMember?.role === 'parent' ? '家长' :
                   userFamilyMember?.role === 'father' ? '爸爸' :
                   userFamilyMember?.role === 'mother' ? '妈妈' :
                   userFamilyMember?.role === 'caregiver' ? '看护者' : '其他'}
                  {userFamilyMember?.is_primary && ' (主要看护人)'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>创建时间:</Text>
                <Text style={styles.infoValue}>{formatDate(userFamily.created_at)}</Text>
              </View>
            </>
          )}
          
          {/* 家庭成员列表 - 可折叠 */}
          <TouchableOpacity
            style={[styles.sectionHeaderTouchable, isMembersSectionExpanded && styles.sectionHeaderActive]}
            onPress={() => setIsMembersSectionExpanded(!isMembersSectionExpanded)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>家庭成员</Text>
              <Text style={[styles.memberCount, { marginLeft: 8 }]}>({familyMembers.length})</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.expandIcon}>
                {isMembersSectionExpanded ? '▼' : '▶'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {isMembersSectionExpanded && (
            <>
              {familyMembers.length === 0 ? (
                <Text style={styles.emptyText}>暂无其他家庭成员</Text>
              ) : (
                <FlatList
                  data={familyMembers}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.memberItem}>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>
                          {item.user_profiles?.display_name || '未知用户'}
                        </Text>
                        <Text style={styles.memberEmail}>
                          {item.user_profiles?.email || ''}
                        </Text>
                        <Text style={styles.memberRole}>
                          {item.role === 'parent' ? '家长' :
                           item.role === 'father' ? '爸爸' :
                           item.role === 'mother' ? '妈妈' :
                           item.role === 'caregiver' ? '看护者' :
                           item.role === 'grandparent' ? '祖父母' :
                           item.role === 'grandfather' ? '爷爷/外公' :
                           item.role === 'grandmother' ? '奶奶/外婆' :
                           item.role === 'relative' ? '亲戚' :
                           item.custom_role_name || '成员'}
                          {item.is_primary && ' • 主要看护人'}
                        </Text>
                      </View>
                      <View style={styles.memberActions}>
                        {item.user_id === userFamily?.created_by && (
                          <Text style={styles.creatorBadge}>创建者</Text>
                        )}
                      </View>
                    </View>
                  )}
                />
              )}
            </>
          )}
          
          {/* 宝宝信息管理 - 可折叠 */}
          <TouchableOpacity
            style={[styles.sectionHeaderTouchable, isBabiesSectionExpanded && styles.sectionHeaderActive]}
            onPress={() => setIsBabiesSectionExpanded(!isBabiesSectionExpanded)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>宝宝信息</Text>
              <Text style={[styles.memberCount, { marginLeft: 8 }]}>({familyBabies.length})</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={(e) => {
                  e.stopPropagation(); // 防止触发折叠
                  createBaby();
                }}
              >
                <Text style={styles.addButtonText}>+ 添加</Text>
              </TouchableOpacity>
              <Text style={styles.expandIcon}>
                {isBabiesSectionExpanded ? '▼' : '▶'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {isBabiesSectionExpanded && (
            <>
              {familyBabies.length === 0 ? (
                <Text style={styles.emptyText}>暂无宝宝信息</Text>
              ) : (
                <FlatList
                  data={familyBabies}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.listItem}>
                      <View style={styles.itemInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={[styles.genderIcon, item.gender === 'male' ? styles.genderIconMale : styles.genderIconFemale]}>
                            {item.gender === 'male' ? '👦' : '👧'}
                          </Text>
                          <Text style={styles.itemTitle}>{item.name || '未命名宝宝'}</Text>
                        </View>
                        <Text style={styles.itemSubtitle}>
                          {item.gender === 'male' ? '男' : '女'} • 出生: {formatDate(item.date_of_birth)}
                        </Text>
                        <Text style={styles.itemSubtitle}>
                          出生体重: {item.birth_weight || 0}kg • 当前体重: {item.current_weight || 0}kg
                        </Text>
                      </View>
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => editBaby(item)}
                        >
                          <Text style={styles.editBtnText}>编辑</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => deleteBaby(item.id)}
                        >
                          <Text style={styles.deleteBtnText}>删除</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              )}
            </>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>您还没有加入任何家庭，请创建或加入一个家庭</Text>
      )}
    </View>
  );

  const renderBabies = () => {
    if (!userFamily) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>宝宝信息管理</Text>
          <Text style={styles.emptyText}>请先加入或创建一个家庭</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>宝宝信息管理</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={createBaby}
          >
            <Text style={styles.addButtonText}>+ 添加</Text>
          </TouchableOpacity>
        </View>
        
        {familyBabies.length === 0 ? (
          <Text style={styles.emptyText}>暂无宝宝信息</Text>
        ) : (
          <FlatList
            data={familyBabies}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <View style={styles.itemInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[styles.genderIcon, item.gender === 'male' ? styles.genderIconMale : styles.genderIconFemale]}>
                      {item.gender === 'male' ? '👦' : '👧'}
                    </Text>
                    <Text style={styles.itemTitle}>{item.name || '未命名宝宝'}</Text>
                  </View>
                  <Text style={styles.itemSubtitle}>
                    {item.gender === 'male' ? '男' : '女'} • 出生: {formatDate(item.date_of_birth)}
                  </Text>
                  <Text style={styles.itemSubtitle}>
                    出生体重: {item.birth_weight || 0}kg • 当前体重: {item.current_weight || 0}kg
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => editBaby(item)}
                  >
                    <Text style={styles.editBtnText}>编辑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => deleteBaby(item.id)}
                  >
                    <Text style={styles.deleteBtnText}>删除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  };

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setEditModalVisible(false)}
    >
      <SafeAreaView style={modalStyles.modalContainer} edges={['top', 'left', 'right', 'bottom']}>
        <View style={modalStyles.modalHeader}>
          <TouchableOpacity onPress={() => setEditModalVisible(false)}>
            <Text style={modalStyles.cancelButton}>取消</Text>
          </TouchableOpacity>
          <Text style={modalStyles.modalTitle}>
            {editType === 'join_family' ? '加入家庭' :
             editType === 'create_family' ? '创建家庭' :
             editType === 'change_password' ? '修改密码' :
             `${isCreating ? '添加' : '编辑'}${
               editType === 'profile' ? '个人信息' :
               editType === 'family' ? '家庭信息' : '宝宝信息'
             }`}
          </Text>
          <TouchableOpacity onPress={
            editType === 'join_family' ? handleJoinFamily :
            editType === 'create_family' ? handleCreateFamily :
            editType === 'change_password' ? handleChangePassword :
            saveItem
          }>
            <Text style={modalStyles.saveButton}>
              {editType === 'join_family' ? '加入' :
               editType === 'create_family' ? '创建' :
               editType === 'change_password' ? '修改' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={modalStyles.modalContent}>
          {editType === 'join_family' && (
            <View style={modalStyles.inputGroup}>
              <Text style={modalStyles.inputLabel}>邀请码</Text>
              <TextInput
                style={modalStyles.textInput}
                value={inviteCode}
                onChangeText={setInviteCode}
                placeholder="请输入6位邀请码"
                maxLength={6}
                autoCapitalize="characters"
              />
            </View>
          )}

          {editType === 'change_password' && (
            <>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>新密码</Text>
                <TextInput
                  style={modalStyles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="请输入新密码（至少6位）"
                  secureTextEntry
                />
              </View>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>确认新密码</Text>
                <TextInput
                  style={modalStyles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="请再次输入新密码"
                  secureTextEntry
                />
              </View>
            </>
          )}

          {editType === 'profile' && editingItem && (
            <View style={modalStyles.inputGroup}>
              <Text style={modalStyles.inputLabel}>显示名称</Text>
              <TextInput
                style={modalStyles.textInput}
                value={editingItem.display_name}
                onChangeText={(text) => setEditingItem({...editingItem, display_name: text})}
                placeholder="请输入显示名称"
              />
            </View>
          )}
          
          {(editType === 'family' || editType === 'create_family') && editingItem && (
            <>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>家庭名称</Text>
                <TextInput
                  style={modalStyles.textInput}
                  value={editingItem.name}
                  onChangeText={(text) => setEditingItem({...editingItem, name: text})}
                  placeholder="请输入家庭名称"
                />
              </View>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>描述(可选)</Text>
                <TextInput
                  style={[modalStyles.textInput, modalStyles.multilineInput]}
                  value={editingItem.description}
                  onChangeText={(text) => setEditingItem({...editingItem, description: text})}
                  placeholder="请输入家庭描述"
                  multiline
                  numberOfLines={3}
                />
              </View>
              {editType === 'create_family' && (
                <View style={modalStyles.inputGroup}>
                  <Text style={modalStyles.inputLabel}>邀请码</Text>
                  <View style={modalStyles.inviteCodeContainer}>
                    <TextInput
                      style={[modalStyles.textInput, modalStyles.inviteCodeInput]}
                      value={editingItem.invite_code}
                      editable={false}
                    />
                    <TouchableOpacity
                      style={modalStyles.regenerateButton}
                      onPress={() => setEditingItem({...editingItem, invite_code: generateInviteCode()})}
                    >
                      <Text style={modalStyles.regenerateButtonText}>重新生成</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
          
          {editType === 'baby' && editingItem && (
            <>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>宝宝姓名</Text>
                <TextInput
                  style={modalStyles.textInput}
                  value={editingItem.name}
                  onChangeText={(text) => setEditingItem({...editingItem, name: text})}
                  placeholder="请输入宝宝姓名"
                />
              </View>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>昵称(可选)</Text>
                <TextInput
                  style={modalStyles.textInput}
                  value={editingItem.nickname}
                  onChangeText={(text) => setEditingItem({...editingItem, nickname: text})}
                  placeholder="请输入宝宝昵称"
                />
              </View>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>性别</Text>
                <View style={modalStyles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      modalStyles.genderButton,
                      editingItem.gender === 'male' && modalStyles.genderButtonActive
                    ]}
                    onPress={() => setEditingItem({...editingItem, gender: 'male'})}
                  >
                    <Text style={[
                      modalStyles.genderButtonText,
                      editingItem.gender === 'male' && modalStyles.genderButtonTextActive
                    ]}>男</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      modalStyles.genderButton,
                      editingItem.gender === 'female' && modalStyles.genderButtonActive
                    ]}
                    onPress={() => setEditingItem({...editingItem, gender: 'female'})}
                  >
                    <Text style={[
                      modalStyles.genderButtonText,
                      editingItem.gender === 'female' && modalStyles.genderButtonTextActive
                    ]}>女</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>出生体重(公斤)</Text>
                <NumberPicker
                  value={editingItem.birth_weight || 0}
                  onValueChange={(value) => setEditingItem({...editingItem, birth_weight: value})}
                  min={0}
                  max={20}
                  step={0.1}
                  allowDecimals={true}
                  unit="kg"
                  placeholder="请输入出生体重"
                />
              </View>
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.inputLabel}>当前体重(公斤)</Text>
                <NumberPicker
                  value={editingItem.current_weight || 0}
                  onValueChange={(value) => setEditingItem({...editingItem, current_weight: value})}
                  min={0}
                  max={50}
                  step={0.1}
                  allowDecimals={true}
                  unit="kg"
                  placeholder="请输入当前体重"
                />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <SkeletonLoader width={60} height={32} borderRadius={16} />
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SkeletonLoader width={100} height={24} borderRadius={12} />
              <SkeletonLoader width={60} height={28} borderRadius={6} />
            </View>
            <SkeletonLoader width="80%" height={20} borderRadius={10} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="60%" height={20} borderRadius={10} />
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SkeletonLoader width={120} height={24} borderRadius={12} />
              <SkeletonLoader width={80} height={28} borderRadius={6} />
            </View>
            <SkeletonLoader width="90%" height={20} borderRadius={10} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="70%" height={20} borderRadius={10} />
          </View>
          
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <SkeletonLoader width={80} height={24} borderRadius={12} />
              <SkeletonLoader width={60} height={28} borderRadius={6} />
            </View>
            <SkeletonLoader width="85%" height={20} borderRadius={10} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="65%" height={20} borderRadius={10} />
          </View>
          
          <SkeletonLoader width={120} height={48} borderRadius={24} style={{ margin: 16, alignSelf: 'center' }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>设置</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {renderUserProfile()}
        {renderFamilyGroup()}
        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {renderEditModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20, // 为全面屏预留空间
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  passwordButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  passwordButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  leaveButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  leaveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    paddingVertical: 20,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  editBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  settingArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  logoutItem: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#f44336',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  logoutText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 13,
    color: '#9C27B0',
    fontWeight: '500',
  },
  memberActions: {
    alignItems: 'flex-end',
  },
  creatorBadge: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  genderIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  genderIconMale: {
    color: '#2196F3',
  },
  genderIconFemale: {
    color: '#E91E63',
  },
  invitationCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  copyHint: {
    fontSize: 12,
    color: '#9C27B0',
    marginLeft: 8,
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 14,
    color: '#9C27B0',
    marginLeft: 8,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderActive: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
  },
  sectionHeaderTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 40, // 增加全面屏底部间距，确保保存按钮可点击
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    // 为全面屏顶部添加额外间距
    marginTop: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    fontSize: 16,
    color: '#9C27B0',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    textAlignVertical: 'center',
    height: 44,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  inviteCodeInput: {
    flex: 1,
  },
  regenerateButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  regenerateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  genderButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  genderButtonText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  genderButtonTextActive: {
    color: 'white',
  },
});

export default SettingsScreen;