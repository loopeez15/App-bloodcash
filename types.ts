import React from 'react';

export interface TapeData {
  id: number;
  name: string;
  theme: string;
  genre: string;
  effect: string;
  severity: string; // "Real Effect"
  description?: string;
}

export interface ActData {
  id: string;
  title: string;
  time: string;
  points: string[];
}

export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  completed?: boolean;
  list_type: 'equipment' | 'tasks' | 'locations';
}

export interface ScriptData {
  id: string; // usually tape_id
  content: string;
  last_updated?: string;
}

export interface CardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  color?: string;
  className?: string;
  action?: React.ReactNode;
}