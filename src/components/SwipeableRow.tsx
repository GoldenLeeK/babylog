import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  deleteText?: string;
}

const SwipeableRow: React.FC<SwipeableRowProps> = ({ 
  children, 
  onDelete, 
  deleteText = '删除' 
}) => {
  const handleLongPress = () => {
    // 长按触发删除
    Alert.alert(
      '确认删除',
      '确定要删除这条记录吗？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      {children}
    </TouchableOpacity>
  );
};

export default SwipeableRow;