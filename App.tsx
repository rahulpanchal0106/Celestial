import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Provider } from 'react-redux';
import { store } from './store/store';
import MusicPlayer from './components/MusicPlayer';
import HomeScreen from './screens/HomeScreen';
import Search from './screens/Search';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <Provider store={store}>
      <View style={styles.container}>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ color, size }) => {
                let iconName = route.name === 'Home' ? 'home' : 'search';
                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarStyle: {
                height: 60,
                
              },
            })}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Search" component={Search} />
            {/* <Tab.Screen name="Profile1" component={ProfileScreen} />
            <Tab.Screen name="Profile2" component={ProfileScreen} /> */}
          </Tab.Navigator>
        </NavigationContainer>

        {/* MusicPlayer shown above the tab bar always */}
        <View style={styles.musicPlayerContainer}>
          <MusicPlayer />
        </View>
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    color: 'black'
  },
  musicPlayerContainer: {
    position: 'absolute',
    bottom:60, // height of the tab bar
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
