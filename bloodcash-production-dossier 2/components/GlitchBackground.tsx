import React from 'react';

export const GlitchBackground: React.FC = () => {
  return (
    <>
      {/* Efecto de Scanline VHS Global */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      
      {/* Glitch Overlay decorativo */}
      <div className="fixed top-0 left-0 w-full h-1 bg-red-600/30 blur-sm opacity-20 animate-bounce pointer-events-none z-50" />
    </>
  );
};