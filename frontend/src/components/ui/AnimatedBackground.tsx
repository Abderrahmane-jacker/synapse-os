"use client";

import React from "react";

export default function AnimatedBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        backgroundImage: `
          linear-gradient(to right, #F4F4F5 1px, transparent 1px),
          linear-gradient(to bottom, #F4F4F5 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px'
      }}
    />
  );
}
