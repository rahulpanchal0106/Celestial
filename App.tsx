import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import MusicPlayer from './components/MusicPlayer';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <MusicPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
