import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { authService } from '../services/authService';
import { supabase } from '../config/supabase';
import { familyService } from '../services/familyService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface FamilyInfo {
  id: string;
  name: string;
  invite_code: string;
  role: string;
  member_count: number;
}

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // 编辑状态
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    loadUserProfile();
    loadFamilyInfo();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError('');
      
      const user = await authService.getCurrentUser();
      if (!user) {
        setError('用户未登录');
        return;
      }

      // 从user_profiles表中获取用户资料
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // 使用maybeSingle()而不是single()，允许返回null

      if (error) {
        console.error('获取用户资料失败:', error);
        setError('获取用户资料失败');
        return;
      }

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
      } else {
        // 如果没有找到用户资料，创建一个默认的资料记录
        const defaultProfile: Partial<UserProfile> = {
          user_id: user.id,
          email: user.email || '',
          display_name: ''
        };

        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert(defaultProfile)
          .select()
          .maybeSingle(); // ✅ 修复：插入后可能没有返回数据（理论上不应该，但为安全起见）

        if (insertError) {
          if (insertError.code === 'PGRST116') {
            console.error('创建用户资料失败：未找到记录');
            setError('创建用户资料失败：未找到记录');
          } else {
            console.error('创建用户资料失败:', insertError);
            setError('创建用户资料失败');
          }
          return;
        }

        if (newProfile) {
          setProfile(newProfile);
          setDisplayName(newProfile.display_name || '');
        }
      }
    } catch (error) {
      console.error('加载用户资料失败:', error);
      setError('加载用户资料失败');
    } finally {
      setLoading(false);
    }
  };

  const loadFamilyInfo = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // 获取用户的家庭组信息
      const families = await familyService.getUserFamilies();
      if (families && families.length > 0) {
        const primaryFamily = families[0]; // 获取第一个家庭组作为主要家庭组
        
        // 获取家庭成员数量
        const members = await familyService.getFamilyMembers(primaryFamily.id);
        
        setFamilyInfo({
          id: primaryFamily.id,
          name: primaryFamily.name,
          invite_code: primaryFamily.invite_code,
          role: 'member', // 暂时设为固定值，后续可以从family_members表获取实际角色
          member_count: members?.length || 0,
        });
      }
    } catch (error) {
      console.error('加载家庭组信息失败:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError('');

      const user = await authService.getCurrentUser();
      if (!user) {
        setError('用户未登录');
        return;
      }

      // 验证输入
      if (!displayName.trim()) {
        setError('请输入您的昵称');
        return;
      }

      // 检查是否已存在用户资料
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let error;
      if (existingProfile) {
        // 更新现有资料
        const result = await supabase
          .from('user_profiles')
          .update({
            display_name: displayName.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        error = result.error;
      } else {
        // 创建新资料
        const result = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            email: user.email || '',
            display_name: displayName.trim(),
          });
        error = result.error;
      }

      if (error) {
        setError('保存失败: ' + error.message);
        return;
      }

      Alert.alert('成功', '个人资料已保存');
      await loadUserProfile(); // 重新加载资料
    } catch (error) {
      setError('保存失败: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
              // 导航器会自动处理跳转
            } catch (error) {
              Alert.alert('错误', '退出登录失败');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>个人资料</Text>
          <Text style={styles.subtitle}>管理您的个人信息</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>个人信息</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>昵称 *</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入您的昵称"
                value={displayName}
                onChangeText={setDisplayName}
                editable={!saving}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>邮箱</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#F0F0F0' }]}
                value={profile?.email || ''}
                editable={false}
              />
            </View>
          </View>

          {familyInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>家庭组信息</Text>
              
              <View style={styles.familyInfoContainer}>
                <View style={styles.familyInfoRow}>
                  <Text style={styles.familyInfoLabel}>家庭组名称:</Text>
                  <Text style={styles.familyInfoValue}>{familyInfo.name}</Text>
                </View>
                
                <View style={styles.familyInfoRow}>
                  <Text style={styles.familyInfoLabel}>我的角色:</Text>
                  <Text style={styles.familyInfoValue}>
                    {familyInfo.role === 'parent' ? '家长' : 
                     familyInfo.role === 'caregiver' ? '看护人' : 
                     familyInfo.role === 'grandparent' ? '祖父母' : '成员'}
                  </Text>
                </View>
                
                <View style={styles.familyInfoRow}>
                  <Text style={styles.familyInfoLabel}>成员数量:</Text>
                  <Text style={styles.familyInfoValue}>{familyInfo.member_count} 人</Text>
                </View>
                
                <View style={styles.familyInfoRow}>
                  <Text style={styles.familyInfoLabel}>邀请码:</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      // 复制邀请码到剪贴板的功能可以后续添加
                      Alert.alert('邀请码', familyInfo.invite_code);
                    }}
                  >
                    <Text style={[styles.familyInfoValue, styles.inviteCode]}>{familyInfo.invite_code}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.babyManageButton}
                onPress={() => navigation.navigate('BabyManagement')}
              >
                <Text style={styles.babyManageButtonText}>管理宝宝信息</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>保存资料</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={saving}
          >
            <Text style={styles.logoutButtonText}>退出登录</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#F9F9F9',
  },
  genderButtonActive: {
    borderColor: '#9C27B0',
    backgroundColor: '#E1BEE7',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#666',
  },
  genderButtonTextActive: {
    color: '#9C27B0',
    fontWeight: '600',
  },
  familyInfoContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  familyInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  familyInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  familyInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  inviteCode: {
    color: '#9C27B0',
    textDecorationLine: 'underline',
  },
  babyManageButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  babyManageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF5252',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF5350',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ProfileScreen;