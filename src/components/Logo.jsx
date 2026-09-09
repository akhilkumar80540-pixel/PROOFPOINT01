// src/components/Logo.jsx
import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function Logo({ size = "default", className = "" }) {
  const isLarge = size === "large";

  return (
    <div className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-white select-none ${className}`}>
      {/* Icon Emblem with Orange Gradient */}
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 ring-1 ring-white/20 ${isLarge ? 'w-10 h-10' : 'w-8 h-8'}`}>
        <ShieldCheck className={isLarge ? 'w-5 h-5' : 'w-4 h-4'} />
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
        </span>
      </div>

      {/* Typography */}
      <div className="flex flex-col">
        <span className={`leading-none font-bold ${isLarge ? 'text-xl tracking-tight' : 'text-base'}`}>
          Proof<span className="text-orange-500">Point</span>
        </span>
        {isLarge && (
          <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 mt-1 font-semibold">
            Protocol & Verifier
          </span>
        )}
      </div>
    </div>
  );
}