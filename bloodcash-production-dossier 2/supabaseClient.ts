import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE SUPABASE ---
// Credenciales inyectadas directamente para conectar con el proyecto.
const PRESET_URL = 'https://copmfphlhxhpjeorhwer.supabase.co';
const PRESET_KEY = 'sb_publishable_UtAd9SO0OEml94t9ndAWyg_uqhYV2gM';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || process.env[`NEXT_PUBLIC_${key}`];
  }
  return '';
};

// Lógica de selección de credenciales:
// 1. LocalStorage (si el usuario las editó manualmente en la UI)
// 2. Variables de entorno (si existen)
// 3. Preset hardcoded (proporcionado en el chat)
const localUrl = typeof window !== 'undefined' ? localStorage.getItem('bloodcash_sb_url') : '';
const localKey = typeof window !== 'undefined' ? localStorage.getItem('bloodcash_sb_key') : '';

// Nota: Priorizamos el PRESET si no hay nada en local, para que funcione directo.
const supabaseUrl = localUrl || getEnv('SUPABASE_URL') || PRESET_URL;
const supabaseAnonKey = localKey || getEnv('SUPABASE_ANON_KEY') || PRESET_KEY;

// Fallback final para evitar crashes si todo está vacío
const finalUrl = supabaseUrl || 'https://falta-configuracion.supabase.co';
const finalKey = supabaseAnonKey || 'falta-key';

export const supabase = createClient(finalUrl, finalKey);

// Helper para saber si tenemos credenciales válidas
export const hasSupabaseCredentials = () => {
  // Consideramos válido si tenemos URL y Key, y la URL parece de supabase
  return (!!finalUrl && !!finalKey && finalUrl.includes('supabase.co'));
};