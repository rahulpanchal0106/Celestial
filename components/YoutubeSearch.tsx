import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

interface YouTubeSearchProps {
  onTrackAdd: (track: AudioFile) => void;
}

const YouTubeSearch: React.FC<YouTubeSearchProps> = ({ onTrackAdd }) => {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

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
        filepath: `https://advise-either-surgeons-fresh.trycloudflare.com${data.url}`,
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
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
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
    maxHeight: 200,
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