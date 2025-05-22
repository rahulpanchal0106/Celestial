import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Type definitions
interface YouTubeVideo {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration?: string;
}

export interface AudioFile {
  uri?: string;
  filepath?: string;
  name: string;
  source: string;
  thumbnail?: string;
  duration?: string | number;
}

interface MusicFile {
  _id: string;
  id: string;
  title: string;
  artist?: string;
  author?: string;
  filepath: string;
  thumbnail?: string;
}

interface YouTubeSearchProps {
  onTrackAdd: (track: AudioFile) => void;
}

// Function to request storage permissions
const requestStoragePermission = async () => {
  console.log('Requesting storage permission...');
  try {
    const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
    if (status === 'granted') {
      console.log('Permission already granted');
      return true;
    }
    if (canAskAgain) {
      console.log('Asking for permission...');
      const { status: newStatus } = await MediaLibrary.requestPermissionsAsync();
      if (newStatus === 'granted') {
        console.log('Permission granted');
        return true;
      }
    }
    console.log('Permission denied or cannot ask');
    Alert.alert(
      'Permission Required',
      'App needs storage permission to save music files permanently. Music will be saved temporarily but may be deleted when storage is low.',
      [{ text: 'OK' }]
    );
    return false;
  } catch (err) {
    console.warn('Error requesting permission:', err);
    return false;
  }
};

