import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import YouTubeSearch from "../components/YoutubeSearch";
import GlobalMusicFileList from "../components/GlobalList";

export default function Global(){
    return (<View style={styles.container}>

        <Text style={styles.sectionTitle}>Global Library</Text>
          <GlobalMusicFileList/>
    </View>)
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 10,
        paddingTop: 40,
        // height:70,
        // overflow:"scroll",
        paddingBottom:130
    },
    sectionTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#444444',
        padding: 12,
      }
})