import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Rewind, FastForward } from 'lucide-react';

interface TimeMachineSliderProps {
  minDate: number; // epoch ms
  maxDate: number; // epoch ms
  currentDate: number;
  onDateChange: (date: number) => void;
  spawnSpeed?: number;
  onSpawnSpeedChange?: (speed: number) => void;
}

export default function TimeMachineSlider({ minDate, maxDate, currentDate, onDateChange, spawnSpeed, onSpawnSpeedChange }: TimeMachineSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef(isPlaying);
  playRef.current = isPlaying;
  
  // Animation loop for playback
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();
    
    const playLoop = (time: number) => {
      if (!playRef.current) return;
      
      const dt = time - lastTime;
      lastTime = time;
      
      const totalDuration = maxDate - minDate;
      const speed = totalDuration / 15000; 
      
      const step = speed * dt;
      let nextDate = currentDate + step;
      
      if (nextDate >= maxDate) {
        nextDate = maxDate;
        setIsPlaying(false);
        playRef.current = false;
      }
      
      onDateChange(nextDate);
      
      if (playRef.current) {
        animationFrame = requestAnimationFrame(playLoop);
      }
    };
    
    if (isPlaying) {
      animationFrame = requestAnimationFrame(playLoop);
    }
    
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, currentDate, minDate, maxDate, onDateChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => {
           if (!prev && currentDate >= maxDate) {
             onDateChange(minDate);
           }
           return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDate, maxDate, minDate, onDateChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    onDateChange(Number(e.target.value));
  };
  
  const formatDate = (epoch: number) => {
    return new Date(epoch).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div style={{
      pointerEvents: 'auto',
      width: '280px',
      background: '#FFFFFF',
      border: '2px solid #0F0F0F',
      boxShadow: '4px 4px 0px #0F0F0F',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      userSelect: 'none',
    }}>
      
      <style dangerouslySetInnerHTML={{__html: `
        .synapse-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          background: #F4F4F5;
          border: 1px solid #0F0F0F;
          border-radius: 0px;
          outline: none;
          cursor: pointer;
        }
        .synapse-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 0px;
          background: #D0FF14;
          cursor: pointer;
          border: 2px solid #0F0F0F;
          box-shadow: 1px 1px 0px #0F0F0F;
        }
        .synapse-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 0px;
          background: #D0FF14;
          cursor: pointer;
          border: 2px solid #0F0F0F;
          box-shadow: 1px 1px 0px #0F0F0F;
        }
      `}} />

      {/* Label */}
      <div style={{
        fontSize: '0.65rem',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 800,
        color: '#0F0F0F',
        letterSpacing: '0.12em',
      }}>
        [TEMPORAL_PLAYBACK]
      </div>

      {/* Top Row: Controls & Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            onClick={() => { onDateChange(minDate); setIsPlaying(false); }}
            style={{
              background: '#F4F4F5',
              border: '1px solid #0F0F0F',
              color: '#0F0F0F',
              cursor: 'pointer',
              padding: '3px 6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Rewind size={12} />
          </button>
          
          <button 
            onClick={() => {
              if (currentDate >= maxDate) onDateChange(minDate);
              setIsPlaying(!isPlaying);
            }}
            style={{
              width: '26px',
              height: '24px',
              borderRadius: '0px',
              background: isPlaying ? '#D0FF14' : '#F4F4F5',
              border: '1px solid #0F0F0F',
              color: '#0F0F0F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} style={{ marginLeft: '1px' }} />}
          </button>
          
          <button
            onClick={() => {
              setIsPlaying(false);
              onDateChange(maxDate);
            }}
            style={{
              background: '#F4F4F5',
              border: '1px solid #0F0F0F',
              color: '#0F0F0F',
              cursor: 'pointer',
              padding: '3px 6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <FastForward size={12} />
          </button>
        </div>

        <div style={{
          fontSize: '0.7rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          color: '#0F0F0F',
          background: '#F4F4F5',
          border: '1px solid #0F0F0F',
          padding: '2px 6px'
        }}>
          {formatDate(currentDate).toUpperCase()}
        </div>
      </div>

      {/* Timeline Track */}
      <div style={{ width: '100%', position: 'relative', marginTop: '4px' }}>
        <input 
          type="range"
          min={minDate}
          max={maxDate}
          value={currentDate}
          onChange={handleSliderChange}
          className="synapse-slider"
          style={{ width: '100%', margin: 0, display: 'block' }}
        />
      </div>

      {/* Spawn Speed section */}
      {spawnSpeed !== undefined && onSpawnSpeedChange && (
        <>
          <div style={{
            fontSize: '0.62rem',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 800,
            color: '#0F0F0F',
            letterSpacing: '0.12em',
            marginTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>SPAWN SPEED</span>
            <span style={{ color: '#80A300' }}>{spawnSpeed.toFixed(1)}x</span>
          </div>
          <div style={{ width: '100%', position: 'relative' }}>
            <input 
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={spawnSpeed}
              onChange={(e) => onSpawnSpeedChange(parseFloat(e.target.value))}
              className="synapse-slider"
              style={{ width: '100%', margin: 0, display: 'block' }}
            />
          </div>
        </>
      )}
    </div>
  );
}
