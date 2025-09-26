import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SideSelectorProps {
  leftSelected: boolean;
  rightSelected: boolean;
  onLeftPress: () => void;
  onRightPress: () => void;
  disabled?: boolean;
}

const SideSelector: React.FC<SideSelectorProps> = ({
  leftSelected,
  rightSelected,
  onLeftPress,
  onRightPress,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.sideButton,
          leftSelected && styles.selectedButton,
          disabled && styles.disabledButton,
        ]}
        onPress={onLeftPress}
        disabled={disabled}
      >
        <Text style={[styles.buttonText, leftSelected && styles.selectedText]}>左侧</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.sideButton,
          rightSelected && styles.selectedButton,
          disabled && styles.disabledButton,
        ]}
        onPress={onRightPress}
        disabled={disabled}
      >
        <Text style={[styles.buttonText, rightSelected && styles.selectedText]}>右侧</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 20,
  },
  sideButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '40%',
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#E1BEE7',
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '500',
  },
  selectedText: {
    color: '#9C27B0',
    fontWeight: 'bold',
  },
});

export default SideSelector;