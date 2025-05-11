import React, { useState, useEffect, useRef, JSX } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MusicFileList from './MusicFileList';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setCurrentTrack, setIsPlaying, setCurrentTime, setDuration } from '../store/musicPlayerSlice';
import { Ionicons } from '@expo/vector-icons';
import ScrollingText from './ScrollingText';

// Define background task
const BACKGROUND_PLAYBACK_TASK = 'background-playback-task';
const AUDIO_CACHE_DIR = `${FileSystem.cacheDirectory}audio-cache/`;
const AUDIO_CACHE_INFO_KEY = 'audio-cache-info';

// Register the task for background playback
TaskManager.defineTask(BACKGROUND_PLAYBACK_TASK, async () => {
  try {
    // Retrieve current playback info from storage
    const playbackInfoStr = await AsyncStorage.getItem('current-playback-info');
    if (playbackInfoStr) {
      const playbackInfo = JSON.parse(playbackInfoStr);
      
      // If there was playback in progress, we could resume it here
      // Or check if notification actions should be triggered
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
  } catch (error) {
    console.log('Background task error:', error);
  }
  
  return BackgroundFetch.BackgroundFetchResult.NoData;
});

interface PlaybackStatus {
  isLoaded: boolean;
  isPlaying?: boolean;
  durationMillis?: number;
  positionMillis?: number;
  didJustFinish?: boolean;
  isLooping?: boolean;
}

interface CachedAudioInfo {
  sourceUri: string;
  cachedUri: string;
  fileName: string;
  lastAccessed: number;
  size: number;
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Main Music Player component
export default function MusicPlayer(): JSX.Element {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: RootState) => state.musicPlayer.currentTrack);
  const isPlaying = useSelector((state: RootState) => state.musicPlayer.isPlaying);
  const currentTime = useSelector((state: RootState) => state.musicPlayer.currentTime);
  const duration = useSelector((state: RootState) => state.musicPlayer.duration);

  // State for the player
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Refs for maintaining values between renders
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Load sound when current track changes
  useEffect(() => {
    if (currentTrack) {
      loadSound(currentTrack.uri);
    }
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [currentTrack]);

  // Update position when playing
  useEffect(() => {
    if (isPlaying && soundRef.current) {
      positionUpdateIntervalRef.current = setInterval(async () => {
        try {
          const status = await soundRef.current?.getStatusAsync();
          if (status?.isLoaded) {
            dispatch(setCurrentTime(status.positionMillis));
            setSliderValue(status.positionMillis);
          }
        } catch (error) {
          console.log('Error updating position:', error);
        }
      }, 1000);
    } else {
      if (positionUpdateIntervalRef.current) {
        clearInterval(positionUpdateIntervalRef.current);
      }
    }

    return () => {
      if (positionUpdateIntervalRef.current) {
        clearInterval(positionUpdateIntervalRef.current);
      }
    };
  }, [isPlaying, dispatch]);

  // Load sound function
  const loadSound = async (uri: string) => {
    try {
      setIsLoading(true);
      
      // Unload previous sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      soundRef.current = newSound;
      setSound(newSound);
      setIsLoaded(true);
    } catch (error) {
      console.log('Error loading sound:', error);
      Alert.alert('Error', 'Failed to load audio file');
    } finally {
      setIsLoading(false);
    }
  };

  // Playback status update handler
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      dispatch(setDuration(status.durationMillis || 0));
      if (!isSliding) {
        dispatch(setCurrentTime(status.positionMillis));
        setSliderValue(status.positionMillis);
      }
      
      if (status.didJustFinish) {
        dispatch(setIsPlaying(false));
      }
    }
  };

  // Play sound
  const playSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        dispatch(setIsPlaying(true));
      }
    } catch (error) {
      console.log('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  // Pause sound
  const pauseSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
        dispatch(setIsPlaying(false));
      }
    } catch (error) {
      console.log('Error pausing sound:', error);
      Alert.alert('Error', 'Failed to pause audio');
    }
  };

  // Stop sound
  const stopSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.setPositionAsync(0);
        dispatch(setIsPlaying(false));
        dispatch(setCurrentTime(0));
        setSliderValue(0);
      }
    } catch (error) {
      console.log('Error stopping sound:', error);
      Alert.alert('Error', 'Failed to stop audio');
    }
  };

  // Handle slider value change
  const handleSliderValueChange = (value: number) => {
    setIsSliding(true);
    setSliderValue(value);
  };

  // Handle slider sliding complete
  const handleSliderSlidingComplete = async (value: number) => {
    if (!soundRef.current || !isLoaded) {
      setIsSliding(false);
      return;
    }

    try {
      await soundRef.current.setPositionAsync(value);
      dispatch(setCurrentTime(value));
      
      if (isPlaying) {
        await soundRef.current.playAsync();
      }
    } catch (error) {
      console.log('Error seeking:', error);
    } finally {
      setIsSliding(false);
    }
  };

  // Format time for display
  const formatTime = (millis: number): string => {
    if (!millis) return '0:00';
    
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.container}>
      {isLoaded && (
        <View>
          
          <Text style={ {
    fontSize: 13,
    fontWeight: '400',
    color: '#333',
    padding:6
  }}
  ellipsizeMode="middle"
  numberOfLines={1}
  >
    
            {currentTrack!.title}
          {/* <ScrollingText title={currentTrack!.title}/> */}
            </Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration || 1}
            value={sliderValue}
            minimumTrackTintColor="#1DB954"
            maximumTrackTintColor="#d3d3d3"
            thumbTintColor="#1DB954"
            onValueChange={handleSliderValueChange}
            onSlidingComplete={handleSliderSlidingComplete}
            disabled={isLoading}
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
        
        </View>
      )}
      
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, (!isPlaying || isLoading) && styles.disabledButton]}
          onPress={pauseSound}
          disabled={!isPlaying || isLoading}
        >
          <Text style={styles.controlButtonText}><Ionicons name='pause' size={20} /></Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlButton, 
            (!currentTrack || isPlaying || isLoading) && styles.disabledButton
          ]}
          onPress={playSound}
          disabled={!currentTrack || isPlaying || isLoading}
        >
          <Text style={styles.controlButtonText}><Ionicons name='play' size={20} /></Text>
        </TouchableOpacity>
        
        
        <TouchableOpacity
          style={[styles.controlButton, (!isLoaded || isLoading) && styles.disabledButton]}
          onPress={stopSound}
          disabled={!isLoaded || isLoading}
        >
          <Text style={styles.controlButtonText}><Ionicons name='stop' size={20} /></Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <View style={styles.loadingIndicator}>
          <Text style={styles.loadingText}>Loading audio file...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop:10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileText: {
    marginVertical: 15,
    fontSize: 10,
    color: '#333',
    textAlign: 'center',
  },
  sliderContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 0,
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
    // height: 20,  // Increased height for better touch target
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  controlButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  loadingIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 5,
    alignItems: 'center',
  },
  loadingText: {
    color: '#333',
    fontSize: 12,
  },
});