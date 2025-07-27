"use client"

import { Text, View, StyleSheet, TextInput } from "react-native"
import { useSelector } from "react-redux"
import { RootState } from "../store/store"
import { Ionicons } from '@expo/vector-icons';

export default function StickyHeader({ title }: { title: string }) {
  const theme  = useSelector((state: RootState) => state.musicPlayer.theme)

  const getThemeColors = () => {
    if (!theme || theme === 'dark') {
      return {
        textColor: "#1a1a2e",
        backgroundColor: "#f5f5f5",
        searchBackgroundColor: "#e0e0e0",
        searchPlaceholderColor: "#9e9e9e"
      }
    } else {
      // Dark theme colors
      return {
        textColor: "#ffffff",
        backgroundColor: "#121212",
        searchBackgroundColor: "#333333",
        searchPlaceholderColor: "#bdbdbd"
      }
    }
  }

  const colors = getThemeColors()

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[styles.titleText, { color: colors.textColor }]}>{title}</Text>
      {/* <View style={[styles.searchContainer, { backgroundColor: colors.searchBackgroundColor }]}>
        <Ionicons name="search" size={20} color={colors.searchPlaceholderColor} style={styles.searchIcon} />
        <TextInput
          placeholder="Search..."
          placeholderTextColor={colors.searchPlaceholderColor}
          style={[styles.searchInput, { color: colors.textColor }]}
        />
      </View> */}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    elevation: 1,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { height: 2, width: 0 },
  },
  titleText: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "System",
  },
  searchContainer: {
    flex: 1,
    marginLeft: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
})
