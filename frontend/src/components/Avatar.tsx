import React, { useState } from 'react';
import { buildImageUrl, type ImageSize } from '../utils/image';

const PALETTE = ['#2A64A4', '#1E2A4A', '#7c3aed', '#0891b2', '#b45309', '#15803d', '#be123c', '#4338ca'];

const colorFor = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const initialsFor = (n: string): string => {
  const parts = n.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const SIZES = {
  sm: { box: 'w-9 h-9', text: 'text-xs' },
  md: { box: 'w-12 h-12', text: 'text-sm' },
  lg: { box: 'w-16 h-16', text: 'text-xl' },
} as const;

interface AvatarProps {
  fotoUrl?: string | null;
  nombre: string;
  size?: keyof typeof SIZES;
  variant?: ImageSize;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ fotoUrl, nombre, size = 'md', variant = 'thumb', className = '' }) => {
  const [failed, setFailed] = useState(false);
  const dims = SIZES[size];
  const src = fotoUrl && !failed ? buildImageUrl(fotoUrl, variant) : '';

  if (src) {
    return (
      <img
        src={src}
        alt={nombre}
        onError={() => setFailed(true)}
        className={`${dims.box} rounded-full object-cover border border-edge ${className}`}
      />
    );
  }

  return (
    <span
      aria-label={nombre}
      className={`${dims.box} ${dims.text} rounded-full inline-flex items-center justify-center font-bold text-white select-none ${className}`}
      style={{ backgroundColor: colorFor(nombre) }}
    >
      {initialsFor(nombre)}
    </span>
  );
};

export default Avatar;
