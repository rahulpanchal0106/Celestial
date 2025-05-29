import { memo, useEffect, useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fallback placeholder
const FALLBACK_AVATAR = "https://via.placeholder.com/50";

interface ChannelData {
  avatarUrl: string;
}

// In-memory cache
const avatarCache = new Map<string, ChannelData>();

// Function to fix/validate avatar URLs
function fixAvatarUrl(url: string): string {
  if (!url || !url.startsWith('http') || !/\.(jpg|png|webp)$/.test(url)) {
    return FALLBACK_AVATAR;
  }
  return url.startsWith('//') ? `https:${url}` : url;
}

// Utility for delay
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Static mapping for known problematic handles
const knownAvatars: Record<string, string> = {
  'TheWeeknd': 'https://yt3.ggpht.com/ytc/AIdro_mN4rW51lW7b5b3hL6nUI1Z3TBu6N47W_7SZA=s176-c-k-c0x00ffffff-no-rj',
  'EddieVedder': 'https://yt3.ggpht.com/ytc/AIdro_mzZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5ZA=s176-c-k-c0x00ffffff-no-rj',
  'TSeries': 'https://yt3.ggpht.com/ytc/AIdro_nfZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5ZA=s176-c-k-c0x00ffffff-no-rj',
  'MichaelBublé': 'https://yt3.ggpht.com/ytc/AIdro_lZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5ZA=s176-c-k-c0x00ffffff-no-rj',
  'TameImpala': 'https://yt3.ggpht.com/ytc/AIdro_kZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5ZA=s176-c-k-c0x00ffffff-no-rj',
  'AURORA': 'https://yt3.ggpht.com/ytc/AIdro_jZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5ZA=s176-c-k-c0x00ffffff-no-rj',
  'ImagineDragons': 'https://yt3.ggpht.com/ytc/AIdro_iZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5ZA=s176-c-k-c0x00ffffff-no-rj',
  'VALORANT': 'https://yt3.ggpht.com/ytc/AIdro_hZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5ZA=s176-c-k-c0x00ffffff-no-rj',
};

async function getChannelAvatarFromHandle(handle: string, retryCount = 2): Promise<ChannelData | null> {
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle.replace(/[^a-zA-Z0-9]/g, '');
  const cacheKey = `channelAvatar:${cleanHandle}`;

  // Check static mapping
  if (knownAvatars[cleanHandle]) {
    console.log(`Static avatar hit for @${cleanHandle}`);
    const avatarUrl = fixAvatarUrl(knownAvatars[cleanHandle]);
    const channelData: ChannelData = { avatarUrl };
    avatarCache.set(cleanHandle, channelData);
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(channelData));
    } catch (error) {
      console.log('Cache write error:', error);
    }
    return channelData;
  }

  // Check in-memory cache
  if (avatarCache.has(cleanHandle)) {
    console.log(`Memory cache hit for @${cleanHandle}`);
    return avatarCache.get(cleanHandle)!;
  }

  // Check AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const cachedData = JSON.parse(cached);
      const fixedUrl = fixAvatarUrl(cachedData.avatarUrl);
      if (fixedUrl !== FALLBACK_AVATAR || cachedData.avatarUrl === FALLBACK_AVATAR) {
        console.log(`AsyncStorage cache hit for @${cleanHandle}: ${fixedUrl}`);
        avatarCache.set(cleanHandle, { avatarUrl: fixedUrl });
        return { avatarUrl: fixedUrl };
      }
      console.log(`Cached URL is invalid for @${cleanHandle}, fetching fresh data`);
      await AsyncStorage.removeItem(cacheKey);
    }
  } catch (error) {
    console.log('Cache read error:', error);
  }

  // Skip invalid handles
  const invalidHandles = ['Myself', 'not active', 'HunterSeth', 'Luigi', 'DAVIS', 'W', 'B0BtheR0SS', 'Pansy', 'TGTlife', 'TGE93', 'ncts', 'Railgun'];
  if (!cleanHandle || cleanHandle.trim() === '' || cleanHandle.length > 50 || invalidHandles.includes(cleanHandle) || cleanHandle.endsWith('Topic')) {
    console.log(`Skipping invalid handle: @${cleanHandle}`);
    return { avatarUrl: FALLBACK_AVATAR };
  }

  // Fetch and parse YouTube channel page
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const controller = new AbortController();
      // const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      let url = `https://www.youtube.com/@${cleanHandle}`;
      let response = await fetch(url, {
        // signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      // clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`Fetch failed for @${cleanHandle}: ${response.status}`);
        if (response.status === 429 && attempt < retryCount) {
          console.log(`Retrying @${cleanHandle} (attempt ${attempt + 1}) after 429 error`);
          await delay(2000 * attempt);
          continue;
        }
        // Fallback to search
        url = `https://www.youtube.com/results?search_query=@${encodeURIComponent(cleanHandle)}`;
        const searchController = new AbortController();
        const searchTimeoutId = setTimeout(() => searchController.abort(), 10000);
        response = await fetch(url, { signal: searchController.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
        clearTimeout(searchTimeoutId);
        if (!response.ok) {
          console.log(`Search fetch failed for @${cleanHandle}: ${response.status}`);
          return { avatarUrl: FALLBACK_AVATAR };
        }
      }

      const html = await response.text();
      // Broad regex to match YouTube thumbnail URLs
      const match = html.match(/<img[^>]+src="(https:\/\/yt3\.ggpht\.com\/[^"]+\.(jpg|png|webp)(?:[?][^"]*)?)"/i);
      if (match && match[1]) {
        const avatarUrl = fixAvatarUrl(match[1]);
        const channelData: ChannelData = { avatarUrl };

        // Cache in memory and AsyncStorage
        avatarCache.set(cleanHandle, channelData);
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(channelData));
          console.log(`Cached fresh avatar for @${cleanHandle}: ${avatarUrl}`);
        } catch (error) {
          console.log('Cache write error:', error);
        }

        return channelData;
      }

      console.log(`No avatar found for @${cleanHandle}`);
      return { avatarUrl: FALLBACK_AVATAR };
    } catch (error: any) {
      // clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log(`Fetch timeout for @${cleanHandle}`);
        return { avatarUrl: FALLBACK_AVATAR };
      }
      console.error(`Fetch error for @${cleanHandle}:`, error);
      if (attempt < retryCount) {
        console.log(`Retrying @${cleanHandle} (attempt ${attempt + 1})`);
        await delay(2000 * attempt);
        continue;
      }
      return { avatarUrl: FALLBACK_AVATAR };
    }
  }

  return { avatarUrl: FALLBACK_AVATAR };
}

