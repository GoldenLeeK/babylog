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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { authService } from '../services/authService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);

  // 加载保存的凭据和设置
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        const savedPassword = await AsyncStorage.getItem('savedPassword');
        const savedRememberMe = await AsyncStorage.getItem('rememberMe');
        const savedAutoLogin = await AsyncStorage.getItem('autoLogin');
        
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
        if (savedRememberMe === 'true') setRememberMe(true);
        if (savedAutoLogin === 'true') {
          setAutoLogin(true);
          // 如果启用了自动登录且有保存的凭据，则自动登录
          if (savedEmail && savedPassword) {
            setTimeout(() => {
              handleAutoLogin(savedEmail, savedPassword);
            }, 500);
          }
        }
      } catch (error) {
        console.error('加载保存的凭据失败:', error);
      }
    };

    loadSavedCredentials();
  }, []);

  const handleAutoLogin = async (savedEmail: string, savedPassword: string) => {
    setLoading(true);
    setError('');
    
    try {
      const { user, error } = await authService.signIn(savedEmail, savedPassword);
      if (error) {
        setError(error.message);
        Alert.alert('登录失败', error.message);
      } else if (user) {
        // 检查用户是否已有家庭组
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: memberData, error: memberError } = await supabase
            .from('family_members')
            .select('id')
            .eq('user_id', currentUser.id)
            .maybeSingle(); // ✅ 修复：用户可能没有家庭
          
          if (memberError && memberError.code === 'PGRST116') {
            // 用户没有家庭组，跳转到家庭组创建页面
            navigation.replace('FamilySetup');
          } else if (!memberData) {
            // 用户没有家庭组，跳转到家庭组创建页面
            navigation.replace('FamilySetup');
          } else {
            // 已有家庭组，进入主界面
            // 检查用户是否已有家庭组
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: memberData, error: memberError } = await supabase
            .from('family_members')
            .select('id')
            .eq('user_id', currentUser.id)
            .maybeSingle(); // ✅ 修复：用户可能没有家庭
          
          if (memberError && memberError.code === 'PGRST116') {
            // 用户没有家庭组，跳转到家庭组创建页面
            navigation.replace('FamilySetup');
          } else if (!memberData) {
            // 用户没有家庭组，跳转到家庭组创建页面
            navigation.replace('FamilySetup');
          } else {
            // 已有家庭组，进入主界面
            navigation.replace('MainTabs');
          }
        } else {
          navigation.replace('MainTabs');
        }
          }
        } else {
          navigation.replace('MainTabs');
        }
      }
    } catch (error) {
      setError('自动登录失败，请手动登录');
      Alert.alert('自动登录失败', '请手动登录');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    
    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      const { user, error } = await authService.signIn(email, password);
      if (error) {
        setError(error.message);
        Alert.alert('登录失败', error.message);
      } else if (user) {
        // 保存登录凭据和设置
        if (rememberMe) {
          await AsyncStorage.setItem('savedEmail', email);
          await AsyncStorage.setItem('savedPassword', password);
          await AsyncStorage.setItem('rememberMe', 'true');
        } else {
          await AsyncStorage.removeItem('savedEmail');
          await AsyncStorage.removeItem('savedPassword');
          await AsyncStorage.setItem('rememberMe', 'false');
        }
        
        if (autoLogin) {
          await AsyncStorage.setItem('autoLogin', 'true');
        } else {
          await AsyncStorage.setItem('autoLogin', 'false');
        }
        
        // 检查用户是否已有家庭组
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: memberData, error: memberError } = await supabase
            .from('family_members')
            .select('id')
            .eq('user_id', currentUser.id)
            .maybeSingle(); // ✅ 修复：用户可能没有家庭
          
          if (memberError && memberError.code === 'PGRST116') {
            // 用户没有家庭组，跳转到家庭组创建页面
            navigation.replace('FamilySetup');
          } else if (!memberData) {
            // 用户没有家庭组，跳转到家庭组创建页面
            navigation.replace('FamilySetup');
          } else {
            // 已有家庭组，进入主界面
            navigation.replace('MainTabs');
          }
        } else {
          navigation.replace('MainTabs');
        }
      }
    } catch (error) {
      setError('发生未知错误');
      Alert.alert('登录失败', '发生未知错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const handleEmailNotVerified = () => {
    Alert.alert(
      '邮箱未验证',
      '如果您已注册但无法登录，请检查邮箱中的验证邮件并点击验证链接。'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>遥遥成长日记</Text>
            <Text style={styles.subtitle}>登录您的账户</Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>邮箱</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入邮箱"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>密码</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入密码"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.optionsContainer}>
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>记住密码</Text>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  disabled={loading}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={rememberMe ? '#007AFF' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>自动登录</Text>
                <Switch
                  value={autoLogin}
                  onValueChange={setAutoLogin}
                  disabled={loading}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={autoLogin ? '#007AFF' : '#f4f3f4'}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>登录</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linkContainer}>
              <TouchableOpacity onPress={handleRegister}>
                <Text style={styles.link}>注册新账户</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.link}>忘记密码？</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.helpButton}
              onPress={handleEmailNotVerified}
            >
              <Text style={styles.helpButtonText}>已注册但无法登录？</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 20,
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
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#F9F9F9',
    textAlignVertical: 'top',
    textAlign: 'left',
    height: 44,
  },
  button: {
    backgroundColor: '#007AFF',
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
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  link: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  helpButton: {
    marginTop: 15,
    paddingVertical: 10,
  },
  helpButtonText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  optionLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
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

export default LoginScreen;