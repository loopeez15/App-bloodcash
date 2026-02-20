import React from 'react';
import { CardProps } from '../types';

export const Card: React.FC<CardProps> = ({ 
  title, 
  icon: Icon, 
  children, 
  color = "border-red-900/50", 
  className = "",
  action
}) => (
  <div className={`bg-zinc-900/90 backdrop-blur-md border ${color} rounded-xl p-6 shadow-2xl hover:border-red-600 transition-all duration-300 flex flex-col ${className}`}>
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-red-950/40 rounded-xl border border-red-900/20">
          <Icon className="text-red-500 w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold uppercase tracking-wider text-zinc-100 italic font-serif leading-none pt-1">{title}</h3>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div className="text-zinc-300 text-base leading-relaxed flex-1">
      {children}
    </div>
  </div>
);