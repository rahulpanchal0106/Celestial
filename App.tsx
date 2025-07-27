import React from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { RootState, store } from './store/store';
import MusicPlayer from './components/MusicPlayer';
import HomeScreen from './screens/HomeScreen';
import Search from './screens/Search';
import { setConverterAPI } from './store/musicPlayerSlice';
import Global from './screens/Global';
// import { View } from 'react-native';
import ArtistScreen from './screens/ArtistsScreen';
import SettingsList from './components/SettingsList';
import ArtGenerator from './components/ArtGenerator';
import { useDownloadQueueManager } from './hooks/useDownloadQueueManager';

const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation }: any) {
  const dispatch = useDispatch();

  const handleRefresh = async () => {
    try {
      const result = await fetch('https://broke-beats.vercel.app/api/music', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = await result.json();
      console.log('CONVAPI: ', data);
      if (data.convAPI) {
        dispatch(setConverterAPI(data.convAPI));
        Alert.alert('Success', 'ConvAPI refreshed successfully!');
      } else {
        throw new Error('CONVAPI NOT FOUND: ' + JSON.stringify(data));
      }
    } catch (e) {
      console.error('Error fetching the Convapi: ', e);
      Alert.alert('Error', 'Failed to fetch the ConvAPI');
    }
  };

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const iconName = route.name === 'Home' ? 'home' : route.name === 'Global' ? 'globe' : route.name === 'Artists' ? 'people' : route.name === 'Settings' ? 'settings' : 'search';

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabButton}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
          >
            <Ionicons
              name={iconName}
              size={isFocused?30:24}
              color={isFocused ? '#6200ee' : '#888'}
            />
          </TouchableOpacity>
        );
      })}
      {/* <TouchableOpacity
        style={styles.refreshButton}
        onPress={handleRefresh}
        accessibilityRole="button"
        accessibilityLabel="Refresh ConvAPI"
      >
        <Ionicons name="refresh" size={24} color="#000000" />
      </TouchableOpacity> */}
    </View>
  );
}

// New child component to handle theme logic
function AppContent() {
  const theme = useSelector((state: RootState) => state.musicPlayer.theme);

  const getThemeColors = () => {
    console.log('♾️♾️♾️ Theme: ', theme);
    if (!theme || theme === 'dark') {
      return {
        textColor: '#1a1a2e',
        particleColor: '#000000',
        gradientPrimary: '#4e3794',
        underlineColor: '#1a1a2e',
        backgroundColor: '#f5f5f5',
        titleColor: '#333333',
        timeTextColor: '#666666',
        sliderThumbColor: '#6200ee',
        sliderTrackColor: '#d3d3d3',
        sliderProgressColor: '#6200ee',
        buttonColor: '#6200ee',
        buttonTextColor: 'white',
        disabledButtonColor: '#cccccc',
      };
    } else {
      return {
        textColor: '#ffffff',
        particleColor: '#ffffff',
        gradientPrimary: '#ffffff',
        underlineColor: '#e0e0e0',
        backgroundColor: '#121212',
        titleColor: '#e0e0e0',
        timeTextColor: '#b3b3b3',
        sliderThumbColor: '#6200ee',
        sliderTrackColor: '#4f4f4f',
        sliderProgressColor: '#6200ee',
        buttonColor: '#6200ee',
        buttonTextColor: 'white',
        disabledButtonColor: '#333333',
      };
    }
  };
  const currentTrack = useSelector((state:RootState)=>state.musicPlayer.currentTrack);
  const colors = getThemeColors();
  useDownloadQueueManager();

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.backgroundColor }]}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor="transparent" />
      <View style={styles.container}>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                height: 60,
              },
            }}
            tabBar={(props) => <CustomTabBar {...props} />}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Search" component={Search} />
            <Tab.Screen name="Global" component={Global} />
            <Tab.Screen name="Artists" component={ArtistScreen} />
            <Tab.Screen name="Settings" component={SettingsList} />
          </Tab.Navigator>
        </NavigationContainer>
        <View style={styles.musicPlayerContainer}>
        {/* {currentTrack && currentTrack.filepath&& <ArtGenerator trackId={currentTrack.filepath as string} borderRadius={0} setAsBg={true}  />} */}
      {/* {currentTrack && currentTrack.id&& <ArtGenerator trackId={currentTrack.id as string} borderRadius={0} setAsBg={true}  />} */}
          <MusicPlayer />
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 0,
    margin: 0,
  },
  musicPlayerContainer: {
    position: 'absolute',
    bottom: 60, // Height of the tab bar
    left: 0,
    right: 0,
    zIndex: 100,
    padding: 0,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  refreshButton: {
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
  },
});