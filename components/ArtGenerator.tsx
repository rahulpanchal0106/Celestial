import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polygon, Path, LinearGradient, Stop, Defs, Rect } from 'react-native-svg';
import Filter from 'react-native-svg';
import FeOffset from 'react-native-svg';
import FeGaussianBlur from 'react-native-svg';
import { BlurView } from 'expo-blur';

// Mood-based color palettes
const MOOD_PALETTES = {
  serene: ['#4682B4', '#98FB98', '#ADD8E6', '#1A1A1A'], // Blue, green, light blue, dark gray
  intense: ['#DC143C', '#FF4500', '#FFD700', '#1A1A1A'], // Crimson, orange, gold, dark gray
  melancholic: ['#483D8B', '#778899', '#B0C4DE', '#1A1A1A'], // Slate blue, gray, light steel blue, dark gray
  vibrant: ['#FFD700', '#FF69B4', '#FF4500', '#1A1A1A'], // Gold, hot pink, orange, dark gray
};

// Mood definitions
const MOODS = ['serene', 'intense', 'melancholic', 'vibrant'] as const;
type Mood = typeof MOODS[number];

// Simple seeded random number generator
function seededRandom(seed: string): () => number {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s += seed.charCodeAt(i);
  }
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Simulated noise for organic placement
function noise(seed: string, x: number, y: number): number {
  const rand = seededRandom(seed + x.toString() + y.toString());
  return (rand() - 0.5) * 2; // Range: -1 to 1
}

