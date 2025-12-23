'use client';

import Image from 'next/image';

interface AgentrixLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 72,
};

export function AgentrixLogo({ size = 'md', showText = true, className }: AgentrixLogoProps) {
  const dimension = sizeMap[size];

  const baseClass = 'inline-flex items-center gap-3';
  const combinedClass = className ? `${baseClass} ${className}` : `${baseClass} text-slate-900`;

  return (
    <div className={combinedClass}>
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <Image
          src="/brand/agentrix-logo.png"
          alt="Agentrix"
          width={dimension}
          height={dimension}
          className="relative rounded-full"
          priority={size === 'lg'}
        />
      </div>
      {showText && (
        <span className={`font-black tracking-[0.3em] text-sm uppercase ${className?.includes('text-gray') || className?.includes('text-slate-900') ? 'text-gray-900' : 'bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-500'}`}>
          AGENTRIX
        </span>
      )}
    </div>
  );
}