const YouTubeSearch: React.FC<YouTubeSearchProps> = ({ onTrackAdd }) => {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [fastTracks, setFastTracks] = useState<MusicFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const AUDIO_BASE_URL = useSelector((state: RootState) => state.musicPlayer.converterAPI) || 'https://fifth-funky-caps-dev.trycloudflare.com';
  const API_BASE_URL = 'https://broke-beats.vercel.app';
  const theme = useSelector((state: RootState) => state.musicPlayer.theme);

  const getThemeColors = () => {
    console.log("♾️♾️♾️ Theme: ", theme);
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
        disabledButtonColor: "#cccccc",
      };
    } else {
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
        disabledButtonColor: "#333333",
      };
    }
  };

  const colors = getThemeColors();

  const searchYouTube = async () => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a song name');
      return;
    }

    setIsSearching(true);
    setError(null);
    setVideos([]);
    setFastTracks([]);

    try {
      const [dbResponse, ytResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`),
        fetch(
          `${API_BASE_URL}/api/youtube-search?q=${encodeURIComponent(query + ' official audio')}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
          }
        ),
      ]);

      const [dbData, ytData] = await Promise.all([dbResponse.json(), ytResponse.json()]);

      if (!dbResponse.ok || !dbData.success) {
        throw new Error(dbData.error || 'Database search failed');
      }
      if (!ytResponse.ok || !ytData.success) {
        throw new Error(ytData.error || 'YouTube search failed');
      }

      setVideos(
        ytData.results.map((video: any) => ({
          id: video.id,
          url: video.url,
          title: video.title,
          thumbnail: video.thumbnail,
          channel: video.channel,
          duration: video.duration,
        }))
      );
      setFastTracks(
        dbData.results
          .filter((track: any) => track._id && track.title && track.filepath)
          .map((track: any) => ({
            _id: track._id,
            id: track._id,
            title: track.title,
            artist: track.author,
            author: track.author,
            filepath: track.filepath,
            thumbnail: track.thumbnail,
          }))
      );
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Failed to search. Please check your connection and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const initiateDownload = async (video: YouTubeVideo) => {
    setIsDownloading(prev => ({ ...prev, [video.id]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/download?url=${encodeURIComponent(video.url)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Download failed: ${response.status}`);
      }
      console.log("DATA: ", data);
      if (data.status === 'processing') {
        Alert.alert('Info', `Track "${video.title}" is being processed. Please try again later.`);
        return;
      }

      const track: AudioFile = {
        filepath: `${AUDIO_BASE_URL}${data.url}`,
        name: data.title || video.title,
        source: video.channel,
        thumbnail: video.thumbnail,
        duration: video.duration,
      };
      onTrackAdd(track);
      Alert.alert('Success', `Track "${data.title || video.title}" added to global download queue`);
    } catch (err: any) {
      console.error('Download error:', err);
      Alert.alert(
        'Error',
        err.message.includes('already')
          ? 'This track is already being processed. Please wait.'
          : `Download Failed: ${err.message}`
      );
    } finally {
      setIsDownloading(prev => ({ ...prev, [video.id]: false }));
    }
  };

  const initiateFastDownload = async (video: MusicFile) => {
    console.log('Starting fast download for:', video.title);
    setIsDownloading((prev) => ({ ...prev, [video._id]: true }));
    let tempFilePath = '';

    try {
      if (!video.filepath) {
        throw new Error('Invalid filepath: filepath is missing or undefined');
      }
      if (!AUDIO_BASE_URL) {
        throw new Error('AUDIO_BASE_URL is not set');
      }

      const permissionGranted = await requestStoragePermission();
      const storageDir = permissionGranted ? FileSystem.documentDirectory : FileSystem.cacheDirectory;
      if (!storageDir) {
        throw new Error('Storage directory is not available');
      }

      const downloadURI = `${AUDIO_BASE_URL.replace(/\/$/, '')}/${video.filepath.replace(/^\//, '')}`;
      const safeTitle = video.title.replace(/[^a-zA-Z0-9]/g, '_');
      tempFilePath = `${FileSystem.cacheDirectory}${safeTitle}_${video._id}_${Date.now()}.mp3`;
      let finalPath = tempFilePath;
      const filename = video.title ? `${video.title}.mp3` : `track_${video._id}.mp3`;

      console.log('Downloading from:', downloadURI);
      const response = await FileSystem.downloadAsync(downloadURI, tempFilePath);
      if (response.status !== 200) {
        throw new Error(`Download failed with status: ${response.status}`);
      }

      const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
      if (!fileInfo.exists || (fileInfo.size && fileInfo.size === 0)) {
        throw new Error('Downloaded file not found or is empty');
      }

      let thumbnailPath: string | undefined;
      if (video.thumbnail) {
        console.log('Downloading thumbnail:', video.thumbnail);
        const thumbnailFileName = `${safeTitle}_${video._id}_thumb.jpg`;
        const thumbnailTempPath = `${FileSystem.cacheDirectory}${thumbnailFileName}`;
        try {
          const thumbnailResponse = await FileSystem.downloadAsync(video.thumbnail, thumbnailTempPath);
          if (thumbnailResponse.status === 200) {
            const thumbnailDocPath = `${FileSystem.documentDirectory}${thumbnailFileName}`;
            await FileSystem.copyAsync({ from: thumbnailTempPath, to: thumbnailDocPath });
            thumbnailPath = thumbnailDocPath;
            await FileSystem.deleteAsync(thumbnailTempPath, { idempotent: true });
          } else {
            console.warn('Thumbnail download failed:', thumbnailResponse.status);
          }
        } catch (thumbnailErr) {
          console.warn('Failed to save thumbnail:', thumbnailErr);
        }
      }

      if (permissionGranted) {
        console.log('Saving to media library...');
        const { status } = await MediaLibrary.getPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Media library permission lost');
          throw new Error('Media library permission denied');
        }

        let asset;
        try {
          asset = await MediaLibrary.createAssetAsync(tempFilePath);
        } catch (assetErr) {
          console.error('Failed to create asset:', assetErr);
          throw new Error('Failed to save to media library');
        }

        let album;
        try {
          const albums = await MediaLibrary.getAlbumsAsync();
          album = albums.find((a) => a.title === 'Celestial');
          if (!album) {
            album = await MediaLibrary.createAlbumAsync('Celestial', asset, false);
          } else {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch (albumErr) {
          console.error('Failed to manage album:', albumErr);
          throw new Error('Failed to save to album');
        }

        let assetInfo;
        try {
          assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        } catch (infoErr) {
          console.error('Failed to get asset info:', infoErr);
          throw new Error('Failed to retrieve asset info');
        }

        if (assetInfo.localUri) {
          finalPath = assetInfo.localUri;
        } else {
          console.warn('No localUri in assetInfo');
        }

        try {
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        } catch (deleteErr) {
          console.warn('Failed to delete temporary file:', deleteErr);
        }
      } else {
        console.log('Saving to document directory...');
        const docFilePath = `${FileSystem.documentDirectory}${safeTitle}_${video._id}.mp3`;
        try {
          await FileSystem.copyAsync({ from: tempFilePath, to: docFilePath });
          finalPath = docFilePath;
        } catch (copyErr) {
          console.error('Failed to copy to document directory:', copyErr);
          throw new Error('Failed to save to document directory');
        }

        try {
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        } catch (deleteErr) {
          console.warn('Failed to delete temporary file:', deleteErr);
        }
      }

      console.log('Saving metadata to AsyncStorage...');
      const metadata = {
        id: video._id,
        title: video.title,
        artist: video.artist || video.author || 'Unknown Artist',
        filepath: finalPath,
        thumbnail: thumbnailPath,
        source: 'mongo',
      };
      try {
        await AsyncStorage.setItem(`track_${video._id}`, JSON.stringify(metadata));
      } catch (storageErr) {
        console.error('Failed to save metadata:', storageErr);
        throw new Error('Failed to save track metadata');
      }

      const track: AudioFile = {
        filepath: finalPath.startsWith('file://') ? finalPath : `file://${finalPath}`,
        name: filename,
        source: 'mongo',
        thumbnail: thumbnailPath,
      };

      console.log('Adding track to library:', track);
      onTrackAdd(track);
      Alert.alert(
        'Success',
        permissionGranted
          ? `Track "${filename}" added to your library and saved to your device`
          : `Track "${filename}" added to your library (may not persist after uninstall)`
      );
    } catch (err: any) {
      console.error('Fast download error:', err);
      if (tempFilePath) {
        try {
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        } catch (deleteErr) {
          console.warn('Failed to clean up temporary file:', deleteErr);
        }
      }
      Alert.alert(
        'Error',
        err.message.includes('already being processed')
          ? 'This track is already being processed. Please wait.'
          : `Failed to add track: ${err.message || 'Unknown error'}`
      );
    } finally {
      console.log('Download complete for:', video.title);
      setIsDownloading((prev) => ({ ...prev, [video._id]: false }));
    }
  };

  const renderVideoItem = ({ item, i }: { item: YouTubeVideo, i: number }) => (
    <TouchableOpacity
      key={i}
      style={[styles.videoItem, isDownloading[item.id] && styles.disabledItem]}
      onPress={() => initiateDownload(item)}
      disabled={isDownloading[item.id]}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.videoInfo}>
        <Text style={[styles.videoTitle, { color: colors.titleColor }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.videoChannel, { color: colors.timeTextColor }]}>{item.channel}</Text>
        <Text style={[styles.videoChannel, { color: colors.timeTextColor }]}>{item.duration}</Text>
      </View>
      {isDownloading[item.id] && <ActivityIndicator size="small" color={colors.sliderThumbColor} style={styles.loader} />}
    </TouchableOpacity>
  );

  const renderFastTrack = ({ item, i }: { item: MusicFile, i: number }) => (
    <TouchableOpacity
      key={i}
      style={[styles.videoItem, isDownloading[item._id] && styles.disabledItem]}
      onPress={() => initiateFastDownload(item)}
      disabled={isDownloading[item._id]}
    >
      {item.thumbnail && <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />}
      {!item.thumbnail && <Ionicons name='flash-outline' size={30} color={colors.particleColor} style={styles.fastThumbnail} />}
      <View style={styles.videoInfo}>
        <Text style={[styles.videoTitle, { color: colors.titleColor }]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.videoChannel, { color: colors.timeTextColor }]}>{item.artist || item.author || 'Unknown Artist'}</Text>
      </View>
      {isDownloading[item._id] && <ActivityIndicator size="small" color={colors.sliderThumbColor} style={styles.loader} />}
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.titleColor,
      padding: 12,
    },
    container: {
      width: '100%',
      backgroundColor: colors.backgroundColor,
      borderRadius: 8,
      padding: 17,
      paddingBottom: 0,
      paddingTop: 0,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      borderColor: colors.underlineColor,
      borderWidth: 1,
      borderRadius: 20,
      backgroundColor: colors.backgroundColor,
      marginRight: 8,
    },
    searchIcon: {
      marginLeft: 12,
      marginRight: 8,
      color: colors.timeTextColor,
    },
    input: {
      flex: 1,
      height: 40,
      fontSize: 14,
      color: colors.textColor,
    },
    searchButton: {
      backgroundColor: colors.buttonColor,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchButtonText: {
      color: colors.buttonTextColor,
      fontSize: 14,
      fontWeight: '600',
    },
    disabledButton: {
      backgroundColor: colors.disabledButtonColor,
      opacity: 0.7,
    },
    videoList: {
      width: '100%',
    },
    fastDownloadList: {
      width: '100%',
    },
    videoItem: {
      flexDirection: 'row',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.underlineColor,
      alignItems: 'center',
    },
    disabledItem: {
      opacity: 0.7,
    },
    thumbnail: {
      width: 80,
      height: 60,
      borderRadius: 5,
      marginRight: 12,
    },
    fastThumbnail: {
      width: 40,
      height: 50,
      borderRadius: 5,
      marginRight: 5,
      marginLeft: 0,
    },
    emptyPage: {
      width: 400,
      height: 200,
      borderRadius: 5,
      marginRight: 5,
      marginLeft: 0,
      color: colors.particleColor,
    },
    videoInfo: {
      flex: 1,
    },
    videoTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.titleColor,
    },
    videoChannel: {
      fontSize: 12,
      color: colors.timeTextColor,
      marginTop: 4,
    },
    loader: {
      marginLeft: 8,
    },
    errorText: {
      fontSize: 14,
      color: '#d32f2f', // Keeping as is since no equivalent in theme colors
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.timeTextColor,
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 12,
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignContent: "center",
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="search" size={20} style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter song or artist name"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchYouTube}
            editable={!isSearching}
          />
        </View>
        <TouchableOpacity
          style={[styles.searchButton, isSearching && styles.disabledButton]}
          onPress={searchYouTube}
          disabled={isSearching}
        >
          <Text style={styles.searchButtonText}>
            {isSearching ? 'Searching...' : 'Search'}
          </Text>
          {isSearching && <ActivityIndicator size="small" color={colors.buttonTextColor} style={styles.loader} />}
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      <ScrollView style={{ height: "100%" }}>
        <Text>
          {isSearching ? 'Searching in Database...' :
            fastTracks.length === 0 && query ?
              "No matching tracks found on database" :
              fastTracks.map((item, i) => renderFastTrack({ item, i }))
          }
        </Text>
        <Text>
          {isSearching ? 'Searching in Youtube...' :
            videos.length === 0 && query ?
              "No tracks found on Youtube" :
              videos.map((item, i) => renderVideoItem({ item, i }))
          }
        </Text>
      </ScrollView>
      {(!isSearching && fastTracks.length === 0 && videos.length === 0) && (
        <View style={{ height: "90%", width: "100%" }}>
          <Text style={{ width: "100%", height: "100%", textAlign: "center", color: colors.textColor }}>
            Search for any track in the world!
          </Text>
        </View>
      )}
    </View>
  );
};

export default YouTubeSearch;