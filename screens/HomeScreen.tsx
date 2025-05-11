import { StyleSheet, Text, View } from "react-native";
import MusicFileList from "../components/MusicFileList";
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
        <View style={styles.container}>
             <Text style={{color:"black", padding:10, paddingTop:30, width:"100%", fontWeight:700, fontSize:30}}>My Music Player</Text>
            <MusicFileList />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 10,
        paddingTop: 20,
        // height:70,
        // overflow:"scroll",
        paddingBottom:120
    }
});