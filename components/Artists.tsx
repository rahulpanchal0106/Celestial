import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { setArtistPlaylist, setPlaylist, Track } from '../store/musicPlayerSlice';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentTrack } from '../store/musicPlayerSlice';
import { Ionicons } from '@expo/vector-icons';
import { initiateFastDownload } from './InitiateFastDownload';
import { MusicFile } from './GlobalList';
import { RootState } from '../store/store';
import { AudioFile } from './YoutubeSearch';

// Types
type ArtistGroup = {
  author: string;
  tracks: Track[];
};

type ExpandedArtistsState = Record<string, boolean>;

type ArtistsPageProps = {
  tracks?: Track[];
};

const ArtistsPage: React.FC<ArtistsPageProps> = () => {
  // State for search and expanded artists
  const [search, setSearch] = useState<string>('');
  const convAPI = useSelector((state: RootState) => state.musicPlayer.converterAPI);
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [favoriteFiles, setFavoriteFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});
  const [expandedArtists, setExpandedArtists] = useState<ExpandedArtistsState>({});
  const tracks = useSelector((state: RootState) => state.musicPlayer.playlist);
  const theme = useSelector((state: RootState) => state.musicPlayer.theme);
  const dispatch = useDispatch();

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
        disabledButtonColor: "#cccccc"
      };
    } else {
      // Assuming 'light' theme for any non-dark theme
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
      };
    }
  };

  const colors = getThemeColors();

  // Group tracks by artist and sort by track count
  const artistData: ArtistGroup[] = useMemo(() => {
    // Create a map of artist to their tracks
    const artistMap: Record<string, Track[]> = tracks.reduce((acc: Record<string, Track[]>, track: Track) => {
      const author = track.artist || 'Unknown Artist';
      if (!acc[author]) {
        acc[author] = [];
      }
      acc[author].push(track);
      return acc;
    }, {});

    // Convert to array and sort by track count
    return Object.entries(artistMap)
      .map(([author, tracks]) => ({
        author,
        tracks,
      }))
      .sort((a, b) => b.tracks.length - a.tracks.length);
  }, [tracks]);

  const onTrackAdd = (track: AudioFile) => {
    const newTrack: MusicFile = {
      id: `downloaded_${Date.now()}`,
      title: track.name,
      artist: 'Downloaded Track',
      uri: track.filepath || '',
      duration: 0,
      isFavorite: true,
      filepath: track.filepath,
    };
    const updatedFiles = [newTrack, ...musicFiles];
    setMusicFiles(updatedFiles);
    dispatch(setPlaylist(updatedFiles));
  };

  const toggleFavorite = async (file: MusicFile | Track) => {
    // Map MusicFile to the format expected by initiateFastDownload
    console.log("--------- ", file);
    const downloadFile = {
      _id: file.id,
      id: file.id,
      title: file.title,
      artist: file.artist,
      author: (file as any).author,
      filepath: (file as any).filepath || '',
      thumbnail: undefined, // Add thumbnail if available in your API data
    };

    console.log("🎵🎵🎵 starting download");
    await initiateFastDownload(downloadFile, setIsDownloading, onTrackAdd, convAPI);
    console.log("🎵🎵🎵 FINisHED download");
  };

  // Filter artists based on search (by artist name or track title)
  const filteredArtists: ArtistGroup[] = useMemo(() => {
    if (!search) return artistData;
    const lowerSearch = search.toLowerCase();
    return artistData
      .map((artist) => ({
        ...artist,
        tracks: artist.tracks.filter(
          (track: Track) =>
            track.title.toLowerCase().includes(lowerSearch) ||
            (artist.author && artist.author.toLowerCase().includes(lowerSearch))
        ),
      }))
      .filter(
        (artist) =>
          artist.tracks.length > 0 ||
          (artist.author && artist.author.toLowerCase().includes(lowerSearch))
      );
  }, [artistData, search]);

  // Toggle artist section expansion
  const toggleArtist = (author: string) => {
    setExpandedArtists((prev) => ({
      ...prev,
      [author]: !prev[author],
    }));
  };

  // Format track length (seconds to MM:SS)
  const formatLength = (seconds?: number) => {
    const minutes = Math.floor((seconds || 0) / 60);
    const secs = (seconds || 0) % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Track card component
  const TrackCard: React.FC<{ track: Track; i: number }> = ({ track, i }) => {
    const dispatch = useDispatch();

    return (
      <TouchableOpacity
        key={i}
        style={[styles.trackCard, { borderBottomColor: colors.underlineColor }]}
        onPress={() => {
          dispatch(setCurrentTrack(track));
          dispatch(setArtistPlaylist(tracks.filter((tr: Track) => tr.artist === track.artist)));
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.trackTitle, { color: colors.titleColor }]}>{track.title}</Text>
        <Text style={[styles.trackLength, { color: colors.timeTextColor }]}>
          {formatLength(track.duration)}
        </Text>
        <View style={styles.fileActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.buttonColor }]}
            onPress={() => toggleFavorite(track)}
            disabled={isDownloading[track.id]}
          >
            {isDownloading[track.id] ? (
              <ActivityIndicator size="small" color={colors.buttonColor} />
            ) : (
              <Text style={[styles.actionButtonText, { color: colors.buttonTextColor }]}>
                <Ionicons name="add-circle-outline" size={23} color={colors.buttonTextColor} />
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Artist item component
  const ArtistItem: React.FC<{ artist: ArtistGroup }> = ({ artist }) => {
    const isExpanded = !!expandedArtists[artist.author];
    return (
      <View style={[styles.artistContainer]}>
        <TouchableOpacity
          style={[styles.artistHeader, { backgroundColor: colors.backgroundColor }]}
          onPress={() => toggleArtist(artist.author)}
        >
          <Text style={[styles.artistName, { color: colors.titleColor }]}>
            {artist.author} ({artist.tracks.length} track{artist.tracks.length !== 1 ? 's' : ''})
          </Text>
          <Text style={[styles.arrow, { color: colors.timeTextColor }]}>
            {isExpanded ? (
              <Ionicons name="chevron-up-outline" size={16} color={colors.timeTextColor} />
            ) : (
              <Ionicons name="chevron-down-outline" size={16} color={colors.timeTextColor} />
            )}
          </Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.trackList}>
            {artist.tracks.map((track, i) => (
              <TrackCard track={track} i={i} key={i} />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container]}>
      <TextInput
        placeholder="Search artists or tracks..."
        value={search}
        onChangeText={setSearch}
        style={[styles.searchInput, { 
          borderColor: colors.underlineColor,
          backgroundColor: colors.backgroundColor,
          color: colors.textColor,
        }]}
        placeholderTextColor={colors.timeTextColor}
      />
      <ScrollView>
        {filteredArtists.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.timeTextColor }]}>
            No artists found
          </Text>
        ) : (
          filteredArtists.map((artist, i) => (
            <View key={i}>
              <ArtistItem artist={artist} />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 5,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 10,
  },
  actionButtonText: {
    fontSize: 18,
  },
  searchInput: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  artistContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  artistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  artistName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  arrow: {
    fontSize: 16,
  },
  trackList: {
    paddingHorizontal: 10,
  },
  trackCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
  },
  trackTitle: {
    fontSize: 16,
    flex: 1,
  },
  trackLength: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
});

export default ArtistsPage;