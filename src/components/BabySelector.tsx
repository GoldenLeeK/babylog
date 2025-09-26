import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { supabase } from '../config/supabase';

interface BabyProfile {
  id: string;
  name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
}

interface BabySelectorProps {
  selectedBabyId?: string;
  onBabySelect: (babyId: string, babyName: string) => void;
  style?: any;
}

const BabySelector: React.FC<BabySelectorProps> = ({ selectedBabyId, onBabySelect, style }) => {
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [selectedBaby, setSelectedBaby] = useState<BabyProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBabies();
  }, []);

  useEffect(() => {
    if (selectedBabyId && babies.length > 0) {
      const baby = babies.find(b => b.id === selectedBabyId);
      setSelectedBaby(baby || null);
    }
  }, [selectedBabyId, babies]);

  const loadBabies = async () => {
    try {
      setLoading(true);
      
      // 获取当前用户的家庭组ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: familyMember } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!familyMember) return;

      // 获取家庭组中的所有活跃宝宝
      const { data, error } = await supabase
        .from('baby_profiles')
        .select('*')
        .eq('family_id', familyMember.family_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('获取宝宝列表失败:', error);
        Alert.alert('错误', '获取宝宝列表失败');
        return;
      }

      setBabies(data || []);
      
      // 自动选择第一个宝宝（如果还没有选择且列表不为空）
      if (data && data.length > 0 && !selectedBabyId) {
        const baby = data[0];
        setSelectedBaby(baby);
        onBabySelect(baby.id, baby.name);
      }
    } catch (error) {
      console.error('获取宝宝列表失败:', error);
      Alert.alert('错误', '获取宝宝列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBabySelect = (baby: BabyProfile) => {
    setSelectedBaby(baby);
    onBabySelect(baby.id, baby.name);
    setModalVisible(false);
  };

  const renderBabyItem = ({ item }: { item: BabyProfile }) => (
    <TouchableOpacity
      style={[
        styles.babyItem,
        selectedBaby?.id === item.id && styles.selectedBabyItem
      ]}
      onPress={() => handleBabySelect(item)}
    >
      <Text style={[
        styles.babyName,
        selectedBaby?.id === item.id && styles.selectedBabyName
      ]}>
        {item.name}
      </Text>
      <Text style={[
        styles.babyInfo,
        selectedBaby?.id === item.id && styles.selectedBabyInfo
      ]}>
        {item.date_of_birth} | {item.gender === 'male' ? '男' : '女'}
      </Text>
    </TouchableOpacity>
  );

  if (babies.length === 0 && !loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.label}>选择宝宝</Text>
        <View style={styles.noBabiesContainer}>
          <Text style={styles.noBabiesText}>暂无宝宝信息，请先添加宝宝</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>选择宝宝 *</Text>
      <TouchableOpacity
        style={[
          styles.selector,
          !selectedBaby && styles.selectorPlaceholder
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[
          styles.selectorText,
          !selectedBaby && styles.selectorPlaceholderText
        ]}>
          {selectedBaby ? selectedBaby.name : '请选择宝宝'}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择宝宝</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={babies}
              renderItem={renderBabyItem}
              keyExtractor={(item) => item.id}
              style={styles.babyList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  selector: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorPlaceholder: {
    borderColor: '#ccc',
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectorPlaceholderText: {
    color: '#999',
  },
  arrow: {
    fontSize: 12,
    color: '#666',
  },
  noBabiesContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  noBabiesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  babyList: {
    maxHeight: 300,
  },
  babyItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedBabyItem: {
    backgroundColor: '#e3f2fd',
  },
  babyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedBabyName: {
    color: '#1976d2',
  },
  babyInfo: {
    fontSize: 14,
    color: '#666',
  },
  selectedBabyInfo: {
    color: '#1976d2',
  },
});

export default BabySelector;