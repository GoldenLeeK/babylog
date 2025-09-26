import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { familyService, FamilyGroup } from '../services/familyService';

interface FamilySetupScreenProps {
  navigation: any;
}

const FamilySetupScreen: React.FC<FamilySetupScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  const [checkingFamily, setCheckingFamily] = useState(true);
  
  // 创建家庭组状态
  const [familyName, setFamilyName] = useState('');
  const [familyDescription, setFamilyDescription] = useState('');
  
  // 加入家庭组状态
  const [inviteCode, setInviteCode] = useState('');
  const [role, setRole] = useState<'parent' | 'caregiver' | 'relative'>('caregiver');

  useEffect(() => {
    checkUserFamily();
  }, []);

  const checkUserFamily = async () => {
    try {
      setCheckingFamily(true);
      const hasFamily = await familyService.checkUserHasFamily();
      if (hasFamily) {
        // 用户已有家庭组，跳转到主界面
        navigation.replace('Main');
      }
    } catch (error) {
      console.error('检查用户家庭状态失败:', error);
    } finally {
      setCheckingFamily(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('错误', '请输入家庭组名称');
      return;
    }

    try {
      setLoading(true);
      const family = await familyService.createFamily(familyName, familyDescription);
      
      Alert.alert(
        '创建成功',
        `家庭组"${family.name}"创建成功！\n邀请码：${family.invite_code}\n\n您可以将邀请码分享给家人，让他们加入您的家庭组。`,
        [
          {
            text: '确定',
            onPress: () => navigation.replace('Main'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('创建失败', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('错误', '请输入邀请码');
      return;
    }

    try {
      setLoading(true);
      await familyService.joinFamilyByInviteCode(inviteCode, role);
      
      Alert.alert(
        '加入成功',
        '您已成功加入家庭组！',
        [
          {
            text: '确定',
            onPress: () => navigation.replace('Main'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('加入失败', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingFamily) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>检查家庭状态...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>设置家庭组</Text>
          <Text style={styles.subtitle}>
            创建或加入家庭组，与家人一起记录宝宝的成长
          </Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'create' && styles.activeTab]}
            onPress={() => setActiveTab('create')}
          >
            <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
              创建家庭组
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'join' && styles.activeTab]}
            onPress={() => setActiveTab('join')}
          >
            <Text style={[styles.tabText, activeTab === 'join' && styles.activeTabText]}>
              加入家庭组
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'create' ? (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>家庭组名称 *</Text>
              <TextInput
                style={styles.input}
                value={familyName}
                onChangeText={setFamilyName}
                placeholder="例如：张家宝宝"
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>家庭描述（可选）</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={familyDescription}
                onChangeText={setFamilyDescription}
                placeholder="简单描述一下您的家庭..."
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreateFamily}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>创建家庭组</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>邀请码 *</Text>
              <TextInput
                style={styles.input}
                value={inviteCode}
                onChangeText={(text) => setInviteCode(text.toUpperCase())}
                placeholder="输入6位邀请码"
                maxLength={6}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>您的角色</Text>
              <View style={styles.roleContainer}>
                {[
                  { key: 'parent', label: '父母' },
                  { key: 'caregiver', label: '看护人' },
                  { key: 'relative', label: '亲属' },
                ].map((roleOption) => (
                  <TouchableOpacity
                    key={roleOption.key}
                    style={[
                      styles.roleOption,
                      role === roleOption.key && styles.roleOptionActive,
                    ]}
                    onPress={() => setRole(roleOption.key as any)}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        role === roleOption.key && styles.roleOptionTextActive,
                      ]}
                    >
                      {roleOption.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleJoinFamily}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>加入家庭组</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
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
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#E9ECEF',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    textAlign: 'left',
    textAlignVertical: 'top',
    height: 44,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  roleOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  roleOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  roleOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default FamilySetupScreen;