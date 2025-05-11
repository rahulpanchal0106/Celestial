import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// Type definitions
interface YouTubeVideo {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration?: string;
}

interface AudioFile {
  uri?: string;
  filepath?: string;
  name: string;
  source: 'local' | 'mongo' | 'youtube';
  thumbnail?: string;
}

// Update MusicFile interface to include all required properties
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
    // For true persistence, we need media library permissions
    console.log('Requesting media library permission');
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
  const AUDIO_BASE_URL = useSelector((state: RootState) => state.musicPlayer.converterAPI);

  console.log("INITIAL BASEURI: ", AUDIO_BASE_URL);
  const API_BASE_URL = 'https://broke-beats.vercel.app';

  const searchYouTube = async () => {
    if (!query.trim()) {
      Alert.alert('Error', 'Please enter a song name');
      return;
    }

    setIsSearching(true);
    setError(null);
    setVideos([]);

    try {
      const dbResponse = await fetch(`${API_BASE_URL}/api/search?q=${query}`);
      const dbData = await dbResponse.json();
      console.log("🤖🤖🤖 ", dbData);

      const response = await fetch(
        `${API_BASE_URL}/api/youtube-search?q=${encodeURIComponent(query + ' official audio')}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`YouTube search failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.results) {
        throw new Error(data.error || 'No results found');
      }

      setVideos(
        data.results.map((video: any) => ({
          id: video.id,
          url: video.url,
          title: video.title,
          thumbnail: video.thumbnail,
          channel: video.channel,
          duration: video.duration,
        }))
      );
      setFastTracks(dbData!.results);
    } catch (err: any) {
      console.error('YouTube search error:', err);
      setError('Failed to search YouTube. Please try again.');
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

      if (data.status === 'processing') {
        Alert.alert('Info', `Track "${video.title}" is being processed. Please try again later.`);
        return;
      }

      if (!data.url || !data.filename) {
        throw new Error(data.message || 'Invalid response from download API');
      }

      // Create track object
      const track: AudioFile = {
        filepath: `${AUDIO_BASE_URL}${data.url}`,
        name: data.title || video.title,
        source: 'youtube',
        thumbnail: video.thumbnail,
      };

      // Add to music player
      onTrackAdd(track);
      Alert.alert('Success', `Track "${data.title || video.title}" added to your library`);
    } catch (err: any) {
      console.error('Download error:', err);
      Alert.alert('Error', err.message === 'This video is already being processed'
        ? 'This track is already being processed. Please wait.'
        : `Failed to add track: ${err.message}`);
    } finally {
      setIsDownloading(prev => ({ ...prev, [video.id]: false }));
    }
  };

  const initiateFastDownload = async (video: MusicFile) => {
    setIsDownloading((prev) => ({ ...prev, [video._id]: true }));
  
    try {
      console.log("AUDIO_BASE_URL:", AUDIO_BASE_URL);
      console.log("video:", video);
      console.log("video.filepath:", video.filepath);
  
      if (!video.filepath) {
        throw new Error("Invalid filepath: filepath is missing or undefined");
      }
  
      if (!AUDIO_BASE_URL) {
        throw new Error("AUDIO_BASE_URL is not set");
      }
  
      // Request media library permissions for persistent storage
      const permissionGranted = await requestStoragePermission();
      
      // Determine the storage directory - use document directory if permissions not granted
      const storageDir = permissionGranted ? 
        FileSystem.documentDirectory : 
        FileSystem.cacheDirectory;
        
      if (!storageDir) {
        throw new Error("Storage directory is not available");
      }
  
      const downloadURI = `${AUDIO_BASE_URL.replace(/\/$/, '')}/${video.filepath.replace(/^\//, '')}`;
      console.log("downloadURI:", downloadURI);
      
      // Create a sanitized filename (remove special characters that may cause issues)
      const safeTitle = video.title.replace(/[^a-zA-Z0-9]/g, '_');
      const tempFilePath = `${FileSystem.cacheDirectory}${safeTitle}_${video._id}_${Date.now()}.mp3`;
      console.log("Downloading to temp location:", tempFilePath);
      
      // Download file to temporary location first
      try {
        const response = await FileSystem.downloadAsync(downloadURI, tempFilePath);
        console.log("FileSystem Response:", response);
  
        if (response.status !== 200) {
          throw new Error(`Download failed with status: ${response.status}`);
        }
      } catch (downloadErr) {
        console.error("Download error:", downloadErr);
        throw new Error(`Download failed: ${downloadErr.message || "Unknown error"}`);
      }
  
      // Check if file exists after download
      const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
      console.log("File exists at", tempFilePath, ":", fileInfo.exists, "size:", fileInfo.size);
  
      if (!fileInfo.exists || (fileInfo.size && fileInfo.size === 0)) {
        throw new Error("Downloaded file not found or is empty");
      }
      
      let finalPath = tempFilePath;
      let filename = video.title ? `${video.title}.mp3` : `track_${video._id}.mp3`;
      
      // If permission was granted, save to media library for persistence
      if (permissionGranted) {
        try {
          // Save to media library
          const asset = await MediaLibrary.createAssetAsync(tempFilePath);
          console.log("Created media library asset:", asset);
          
          // Create a Broke Beats album if it doesn't exist
          const albums = await MediaLibrary.getAlbumsAsync();
          let album = albums.find(a => a.title === "Broke Beats");
          
          if (!album) {
            album = await MediaLibrary.createAlbumAsync("Broke Beats", asset, false);
            console.log("Created 'Broke Beats' album:", album);
          } else {
            // Add to the existing album
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            console.log("Added to 'Broke Beats' album");
          }
          
          // Get the local URI for the asset
          const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
          if (assetInfo.localUri) {
            finalPath = assetInfo.localUri;
            console.log("Permanent file path:", finalPath);
          }
        } catch (mediaErr) {
          console.error("Media library error:", mediaErr);
          // Continue with the temporary file if media library fails
          console.log("Falling back to temporary file");
        }
      } else {
        // If no permission, use DocumentDirectory for semi-persistence
        const docFilePath = `${FileSystem.documentDirectory}${safeTitle}_${video._id}.mp3`;
        
        try {
          // Copy from cache to document directory (more persistent)
          await FileSystem.copyAsync({
            from: tempFilePath,
            to: docFilePath
          });
          console.log("Copied to document directory:", docFilePath);
          finalPath = docFilePath;
          
          // Delete the temporary file
          await FileSystem.deleteAsync(tempFilePath);
        } catch (copyErr) {
          console.error("Error copying to document directory:", copyErr);
          // Fall back to cache file if copy fails
        }
      }
  
      const track: AudioFile = {
        // Ensure proper file URI format based on platform
        filepath: Platform.OS === 'ios' ? finalPath : finalPath.startsWith('file://') ? finalPath : `file://${finalPath}`,
        name: filename,
        source: 'mongo',
        thumbnail: video.thumbnail,
      };
  
      console.log("Adding track to library:", track);
      onTrackAdd(track);
  
      Alert.alert(
        'Success', 
        permissionGranted ? 
          `Track "${filename}" added to your library and saved to your device` : 
          `Track "${filename}" added to your library`
      );
    } catch (err: any) {
      console.error('Download Error:', err);
      Alert.alert(
        'Error',
        err.message.includes('already being processed')
          ? 'This track is already being processed. Please wait.'
          : `Failed to add track: ${err.message}`
      );
    } finally {
      setIsDownloading((prev) => ({ ...prev, [video._id]: false }));
    }
  };
  
  const renderVideoItem = ({ item }: { item: YouTubeVideo }) => (
    <TouchableOpacity
      style={[styles.videoItem, isDownloading[item.id] && styles.disabledItem]}
      onPress={() => initiateDownload(item)}
      disabled={isDownloading[item.id]}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.videoChannel}>{item.channel}</Text>
      </View>
      {isDownloading[item.id] && <ActivityIndicator size="small" color="#6200ee" style={styles.loader} />}
    </TouchableOpacity>
  );

  const renderFastTrack = ({ item }: { item: MusicFile }) => (
    <TouchableOpacity
      style={[styles.videoItem, isDownloading[item._id] && styles.disabledItem]}
      onPress={() => initiateFastDownload(item)}
      disabled={isDownloading[item._id]}
    >
      {item.thumbnail && <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />}
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.videoChannel}>{item.artist || item.author || 'Unknown Artist'}</Text>
      </View>
      {isDownloading[item._id] && <ActivityIndicator size="small" color="#6200ee" style={styles.loader} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter song name (e.g., Bohemian Rhapsody)"
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
          {isSearching && <ActivityIndicator size="small" color="#fff" style={styles.loader} />}
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={fastTracks}
        renderItem={renderFastTrack}
        keyExtractor={item => item._id}
        style={styles.videoList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isSearching ? 'Searching...' : fastTracks.length === 0 && query ? 'No fast tracks found' : ''}
          </Text>
        }
      />
      
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={item => item.id}
        style={styles.videoList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isSearching ? 'Searching...' : videos.length === 0 && query ? 'No videos found' : 'Search for a song'}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 17,
    paddingBottom: 0,
    marginBottom: 0,
    borderColor: "#CCCCCC",
    borderWidth: 1
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  searchIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  videoList: {
    width: '100%',
    maxHeight: "85%",
  },
  videoItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  videoInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  videoChannel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  loader: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default YouTubeSearch;