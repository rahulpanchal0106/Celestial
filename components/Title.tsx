"use client"

import { useEffect, useRef, useState } from "react"
import { Text, View, StyleSheet, Animated } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg"

// Particle component for individual sparkles
const Particle = ({ size, left, top, delay }: { size: number; left: number; top: number; delay: number }) => {
  const sparkleAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 2000,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start()
  }, [delay])

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        // backgroundColor: "#FFD700",
        backgroundColor: "#000000",
        borderRadius: size / 2,
        left,
        top,
        opacity: sparkleAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 1, 0],
        }),
        transform: [
          {
            scale: sparkleAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.5, 1.2, 0.5],
            }),
          },
        ],
      }}
    />
  )
}

// Generate particles with random positions and properties
const generateParticles = (count: number, textWidth: number, textHeight: number) => {
  const particles = []
  const padding = 70 // Distance from text edges
  for (let i = 0; i < count; i++) {
    const size = Math.random() * 2+ 1 // Particle size between 2 and 6
    const left = Math.random() * (textWidth + padding * 2) - padding
    const top = Math.random() * (textHeight + padding * 2) - padding
    const delay = Math.random() * 9000 // Random delay for staggered animation
    particles.push({ size, left, top, delay })
  }
  return particles
}

export default function CelestialTitle({ title, atHome=false }: { title: string, atHome?:boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current
  const gradScaleAnim = useRef(new Animated.Value(0.01)).current // Animation for gradient scale
  const pulseAnim = useRef(new Animated.Value(0)).current
  const [textDimensions, setTextDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
      // Animated.timing(gradScaleAnim, {
      //   toValue: 1,
      //   duration: 6000, // Slow grow for the gradient
      //   useNativeDriver: false, // SVG transform is not supported by native driver
      // }),
    ]).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: false,
        }),
      ]),
    ).start()
  }, [])

  const particles = generateParticles(35, textDimensions.width, textDimensions.height)

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.gradient, { opacity:fadeAnim,transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient colors={["rgba(98, 98, 98, 0)", "rgba(255, 0, 0, 0)"]} style={{ flex: 1, width: "100%", height: "100%" }} />
      </Animated.View>
      <Animated.View
        style={[
          styles.titleContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
       {!atHome && <Text
          style={styles.scondaryTitleText}
          // onLayout={(event) => {
          //   const { width, height } = event.nativeEvent.layout
          //   setTextDimensions({ width, height })
          // }}
        >
          Celestial
        </Text>}
        <Text
          style={[styles.titleText,{fontSize: atHome?40:30}]}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout
            setTextDimensions({ width, height })
          }}
        >
          {title}
        </Text>
        <View style={styles.underline} />
      </Animated.View>
      <View style={{
        position:"absolute",
        top:50,
        left:-100
      }}>

        {particles.map((particle, index) => (
          <Particle
            key={index}
            size={particle.size}
            left={particle.left + (textDimensions.width - particle.size) / 2}
            top={particle.top + (textDimensions.height - particle.size) / 2}
            delay={particle.delay}
          />
        ))}
      </View>
      <Animated.View
        style={{
          position: "absolute",
          width: "100%",
          height: "600%",
          top: -250,
          left: 0,
          opacity: pulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.7, 1],
          }),
        }}
      >
        <Svg height="200%" width="100%">
          <Defs>
            <RadialGradient
              id="grad"
              cx="50%"
              cy="15%"
              rx="70%"
              ry="60%"
              fx="50%"
              fy="15%"
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#4e3794" stopOpacity="1" />
              <Stop offset="0.3" stopColor="#4e3794" stopOpacity="0.6" />
              <Stop offset="1" stopColor="#4e3794" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
        </Svg>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingTop: 110,
    paddingBottom: 90,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "400%",
  },
  titleContainer: {
    alignItems: "center",
    position: "relative",
  },
  titleText: {
    color: "#1a1a2e",
    fontSize: 30,
    fontWeight: "100",
    letterSpacing: 14,
    textAlign: "center",
    textTransform: "uppercase",
    fontFamily: "System",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  scondaryTitleText: {
    color: "#1a1a2e",
    fontSize: 10,
    fontWeight: "100",
    letterSpacing: 14,
    textAlign: "center",
    textTransform: "uppercase",
    fontFamily: "System",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  underline: {
    width: 40,
    height: 0.3,
    backgroundColor: "#1a1a2e",
    marginTop: 15,
    opacity: 0.5,
  },
})