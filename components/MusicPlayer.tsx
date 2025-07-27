import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { setCurrentTrack, setIsPlaying, setCurrentTime, setDuration, togglePlayPause } from '../store/musicPlayerSlice';
import { Ionicons } from '@expo/vector-icons';

// Import Reanimated and Gesture Handler
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ArtGenerator from './ArtGenerator';

// Background task definition (unchanged)
const BACKGROUND_PLAYBACK_TASK = 'background-playback-task';
TaskManager.defineTask(BACKGROUND_PLAYBACK_TASK, async () => {
  try {
    const playbackInfoStr = await AsyncStorage.getItem('current-playback-info');
    if (playbackInfoStr) {
      const playbackInfo = JSON.parse(playbackInfoStr);
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
  } catch (error) {
    console.log('Background task error:', error);
  }
  return BackgroundFetch.BackgroundFetchResult.NoData;
});

// Configure notifications (unchanged)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: true,
  }),
});

// Main Music Player component
export default function MusicPlayer() {
  const dispatch = useDispatch();
  const currentTrack = useSelector((state: RootState) => state.musicPlayer.currentTrack);
  const isPlaying = useSelector((state: RootState) => state.musicPlayer.isPlaying);
  const currentTime = useSelector((state: RootState) => state.musicPlayer.currentTime);
  const duration = useSelector((state: RootState) => state.musicPlayer.duration);
  const playlist = useSelector((state: RootState) => state.musicPlayer.playlist);
  const convAPI = useSelector((state: RootState) => state.musicPlayer.converterAPI);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const positionUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const theme = useSelector((state: RootState) => state.musicPlayer.theme);

  const getThemeColors = () => {
    // console.log("♾️♾️♾️ Theme: ", theme);
    if (!theme || theme === 'dark') {
      return {
        textColor: "#1a1a2e",
        particleColor: "#000000",
        gradientPrimary: "#4e3794",
        underlineColor: "#1a1a2e",
        backgroundColor: "#f5f5f5",
        titleColor: "#333333",
        timeTextColor: "#666666",
        sliderThumbColor: "#6200ee",
        sliderTrackColor: "#d3d3d3",
        sliderProgressColor: "#6200ee",
        buttonColor: "#6200ee",
        buttonTextColor: "white",
        disabledButtonColor: "#cccccc"
      }
    } else {
      // Dark theme colors
      return {
        textColor: "#ffffff",
        particleColor: "#ffffff",
        gradientPrimary: "#ffffff",
        underlineColor: "#e0e0e0",
        backgroundColor: "#121212",
        titleColor: "#e0e0e0",
        timeTextColor: "#b3b3b3",
        sliderThumbColor: "#6200ee",
        sliderTrackColor: "#4f4f4f",
        sliderProgressColor: "#6200ee",
        buttonColor: "#6200ee",
        buttonTextColor: "white",
        disabledButtonColor: "#333333"
      }
    }
  }

  const colors = getThemeColors();

  // Animation shared values
  const playButtonScale = useSharedValue(1);
  const pauseButtonScale = useSharedValue(1);
  const titleOpacity = useSharedValue(1);
  const sliderProgress = useSharedValue(0);

  // Animated styles for play/pause buttons
  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
    opacity: isPlaying ? 0 : 1,
  }));

  const pauseButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pauseButtonScale.value }],
    opacity: isPlaying ? 1 : 0,
  }));

  // Animated style for track title
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  // Animated style for slider progress
  const sliderStyle = useAnimatedStyle(() => ({
    width: `${(sliderProgress.value / (duration || 1)) * 100}%`,
    height: 4,
    backgroundColor: colors.sliderProgressColor,
    position: 'absolute',
    borderRadius: 3,
    left: 0,
    top: 0,
  }));

  // Setup audio mode
  useEffect(() => {
    const setupAudio = async () => {
      try {
        const interruptionModeAndroid = Audio.InterruptionModeAndroid?.DoNotMix ?? 1;
        const interruptionModeIOS = Audio.InterruptionModeIOS?.DoNotMix ?? 1;
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeAndroid,
          interruptionModeIOS,
          playsInSilentModeIOS: true,
        });

        // Register background task
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_PLAYBACK_TASK);
        if (!isRegistered) {
          await TaskManager.registerTaskAsync(BACKGROUND_PLAYBACK_TASK);
        }

        // Request notification permissions
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please enable notifications for background playback.');
        }

      } catch (error) {
        console.log('Error setting audio mode or registering task:', error);
      }
    };
    setupAudio();
  }, []);

  useEffect(() => {
    if (isPlaying) {
      playSound();
    } else {
      pauseSound();
    }
  }, [isPlaying]);

  // Animate track title on track change
  useEffect(() => {
    if (currentTrack) {
      titleOpacity.value = 0;
      titleOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.exp) });
      console.log("URI DEFORE LOAD: ", currentTrack.uri);
      let soundURI = currentTrack.uri;
      if (currentTrack.uri.startsWith("null")) {
        const filepath = currentTrack.uri.split("/")[2];
        console.log("CONVAPI AT MUSICPLAYER: ", convAPI);
        soundURI = `${convAPI}/files/${filepath}`;
      }
      console.log("SOUDURI TO BE LOADED: ", soundURI);
      if (!soundURI.startsWith("null") && !isLoading) {
        loadSound(soundURI);
      }
    }
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (soundRef.current && currentTrack?.uri.startsWith("null")) {
        soundRef.current.unloadAsync();
      }
    };
  }, [currentTrack]);

  // Update slider progress
  useEffect(() => {
    if (isPlaying && !isSliding) {
      sliderProgress.value = withTiming(currentTime, { duration: 1000, easing: Easing.linear });
    }
  }, [currentTime, isPlaying, isSliding]);

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

  // Load sound
  const loadSound = async (uri: string) => {
    try {
      setIsLoading(true);
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, isLooping: false, progressUpdateIntervalMillis: 1000 },
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
      if (isPlaying) {
        playSound();
      }
    }
  };

  // Play next track
  const playNextTrack = () => {
    if (!currentTrack || !playlist) return;
    
    const currentIndex = playlist.findIndex(track => track.id === currentTrack.id);
    if (currentIndex < playlist.length - 1) {
      const nextTrack = playlist[currentIndex + 1];
      dispatch(setCurrentTrack(nextTrack));
      dispatch(setIsPlaying(true));
    }
  };
  const playPreviousTrack = () => {
    if (!currentTrack || !playlist) return;
    
    const currentIndex = playlist.findIndex(track => track.id === currentTrack.id);
    if (currentIndex < playlist.length - 1) {
      const nextTrack = playlist[currentIndex - 1];
      dispatch(setCurrentTrack(nextTrack));
      dispatch(setIsPlaying(true));
    }
  };

  // Playback status update
  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      dispatch(setDuration(status.durationMillis || 0));
      if (!isSliding) {
        dispatch(setCurrentTime(status.positionMillis));
        setSliderValue(status.positionMillis);
      }
      if (status.didJustFinish) {
        playNextTrack();
      }
    }
  };

  // Play sound
  const playSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        dispatch(setIsPlaying(true));
        // Start foreground service and show notification
        if (Platform.OS === 'android') {
          await Notifications.presentNotificationAsync({
            title: currentTrack?.title || 'Unknown Title',
            body: currentTrack?.artist || 'Unknown Artist',
            sound: false,
            sticky: true, // Makes the notification persistent
            data: {},
          });
        }
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
        // Dismiss notification when paused
        if (Platform.OS === 'android') {
          await Notifications.dismissAllNotificationsAsync();
        }
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
        sliderProgress.value = 0;
        // Dismiss notification when stopped
        if (Platform.OS === 'android') {
          await Notifications.dismissAllNotificationsAsync();
        }
      }
    } catch (error) {
      console.log('Error stopping sound:', error);
      Alert.alert('Error', 'Failed to stop audio');
    }
  };

  // Handle slider gesture
  const handleSliderValueChange = (value: number) => {
    setIsSliding(true);
    setSliderValue(value);
    sliderProgress.value = value;
  };

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

  // Format time
  const formatTime = (millis: number): string => {
    if (!millis) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={[styles.container]}>

      {/* {currentTrack && currentTrack.filepath&& <ArtGenerator trackId={currentTrack.filepath as string} borderRadius={0} setAsBg={true}  />} */}
      
      {isLoaded && (
        <View style={{overflow:"hidden", width:"93%", padding:15, borderTopRightRadius:40, borderTopLeftRadius:40, backgroundColor: colors.backgroundColor}}>
          {currentTrack && currentTrack.id&& <ArtGenerator trackId={currentTrack.id as string} borderRadius={0} setAsBg={true}  />}
          <Animated.Text
            style={[
              {
                fontSize: 13,
                fontWeight: '400',
                color: colors.titleColor,
                padding: 6,
              },
              titleStyle,
            ]}
            ellipsizeMode="middle"
            numberOfLines={1}
          >
            {isLoading ? 'Loading audio...' : currentTrack!.title.replace(/_+/g, ' ')}
          </Animated.Text>
          <View style={styles.sliderContainer}>
            <Text style={[styles.timeText, { color: colors.timeTextColor }]}>
              {formatTime(currentTime)}
            </Text>
            <View style={styles.sliderWrapper}>
              {/* <Animated.View style={sliderStyle} /> */}
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration || 1}
                value={sliderValue}
                minimumTrackTintColor="transparent"
                maximumTrackTintColor={colors.sliderTrackColor}
                thumbTintColor={colors.sliderThumbColor}
                onValueChange={handleSliderValueChange}
                onSlidingComplete={handleSliderSlidingComplete}
                disabled={isLoading}
              />
            </View>
            <Text style={[styles.timeText, { color: colors.timeTextColor }]}>
              {formatTime(duration)}
            </Text>
          </View>
        </View>
      )}
      <View style={[styles.controlsContainer, { backgroundColor: colors.backgroundColor }]}>
        <TouchableOpacity
          style={[
            styles.controlButton, 
            { backgroundColor: colors.buttonColor },
            (!isPlaying || isLoading) && [styles.disabledButton, { backgroundColor: colors.disabledButtonColor }]
          ]}
          onPress={playPreviousTrack}
          disabled={!isPlaying || isLoading}
        >
          <Animated.View style={pauseButtonStyle}>
            <Ionicons name="play-skip-back" size={20} color={colors.buttonTextColor} />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlButton, 
            { backgroundColor: colors.buttonColor },
            (!currentTrack || isLoading) && [styles.disabledButton, { backgroundColor: colors.disabledButtonColor }]
          ]}
          onPress={() => dispatch(togglePlayPause())}
          disabled={!currentTrack || isLoading}
        >
          <Animated.View style={isPlaying ? pauseButtonStyle : playButtonStyle}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={20} color={colors.buttonTextColor} />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlButton, 
            { backgroundColor: colors.buttonColor },
            (!isPlaying || isLoading) && [styles.disabledButton, { backgroundColor: colors.disabledButtonColor }]
          ]}
          onPress={playNextTrack}
          disabled={!isPlaying || isLoading}
        >
          <Animated.View style={pauseButtonStyle}>
            <Ionicons name="play-skip-forward" size={20} color={colors.buttonTextColor} />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlButton, 
            { backgroundColor: colors.buttonColor },
            (!isLoaded || isLoading) && [styles.disabledButton, { backgroundColor: colors.disabledButtonColor }]
          ]}
          onPress={stopSound}
          disabled={!isLoaded || isLoading}
        >
          <Ionicons name="stop" size={20} color={colors.buttonTextColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 20,
    overflow:"hidden",
    paddingTop: 0,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,

    // Android shadow
    elevation: 5,
  },
  sliderContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 0,
  },
  sliderWrapper: {
    flex: 1,
    marginHorizontal: 10,
    position: 'relative',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeText: {
    fontSize: 12,
    width: 40,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: -1,
    padding:20,
  },
  controlButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
});