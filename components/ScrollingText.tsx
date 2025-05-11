import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, StyleProp, TextStyle } from 'react-native';

interface ScrollingTextProps {
  title: string;
  style?: StyleProp<TextStyle>;
}

const ScrollingText: React.FC<ScrollingTextProps> = ({ title, style }) => {
  const [textWidth, setTextWidth] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const isOverflowing: boolean = textWidth > containerWidth;

  useEffect(() => {
    if (isOverflowing) {
      const animation = Animated.loop(
        Animated.timing(translateX, {
          toValue: -(textWidth - containerWidth),
          duration: textWidth * 50, // Adjust speed by multiplying text width
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => animation.stop();
    } else {
      translateX.setValue(0); // Reset position if not overflowing
    }
  }, [isOverflowing, textWidth, containerWidth, translateX]);

  return (
    <View
      style={styles.container}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          isOverflowing && { transform: [{ translateX }] },
          { flexShrink: 0 }, // Prevent text from shrinking
        ]}
      >
        <Text
          style={[styles.fileName, style]}
          numberOfLines={1}
          onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
        >
          {title}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});

export default ScrollingText;