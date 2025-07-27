import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../store/store';
import { setQueue, updateTrackStatus, removeTrackFromQueue, QueuedTrack } from '../store/downloadQueueSlice';
import { initiateFastDownload } from '../components/InitiateFastDownload';

const DOWNLOAD_QUEUE_KEY = 'download-queue';
const POLLING_INTERVAL = 5000; // Poll every 5 seconds

export const useDownloadQueueManager = () => {
  const dispatch = useDispatch();
  const downloadQueue = useSelector((state: RootState) => state.downloadQueue.queue);
  const convAPI = useSelector((state: RootState) => state.musicPlayer.converterAPI);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load queue from AsyncStorage on app startup
  useEffect(() => {
    const loadQueue = async () => {
      try {
        const storedQueue = await AsyncStorage.getItem(DOWNLOAD_QUEUE_KEY);
        if (storedQueue) {
          dispatch(setQueue(JSON.parse(storedQueue)));
        }
      } catch (error) {
        console.error('Failed to load download queue from AsyncStorage:', error);
      }
    };
    loadQueue();
  }, [dispatch]);

  // Persist queue to AsyncStorage whenever it changes
  useEffect(() => {
    const saveQueue = async () => {
      try {
        await AsyncStorage.setItem(DOWNLOAD_QUEUE_KEY, JSON.stringify(downloadQueue));
      } catch (error) {
        console.error('Failed to save download queue to AsyncStorage:', error);
      }
    };
    saveQueue();
  }, [downloadQueue]);

  // Polling logic
  useEffect(() => {
    const pollQueue = async () => {
      for (const track of downloadQueue) {
        if (track.status === 'queued') {
          dispatch(updateTrackStatus({ id: track.id, status: 'downloading' }));
          try {
            // Check if the file exists on the server
            const fileUrl = `${convAPI}/files/${track.youtubeVideoId}.mp3`;
            const response = await fetch(fileUrl, { method: 'HEAD' });

            if (response.status === 200) {
              // File found on server, initiate download to device
              await initiateFastDownload(track, convAPI);
              dispatch(updateTrackStatus({ id: track.id, status: 'downloaded' }));
              dispatch(removeTrackFromQueue(track.id)); // Remove from queue after successful download
            } else {
              // File not yet on server, keep status as 'downloading' or revert to 'queued'
              // For now, we'll keep it as 'downloading' and retry on next poll
              dispatch(updateTrackStatus({ id: track.id, status: 'queued' })); // Revert to queued to retry
            }
          } catch (error) {
            console.error(`Error processing download for ${track.title}:`, error);
            dispatch(updateTrackStatus({ id: track.id, status: 'failed' }));
            // Optionally, remove failed tracks or add retry logic
          }
        }
      }
    };

    pollingIntervalRef.current = setInterval(pollQueue, POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [downloadQueue, convAPI, dispatch]);
};