// Generate mood-based SVG shapes
function generateShapes(seed: string, width: number, height: number, mood: Mood, setAsBg: boolean, numShapes: number = 8): JSX.Element[] {
  const rand = seededRandom(seed);
  const shapes: JSX.Element[] = [];
  const palette = MOOD_PALETTES[mood];

  // Mood-specific settings
  const settings = {
    serene: { shapeTypes: ['circle', 'path'], maxSize: 40, opacity: [0.4, 0.8], cluster: false },
    intense: { shapeTypes: ['polygon', 'path'], maxSize: 60, opacity: [0.6, 1.0], cluster: true },
    melancholic: { shapeTypes: ['circle', 'dot'], maxSize: 30, opacity: [0.3, 0.6], cluster: false },
    vibrant: { shapeTypes: ['circle', 'polygon'], maxSize: 50, opacity: [0.5, 0.9], cluster: true },
  }[mood];

  // Clustering for intense/vibrant moods
  const clusterX = settings.cluster ? rand() * width : width / 2;
  const clusterY = settings.cluster ? rand() * height : height / 2;

  // Background pattern (dots for melancholic, waves for serene) - skip if it's a background
  if (!setAsBg && mood === 'melancholic') {
    const dotSize = 3;
    const gridSpacing = 20;
    for (let x = 0; x < width; x += gridSpacing) {
      for (let y = 0; y < height; y += gridSpacing) {
        if (rand() < 0.2) {
          shapes.push(
            <Circle
              key={`dot-${x}-${y}`}
              cx={x + noise(seed, x, y) * 5}
              cy={y + noise(seed, x, y) * 5}
              r={dotSize}
              fill={palette[Math.floor(rand() * palette.length)]}
              opacity={0.3}
            />
          );
        }
      }
    }
  } else if (!setAsBg && mood === 'serene') {
    for (let i = 0; i < 3; i++) {
      const y = (i + 1) * (height / 4) + noise(seed, i, 0) * 20;
      const d = `M0,${y} Q${width / 4},${y + rand() * 40} ${width / 2},${y} T${width},${y}`;
      shapes.push(
        <Path
          key={`wave-${i}`}
          d={d}
          fill="none"
          stroke={palette[Math.floor(rand() * palette.length)]}
          strokeWidth={2}
          opacity={0.4}
        />
      );
    }
  }

  // Main shapes - reduce count for background
  const shapeCount = setAsBg ? Math.floor(numShapes * 0.5) : numShapes;
  for (let i = 0; i < shapeCount; i++) {
    const type = settings.shapeTypes[Math.floor(rand() * settings.shapeTypes.length)];
    const x = settings.cluster ? clusterX + noise(seed, i, 0) * width * 0.3 : rand() * width;
    const y = settings.cluster ? clusterY + noise(seed, 0, i) * height * 0.3 : rand() * height;
    const size = 20 + rand() * settings.maxSize;
    const rotation = rand() * 360;
    const colorIndex = Math.floor(rand() * palette.length);
    const color = palette[colorIndex];
    const useGradient = rand() < 0.5; // Reduce gradient usage
    const opacity = (setAsBg ? 0.7 : 1) * (settings.opacity[0] + rand() * (settings.opacity[1] - settings.opacity[0]));

    const shapeProps = {
      key: `shape-${i}`,
      transform: `rotate(${rotation} ${x} ${y})`,
    };

    if (type === 'circle') {
      shapes.push(
        <Circle
          {...shapeProps}
          cx={x}
          cy={y}
          r={size / 2}
          fill={useGradient ? `url(#grad${i})` : color}
          opacity={opacity}
        />
      );
    } else if (type === 'polygon') {
      const points = Array.from({ length: 3 + Math.floor(rand() * 3) }, (_, j) => {
        const angle = (j / (3 + rand() * 3)) * 2 * Math.PI;
        const r = size * (0.5 + rand() * 0.5);
        return [
          x + r * Math.cos(angle) + noise(seed, j, i) * 5,
          y + r * Math.sin(angle) + noise(seed, j, i) * 5,
        ];
      }).map(p => p.join(',')).join(' ');
      shapes.push(
        <Polygon
          {...shapeProps}
          points={points}
          fill={useGradient ? `url(#grad${i})` : color}
          opacity={opacity}
        />
      );
    } else if (type === 'path') {
      const d = mood === 'intense'
        ? `M${x},${y} L${x + size * (rand() - 0.5)},${y + size * (rand() - 0.5)} L${x + size * (rand() - 0.5)},${y + size * (rand() - 0.5)} Z`
        : `M${x},${y} Q${x + size * (rand() - 0.5)},${y + size * (rand() - 0.5)} ${x + size * (rand() - 0.5)},${y + size}`;
      shapes.push(
        <Path
          {...shapeProps}
          d={d}
          fill={mood === 'intense' ? (useGradient ? `url(#grad${i})` : color) : 'none'}
          stroke={mood !== 'intense' ? (useGradient ? `url(#grad${i})` : color) : 'none'}
          strokeWidth={2 + rand() * 3}
          opacity={opacity}
        />
      );
    } else if (type === 'dot') {
      shapes.push(
        <Circle
          {...shapeProps}
          cx={x}
          cy={y}
          r={3 + rand() * 5}
          fill={useGradient ? `url(#grad${i})` : color}
          opacity={opacity}
        />
      );
    }

    if (useGradient) {
      shapes.push(
        <Defs key={`def-${i}`}>
          <LinearGradient id={`grad${i}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette[colorIndex]} stopOpacity="1" />
            <Stop offset="0.5" stopColor={palette[(colorIndex + 1) % palette.length]} stopOpacity="1" />
            <Stop offset="1" stopColor={palette[(colorIndex + 2) % palette.length]} stopOpacity="1" />
          </LinearGradient>
        </Defs>
      );
    }

    // Add shadow for intense/vibrant moods - skip for background
    if (!setAsBg && (mood === 'intense' || mood === 'vibrant') && rand() < 0.3) {
      shapes.push(
        <Defs key={`filter-${i}`}>
          <Filter id={`shadow${i}`}>
            <FeOffset dx={2} dy={2} />
            <FeGaussianBlur stdDeviation="2" />
          </Filter>
        </Defs>
      );
      shapes[i] = { ...shapes[i], props: { ...shapes[i].props, filter: `url(#shadow${i})` } };
    }
  }

  return shapes;
}

interface TrackCoverArtProps {
  trackId: string;
  width?: number;
  height?: number;
  borderRadius?:number;
  setAsBg?:boolean;
  style?:any;
}

function TrackCoverArt({ trackId, width = 370, height = 100, borderRadius=50, setAsBg=false, style=null }: TrackCoverArtProps) {
  const rand = seededRandom(trackId);
  const mood = MOODS[Math.floor(rand() * MOODS.length)];
  const palette = MOOD_PALETTES[mood];
  const bgColor1 = palette[Math.floor(rand() * palette.length)];
  const bgColor2 = palette[Math.floor(rand() * palette.length)];
  const bgColor3 = palette[Math.floor(rand() * palette.length)];

  return (
    <View style={[styles.container, { width, height, borderRadius }, 
        setAsBg&&{
            position:"absolute",
            opacity:0.2,
        }
    ]}>
         {setAsBg && (
        <BlurView
          intensity={20} // adjust as needed
          tint="light"
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
      )}
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={bgColor1} stopOpacity="1" />
            <Stop offset="0.5" stopColor={bgColor2} stopOpacity="1" />
            <Stop offset="1" stopColor={bgColor3} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#bgGrad)" />
        {generateShapes(trackId, width, height, mood, setAsBg)}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#1A1A1A', // Fallback for dark theme
  },
});

export default memo(TrackCoverArt, (prevProps, nextProps) => {
  return prevProps.trackId === nextProps.trackId &&
         prevProps.width === nextProps.width &&
         prevProps.height === nextProps.height;
});



//tried to use blur
// import { memo } from 'react';
// import { StyleSheet, View } from 'react-native';
// import Svg, { Circle, Polygon, Path, LinearGradient, Stop, Defs, Rect } from 'react-native-svg';
// import Filter from 'react-native-svg';
// import FeOffset from 'react-native-svg';
// import FeGaussianBlur from 'react-native-svg';
// import FeColorMatrix from 'react-native-svg';
// import { BlurView } from 'expo-blur';

// // Mood-based color palettes
// const MOOD_PALETTES = {
//   serene: ['#4682B4', '#98FB98', '#ADD8E6', '#1A1A1A'], // Blue, green, light blue, dark gray
//   intense: ['#DC143C', '#FF4500', '#FFD700', '#1A1A1A'], // Crimson, orange, gold, dark gray
//   melancholic: ['#483D8B', '#778899', '#B0C4DE', '#1A1A1A'], // Slate blue, gray, light steel blue, dark gray
//   vibrant: ['#FFD700', '#FF69B4', '#FF4500', '#1A1A1A'], // Gold, hot pink, orange, dark gray
// };

// // Mood definitions
// const MOODS = ['serene', 'intense', 'melancholic', 'vibrant'] as const;
// type Mood = typeof MOODS[number];

// // Simple seeded random number generator
// function seededRandom(seed: string): () => number {
//   let s = 0;
//   for (let i = 0; i < seed.length; i++) {
//     s += seed.charCodeAt(i);
//   }
//   return function () {
//     s = (s * 9301 + 49297) % 233280;
//     return s / 233280;
//   };
// }

// // Simulated noise for organic placement
// function noise(seed: string, x: number, y: number): number {
//   const rand = seededRandom(seed + x.toString() + y.toString());
//   return (rand() - 0.5) * 2; // Range: -1 to 1
// }

// // Generate mood-based SVG shapes
// function generateShapes(seed: string, width: number, height: number, mood: Mood, setAsBg: boolean, numShapes: number = 8): JSX.Element[] {
//   const rand = seededRandom(seed);
//   const shapes: JSX.Element[] = [];
//   const palette = MOOD_PALETTES[mood];
//   const scaleFactor = Math.min(width, height) / 100; // Adjust for larger sizes

//   // Mood-specific settings
//   const settings = {
//     serene: { shapeTypes: ['circle', 'path'], maxSize: 40 * scaleFactor, opacity: [0.4, 0.8], cluster: false, blur: 4 },
//     intense: { shapeTypes: ['polygon', 'path'], maxSize: 60 * scaleFactor, opacity: [0.6, 1.0], cluster: true, blur: 2 },
//     melancholic: { shapeTypes: ['circle', 'dot'], maxSize: 30 * scaleFactor, opacity: [0.3, 0.6], cluster: false, blur: 3 },
//     vibrant: { shapeTypes: ['circle', 'polygon'], maxSize: 50 * scaleFactor, opacity: [0.5, 0.9], cluster: true, blur: 2.5 },
//   }[mood];

//   // Clustering for intense/vibrant moods
//   const clusterX = settings.cluster ? rand() * width : width / 2;
//   const clusterY = settings.cluster ? rand() * height : height / 2;

//   // Background pattern (reduced for setAsBg)
//   if (!setAsBg && mood === 'melancholic') {
//     const dotSize = 3 * scaleFactor;
//     const gridSpacing = 20 * scaleFactor;
//     for (let x = 0; x < width; x += gridSpacing) {
//       for (let y = 0; y < height; y += gridSpacing) {
//         if (rand() < 0.15) {
//           shapes.push(
//             <Circle
//               key={`dot-${x}-${y}`}
//               cx={x + noise(seed, x, y) * 5}
//               cy={y + noise(seed, x, y) * 5}
//               r={dotSize}
//               fill={palette[Math.floor(rand() * palette.length)]}
//               opacity={0.3}
//             />
//           );
//         }
//       }
//     }
//   } else if (!setAsBg && mood === 'serene') {
//     for (let i = 0; i < 2; i++) {
//       const y = (i + 1) * (height / 3) + noise(seed, i, 0) * 20;
//       const d = `M0,${y} Q${width / 4},${y + rand() * 40} ${width / 2},${y} T${width},${y}`;
//       shapes.push(
//         <Path
//           key={`wave-${i}`}
//           d={d}
//           fill="none"
//           stroke={palette[Math.floor(rand() * palette.length)]}
//           strokeWidth={2 * scaleFactor}
//           opacity={0.4}
//         />
//       );
//     }
//   }

//   // Main shapes (fewer for setAsBg)
//   const shapeCount = setAsBg ? Math.floor(numShapes * 0.6) : numShapes;
//   for (let i = 0; i < shapeCount; i++) {
//     const type = settings.shapeTypes[Math.floor(rand() * settings.shapeTypes.length)];
//     const x = settings.cluster ? clusterX + noise(seed, i, 0) * width * 0.3 : rand() * width;
//     const y = settings.cluster ? clusterY + noise(seed, 0, i) * height * 0.3 : rand() * height;
//     const size = 20 * scaleFactor + rand() * settings.maxSize;
//     const rotation = rand() * 360;
//     const colorIndex = Math.floor(rand() * palette.length);
//     const color = palette[colorIndex];
//     const useGradient = rand() < 0.7;
//     const opacity = setAsBg ? settings.opacity[0] * 0.7 : settings.opacity[0] + rand() * (settings.opacity[1] - settings.opacity[0]);

//     const shapeProps = {
//       key: `shape-${i}`,
//       transform: `rotate(${rotation} ${x} ${y})`,
//     };

//     if (type === 'circle') {
//       shapes.push(
//         <Circle
//           {...shapeProps}
//           cx={x}
//           cy={y}
//           r={size / 2}
//           fill={useGradient ? `url(#grad${i})` : color}
//           opacity={opacity}
//         />
//       );
//     } else if (type === 'polygon') {
//       const points = Array.from({ length: 3 + Math.floor(rand() * 3) }, (_, j) => {
//         const angle = (j / (3 + rand() * 3)) * 2 * Math.PI;
//         const r = size * (0.5 + rand() * 0.5);
//         return [
//           x + r * Math.cos(angle) + noise(seed, j, i) * 5,
//           y + r * Math.sin(angle) + noise(seed, j, i) * 5,
//         ];
//       }).map(p => p.join(',')).join(' ');
//       shapes.push(
//         <Polygon
//           {...shapeProps}
//           points={points}
//           fill={useGradient ? `url(#grad${i})` : color}
//           opacity={opacity}
//         />
//       );
//     } else if (type === 'path') {
//       const d = mood === 'intense'
//         ? `M${x},${y} L${x + size * (rand() - 0.5)},${y + size * (rand() - 0.5)} L${x + size * (rand() - 0.5)},${y + size * (rand() - 0.5)} Z`
//         : `M${x},${y} Q${x + size * (rand() - 0.5)},${y + size * (rand() - 0.5)} ${x + size * (rand() - 0.5)},${y + size}`;
//       shapes.push(
//         <Path
//           {...shapeProps}
//           d={d}
//           fill={mood === 'intense' ? (useGradient ? `url(#grad${i})` : color) : 'none'}
//           stroke={mood !== 'intense' ? (useGradient ? `url(#grad${i})` : color) : 'none'}
//           strokeWidth={2 * scaleFactor + rand() * 3}
//           opacity={opacity}
//         />
//       );
//     } else if (type === 'dot') {
//       shapes.push(
//         <Circle
//           {...shapeProps}
//           cx={x}
//           cy={y}
//           r={3 * scaleFactor + rand() * 5}
//           fill={useGradient ? `url(#grad${i})` : color}
//           opacity={opacity}
//         />
//       );
//     }

//     if (useGradient) {
//       shapes.push(
//         <Defs key={`def-${i}`}>
//           <LinearGradient id={`grad${i}`} x1="0" y1="0" x2="1" y2="1">
//             <Stop offset="0" stopColor={palette[colorIndex]} stopOpacity="1" />
//             <Stop offset="0.5" stopColor={palette[(colorIndex + 1) % palette.length]} stopOpacity="1" />
//             <Stop offset="1" stopColor={palette[(colorIndex + 2) % palette.length]} stopOpacity="1" />
//           </LinearGradient>
//         </Defs>
//       );
//     }

//     // Add shadow or blur for intense/vibrant moods
//     if ((mood === 'intense' || mood === 'vibrant') && rand() < 0.3) {
//       shapes.push(
//         <Defs key={`filter-${i}`}>
//           <Filter id={`effect${i}`}>
//             {setAsBg ? (
//               <View>
//                 <FeGaussianBlur in="SourceGraphic" stdDeviation={settings.blur} />
//                 <FeColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" />
//               </View>
//             ) : (
//               <View>
//                 <FeOffset dx={2} dy={2} />
//                 <FeGaussianBlur stdDeviation="2" />
//               </View>
//             )}
//           </Filter>
//         </Defs>
//       );
//       shapes[i] = { ...shapes[i], props: { ...shapes[i].props, filter: `url(#effect${i})` } };
//     }
//   }

//   return shapes;
// }

// interface TrackCoverArtProps {
//   trackId: string;
//   width?: number;
//   height?: number;
//   borderRadius?: number;
//   setAsBg?: boolean;
// }

// function TrackCoverArt({ trackId, width = 370, height = 100, borderRadius = 50, setAsBg = false }: TrackCoverArtProps) {
//   const rand = seededRandom(trackId);
//   const mood = MOODS[Math.floor(rand() * MOODS.length)];
//   const palette = MOOD_PALETTES[mood];
//   const bgColor1 = palette[Math.floor(rand() * palette.length)];
//   const bgColor2 = palette[Math.floor(rand() * palette.length)];
//   const bgColor3 = palette[Math.floor(rand() * palette.length)];

//   return (
//     <View style={[
//       styles.container,
//       { width, height, borderRadius },
//       setAsBg && styles.backgroundStyle,
//     ]}>
//       {setAsBg && (
//         <BlurView
//           intensity={10}
//           tint="dark"
//           style={[StyleSheet.absoluteFill, { borderRadius }]}
//         />
//       )}
//       <Svg width={width} height={height}>
//         <Defs>
//           <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
//             <Stop offset="0" stopColor={bgColor1} stopOpacity={setAsBg ? 0.6 : 1} />
//             <Stop offset="0.5" stopColor={bgColor2} stopOpacity={setAsBg ? 0.6 : 1} />
//             <Stop offset="1" stopColor={bgColor3} stopOpacity={setAsBg ? 0.6 : 1} />
//           </LinearGradient>
//         </Defs>
//         <Rect x="0" y="0" width={width} height={height} fill="url(#bgGrad)" />
//         {generateShapes(trackId, width, height, mood, setAsBg)}
//       </Svg>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     overflow: 'hidden',
//     backgroundColor: '#1A1A1A', // Fallback for dark theme
//   },
//   backgroundStyle: {
//     position: 'absolute',
//     opacity: 0.7,
//     zIndex: -1,
//   },
// });

// export default memo(TrackCoverArt, (prevProps, nextProps) => {
//   return prevProps.trackId === nextProps.trackId &&
//          prevProps.width === nextProps.width &&
//          prevProps.height === nextProps.height &&
//          prevProps.borderRadius === nextProps.borderRadius &&
//          prevProps.setAsBg === nextProps.setAsBg;
// });
