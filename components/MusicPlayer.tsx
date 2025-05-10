import React, { useState, useEffect, useRef, JSX } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MusicFileList from './MusicFileList';

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
export default function EnhancedMusicPlayer(): JSX.Element {
  // State for the player
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cacheInitialized, setCacheInitialized] = useState<boolean>(false);

  // Refs for maintaining values between renders
  const soundRef = useRef<Audio.Sound | null>(null);
  const positionUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const cachedAudioInfo = useRef<Map<string, CachedAudioInfo>>(new Map());
  const lastPlaybackPosition = useRef<number>(0);
  const lastSelectedFile = useRef<string | null>(null);
  const lastSelectedFileName = useRef<string | null>(null);

  // Initialize audio session and register background task
  useEffect(() => {
    async function setupAudio(): Promise<void> {
      try {
        await Notifications.requestPermissionsAsync();
        
        // Enhanced audio mode settings for better streaming performance
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          interruptionModeIOS: 1,  // Audio.InterruptionModeIOS.DuckOthers
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,  // Audio.InterruptionModeAndroid.DuckOthers
          playThroughEarpieceAndroid: false,
        });
        
        // Preload Expo AV to improve initial load times
        await Audio.setIsEnabledAsync(true);
        
        // Setup background task
        await BackgroundFetch.registerTaskAsync(BACKGROUND_PLAYBACK_TASK, {
          minimumInterval: 60,
          stopOnTerminate: false,
          startOnBoot: true,
        });

        // Use a more efficient interval for position updates
        positionUpdateIntervalRef.current = setInterval(async () => {
          if (soundRef.current && isPlaying && !isSliding && isMountedRef.current) {
            try {
              const status = await soundRef.current.getStatusAsync() as any as PlaybackStatus;
              if (status.isLoaded && status.isPlaying) {
                // This approach prevents janky UI - batch updates together
                requestAnimationFrame(() => {
                  if (isMountedRef.current) {
                    setPosition(status.positionMillis || 0);
                    setSliderValue(status.positionMillis || 0);
                    lastPlaybackPosition.current = status.positionMillis || 0;
                  }
                });
                
                // Don't save position on every update - too expensive
                // Only save position every 10 seconds
                if (Math.floor((status.positionMillis || 0) / 10000) !== 
                    Math.floor((lastPlaybackPosition.current || 0) / 10000)) {
                  AsyncStorage.setItem('current-playback-position', 
                    JSON.stringify({ position: status.positionMillis }));
                }
              }
            } catch (error) {
              console.log('Error getting position:', error);
            }
          }
        }, 500);

        // Try to restore previous session
        await restorePreviousSession();
        
      } catch (error) {
        console.log('Error setting up audio session:', error);
      }
    }

    setupAudio();
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      
      // Clear the update interval
      if (positionUpdateIntervalRef.current) {
        clearInterval(positionUpdateIntervalRef.current);
        positionUpdateIntervalRef.current = null;
      }
      
      // Save state before unmounting
      const saveState = async (): Promise<void> => {
        try {
          if (selectedFile && selectedFileName) {
            await AsyncStorage.setItem('current-playback-info', JSON.stringify({
              uri: selectedFile,
              fileName: selectedFileName,
              position: lastPlaybackPosition.current,
              isPlaying: isPlaying
            }));
          }
        } catch (error) {
          console.log('Error saving state:', error);
        }
      };
      
      saveState();
      
      // Unload sound when component unmounts
      const unloadSound = async (): Promise<void> => {
        if (soundRef.current) {
          try {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          } catch (error) {
            console.log('Error unloading sound on unmount:', error);
          }
          soundRef.current = null;
        }
      };
      
      unloadSound();
    };
  }, []);

  // App state change handler (for when app goes to background/foreground)
  useEffect(() => {
    // Setup AppState listener to handle app backgrounding/foregrounding
    const handleAppStateChange = async (nextAppState: string): Promise<void> => {
      if (nextAppState === 'active') {
        // App came to foreground
        if (soundRef.current && lastSelectedFile.current) {
          try {
            const status = await soundRef.current.getStatusAsync() as any as PlaybackStatus;
            
            // Fix for the main issue - when the app is reopened, check if sound is playing
            if (!status.isPlaying && isPlaying) {
              // Sound should be playing but isn't - resume it
              await soundRef.current.playAsync();
              console.log("Resuming playback after app foregrounded");
            }
          } catch (error) {
            console.log("Error checking sound status after foreground:", error);
            
            // If there was an error with the sound object, recreate it
            if (lastSelectedFile.current) {
              console.log("Recreating sound object after error");
              await loadSound(lastSelectedFile.current);
              
              // If it was playing before, resume playback
              if (isPlaying) {
                setTimeout(async () => {
                  if (soundRef.current) {
                    await soundRef.current.playAsync();
                  }
                }, 500);
              }
            }
          }
        } else if (lastSelectedFile.current) {
          // Sound was unloaded but we had a track - reload it
          console.log("Restoring session after app foregrounded");
          await restorePreviousSession();
        }
      } else if (nextAppState === 'background') {
        // App went to background - ensure we save our state
        if (selectedFile && selectedFileName) {
          console.log("Saving state before app backgrounded");
          await AsyncStorage.setItem('current-playback-info', JSON.stringify({
            uri: selectedFile,
            fileName: selectedFileName,
            position: lastPlaybackPosition.current,
            isPlaying: isPlaying
          }));
        }
      }
    };
    
    // Add app state change listener
    let subscription: any;
    
    if (Platform.OS !== 'web') {
      const AppState = require('react-native').AppState;
      
      // For newer RN versions
      if (AppState.addEventListener) {
        subscription = AppState.addEventListener('change', handleAppStateChange);
      } 
      // For older RN versions
      else if (AppState.addListener) {
        subscription = AppState.addListener('change', handleAppStateChange);
      }
    } else {
      subscription = { remove: () => {} }; // Web doesn't have AppState
    }
    
    return () => {
      if (subscription && subscription.remove) {
        subscription.remove();
      }
    };
  }, [isPlaying, selectedFile, selectedFileName]);

  // Initialize the audio cache directory
  const initializeCache = async (): Promise<void> => {
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });
      }
      
      // Load existing cache info
      const cacheInfoStr = await AsyncStorage.getItem(AUDIO_CACHE_INFO_KEY);
      if (cacheInfoStr) {
        const cacheInfo = JSON.parse(cacheInfoStr) as CachedAudioInfo[];
        cacheInfo.forEach(info => {
          cachedAudioInfo.current.set(info.sourceUri, info);
        });
      }
      
      setCacheInitialized(true);
    } catch (error) {
      console.log('Error initializing cache:', error);
    }
  };

  // Save cache info to persistent storage
  const saveCacheInfo = async (): Promise<void> => {
    try {
      const cacheInfoArray = Array.from(cachedAudioInfo.current.values());
      await AsyncStorage.setItem(AUDIO_CACHE_INFO_KEY, JSON.stringify(cacheInfoArray));
    } catch (error) {
      console.log('Error saving cache info:', error);
    }
  };

  // Restore previous playback session if applicable
  const restorePreviousSession = async (): Promise<void> => {
    try {
      const playbackInfoStr = await AsyncStorage.getItem('current-playback-info');
      if (playbackInfoStr) {
        const playbackInfo = JSON.parse(playbackInfoStr);
        lastSelectedFile.current = playbackInfo.uri;
        lastSelectedFileName.current = playbackInfo.fileName;
        
        // Set file info first
        setSelectedFile(playbackInfo.uri);
        setSelectedFileName(playbackInfo.fileName);
        
        // Load the sound with streaming settings
        setIsLoading(true);
        const loadedSound = await loadSound(playbackInfo.uri);
        setIsLoading(false);
        
        if (loadedSound) {
          try {
            // Set position to where we left off
            await loadedSound.setPositionAsync(playbackInfo.position || 0);
            lastPlaybackPosition.current = playbackInfo.position || 0;
            setPosition(playbackInfo.position || 0);
            setSliderValue(playbackInfo.position || 0);
            
            // If it was playing when the app closed, resume playback
            // Slight delay to ensure everything is ready
            if (playbackInfo.isPlaying) {
              setTimeout(async () => {
                try {
                  if (loadedSound) {
                    await loadedSound.playAsync();
                    setIsPlaying(true);
                    console.log("Resumed playback from previous session");
                  }
                } catch (err) {
                  console.log("Error resuming playback:", err);
                }
              }, 300);
            }
          } catch (err) {
            console.log("Error setting position:", err);
          }
        }
      }
    } catch (error) {
      console.log('Error restoring session:', error);
      setIsLoading(false);
    }
  };

  // Check and retrieve cached audio file or download it
  const getAudioFileUri = async (sourceUri: string, fileName: string): Promise<string> => {
    if (!cacheInitialized) await initializeCache();
    
    try {
      // Generate a filename based on the source URI to avoid collisions
      const fileHash = sourceUri
        .split('')
        .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)
        .toString(16)
        .replace('-', '_');
      
      const cachedFilePath = `${AUDIO_CACHE_DIR}${fileHash}_${fileName.replace(/[^\w\s.-]/gi, '')}`;
      
      // Check if file exists in our map
      if (cachedAudioInfo.current.has(sourceUri)) {
        const info = cachedAudioInfo.current.get(sourceUri)!;
        
        // Check if file exists on disk
        const fileInfo = await FileSystem.getInfoAsync(info.cachedUri);
        if (fileInfo.exists) {
          // Update last accessed time
          info.lastAccessed = Date.now();
          cachedAudioInfo.current.set(sourceUri, info);
          await saveCacheInfo();
          return info.cachedUri;
        }
      }
      
      // File doesn't exist in cache, download it
      setIsLoading(true);
      
      // Download the file
      const downloadResult = await FileSystem.downloadAsync(sourceUri, cachedFilePath);
      
      if (downloadResult.status === 200) {
        // Add to cache info
        const fileInfo = await FileSystem.getInfoAsync(cachedFilePath);
        const newCacheInfo: CachedAudioInfo = {
          sourceUri,
          cachedUri: cachedFilePath,
          fileName,
          lastAccessed: Date.now(),
          size: fileInfo.size || 0
        };
        
        cachedAudioInfo.current.set(sourceUri, newCacheInfo);
        await saveCacheInfo();
        
        // Manage cache size if needed (limit to ~100MB)
        await cleanupCache(100 * 1024 * 1024);
        
        setIsLoading(false);
        return cachedFilePath;
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.log('Error caching audio file:', error);
      setIsLoading(false);
      // Fall back to original URI if caching fails
      return sourceUri;
    }
  };

  // Clean up old cache entries if cache exceeds maxSize
  const cleanupCache = async (maxSize: number): Promise<void> => {
    try {
      // Calculate total cache size
      let totalSize = 0;
      const cacheEntries = Array.from(cachedAudioInfo.current.values());
      cacheEntries.forEach(entry => {
        totalSize += entry.size;
      });
      
      // If cache size is under limit, no cleanup needed
      if (totalSize <= maxSize) return;
      
      // Sort by last accessed (oldest first)
      cacheEntries.sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      // Remove oldest entries until we're under the limit
      for (const entry of cacheEntries) {
        if (totalSize <= maxSize * 0.8) break; // 20% buffer
        
        try {
          await FileSystem.deleteAsync(entry.cachedUri);
          cachedAudioInfo.current.delete(entry.sourceUri);
          totalSize -= entry.size;
        } catch (error) {
          console.log(`Error deleting cached file ${entry.fileName}:`, error);
        }
      }
      
      // Save updated cache info
      await saveCacheInfo();
    } catch (error) {
      console.log('Error cleaning cache:', error);
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

  // Show notification
  const showPlaybackNotification = async (isNowPlaying: boolean): Promise<void> => {
    if (!selectedFileName) return;

    try {
      const actionId = isNowPlaying ? 'pause' : 'play';
      const channelId = 'music-playback';

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(channelId, {
          name: 'Music Playback',
          importance: Notifications.AndroidImportance.LOW,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Music Player',
          body: `${isNowPlaying ? 'Playing' : 'Paused'}: ${selectedFileName}`,
          data: { action: actionId },
        },
        trigger: null,
      });
    } catch (error) {
      console.log('Error showing notification:', error);
    }
  };

  // Status update handler for the sound object
  const onPlaybackStatusUpdate = (status: PlaybackStatus): void => {
    if (!isMountedRef.current) return;
    
    if (!status.isLoaded) {
      setIsLoaded(false);
      return;
    }

    // Update loaded state if needed
    if (!isLoaded) {
      setIsLoaded(true);
    }

    // Only update position when not sliding, and limit updates to avoid UI jank
    if (!isSliding) {
      // We're already updating position in the interval timer, so we don't need
      // to update here unless the position change is significant
      const newPosition = status.positionMillis || 0;
      if (Math.abs(newPosition - position) > 1000) {
        setPosition(newPosition);
        setSliderValue(newPosition);
        lastPlaybackPosition.current = newPosition;
      }
    }

    // Update duration if needed
    if (status.durationMillis && duration !== status.durationMillis) {
      setDuration(status.durationMillis);
    }

    // Update playing state if changed
    if (isPlaying !== status.isPlaying) {
      setIsPlaying(status.isPlaying || false);
    }

    // Handle playback completion
    if (status.didJustFinish && !status.isLooping) {
      handlePlaybackFinished();
    }
  };

  // Handle playback finished
  const handlePlaybackFinished = async (): Promise<void> => {
    if (!isMountedRef.current) return;
    
    setIsPlaying(false);
    setPosition(0);
    setSliderValue(0);
    lastPlaybackPosition.current = 0;
    
    await showPlaybackNotification(false);
  };

  // Load sound from URI with streaming support
  const loadSound = async (uri: string): Promise<Audio.Sound | null> => {
    try {
      setIsLoading(true);
      
      // Unload any existing sound first
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setSound(null);
      }

      // Create new sound object with streaming enabled
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: uri },
        { 
          shouldPlay: false, 
          progressUpdateIntervalMillis: 200,
          // These options enable streaming playback
          audioTrackCategoryType: "playback",
          audioPan: 0,
          volume: 1.0,
          // Lower buffer size to start playback faster
          iosPreferredBufferSize: 512 * 8, // Smaller buffer for quicker start
          // Lower buffer sizes have lower latency but more risk of stuttering
          androidAudioBufferSize: 512 * 8, 
        },
        onPlaybackStatusUpdate as any
      );
      
      // Store sound in state and ref
      soundRef.current = newSound;
      setSound(newSound);

      // Get initial status
      const status = await newSound.getStatusAsync() as any as PlaybackStatus;
      if (status.isLoaded) {
        setDuration(status.durationMillis || 0);
        setPosition(0);
        setSliderValue(0);
        setIsLoaded(true);
      }
      
      setIsLoading(false);
      return newSound;
    } catch (error) {
      console.log('Error loading sound:', error);
      Alert.alert('Error', 'Failed to load audio file');
      setIsLoading(false);
      return null;
    }
  };

  // Play sound with immediate streaming
  const playSound = async (): Promise<void> => {
    if (!selectedFile || isPlaying) return;

    try {
      let currentSound = soundRef.current;

      // Set playing state early to give immediate feedback
      setIsPlaying(true);
      
      // Load sound if not already loaded - will begin streaming immediately
      if (!currentSound) {
        setIsLoading(true);
        currentSound = await loadSound(selectedFile);
        if (!currentSound) {
          setIsPlaying(false);
          setIsLoading(false);
          return;
        }
      }

      // Start playback
      await currentSound.playAsync();
      await showPlaybackNotification(true);
      setIsLoading(false);
    } catch (error) {
      console.log('Error playing sound:', error);
      Alert.alert('Playback Error', 'Failed to play audio file');
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  // Pause sound
  const pauseSound = async (): Promise<void> => {
    if (!soundRef.current || !isPlaying) return;
    
    try {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      await showPlaybackNotification(false);
    } catch (error) {
      console.log('Error pausing sound:', error);
    }
  };

  // Stop sound
  const stopSound = async (): Promise<void> => {
    if (!soundRef.current) return;
    
    try {
      // Stop and unload
      await soundRef.current.stopAsync();
      await soundRef.current.setPositionAsync(0);
      
      // Update state
      setPosition(0);
      setSliderValue(0);
      lastPlaybackPosition.current = 0;
      setIsPlaying(false);
      
      // Clear notification
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.log('Error stopping sound:', error);
    }
  };

  // Handle slider value change (when user is sliding)
  const handleSliderValueChange = (value: number): void => {
    setIsSliding(true);
    setSliderValue(value);
  };

  // Handle slider sliding complete
  const handleSliderSlidingComplete = async (value: number): Promise<void> => {
    if (!soundRef.current || !isLoaded) {
      setIsSliding(false);
      return;
    }
    
    try {
      // Set new position
      await soundRef.current.setPositionAsync(value);
      setPosition(value);
      lastPlaybackPosition.current = value;
      
      // Resume playing if was playing before
      if (isPlaying) {
        await soundRef.current.playAsync();
      }
    } catch (error) {
      console.log('Error seeking:', error);
    } finally {
      setIsSliding(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (uri: string, name: string): Promise<void> => {
    try {
      // Stop previous playback
      await stopSound();
      
      // Update selected file
      setSelectedFile(uri);
      setSelectedFileName(name);
      lastSelectedFile.current = uri;
      lastSelectedFileName.current = name;
      
      // Load new sound
      await loadSound(uri);
    } catch (error) {
      console.log('Error selecting file:', error);
      Alert.alert('Error', 'Failed to select audio file');
    }
  };

  return (
    <View style={styles.container}>
      <MusicFileList onFileSelect={handleFileSelect} />
      
      {selectedFileName && (
        <Text style={styles.fileText}>
          {isLoading ? `Loading: ${selectedFileName}...` : `Now Playing: ${selectedFileName}`}
        </Text>
      )}
      
      {isLoaded && (
        <View style={styles.sliderContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
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
      )}
      
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.controlButton, 
            (!selectedFile || isPlaying || isLoading) && styles.disabledButton
          ]}
          onPress={playSound}
          disabled={!selectedFile || isPlaying || isLoading}
        >
          <Text style={styles.controlButtonText}>▶️ Play</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, (!isPlaying || isLoading) && styles.disabledButton]}
          onPress={pauseSound}
          disabled={!isPlaying || isLoading}
        >
          <Text style={styles.controlButtonText}>⏸️ Pause</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, (!isLoaded || isLoading) && styles.disabledButton]}
          onPress={stopSound}
          disabled={!isLoaded || isLoading}
        >
          <Text style={styles.controlButtonText}>⏹️ Stop</Text>
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
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileText: {
    marginVertical: 15,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  sliderContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
    height: 40,  // Increased height for better touch target
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