import React from 'react';

export const AuraVignette: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[1] select-none"
      style={{
        background: 'radial-gradient(130% 100% at 50% 50%, transparent 62%, rgba(3, 5, 8, 0.42))',
      }}
    />
  );
};
