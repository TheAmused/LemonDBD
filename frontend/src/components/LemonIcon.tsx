import React from 'react';

interface LemonIconProps {
  className?: string;
  size?: number;
}

export const LemonIcon: React.FC<LemonIconProps> = ({ className = 'w-6 h-6', size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        {/* Glow & Aura Filter */}
        <filter id="entityGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#EF4444" floodOpacity="0.6" />
        </filter>

        {/* Lemon Gradient with DBD Amber & Blood undertones */}
        <linearGradient id="dbdLemonGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FACC15" />     {/* Bright Yellow */}
          <stop offset="50%" stopColor="#EAB308" />    {/* Lemon Gold */}
          <stop offset="85%" stopColor="#D97706" />    {/* Entity Amber */}
          <stop offset="100%" stopColor="#991B1B" />   {/* Blood Red Shadow */}
        </linearGradient>

        <linearGradient id="leafGrad" x1="16" y1="2" x2="24" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>

      {/* Background Subtle Blood Aura */}
      <circle cx="16" cy="17" r="13" fill="#DC2626" fillOpacity="0.15" filter="url(#entityGlow)" />

      {/* Lemon Body Silhouette (Distinct pointed lemon tips) */}
      <path
        d="M 5 16 C 5 8, 11 5, 17 5 C 24 5, 27 10, 27 16 C 27 24, 21 27, 15 27 C 8 27, 5 22, 5 16 Z 
           M 4 16 C 2.5 16, 2.5 15, 4 15 Z 
           M 27 16 C 29.5 16, 29.5 17, 27 17 Z"
        fill="url(#dbdLemonGrad)"
        stroke="#78350F"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* DBD 4-Tally / Entity Claw Slash Marks across the Lemon */}
      {/* Slash 1 */}
      <path
        d="M 11 10 L 9 22"
        stroke="#450A0A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M 11 10 L 9 22"
        stroke="#DC2626"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Slash 2 */}
      <path
        d="M 14.5 9 L 12.5 23"
        stroke="#450A0A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M 14.5 9 L 12.5 23"
        stroke="#DC2626"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Slash 3 */}
      <path
        d="M 18 9 L 16 23"
        stroke="#450A0A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M 18 9 L 16 23"
        stroke="#DC2626"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Slash 4 */}
      <path
        d="M 21.5 10 L 19.5 22"
        stroke="#450A0A"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M 21.5 10 L 19.5 22"
        stroke="#DC2626"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Cross Strike (DBD 5th strike) */}
      <path
        d="M 7.5 18.5 L 23 13.5"
        stroke="#18181B"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M 7.5 18.5 L 23 13.5"
        stroke="#EF4444"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Lemon Stem & Leaf */}
      <path
        d="M 16 5 C 16 2, 17 1.5, 18 1"
        stroke="#522504"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M 17 3 C 21 1.5, 24 3, 24 6 C 20 6.5, 18 5, 17 3 Z"
        fill="url(#leafGrad)"
        stroke="#14532D"
        strokeWidth="0.8"
      />
    </svg>
  );
};
