import { ScrollView, StyleSheet, Text } from "react-native";
import MusicFileList from "../components/MusicFileList";
import CelestialTitle from "../components/Title";
import { View } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
// const handleFileSelect = async (uri: string, name: string): Promise<void> => {
//     try {
//       // Stop previous playback
//       await stopSound();
      
//       // Update selected file
//       setSelectedFile(uri);
//       setSelectedFileName(name);
//       lastSelectedFile.current = uri;
//       lastSelectedFileName.current = name;
      
//       // Load new sound
//       await loadSound(uri);
//     } catch (error) {
//       console.log('Error selecting file:', error);
//       Alert.alert('Error', 'Failed to select audio file');
//     }
//   };
export default function HomeScreen() {
    const theme = useSelector((state:RootState)=>state.musicPlayer.theme)
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
            disabledButtonColor: "#cccccc",
          };
        } else {
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
            disabledButtonColor: "#333333",
          };
        }
      };
    
      const colors = getThemeColors();
      const styles = StyleSheet.create({
        safeArea: {
            flex: 1,
            padding:0,
            margin:0,
            backgroundColor: colors.backgroundColor,
          },
        container: {
            flex: 1,
            backgroundColor: colors.backgroundColor,
            // padding: 10,
            // paddingTop: 20,
            // height:70,
            // overflow:"scroll",
            paddingBottom:70,
            marginBottom:70,
        }
    });
    return (
        <View style={styles.safeArea}>
        <ScrollView style={styles.container}>
            <CelestialTitle title="Celestial" atHome={true}/>
            {/* <Text style={
                {color:"black", 
                padding:10,
                textAlign:"center", 
                paddingTop:110, 
                paddingBottom:90, 
                width:"100%", 
                fontWeight:200, 
                fontSize:50
            }}>
                Celestial
            </Text> */}
            <MusicFileList />
        </ScrollView>
        </View>
    );
}

