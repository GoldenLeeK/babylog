import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';

interface NumberPickerProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  allowDecimals?: boolean;
  unit?: string;
  placeholder?: string;
}

const NumberPicker: React.FC<NumberPickerProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 999,
  step = 0.1,
  allowDecimals = true,
  unit = '',
  placeholder = '请输入'
}) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const [isEditing, setIsEditing] = useState(false);

  const formatNumber = (num: number): string => {
    if (allowDecimals) {
      return num.toFixed(1);
    }
    return Math.round(num).toString();
  };

  const handleIncrement = () => {
    const currentValue = parseFloat(inputValue) || 0;
    const newValue = Math.min(currentValue + step, max);
    const formattedValue = formatNumber(newValue);
    setInputValue(formattedValue);
    onValueChange(parseFloat(formattedValue));
  };

  const handleDecrement = () => {
    const currentValue = parseFloat(inputValue) || 0;
    const newValue = Math.max(currentValue - step, min);
    const formattedValue = formatNumber(newValue);
    setInputValue(formattedValue);
    onValueChange(parseFloat(formattedValue));
  };

  const handleInputChange = (text: string) => {
    // 只允许数字、小数点和负号
    const filteredText = text.replace(/[^-0-9.]/g, '');
    
    // 检查小数点数量
    const parts = filteredText.split('.');
    if (parts.length > 2) {
      return; // 不允许多个小数点
    }

    // 如果不允许小数，移除小数点
    if (!allowDecimals && filteredText.includes('.')) {
      return;
    }

    setInputValue(filteredText);
    
    const numValue = parseFloat(filteredText);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(numValue, max));
      onValueChange(clampedValue);
    }
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    const numValue = parseFloat(inputValue) || 0;
    const clampedValue = Math.max(min, Math.min(numValue, max));
    const formattedValue = formatNumber(clampedValue);
    setInputValue(formattedValue);
    onValueChange(parseFloat(formattedValue));
  };

  const handleInputFocus = () => {
    setIsEditing(true);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleDecrement}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>-</Text>
      </TouchableOpacity>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          keyboardType="numeric"
          selectTextOnFocus
          editable={true}
          scrollEnabled={false}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleIncrement}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 4,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 6,
    height: 42,
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 2,
    paddingVertical: 0,
    fontWeight: '500',
    minWidth: 50,
    includeFontPadding: false,
    textAlignVertical: 'center',
    numberOfLines: 1,
    ellipsizeMode: 'clip',
    overflow: 'hidden',
    height: '100%',
  },
  unit: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    fontWeight: '400',
    alignSelf: 'center',
  },
});

export default NumberPicker;