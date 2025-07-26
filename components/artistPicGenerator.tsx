import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Polygon, Path, Defs, RadialGradient, Stop } from 'react-native-svg';

const styles = StyleSheet.create({
  artistAvatar: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInitial: {
    textAlign: 'center',
  },
});

// // Option 1: Geometric Pattern Avatar
// export const GeometricAvatar = ({ artistName, size = 50, colors }) => {
//   const getPatternFromName = (name) => {
//     const hash = name.split('').reduce((a, b) => {
//       a = ((a << 5) - a) + b.charCodeAt(0);
//       return a & a;
//     }, 0);
//     return Math.abs(hash) % 4;
//   };

//   const pattern = getPatternFromName(artistName);
  
//   return (
//     <View style={[styles.artistAvatar, { width: size, height: size }]}>
//       <Svg width={size} height={size} viewBox="0 0 50 50">
//         <Defs>
//           <RadialGradient id="grad" cx="50%" cy="50%" r="50%">
//             <Stop offset="0%" stopColor={colors.accentColor} stopOpacity="1" />
//             <Stop offset="100%" stopColor={colors.accentColor} stopOpacity="0.6" />
//           </RadialGradient>
//         </Defs>
        
//         {pattern === 0 && (
//           <>
//             <Circle cx="25" cy="25" r="20" fill="url(#grad)" />
//             <Polygon points="25,10 35,30 15,30" fill="white" opacity="0.3" />
//           </>
//         )}
//         {pattern === 1 && (
//           <>
//             <Circle cx="25" cy="25" r="20" fill="url(#grad)" />
//             <Circle cx="18" cy="18" r="6" fill="white" opacity="0.4" />
//             <Circle cx="32" cy="32" r="6" fill="white" opacity="0.4" />
//           </>
//         )}
//         {pattern === 2 && (
//           <>
//             <Circle cx="25" cy="25" r="20" fill="url(#grad)" />
//             <Path d="M15 25 L25 15 L35 25 L25 35 Z" fill="white" opacity="0.3" />
//           </>
//         )}
//         {pattern === 3 && (
//           <>
//             <Circle cx="25" cy="25" r="20" fill="url(#grad)" />
//             <Path d="M10 25 Q25 10 40 25 Q25 40 10 25" fill="white" opacity="0.3" />
//           </>
//         )}
//       </Svg>
//     </View>
//   );
// };

// // Option 2: Gradient Blob Avatar
// export const GradientBlobAvatar = ({ artistName, size = 50, colors }) => {
//   const getGradientColors = (name) => {
//     const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
//     const hue1 = hash % 360;
//     const hue2 = (hash + 120) % 360;
//     return [`hsl(${hue1}, 70%, 60%)`, `hsl(${hue2}, 70%, 40%)`];
//   };

//   const gradientColors = getGradientColors(artistName);
  
//   return (
//     <LinearGradient
//       colors={gradientColors}
//       start={{ x: 0, y: 0 }}
//       end={{ x: 1, y: 1 }}
//       style={[
//         styles.artistAvatar,
//         {
//           width: size,
//           height: size,
//           borderRadius: size * 0.3, // Slightly rounded for blob effect
//         }
//       ]}
//     >
//       <View style={{
//         position: 'absolute',
//         top: '20%',
//         left: '20%',
//         width: '60%',
//         height: '60%',
//         backgroundColor: 'white',
//         opacity: 0.2,
//         borderRadius: size * 0.2,
//         transform: [{ rotate: '45deg' }]
//       }} />
//     </LinearGradient>
//   );
// };

// Option 3: Music Wave Avatar
export const MusicWaveAvatar = ({ artistName, size = 50, colors }:{artistName:string, size:number, colors:any}) => {
  const getBars = (name: string) => {
    return name.split('').map((char, i) => {
      const height = (char.charCodeAt(0) % 30) + 10;
      return height;
    }).slice(0, 5);
  };

  const bars = getBars(artistName);
  
  return (
    <View style={[
      styles.artistAvatar,
      {
        backgroundColor: colors.accentColor,
        width: size,
        height: size,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        paddingVertical: 8,
      }
    ]}>
      {bars.map((height, i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: `${height}%`,
            backgroundColor: 'white',
            borderRadius: 2,
            opacity: 0.8,
          }}
        />
      ))}
    </View>
  );
};

// // Option 4: Artistic Initials with Creative Background
// export const ArtisticInitialsAvatar = ({ artistName, size = 50, colors }) => {
//   const getBackgroundPattern = (name) => {
//     const hash = name.length + name.charCodeAt(0);
//     return hash % 3;
//   };

//   const pattern = getBackgroundPattern(artistName);
//   const initial = artistName.charAt(0).toUpperCase();
  
//   return (
//     <View style={[styles.artistAvatar, { width: size, height: size }]}>
//       <Svg width={size} height={size} viewBox="0 0 50 50">
//         <Defs>
//           <RadialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
//             <Stop offset="0%" stopColor={colors.accentColor} stopOpacity="0.8" />
//             <Stop offset="100%" stopColor={colors.accentColor} stopOpacity="1" />
//           </RadialGradient>
//         </Defs>
        
//         <Circle cx="25" cy="25" r="23" fill="url(#bgGrad)" />
        
//         {pattern === 0 && (
//           <Path d="M5 5 L45 5 L25 25 Z" fill="white" opacity="0.1" />
//         )}
//         {pattern === 1 && (
//           <>
//             <Circle cx="15" cy="15" r="8" fill="white" opacity="0.1" />
//             <Circle cx="35" cy="35" r="6" fill="white" opacity="0.1" />
//           </>
//         )}
//         {pattern === 2 && (
//           <Path d="M0 25 Q25 0 50 25 Q25 50 0 25" fill="white" opacity="0.1" />
//         )}
//       </Svg>
      
//       <Text style={[
//         styles.artistInitial,
//         {
//           position: 'absolute',
//           color: 'white',
//           fontSize: size * 0.4,
//           fontWeight: 'bold',
//         }
//       ]}>
//         {initial}
//       </Text>
//     </View>
//   );
// };