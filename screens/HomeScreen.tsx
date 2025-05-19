import { ScrollView, StyleSheet, Text, View } from "react-native";
import MusicFileList from "../components/MusicFileList";
import CelestialTitle from "../components/Title";
import { SafeAreaView } from "react-native-safe-area-context";
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
    return (
        <SafeAreaView style={styles.safeArea}>
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        padding:0,
        margin:0,
        backgroundColor: "#f8f9fa",
      },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        // padding: 10,
        // paddingTop: 20,
        // height:70,
        // overflow:"scroll",
        paddingBottom:70,
        marginBottom:70,
    }
});