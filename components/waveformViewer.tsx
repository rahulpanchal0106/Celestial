// WaveformViewer.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { RNFFmpeg } from 'react-native-ffmpeg';

export default function WaveformViewer({ url }: { url: string }) {
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWaveform = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Normalize file path
        let filePath = url;
        if (Platform.OS === 'android' && url.startsWith('file://')) {
          filePath = url.replace('file://', '');
        }

        // Verify RNFS
        if (!RNFS) {
          throw new Error('react-native-fs module is not available');
        }

        // Verify file exists
        const fileExists = await RNFS.exists(filePath);
        if (!fileExists) {
          throw new Error('Audio file not found');
        }

        // Verify RNFFmpeg
        if (!RNFFmpeg) {
          throw new Error('react-native-ffmpeg module is not available');
        }

        // Disable FFmpeg logging to avoid enableLogEvents issue
        // Optionally, enable if needed and handle safely
        // try {
        //   await RNFFmpeg.enableLogEvents(false);
        // } catch (logErr) {
        //   console.warn('Failed to configure FFmpeg logging:', logErr);
        // }

        // Process audio file to extract waveform data
        const waveformData = await processAudioFile(filePath);
        setWaveformData(waveformData);
      } catch (err) {
        console.error('Waveform error:', err);
        setError(`Failed to load waveform: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadWaveform();
  }, [url]);

  const processAudioFile = async (filePath: string): Promise<number[]> => {
    try {
      // Use FFmpeg to extract raw audio samples
      const outputPath = `${RNFS.TemporaryDirectoryPath}/waveform.pcm`;
      const command = `-i "${filePath}" -f s16le -ac 1 -ar 44100 "${outputPath}"`;
      const result = await RNFFmpeg.execute(command);
      if (result.rc !== 0) {
        throw new Error('FFmpeg processing failed');
      }

      // Read PCM data
      const pcmData = await RNFS.readFile(outputPath, 'base64');
      const buffer = Buffer.from(pcmData, 'base64');

      // Process buffer to extract amplitude values
      const amplitudes: number[] = [];
      const samplesToAverage = 1000; // Adjust for desired resolution
      for (let i = 0; i < buffer.length; i += 2 * samplesToAverage) {
        let sum = 0;
        const count = Math.min(samplesToAverage, (buffer.length - i) / 2);
        for (let j = 0; j < count; j++) {
          const sample = buffer.readInt16LE(i + j * 2);
          sum += Math.abs(sample);
        }
        const avgAmplitude = (sum / count / 32768) * 100; // Normalize to 0-100
        amplitudes.push(avgAmplitude);
      }
      return amplitudes.slice(0, 100); // Limit to 100 bars for performance
    } catch (err) {
      throw new Error(`Failed to process audio: ${err.message}`);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (isLoading || !waveformData.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading waveform...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.waveform}>
        {waveformData.map((amplitude, index) => (
          <View
            key={index}
            style={{
              width: 4,
              height: amplitude,
              backgroundColor: '#000000',
              marginHorizontal: 1,
            }}
          />
        ))}
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
    width: '100%',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
});