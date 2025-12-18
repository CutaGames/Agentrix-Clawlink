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

  const baseClass = 'inline-flex items-center gap-2 text-slate-900';
  const combinedClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <div className={combinedClass}>
      <Image
        src="/brand/agentrix-logo.png"
        alt="Agentrix"
        width={dimension}
        height={dimension}
        className="text-slate-900"
        priority={size === 'lg'}
      />
      {showText && (
        <span className="font-extrabold tracking-[0.2em] text-xs uppercase text-slate-900">
          AGENTRIX
        </span>
      )}
    </div>
  );
}
