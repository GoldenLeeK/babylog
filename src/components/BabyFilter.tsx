import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { babyService, BabyProfile } from '../services/supabaseService';
import { supabase } from '../config/supabase';

interface BabyFilterProps {
  selectedBabyId?: string;
  onBabySelect: (babyId: string | undefined, babyName?: string) => void;
  showAllOption?: boolean;
  style?: any;
}

const BabyFilter: React.FC<BabyFilterProps> = ({
  selectedBabyId,
  onBabySelect,
  showAllOption = true,
  style,
}) => {
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBabies();
  }, []);

  const loadBabies = async () => {
    try {
      setLoading(true);
      
      // 获取当前用户的家庭组ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBabies([]);
        return;
      }

      const { data: familyMember } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!familyMember) {
        setBabies([]);
        return;
      }

      // 获取当前家庭组的所有宝宝（只获取活跃的宝宝）
      const { data, error } = await supabase
        .from('baby_profiles')
        .select('*')
        .eq('family_id', familyMember.family_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('加载宝宝列表失败:', error);
        Alert.alert('错误', '加载宝宝列表失败，请重试');
        setBabies([]);
      } else {
        setBabies(data || []);
      }
    } catch (error) {
      console.error('加载宝宝列表失败:', error);
      Alert.alert('错误', '加载宝宝列表失败，请重试');
      setBabies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBabySelect = (baby?: BabyProfile) => {
    if (baby) {
      onBabySelect(baby.id, baby.name);
    } else {
      onBabySelect(undefined);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (babies.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.emptyText}>暂无宝宝信息，请先添加宝宝</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>选择宝宝</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {showAllOption && (
          <TouchableOpacity
            style={[
              styles.babyButton,
              !selectedBabyId && styles.selectedButton,
            ]}
            onPress={() => handleBabySelect()}
          >
            <Text
              style={[
                styles.babyButtonText,
                !selectedBabyId && styles.selectedButtonText,
              ]}
            >
              全部
            </Text>
          </TouchableOpacity>
        )}
        
        {babies.map((baby) => (
          <TouchableOpacity
            key={baby.id}
            style={[
              styles.babyButton,
              selectedBabyId === baby.id && styles.selectedButton,
            ]}
            onPress={() => handleBabySelect(baby)}
          >
            <Text
              style={[
                styles.babyButtonText,
                selectedBabyId === baby.id && styles.selectedButtonText,
              ]}
            >
              {baby.nickname || baby.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#212529',
    letterSpacing: -0.3,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  babyButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  babyButtonText: {
    color: '#495057',
    fontSize: 15,
    fontWeight: '500',
  }
  selectedButtonText: {
    color: '#fff',
    fontWeight: '600',
  },  fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default BabyFilter;