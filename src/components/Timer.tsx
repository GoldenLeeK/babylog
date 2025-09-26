import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface TimerProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  startTime?: number;
  disabled?: boolean;
  leftDuration?: number;
  rightDuration?: number;
  leftSelected?: boolean;
  rightSelected?: boolean;
  leftStartTime?: number | null;
  rightStartTime?: number | null;
}

const Timer: React.FC<TimerProps> = ({ 
  isRunning, 
  onStart, 
  onStop, 
  startTime, 
  disabled = false,
  leftDuration = 0,
  rightDuration = 0,
  leftSelected = false,
  rightSelected = false,
  leftStartTime = null,
  rightStartTime = null
}) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && startTime) {
      const calculateCurrentTime = () => {
        // 计算从开始到现在的总时间
        const totalElapsed = Math.floor((Date.now() - startTime) / 1000);
        return totalElapsed;
      };
      
      // 设置初始时间
      setElapsedTime(calculateCurrentTime());
      
      interval = setInterval(() => {
        setElapsedTime(calculateCurrentTime());
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  // 格式化时间为 MM:SS 格式
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
      <TouchableOpacity
        style={[
          styles.button, 
          isRunning ? styles.stopButton : styles.startButton,
          disabled && styles.disabledButton
        ]}
        onPress={isRunning ? onStop : onStart}
        disabled={disabled}
      >
        <Text style={[styles.buttonText, disabled && styles.disabledText]}>
          {isRunning ? '停止' : '开始'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledText: {
    color: '#999',
  },
});

export default Timer;