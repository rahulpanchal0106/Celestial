import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ThemeToggle } from '../components/Settings/Theme';
import { RootState } from '../store/store';

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.musicPlayer.theme);

  // Define theme-based colors
  const colors = {
    dark: {
      background: '#ffffff',
      text: '#333333',
      timeText: '#666666',
      controlButton: '#6200ee',
      disabledButton: '#cccccc',
    },
    light: {
      background: '#121212',
      text: '#ffffff',
      timeText: '#bbbbbb',
      controlButton: '#bb86fc',
      disabledButton: '#666666',
    },
  };

  // Select the appropriate theme colors
  const themeColors = colors[theme as keyof typeof colors] || colors.light;

  // Define styles with theme colors
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingTop: 0,
      alignItems: 'center',
      justifyContent: 'center',
      // backgroundColor: themeColors.background,
    },
    sliderContainer: {
      backgroundColor: themeColors.background,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: 0,
    },
    sliderWrapper: {
      flex: 1,
      marginHorizontal: 10,
      backgroundColor: themeColors.background,
      position: 'relative',
    },
    slider: {
      width: '100%',
      height: 40,
    },
    timeText: {
      fontSize: 12,
      color: themeColors.timeText,
      width: 40,
      textAlign: 'center',
    },
    controlsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: 10,
      backgroundColor: themeColors.background,
    },
    controlButton: {
      backgroundColor: themeColors.controlButton,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
      minWidth: 80,
      alignItems: 'center',
    },
    disabledButton: {
      backgroundColor: themeColors.disabledButton,
      opacity: 0.7,
    },
  });

  // Define your settings as an array of objects with a render function
  const settings = [
    {
      id: 'theme',
      render: () => <ThemeToggle />,
    },
    // Add more settings here in the future, e.g.:
    // { id: 'notifications', render: () => <NotificationsToggle /> }
  ];

  return (
    <View style={styles.container}>
      {settings.map((setting) => (
        <View key={setting.id}>{setting.render()}</View>
      ))}
    </View>
  );
}