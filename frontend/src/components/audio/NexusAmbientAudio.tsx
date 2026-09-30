import React, { useEffect, useRef, useState } from 'react';

interface NexusAmbientAudioProps {
  isThinking: boolean;
  visibleNodesCount: number;
  isMuted?: boolean;
}

export default function NexusAmbientAudio({ isThinking, visibleNodesCount, isMuted = false }: NexusAmbientAudioProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Nodes
  const masterGainRef = useRef<GainNode | null>(null);
  const humGainRef = useRef<GainNode | null>(null);
  const pulseGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);

  const initAudio = () => {
    if (audioCtxRef.current) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.5; // overall max volume
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200; // Will scale with node density
    filter.connect(masterGain);
    filterRef.current = filter;

    // 1. Deep Space Hum
    const humGain = ctx.createGain();
    humGain.gain.value = 0.3;
    humGain.connect(filter);
    humGainRef.current = humGain;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 45;
    osc1.connect(humGain);
    osc1.start();

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 47;
    osc2.connect(humGain);
    osc2.start();

    // 2. Data Pulse (Thinking)
    const pulseGain = ctx.createGain();
    pulseGain.gain.value = 0.0;
    pulseGain.connect(masterGain); // bypass filter for clear pulse
    pulseGainRef.current = pulseGain;

    const pulseOsc = ctx.createOscillator();
    pulseOsc.type = 'sine';
    pulseOsc.frequency.value = 400; // soft beep freq
    pulseOsc.connect(pulseGain);
    pulseOsc.start();

    // LFO to modulate the pulse
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 8; // 8Hz rapid pulse
    
    // We modulate the gain of a sub-node
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05; 
    lfo.connect(lfoGain);
    
    // Connect LFO -> lfoGain -> pulseGain.gain (modulating the volume parameter)
    lfoGain.connect(pulseGain.gain);
    lfo.start();
    lfoRef.current = lfo;

    setIsUnlocked(true);
  };

  useEffect(() => {
    const handleInteract = () => {
      initAudio();
    };

    if (!isUnlocked) {
      window.addEventListener('click', handleInteract);
      window.addEventListener('keydown', handleInteract);
    }

    return () => {
      window.removeEventListener('click', handleInteract);
      window.removeEventListener('keydown', handleInteract);
    };
  }, [isUnlocked]);

  // Effect: Graph Density Reaction
  useEffect(() => {
    if (!isUnlocked || !filterRef.current || !humGainRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // Scale cutoff frequency from 100Hz (empty) to 800Hz (dense)
    // Scale volume slightly
    const targetFreq = Math.min(800, 100 + visibleNodesCount * 1.5);
    const targetVolume = Math.min(0.4, 0.1 + visibleNodesCount * 0.001);

    filterRef.current.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.5);
    humGainRef.current.gain.setTargetAtTime(targetVolume, ctx.currentTime, 0.5);
  }, [visibleNodesCount, isUnlocked]);

  // Effect: AI Thinking Pulse
  useEffect(() => {
    if (!isUnlocked || !pulseGainRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (isThinking) {
      // Fade in the pulse base volume
      pulseGainRef.current.gain.setTargetAtTime(0.04, ctx.currentTime, 0.2);
    } else {
      // Fade out
      pulseGainRef.current.gain.setTargetAtTime(0.0, ctx.currentTime, 0.5);
    }
  }, [isThinking, isUnlocked]);

  // Effect: Mute Toggle
  useEffect(() => {
    if (!isUnlocked || !masterGainRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    if (isMuted) {
      masterGainRef.current.gain.setTargetAtTime(0.0, ctx.currentTime, 0.1);
    } else {
      masterGainRef.current.gain.setTargetAtTime(0.5, ctx.currentTime, 0.2);
    }
  }, [isMuted, isUnlocked]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  return null; // Audio component doesn't render anything visually
}
