import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import YouTubeSearch from "../components/YoutubeSearch";

export default function Search(){
    return (<View style={styles.container}>

        <Text style={styles.sectionTitle}>YouTube Search</Text>
        <View style={{}}>
          {/* <Ionicons 
            name={searchExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="#444"
          /> */}
          <YouTubeSearch onTrackAdd={()=>{}} />
        </View>
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
        paddingBottom:110
    },
    sectionTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#444',
        padding: 12,
      }
})