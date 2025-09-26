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
  FlatList,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../config/supabase';
import { familyService } from '../services/familyService';

type Props = NativeStackScreenProps<RootStackParamList, 'BabyManagement'>;

interface BabyProfile {
  id: string;
  family_id: string;
  name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  created_at: string;
  updated_at: string;
}

export const BabyManagementScreen: React.FC<Props> = ({ navigation }) => {
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBaby, setEditingBaby] = useState<BabyProfile | null>(null);
  
  // 表单状态
  const [babyName, setBabyName] = useState('');
  const [babyBirthdate, setBabyBirthdate] = useState('');
  const [babyGender, setBabyGender] = useState<'male' | 'female'>('male');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadBabies();
  }, []);

  const loadBabies = async () => {
    try {
      setLoading(true);
      
      // 获取当前用户的家庭组ID
      const familyId = await familyService.getUserPrimaryFamilyId();

      // 查询家庭组中的所有宝宝
      const { data, error } = await supabase
          .from('baby_profiles')
          .select('*')
          .eq('family_id', familyId)
          .order('created_at', { ascending: false });

      if (error) {
        console.error('加载宝宝信息失败:', error);
        Alert.alert('错误', '加载宝宝信息失败');
        return;
      }

      setBabies(data || []);
    } catch (error) {
      console.error('加载宝宝信息失败:', error);
      Alert.alert('错误', '加载宝宝信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBaby = async () => {
    if (!babyName.trim()) {
      Alert.alert('提示', '请输入宝宝姓名');
      return;
    }

    if (!babyBirthdate.trim()) {
      Alert.alert('提示', '请输入宝宝出生日期');
      return;
    }

    // 验证日期格式
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(babyBirthdate.trim())) {
      Alert.alert('提示', '请输入正确的日期格式 (YYYY-MM-DD)');
      return;
    }

    try {
      setSaving(true);
      
      // 获取当前用户的家庭组ID
      const familyId = await familyService.getUserPrimaryFamilyId();

      if (editingBaby) {
        // 更新现有宝宝信息
        const { error } = await supabase
          .from('baby_profiles')
          .update({
            name: babyName.trim(),
            date_of_birth: babyBirthdate.trim(),
            gender: babyGender,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBaby.id);

        if (error) {
          console.error('更新宝宝信息失败:', error);
          Alert.alert('错误', '更新宝宝信息失败: ' + error.message);
          return;
        }

        Alert.alert('成功', '宝宝信息已更新');
      } else {
        // 添加新宝宝
        const { error } = await supabase
          .from('baby_profiles')
          .insert({
            family_id: familyId,
            name: babyName.trim(),
            date_of_birth: babyBirthdate.trim(),
            gender: babyGender,
          });

        if (error) {
          console.error('添加宝宝信息失败:', error);
          Alert.alert('错误', '添加宝宝信息失败: ' + error.message);
          return;
        }

        Alert.alert('成功', '宝宝信息已添加');
      }

      // 重置表单
      setBabyName('');
      setBabyBirthdate('');
      setSelectedDate(new Date());
      setBabyGender('male');
      setShowAddForm(false);
      setEditingBaby(null);
      
      // 重新加载宝宝列表
      await loadBabies();
    } catch (error) {
      console.error('保存宝宝信息失败:', error);
      Alert.alert('错误', '保存宝宝信息失败: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditBaby = (baby: BabyProfile) => {
    setEditingBaby(baby);
    setBabyName(baby.name);
    setBabyBirthdate(baby.date_of_birth);
    setSelectedDate(new Date(baby.date_of_birth));
    setBabyGender(baby.gender);
    setShowAddForm(true);
  };

  const handleDeleteBaby = (baby: BabyProfile) => {
    Alert.alert(
      '确认删除',
      `确定要删除宝宝 ${baby.name} 的信息吗？此操作不可撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('baby_profiles')
                .delete()
                .eq('id', baby.id);

              if (error) {
                console.error('删除宝宝信息失败:', error);
                Alert.alert('错误', '删除宝宝信息失败');
                return;
              }

              Alert.alert('成功', '宝宝信息已删除');
              await loadBabies();
            } catch (error) {
              console.error('删除宝宝信息失败:', error);
              Alert.alert('错误', '删除宝宝信息失败');
            }
          },
        },
      ]
    );
  };

  const handleCancelForm = () => {
    setBabyName('');
    setBabyBirthdate('');
    setSelectedDate(new Date());
    setBabyGender('male');
    setShowAddForm(false);
    setEditingBaby(null);
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setBabyBirthdate(formattedDate);
    }
  };

  const renderBabyItem = ({ item }: { item: BabyProfile }) => (
    <View style={styles.babyItem}>
      <View style={styles.babyInfo}>
        <Text style={styles.babyName}>{item.name}</Text>
        <Text style={styles.babyDetails}>
          出生日期: {item.date_of_birth} | 性别: {item.gender === 'male' ? '男' : '女'}
        </Text>
      </View>
      <View style={styles.babyActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditBaby(item)}
        >
          <Text style={styles.editButtonText}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteBaby(item)}
        >
          <Text style={styles.deleteButtonText}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>宝宝管理</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(true)}
        >
          <Text style={styles.addButtonText}>+ 添加</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {showAddForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {editingBaby ? '编辑宝宝信息' : '添加宝宝信息'}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>宝宝姓名</Text>
              <TextInput
                style={styles.input}
                placeholder="请输入宝宝姓名"
                value={babyName}
                onChangeText={setBabyName}
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>出生日期</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
                disabled={saving}
              >
                <Text style={[styles.datePickerText, !babyBirthdate && styles.placeholderText]}>
                  {babyBirthdate || '请选择出生日期'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>性别</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    babyGender === 'male' && styles.genderButtonActive,
                  ]}
                  onPress={() => setBabyGender('male')}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      babyGender === 'male' && styles.genderButtonTextActive,
                    ]}
                  >
                    男
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    babyGender === 'female' && styles.genderButtonActive,
                  ]}
                  onPress={() => setBabyGender('female')}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      babyGender === 'female' && styles.genderButtonTextActive,
                    ]}
                  >
                    女
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelForm}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveBaby}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingBaby ? '更新' : '保存'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.babyList}>
          <Text style={styles.listTitle}>家庭宝宝列表</Text>
          {babies.length > 0 ? (
            <FlatList
              data={babies}
              renderItem={renderBabyItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无宝宝信息</Text>
              <Text style={styles.emptySubText}>点击右上角"添加"按钮添加宝宝信息</Text>
            </View>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#9C27B0',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
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
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
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
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  babyList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  babyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  babyInfo: {
    flex: 1,
  },
  babyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  babyDetails: {
    fontSize: 14,
    color: '#666',
  },
  babyActions: {
    flexDirection: 'row',
  },
  editButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF5252',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
  },
});

export default BabyManagementScreen;