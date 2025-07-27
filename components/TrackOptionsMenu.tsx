import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../store/musicPlayerSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { addTrackToQueue } from '../store/downloadQueueSlice';
import { initiateFastDownload } from './InitiateFastDownload'; // Assuming this is the correct path

interface TrackOptionsMenuProps {
  isVisible: boolean;
  onClose: () => void;
  track: Track;
}

const TrackOptionsMenu: React.FC<TrackOptionsMenuProps> = ({ isVisible, onClose, track }) => {
  const theme = useSelector((state: RootState) => state.musicPlayer.theme);
  const convAPI = useSelector((state: RootState) => state.musicPlayer.converterAPI);

  const getThemeColors = () => {
    if (!theme || theme === 'dark') {
      return {
        backgroundColor: '#f5f5f5',
        textColor: '#333333',
        buttonColor: '#6200ee',
        buttonTextColor: 'white',
      };
    } else {
      return {
        backgroundColor: '#121212',
        textColor: '#e0e0e0',
        buttonColor: '#6200ee',
        buttonTextColor: 'white',
      };
    }
  };

  const colors = getThemeColors();

  const handleVisitYoutube = () => {
    if (track.id) {
      console.log("DDDDDDDDDDd ",track)
      const youtubeUrl = `https://www.youtube.com/watch?v=${track.filepath?.split("/")?.pop()?.replace(".mp3", "")}`;
      Linking.openURL(youtubeUrl).catch(err => Alert.alert('Error', 'Could not open YouTube video.'));
    } else {
      Alert.alert('Info', 'No YouTube video found for this track.');
    }
    onClose();
  };

  const handleOpenCreatorChannel = () => {
    // This functionality requires a way to get the creator's YouTube channel ID or URL.
    // As per previous discussion, this data is not available in the current API.
    Alert.alert('Info', "Creator's YouTube channel information is not available for this track.");
    onClose();
  };

  const handleDownloadTrack = async () => {
    if (track.youtubeVideoId) {
      dispatch(addTrackToQueue(track));
      Alert.alert('Queued', `Track "${track.title}" added to download queue.`);
    } else if (track.uri) {
      try {
        await initiateFastDownload(track, convAPI);
        Alert.alert('Success', `Downloaded ${track.title}`);
      } catch (error) {
        console.error('Download failed:', error);
        Alert.alert('Error', `Failed to download ${track.title}`);
      }
    } else {
      Alert.alert('Error', 'No downloadable URI found for this track.');
    }
    onClose();
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: colors.backgroundColor,
      borderRadius: 10,
      padding: 20,
      width: '80%',
      alignItems: 'center',
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      width: '100%',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    lastOptionButton: {
      borderBottomWidth: 0,
    },
    optionText: {
      marginLeft: 10,
      fontSize: 16,
      color: colors.textColor,
    },
    closeButton: {
      marginTop: 20,
      backgroundColor: colors.buttonColor,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 5,
    },
    closeButtonText: {
      color: colors.buttonTextColor,
      fontSize: 16,
    },
  });

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={styles.optionButton} onPress={handleVisitYoutube}>
            <Ionicons name="logo-youtube" size={24} color="red" />
            <Text style={styles.optionText}>Visit Track's YouTube Video</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton} onPress={handleOpenCreatorChannel}>
            <Ionicons name="person" size={24} color={colors.textColor} />
            <Text style={styles.optionText}>Open Creator's YouTube Channel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.optionButton, styles.lastOptionButton]} onPress={handleDownloadTrack}>
            <Ionicons name="download" size={24} color={colors.textColor} />
            <Text style={styles.optionText}>Add to Downloaded List</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default TrackOptionsMenu;