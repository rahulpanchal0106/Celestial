import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

interface MusicFile {
  _id: string;
  id: string;
  title: string;
  artist?: string;
  author?: string;
  filepath: string;
  thumbnail?: string;
}

interface AudioFile {
  uri?: string;
  filepath?: string;
  name: string;
  source: 'local' | 'mongo' | 'youtube';
  thumbnail?: string;
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

export const initiateFastDownload = async (
  video: MusicFile,
  setIsDownloading: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>,
  onTrackAdd: (track: AudioFile) => void,
  AUDIO_BASE_URL: string
) => {
  setIsDownloading((prev) => ({ ...prev, [video._id]: true }));
  console.log("(****************************");
  console.log("____________________STARTING: ", video);

  try {
    if (!video.filepath) {
      throw new Error('Invalid filepath: filepath is missing or undefined');
    }
    if (!AUDIO_BASE_URL) {
      throw new Error('AUDIO_BASE_URL is not set');
    }
    if (!AUDIO_BASE_URL.match(/^https?:\/\//)) {
      throw new Error('AUDIO_BASE_URL is invalid or not a valid URL');
    }

    console.log("🔥🔥🔥🔥 AUDIO_BASE_URL: ", AUDIO_BASE_URL);
    console.log("🔥🔥🔥🔥 Filepath: ", video.filepath);

    // Request permissions
    const permissionGranted = await requestStoragePermission();
    const storageDir = permissionGranted ? FileSystem.documentDirectory : FileSystem.cacheDirectory;
    console.log("🔥🔥🔥🔥 StorageDir: ", storageDir);

    if (!storageDir) {
      throw new Error('Storage directory is not available');
    }

    // Check available storage
    const storageInfo = await FileSystem.getFreeDiskStorageAsync();
    console.log("🔥🔥🔥🔥 Free storage: ", storageInfo);
    if (storageInfo < 50 * 1024 * 1024) {
      throw new Error('Insufficient storage space');
    }

    const downloadURI = `${AUDIO_BASE_URL.replace(/\/$/, '')}/${video.filepath.replace(/^\//, '')}`;
    console.log("🔥🔥🔥🔥 DownloadURI: ", downloadURI);

    const safeTitle = video.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
    const tempFilePath = `${FileSystem.cacheDirectory}${safeTitle}_${video._id}.mp3`;
    console.log("🔥🔥🔥🔥 TempFilePath: ", tempFilePath);

    let finalPath = tempFilePath;
    let filename = video.title ? `${video.title}.mp3` : `track_${video._id}.mp3`;

    // Download file
    console.log("Starting download...");
    const response = await FileSystem.downloadAsync(downloadURI, tempFilePath);
    console.log("Download response: ", response);

    if (response.status !== 200) {
      throw new Error(`Download failed with status: ${response.status}`);
    }

    // Verify file
    const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
    console.log("File info: ", fileInfo);
    if (!fileInfo.exists || (fileInfo.size && fileInfo.size === 0)) {
      throw new Error('Downloaded file not found or is empty');
    }

    // Save thumbnail persistently (if available)
    let thumbnailPath: string | undefined;
    if (video.thumbnail) {
      const thumbnailFileName = `${safeTitle}_${video._id}_thumb.jpg`;
      const thumbnailTempPath = `${FileSystem.cacheDirectory}${thumbnailFileName}`;
      try {
        const thumbnailResponse = await FileSystem.downloadAsync(video.thumbnail, thumbnailTempPath);
        if (thumbnailResponse.status === 200) {
          const thumbnailDocPath = `${FileSystem.documentDirectory}${thumbnailFileName}`;
          await FileSystem.copyAsync({
            from: thumbnailTempPath,
            to: thumbnailDocPath,
          });
          thumbnailPath = thumbnailDocPath;
          await FileSystem.deleteAsync(thumbnailTempPath);
        }
      } catch (thumbnailErr) {
        console.warn('Failed to save thumbnail:', thumbnailErr);
      }
    }

    let track: AudioFile;
    if (permissionGranted) {
      // Save to media library
      console.log("Creating media library asset...");
      const asset = await MediaLibrary.createAssetAsync(tempFilePath);
      console.log("Asset created: ", asset);

      const albums = await MediaLibrary.getAlbumsAsync();
      let album = albums.find((a) => a.title === 'Broke Beats');

      if (!album) {
        console.log("Creating Broke Beats album...");
        album = await MediaLibrary.createAlbumAsync('Broke Beats', asset, false);
        console.log("Album created: ", album);
      } else {
        console.log("Adding asset to Broke Beats album...");
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        console.log("Asset added to album");
      }

      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
      console.log("Asset info: ", assetInfo);
      if (!assetInfo.localUri) {
        throw new Error('Failed to get asset local URI');
      }

      finalPath = assetInfo.localUri;
      filename = assetInfo.filename || filename;

      // Save metadata to AsyncStorage with asset filename for MusicFileList
      const metadata = {
        id: video._id,
        title: video.title,
        artist: video.artist || video.author || 'Unknown Artist',
        filepath: finalPath,
        thumbnail: thumbnailPath,
        source: 'mongo',
        assetFilename: assetInfo.filename, // Store filename for lookup
      };
      const storageKey = `track_${video._id}_${assetInfo.filename || video._id}`;
      console.log("Saving metadata to AsyncStorage with key: ", storageKey);
      await AsyncStorage.setItem(storageKey, JSON.stringify(metadata));

      // Delete temporary file
      console.log("Deleting temporary file: ", tempFilePath);
      await FileSystem.deleteAsync(tempFilePath);

      track = {
        filepath: Platform.OS === 'ios' ? finalPath : finalPath.startsWith('file://') ? finalPath : `file://${finalPath}`,
        name: video.title,
        source: 'mongo',
        thumbnail: thumbnailPath,
      };
    } else {
      // Save to document directory for semi-persistence
      const docFilePath = `${FileSystem.documentDirectory}${safeTitle}_${video._id}.mp3`;
      console.log("Copying to document directory: ", docFilePath);
      await FileSystem.copyAsync({
        from: tempFilePath,
        to: docFilePath,
      });
      finalPath = docFilePath;
      await FileSystem.deleteAsync(tempFilePath);

      // Save metadata to AsyncStorage
      const metadata = {
        id: video._id,
        title: video.title,
        artist: video.artist || video.author || 'Unknown Artist',
        filepath: finalPath,
        thumbnail: thumbnailPath,
        source: 'mongo',
        assetFilename: filename,
      };
      const storageKey = `track_${video._id}_${filename}`;
      console.log("Saving metadata to AsyncStorage with key: ", storageKey);
      await AsyncStorage.setItem(storageKey, JSON.stringify(metadata));

      track = {
        filepath: Platform.OS === 'ios' ? finalPath : finalPath.startsWith('file://') ? finalPath : `file://${finalPath}`,
        name: video.title,
        source: 'mongo',
        thumbnail: thumbnailPath,
      };
    }

    console.log("Track prepared: ", track);
    onTrackAdd(track);
    Alert.alert(
      'Success',
      permissionGranted
        ? `Track "${video.title}" added to Broke Beats album`
        : `Track "${video.title}" added to your library (may not persist after uninstall)`
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
    console.log("🎵🎵🎵 FINisHED download");
  }
};