async function getChannelAvatarsFromHandles(handles: string[]): Promise<Record<string, ChannelData>> {
  const cleanHandles = handles.map(h => h.startsWith('@') ? h.slice(1).replace(/[^a-zA-Z0-9]/g, '') : h);
  const result: Record<string, ChannelData> = {};

  // Initialize results with fallbacks
  cleanHandles.forEach(handle => {
    result[handle] = { avatarUrl: FALLBACK_AVATAR };
  });

  // Check in-memory cache
  const uncachedHandles = cleanHandles.filter(handle => !avatarCache.has(handle));
  for (const handle of cleanHandles) {
    if (avatarCache.has(handle)) {
      result[handle] = avatarCache.get(handle)!;
    }
  }

  if (uncachedHandles.length === 0) {
    return result;
  }

  // Check AsyncStorage cache
  const cacheKeys = uncachedHandles.map(h => `channelAvatar:${h}`);
  try {
    const cachedItems = await AsyncStorage.multiGet(cacheKeys);
    for (const [key, value] of cachedItems) {
      if (value) {
        const handle = key.replace('channelAvatar:', '');
        const cachedData = JSON.parse(value);
        const fixedUrl = fixAvatarUrl(cachedData.avatarUrl);
        if (fixedUrl !== FALLBACK_AVATAR || cachedData.avatarUrl === FALLBACK_AVATAR) {
          avatarCache.set(handle, { avatarUrl: fixedUrl });
          result[handle] = { avatarUrl: fixedUrl };
        } else {
          await AsyncStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.log('Batch cache read error:', error);
  }

  // Fetch remaining uncached handles with delay
  for (const handle of uncachedHandles) {
    await delay(1000); // 1s delay to avoid rate-limiting
    const channelData = await getChannelAvatarFromHandle(handle);
    if (channelData) {
      result[handle] = channelData;
    }
  }

  return result;
}

async function clearBadCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const channelKeys = keys.filter(key => key.startsWith('channelAvatar:'));
    
    for (const key of channelKeys) {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cachedData = JSON.parse(cached);
          if (!/\.(jpg|png|webp)$/.test(cachedData.avatarUrl)) {
            await AsyncStorage.removeItem(key);
            console.log(`Removed bad cache entry: ${key}`);
          }
        }
      } catch (error) {
        console.log(`Error checking cache entry ${key}:`, error);
      }
    }
    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Error during cache cleanup:', error);
  }
}

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  image: {
    width: 50,
    height: 50,
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export { getChannelAvatarsFromHandles, clearBadCache };

export default memo(function ChannelAvatar({ handle, preloadedAvatar }: { handle: string, preloadedAvatar?: ChannelData }) {
  const [channelData, setChannelData] = useState<ChannelData | null>(preloadedAvatar || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preloadedAvatar) {
      setChannelData(preloadedAvatar);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const data = await getChannelAvatarFromHandle(handle);
        if (mounted) {
          if (data) {
            setChannelData(data);
            setError(null);
          } else {
            setError('No channel data found');
          }
        }
      } catch (error: any) {
        if (mounted) {
          console.error('Error in useEffect:', error);
          setError(error.message || 'Failed to load channel avatar');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [handle, preloadedAvatar]);

  return (
    <View style={styles.container}>
      {channelData ? (
        <Image
          source={{ uri: channelData.avatarUrl }}
          style={styles.image}
          onError={async (e) => {
            console.log('Image load error:', e.nativeEvent.error);
            const cleanHandle = handle.startsWith('@') ? handle.slice(1).replace(/[^a-zA-Z0-9]/g, '') : handle;
            await AsyncStorage.removeItem(`channelAvatar:${cleanHandle}`);
            avatarCache.delete(cleanHandle);
            setChannelData({ avatarUrl: FALLBACK_AVATAR });
          }}
          onLoad={() => console.log(`Image loaded successfully: ${channelData.avatarUrl}`)}
        />
      ) : (
        <Text style={styles.errorText}>{error || 'Loading...'}</Text>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.handle === nextProps.handle &&
         prevProps.preloadedAvatar?.avatarUrl === nextProps.preloadedAvatar?.avatarUrl;
});