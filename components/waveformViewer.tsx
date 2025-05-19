// WaveformViewer.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

export default function WaveformViewer({ url }: { url: string }) {
  return (
    <View style={styles.container}>
      {/* <AudioWaveform
        source={{ uri: url }}
        waveFormStyle={{
          waveColor: '#000000',
          scrubColor: '#6200ee',
          height: 100,
        }}
        style={styles.waveform}
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 150,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  waveform: {
    width: '100%',
    height: 100,
  }
});