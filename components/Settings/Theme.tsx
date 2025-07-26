import React, { useState, useEffect } from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { useDispatch } from "react-redux";
import { setTheme } from "../../store/musicPlayerSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ThemeToggle = () => {
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

  const [isDark, setIsDark] = useState(true);
  const dispatch = useDispatch();

  // Load theme preference from AsyncStorage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem("theme");
        if (storedTheme === "light" || storedTheme === "dark") {
          setIsDark(storedTheme === "dark");
          dispatch(setTheme(storedTheme));
        }
      } catch (e) {
        // fallback to default
      }
    };
    loadTheme();
  }, [dispatch]);

  const toggleTheme = async () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    const newTheme = newIsDark ? "dark" : "light";
    dispatch(setTheme(newTheme));
    try {
      await AsyncStorage.setItem("theme", newTheme);
    } catch (e) {
      // handle error if needed
    }
  };

  const themeColors = colors[isDark ? "dark" : "light" as keyof typeof colors] || colors.light;
  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      justifyContent: "space-between",
      width: "100%",
      backgroundColor: themeColors.background,
      borderRadius: 12,
      marginVertical: 8,
      elevation: 1,
    },
    label: {
      fontSize: 16,
      color: themeColors.text,
      fontWeight: "500",
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{isDark ? "Change to Dark Theme" : "Change to Light Theme"}</Text>
      <Switch
        value={isDark}
        onValueChange={toggleTheme}
        thumbColor={isDark ? "#222" : "#fff"}
        trackColor={{ false: "#ccc", true: "#444" }}
      />
    </View>
  );
};
