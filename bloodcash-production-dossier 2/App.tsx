import React, { useState, useMemo, useEffect } from 'react';
import { 
  Tv, 
  Zap, 
  MapPin, 
  ClipboardList, 
  AlertTriangle,
  Music,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Clock,
  PlayCircle,
  Menu,
  X,
  Hammer,
  Package,
  Trash2,
  Plus,
  Loader2,
  WifiOff,
  Save,
  Edit3,
  Film,
  Cloud,
  CloudOff,
  Database,
  Settings,
  Link,
  Clapperboard,
  Siren,
  MonitorPlay,
  CalendarClock,
  Droplet,
  Check
} from 'lucide-react';
import { Card } from './components/Card';
import { GlitchBackground } from './components/GlitchBackground';
import { TapeData, ActData, ChecklistItem, ScriptData } from './types';
import { supabase, hasSupabaseCredentials } from './supabaseClient';

// KEYS PARA LOCALSTORAGE
const STORAGE_KEYS = {
  TASKS: 'bloodcash_tasks_v1',
  LOCATIONS: 'bloodcash_locations_v1',
  EQUIPMENT: 'bloodcash_equipment_v1',
  SCRIPT_PREFIX: 'bloodcash_script_',
  BIBLE: 'bloodcash_bible_v1'
};

// DEFAULT DATA FOR BIBLE
const DEFAULT_BIBLE_DATA = {
  breakdown: `[PROPS TÉCNICOS]
- VCR Sony SLV-Series (Hero)
- TV CRT Trinitron (Funcional)
- Cintas VHS "Etiquetadas"

[VESTUARIO]
- Camiseta Alex (Limpia)
- Camiseta Alex (Sudor Lvl 1)
- Camiseta Alex (Sangre Lvl 2)

[SONIDO DIEGÉTICO]
Zumbido 60Hz constante, Click de VCR, Respiración agitada del operador.`,

  schedule: `[DÍAS 1-3: VILLA PRIVADA (INTERIORES)]
PRIORIDAD: ALTA
Rodaje bloqueado de todas las escenas de "Salón". Control total de luz. Blackout de ventanas para simular noche eterna.

[DÍA 4: BARCO / EXTERIORES]
PRIORIDAD: GOLDEN HOUR
Salida puerto 15:00. Rodaje "Cinta Tormenta" en cubierta. Uso de luz natural atardecer para el contraste con el "Salón".`,

  sfx: `[HERIDA DUAL (CONCEPTO)]
Sincronización frame-perfect entre el corte digital (VHS) y la aparición de sangre física (Actor).

- Tubos de sangre ocultos (Squibs)
- Maquillaje "Sudor frío" (Glicerina)
- Prótesis corte profundo mano derecha`,

  workflow: `1. MASTERIZACIÓN
Masterización Digital en 4K (Log Profile).

2. PRINT TO TAPE
Grabar el master digital en cinta VHS virgen usando VCR 4 cabezales.

3. ANALOG DAMAGE
Manipular físicamente la cinta (imanes, arrugas) durante la reproducción.

4. RE-CAPTURA Y OVERLAY
Digitalizar señal analógica y superponer (modo 'Overlay') sobre el 4K original al 30%.`,

  security: `[TRANSPORTE MARÍTIMO]
Todo el equipo de cámara en pelican cases estancas IP67. Seguro marítimo activado.

[ESCENAS DE RIESGO]
Coordinador de Stunts presente para caídas en "Cinta Maratón". Ambulancia en standby en puerto base.

[CATERING]
Logística de agua crítica. La villa está aislada. Suministro para 6 días + 2 contingencia.`
};

// COMPONENTE AUXILIAR PARA BIBLE EDITABLE
const EditableBibleCard: React.FC<{
  title: string;
  icon: any;
  content: string;
  sectionKey: string;
  onSave: (key: string, val: string) => Promise<void>;
  className?: string;
  isOnline: boolean;
}> = ({ title, icon, content, sectionKey, onSave, className, isOnline }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content);
  const [saving, setSaving] = useState(false);

  // Sync internal state if prop changes (external load)
  useEffect(() => {
    if (!isEditing) setValue(content);
  }, [content, isEditing]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(sectionKey, value);
    setSaving(false);
    setIsEditing(false);
  };

  return (
    <Card 
      title={title} 
      icon={icon} 
      className={className}
      action={
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={saving}
          className={`p-2 rounded hover:bg-zinc-800 transition-colors ${isEditing ? 'text-green-500' : 'text-zinc-500 hover:text-white'}`}
        >
          {saving ? <Loader2 size={18} className="animate-spin"/> : isEditing ? <Check size={18} /> : <Edit3 size={18} />}
        </button>
      }
    >
      {isEditing ? (
        <textarea 
          className="w-full h-full min-h-[150px] bg-black/40 text-zinc-300 font-courier text-sm p-3 border border-zinc-700 rounded focus:border-red-500 focus:outline-none resize-y"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      ) : (
        <div className="whitespace-pre-wrap font-courier text-sm text-zinc-300">
          {value.split('\n').map((line, i) => {
            if (line.trim().startsWith('[')) {
              return <span key={i} className="block text-red-500 font-bold mt-3 mb-1">{line}</span>;
            }
            if (line.trim().startsWith('-')) {
               return <div key={i} className="pl-4 border-l-2 border-zinc-800 ml-1">{line}</div>;
            }
            return <div key={i}>{line}</div>;
          })}
        </div>
      )}
      {isEditing && !isOnline && (
         <p className="text-[10px] text-red-500 mt-2 text-right">Guardando localmente (Offline)</p>
      )}
    </Card>
  );
};

const App: React.FC = () => {
  const [activeTape, setActiveTape] = useState<number | null>(0); // Default a Cinta 0
  const [expandedAct, setExpandedAct] = useState<string | null>('ACTO I');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Production Manager State
  const [activeChecklistTab, setActiveChecklistTab] = useState<'tasks' | 'locations' | 'equipment'>('tasks');
  const [equipmentList, setEquipmentList] = useState<ChecklistItem[]>([]);
  const [taskList, setTaskList] = useState<ChecklistItem[]>([]);
  const [locationList, setLocationList] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline'>('online');
  
  // Script Manager State
  const [scriptContent, setScriptContent] = useState('');
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<'online' | 'offline' | 'syncing'>('online');

  // Bible State
  const [bibleData, setBibleData] = useState(DEFAULT_BIBLE_DATA);
  
  // Add Item State
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');

  // Config State
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');

  // --- DATOS PRINCIPALES ---
  const tapes: TapeData[] = [
    { 
      id: 0, 
      name: "PRÓLOGO: EL HALLAZGO", 
      theme: "Curiosidad Fatal", 
      genre: "Found Footage / Realidad", 
      effect: "Estática leve, polvo flotando.", 
      severity: "Nula",
      description: "El mercadillo, el vendedor sin rostro y la compra de la caja marcada 'JUEGA'. La primera advertencia."
    },
    { 
      id: 1, 
      name: "MARATÓN", 
      theme: "Obsesión Física", 
      genre: "Drama Deportivo", 
      effect: "Sudor real, agotamiento físico extremo.", 
      severity: "Baja",
      description: "Alex corre sin fin. Match-cut entre su ojo y el corredor. La fatiga traspasa la pantalla."
    },
    { 
      id: 2, 
      name: "TORMENTA", 
      theme: "Aislamiento / Caos Natural", 
      genre: "Survival / Catástrofe", 
      effect: "Frío intenso, agua goteando, truenos.", 
      severity: "Media",
      description: "Una tormenta eléctrica que nunca acaba. La lluvia traspasa la pantalla y empieza a inundar la habitación real."
    },
    { 
      id: 5, 
      name: "BLOODCASH", 
      theme: "Autodestrucción", 
      genre: "Crimen / Violencia", 
      effect: "Heridas reales. Sangre. Muerte física.", 
      severity: "CRÍTICA",
      description: "El juego final. No hay botón de stop. Si muere en la cinta, muere en el salón."
    },
  ];

  // --- INITIAL LOAD & SYNC ---

  useEffect(() => {
    // Verificar si necesitamos configuración
    if (!hasSupabaseCredentials()) {
      setDbStatus('offline');
      setCloudStatus('offline');
    }
    
    // Cargar config guardada para el modal
    const savedUrl = localStorage.getItem('bloodcash_sb_url');
    const savedKey = localStorage.getItem('bloodcash_sb_key');
    if (savedUrl) setConfigUrl(savedUrl);
    if (savedKey) setConfigKey(savedKey);

    loadLocalData();
    fetchChecklist();
    fetchBible();
  }, []);

  useEffect(() => {
    if (activeTape !== null) {
      loadScript(activeTape);
    }
  }, [activeTape]);

  // --- CONFIG HANDLERS ---
  const saveConfig = () => {
    localStorage.setItem('bloodcash_sb_url', configUrl.trim());
    localStorage.setItem('bloodcash_sb_key', configKey.trim());
    window.location.reload(); // Recargar para reinicializar cliente
  };

  const clearConfig = () => {
    localStorage.removeItem('bloodcash_sb_url');
    localStorage.removeItem('bloodcash_sb_key');
    setConfigUrl('');
    setConfigKey('');
    window.location.reload();
  };

  // Helper para cargar datos locales inmediatamente
  const loadLocalData = () => {
    try {
      const t = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (t) setTaskList(JSON.parse(t));
      
      const l = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      if (l) setLocationList(JSON.parse(l));

      const e = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
      if (e) setEquipmentList(JSON.parse(e));

      const b = localStorage.getItem(STORAGE_KEYS.BIBLE);
      if (b) setBibleData({...DEFAULT_BIBLE_DATA, ...JSON.parse(b)});
    } catch (err) {
      console.error("Error cargando local storage:", err);
    }
  };

  // Helper para guardar datos locales
  const updateLocalAndState = (type: 'tasks'|'locations'|'equipment', newList: ChecklistItem[]) => {
    // 1. Update React State
    if (type === 'tasks') setTaskList(newList);
    else if (type === 'locations') setLocationList(newList);
    else if (type === 'equipment') setEquipmentList(newList);

    // 2. Update LocalStorage
    const key = type === 'tasks' ? STORAGE_KEYS.TASKS : type === 'locations' ? STORAGE_KEYS.LOCATIONS : STORAGE_KEYS.EQUIPMENT;
    localStorage.setItem(key, JSON.stringify(newList));
  };

  const fetchChecklist = async () => {
    if (!hasSupabaseCredentials()) {
        setDbStatus('offline');
        setLoading(false);
        return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const newTasks = data.filter((item: any) => item.list_type === 'tasks');
        const newLocs = data.filter((item: any) => item.list_type === 'locations');
        const newEquip = data.filter((item: any) => item.list_type === 'equipment');

        setEquipmentList(newEquip);
        setTaskList(newTasks);
        setLocationList(newLocs);

        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newTasks));
        localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(newLocs));
        localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(newEquip));
        
        setDbStatus('online');
      } else {
        setDbStatus('online');
      }
    } catch (err: any) {
      console.log('Modo Offline activado para listas:', err.message);
      setDbStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const fetchBible = async () => {
     if (!hasSupabaseCredentials()) return;
     try {
        const { data } = await supabase.from('production_bible').select('*');
        if (data && data.length > 0) {
           const newBible = { ...DEFAULT_BIBLE_DATA };
           data.forEach((item: any) => {
              // @ts-ignore
              if (newBible[item.section_key] !== undefined) {
                 // @ts-ignore
                 newBible[item.section_key] = item.content;
              }
           });
           setBibleData(newBible);
           localStorage.setItem(STORAGE_KEYS.BIBLE, JSON.stringify(newBible));
        }
     } catch (e) {
        console.log("Bible fetch offline");
     }
  };

  const saveBibleSection = async (sectionKey: string, content: string) => {
     // 1. Local
     const newBible = { ...bibleData, [sectionKey]: content };
     setBibleData(newBible);
     localStorage.setItem(STORAGE_KEYS.BIBLE, JSON.stringify(newBible));

     // 2. Cloud
     if (hasSupabaseCredentials()) {
        try {
           await supabase.from('production_bible').upsert({
              section_key: sectionKey,
              content: content,
              updated_at: new Date().toISOString()
           });
        } catch (e) {
           console.log("Error saving bible to cloud");
        }
     }
  };

  const loadScript = async (tapeId: number) => {
    setCloudStatus('syncing');
    
    // 1. Cargar Local primero
    const localKey = `${STORAGE_KEYS.SCRIPT_PREFIX}${tapeId}`;
    const localData = localStorage.getItem(localKey);
    let hasLocal = false;
    
    if (localData) {
        try {
            const parsed = JSON.parse(localData);
            setScriptContent(parsed.content || '');
            setLastSaved(`${new Date(parsed.updated_at).toLocaleTimeString()} (Local)`);
            hasLocal = true;
        } catch (e) {
            console.error(e);
        }
    } else {
        setScriptContent('');
        setLastSaved(null);
    }

    if (!hasSupabaseCredentials()) {
        setCloudStatus('offline');
        return;
    }

    // 2. Intentar cargar de Nube
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('content, updated_at')
        .eq('tape_id', tapeId.toString())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setScriptContent(data.content);
        setLastSaved(new Date(data.updated_at).toLocaleTimeString());
        setCloudStatus('online');
        // Actualizar backup local
        localStorage.setItem(localKey, JSON.stringify({ 
            content: data.content, 
            updated_at: data.updated_at, 
            tape_id: tapeId 
        }));
      } else {
        setCloudStatus('online'); // Conectado pero sin datos aun
      }
    } catch (err) {
      console.log("Script offline mode");
      setCloudStatus('offline');
    }
  };

  const saveScript = async () => {
    if (activeTape === null) return;
    setIsSavingScript(true);
    
    const now = new Date();
    const payload = { 
        tape_id: activeTape.toString(), 
        content: scriptContent,
        updated_at: now.toISOString()
    };

    // 1. Guardar Local (Siempre funciona)
    const localKey = `${STORAGE_KEYS.SCRIPT_PREFIX}${activeTape}`;
    localStorage.setItem(localKey, JSON.stringify(payload));

    if (!hasSupabaseCredentials()) {
        setLastSaved(`${now.toLocaleTimeString()} (Solo Local)`);
        setIsSavingScript(false);
        return;
    }

    // 2. Guardar Nube (Best effort)
    try {
      const { error } = await supabase
        .from('scripts')
        .upsert(payload, { onConflict: 'tape_id' });

      if (error) throw error;
      
      setLastSaved(now.toLocaleTimeString());
      setCloudStatus('online');
    } catch (err: any) {
      console.log("Error guardando en nube:", err.message);
      setCloudStatus('offline');
      setLastSaved(`${now.toLocaleTimeString()} (Solo Local)`);
    } finally {
      setIsSavingScript(false);
    }
  };

  // --- ACTIONS ---

  const getCurrentList = () => {
    switch (activeChecklistTab) {
      case 'locations': return locationList;
      case 'equipment': return equipmentList;
      case 'tasks': default: return taskList;
    }
  };
  
  const currentList = getCurrentList();
  
  const categories = useMemo(() => {
    const cats = Array.from(new Set(currentList.map(i => i.category)));
    return cats.length > 0 ? cats : ['General'];
  }, [currentList]);

  const toggleCheck = async (id: string, currentStatus: boolean | undefined) => {
    // Optimistic Update
    const updatedList = currentList.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    updateLocalAndState(activeChecklistTab, updatedList);

    // Cloud Update
    try {
      if (!id.startsWith('local-') && hasSupabaseCredentials()) {
        await supabase.from('checklist_items').update({ completed: !currentStatus }).eq('id', id);
      }
    } catch (err) { console.log('Offline toggle'); }
  };

  const deleteItem = async (id: string) => {
    // Optimistic Update
    const updatedList = currentList.filter(item => item.id !== id);
    updateLocalAndState(activeChecklistTab, updatedList);

    // Cloud Update
    try {
      if (!id.startsWith('local-') && hasSupabaseCredentials()) {
        await supabase.from('checklist_items').delete().eq('id', id);
      }
    } catch (err) { console.log('Offline delete'); }
  };

  const addItem = async () => {
    if (!newItemText.trim()) return;
    
    const categoryToUse = newItemCategory || categories[0] || 'General';
    const listType = activeChecklistTab;

    // ID temporal para UI inmediata
    const tempId = `local-${Date.now()}`;
    const newItemOptimistic: ChecklistItem = {
      id: tempId,
      label: newItemText,
      category: categoryToUse,
      list_type: listType,
      completed: false
    };

    // 1. Update Local & State
    const newList = [...currentList, newItemOptimistic];
    updateLocalAndState(listType, newList);
    setNewItemText('');

    if (!hasSupabaseCredentials()) {
        return;
    }

    // 2. Try Cloud Save
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .insert([{ 
            label: newItemText, 
            category: categoryToUse, 
            list_type: listType,
            completed: false 
          }])
        .select();

      if (!error && data) {
        // Reemplazar ID local con ID real de DB silenciosamente
        const realIdItem = { ...newItemOptimistic, id: data[0].id };
        const fixedList = newList.map(i => i.id === tempId ? realIdItem : i);
        updateLocalAndState(listType, fixedList);
        setDbStatus('online');
      }
    } catch (err) {
      console.log('Offline add - item guardado localmente');
      setDbStatus('offline');
    }
  };

  // DATOS: Estructura Narrativa
  const acts: ActData[] = [
    {
      id: 'ACTO I',
      title: 'LA CAJA & MARATÓN',
      time: '0:00 – 7:00',
      points: [
        "ALEX recibe la caja con 'JUEGA'.",
        "Inserta MARATÓN. Obsesión visual inmediata.",
        "Match-cut: Ojo de Alex -> Corredor.",
        "Gota de sudor real cae en su mano."
      ]
    },
    {
      id: 'ACTO II',
      title: 'ESCALADA SENSORIAL',
      time: '7:00 – 15:00',
      points: [
        "Inserta TORMENTA. La temperatura baja drásticamente.",
        "El agua empieza a gotear del techo aunque no llueve fuera.",
        "Truenos sincronizados con los latidos del corazón.",
        "Aparición de EL COLECCIONISTA en los destellos de luz."
      ]
    },
    {
      id: 'ACTO III',
      title: 'BLOODCASH',
      time: '15:00 – 22:00',
      points: [
        "Cinta roja final. Ruido analógico agresivo.",
        "Herida Dual: Apuñalado en VHS, sangra en sofá.",
        "Fusión de realidades. El mando no funciona.",
        "Muerte simultánea y silencio estático."
      ]
    }
  ];

  const activeTapeInfo = tapes.find(t => t.id === activeTape);
  const completedCount = currentList.filter(i => i.completed).length;
  const progress = Math.round((completedCount / currentList.length) * 100) || 0;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-red-900 selection:text-white relative overflow-x-hidden">
      <GlitchBackground />

      {/* --- CONFIG MODAL --- */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
           <div className="bg-zinc-900 border-2 border-red-600 rounded-xl w-full max-w-lg shadow-[0_0_50px_rgba(220,38,38,0.2)]">
              <div className="bg-red-950/30 p-4 border-b border-red-900/50 flex justify-between items-center">
                 <h3 className="font-cinzel text-xl text-red-500 font-bold flex items-center gap-2">
                    <Database size={20} /> CONFIGURACIÓN NUBE
                 </h3>
                 <button onClick={() => setShowConfigModal(false)}><X className="text-zinc-400 hover:text-white" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <p className="text-sm text-zinc-400 mb-4">
                    Pega tus credenciales de Supabase para activar la sincronización en tiempo real. 
                    <br/><span className="text-xs text-zinc-500">Puedes encontrarlas en Project Settings &gt; API.</span>
                 </p>
                 
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Project URL</label>
                    <input 
                      className="w-full bg-black/50 border border-zinc-700 p-3 rounded text-zinc-200 focus:border-red-500 focus:outline-none font-mono text-sm"
                      placeholder="https://xyz...supabase.co"
                      value={configUrl}
                      onChange={(e) => setConfigUrl(e.target.value)}
                    />
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Anon / Public Key</label>
                    <input 
                      className="w-full bg-black/50 border border-zinc-700 p-3 rounded text-zinc-200 focus:border-red-500 focus:outline-none font-mono text-sm"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={configKey}
                      onChange={(e) => setConfigKey(e.target.value)}
                    />
                 </div>

                 <div className="flex gap-3 pt-4">
                    <button 
                       onClick={saveConfig}
                       className="flex-1 bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded uppercase tracking-widest text-sm transition-all"
                    >
                       Guardar y Conectar
                    </button>
                    {hasSupabaseCredentials() && (
                       <button onClick={clearConfig} className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400">
                          <Trash2 size={18} />
                       </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
      
      {/* --- HEADER --- */}
      <header className="max-w-7xl mx-auto border-b-2 border-red-900/40 relative z-20 bg-black/90 backdrop-blur-md sticky top-0 md:static shadow-2xl">
        <div className="p-5 md:p-8 flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="w-full md:w-auto">
            <div className="flex justify-between items-start md:block">
              <div className="flex items-center gap-3 mb-3 opacity-80">
                <span className="text-3xl animate-pulse">📼</span>
                <span className="font-courier text-red-500 tracking-[0.2em] text-xs font-bold border border-red-500/50 px-3 py-1 rounded uppercase bg-red-950/20">Confidencial</span>
              </div>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-red-500 p-2 bg-zinc-900 rounded border border-zinc-800">
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
            
            <h1 className="font-cinzel text-5xl md:text-8xl text-white tracking-wide mb-2 text-shadow-red leading-[0.9]">
              LAS CINTAS
            </h1>
            <p className="font-courier text-red-600 text-xl md:text-3xl tracking-[0.15em] font-bold mt-2 opacity-90">(BLOODCASH)</p>
          </div>
          
          <div className={`
            flex flex-col gap-3 text-sm font-courier text-zinc-400 bg-zinc-900/95 p-6 rounded-xl border border-zinc-700 w-full md:w-auto transition-all duration-300 shadow-xl
            ${mobileMenuOpen ? 'block mt-4' : 'hidden md:flex'}
          `}>
             <div className="flex justify-between gap-8 border-b border-zinc-800 pb-2">
                <span className="text-red-500 font-bold uppercase">Género</span> <span>Thriller Psicológico</span>
             </div>
             <div className="flex justify-between gap-8 border-b border-zinc-800 pb-2">
                <span className="text-red-500 font-bold uppercase">Duración</span> <span>18–22 Min</span>
             </div>
             <div className="flex justify-between gap-8">
                <span className="text-red-500 font-bold uppercase">Loc</span> <span>Isla Menorca</span>
             </div>
             {/* Config Button Desktop */}
             <button 
                onClick={() => setShowConfigModal(true)}
                className="mt-2 text-xs flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded border border-zinc-600 transition-colors"
             >
                <Settings size={14} /> {hasSupabaseCredentials() ? 'CONFIG NUBE' : 'CONECTAR A SUPABASE'}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 relative z-10 pb-32">
        
        {/* SECCIÓN 1: PITCH & CONCEPTOS CLAVE */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card title="El Pitch" icon={Zap} className="md:col-span-2 border-l-4 border-l-red-600">
             <p className="text-lg md:text-xl font-medium leading-relaxed mb-4 text-white">
               Un cruce entre <span className="text-red-500">Black Mirror</span> y <span className="text-red-500">Jumanji</span> con la estética de <span className="text-red-500">Drive</span>.
             </p>
             <p className="text-zinc-400">
               Un joven solitario huye de su vida entrando en cintas VHS. Pero la última cinta, <strong className="text-white">BLOODCASH</strong>, lo encierra dentro. Si muere en la película, muere en la realidad.
             </p>
           </Card>

           <Card title="Reglas del Universo" icon={AlertTriangle}>
              <ul className="space-y-4 text-sm md:text-base font-courier text-zinc-300">
                <li className="flex gap-3 items-start">
                  <span className="bg-red-900/40 text-red-500 font-bold px-2 py-0.5 rounded text-xs mt-1">01</span>
                  <span>Entrada por contacto visual fijo sin pestañear.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="bg-red-900/40 text-red-500 font-bold px-2 py-0.5 rounded text-xs mt-1">02</span>
                  <span>Daño físico real (cortes, sudor, sangre).</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="bg-red-900/40 text-red-500 font-bold px-2 py-0.5 rounded text-xs mt-1">03</span>
                  <span>No existe el botón de STOP en Bloodcash.</span>
                </li>
              </ul>
           </Card>
        </section>

        {/* SECCIÓN 2: TERMINAL DE GUION (NUEVO) */}
        <section className="space-y-6">
           <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
              <FileText className="text-red-500 w-8 h-8" />
              <h2 className="text-3xl md:text-4xl font-cinzel text-white">Terminal de Guion</h2>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[600px]">
              {/* Selector de Cintas */}
              <div className="lg:col-span-3 flex flex-col gap-3 h-[250px] lg:h-full overflow-y-auto pr-2 custom-scrollbar">
                 <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2 px-1">Seleccionar Archivo</p>
                 {tapes.map(tape => (
                    <button
                      key={tape.id}
                      onClick={() => setActiveTape(tape.id)}
                      className={`text-left p-4 rounded-xl border transition-all duration-200 flex flex-col gap-1 ${
                        activeTape === tape.id 
                        ? 'bg-red-950/40 border-red-500/50 shadow-lg scale-[1.02]' 
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800'
                      }`}
                    >
                       <span className="text-xs font-bold text-red-500 tracking-wider">CINTA 0{tape.id}</span>
                       <span className="text-lg font-bold text-white font-cinzel">{tape.name}</span>
                    </button>
                 ))}
                 
                 {activeTapeInfo && (
                   <div className="mt-auto bg-black/40 p-4 rounded-xl border border-zinc-800/50 hidden lg:block">
                      <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Metadata</p>
                      <p className="text-sm text-zinc-300 italic mb-2">"{activeTapeInfo.description}"</p>
                      <div className="flex gap-2 text-xs">
                         <span className="bg-zinc-800 px-2 py-1 rounded text-zinc-400">{activeTapeInfo.genre}</span>
                         <span className="bg-red-900/30 px-2 py-1 rounded text-red-400 border border-red-900/50">{activeTapeInfo.severity}</span>
                      </div>
                   </div>
                 )}
              </div>

              {/* Editor de Texto */}
              <div className="lg:col-span-9 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden flex flex-col shadow-2xl relative h-[550px] lg:h-full">
                 <div className="bg-black/60 border-b border-zinc-800 p-4 flex justify-between items-center backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                       <Edit3 size={18} className="text-zinc-400"/>
                       <span className="text-sm font-courier font-bold text-zinc-300 uppercase">
                          Editando: <span className="text-white">{activeTapeInfo?.name}</span>
                       </span>
                    </div>
                    <div className="flex items-center gap-4">
                       {/* Indicador de Estado de Nube */}
                       <button onClick={() => setShowConfigModal(true)} className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-zinc-800 hover:bg-zinc-800 transition-colors">
                          {cloudStatus === 'online' ? <Cloud size={14} className="text-green-500" /> : 
                           cloudStatus === 'offline' ? <Database size={14} className="text-red-500" /> :
                           <Loader2 size={14} className="text-yellow-500 animate-spin" />}
                           <span className={`text-xs font-bold ${
                             cloudStatus === 'online' ? 'text-green-600' : 
                             cloudStatus === 'offline' ? 'text-red-500' : 'text-yellow-600'
                           }`}>
                             {cloudStatus === 'online' ? 'NUBE ACTIVA' : cloudStatus === 'offline' ? 'MODO LOCAL' : 'CONECTANDO'}
                           </span>
                       </button>

                       {lastSaved && <span className="text-xs text-zinc-500 font-mono hidden sm:inline">Guardado: {lastSaved}</span>}
                       <button 
                         onClick={saveScript}
                         disabled={isSavingScript}
                         className="bg-red-700 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-red-900/20 disabled:opacity-50"
                       >
                          {isSavingScript ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                          {isSavingScript ? 'Guardando...' : 'Guardar Guion'}
                       </button>
                    </div>
                 </div>
                 <textarea 
                    className="flex-1 bg-[#121212] text-zinc-300 p-6 md:p-8 font-courier text-base md:text-lg leading-relaxed focus:outline-none resize-none selection:bg-red-900/40 selection:text-white custom-scrollbar"
                    placeholder="Escribe el guion literario aquí... (Se guarda automáticamente en tu navegador si no hay conexión)"
                    value={scriptContent}
                    onChange={(e) => setScriptContent(e.target.value)}
                 />
                 {/* Decorative Corner */}
                 <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-red-900/30 m-4 pointer-events-none"></div>
              </div>
           </div>
        </section>

        {/* SECCIÓN 3: PRODUCTION MANAGER */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 border-b border-zinc-800 pb-4 justify-between">
              <div className="flex items-center gap-4">
                <ClipboardList className="text-red-500 w-8 h-8" />
                <h2 className="text-3xl md:text-4xl font-cinzel text-white">Production Manager</h2>
              </div>
              <div className="flex items-center gap-2">
                 {dbStatus === 'offline' && (
                    <button onClick={() => setShowConfigModal(true)} className="text-xs font-bold text-red-500 bg-red-900/20 px-3 py-1 rounded border border-red-800 flex items-center gap-2 hover:bg-red-900/40 transition-colors">
                       <CloudOff size={12} /> CONECTAR DB
                    </button>
                 )}
              </div>
           </div>

          <div className="bg-zinc-900/80 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
            {/* Tabs Grandes */}
            <div className="flex border-b border-zinc-800 bg-black/40">
               <button 
                  onClick={() => setActiveChecklistTab('tasks')}
                  className={`flex-1 py-5 text-sm md:text-base font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all relative ${activeChecklistTab === 'tasks' ? 'text-white bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                  <Hammer size={18} /> Tareas
                  {activeChecklistTab === 'tasks' && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600"></div>}
               </button>
               <button 
                  onClick={() => setActiveChecklistTab('locations')}
                  className={`flex-1 py-5 text-sm md:text-base font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all relative ${activeChecklistTab === 'locations' ? 'text-white bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                  <MapPin size={18} /> Localizaciones
                  {activeChecklistTab === 'locations' && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600"></div>}
               </button>
               <button 
                  onClick={() => setActiveChecklistTab('equipment')}
                  className={`flex-1 py-5 text-sm md:text-base font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all relative ${activeChecklistTab === 'equipment' ? 'text-white bg-zinc-800/50' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                  <Package size={18} /> Equipo
                  {activeChecklistTab === 'equipment' && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600"></div>}
               </button>
            </div>

            {/* Barra Progreso */}
            <div className="h-1.5 bg-zinc-800 w-full">
               <div className="h-full bg-red-600 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(220,38,38,0.5)]" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0a0a0a] custom-scrollbar">
               {loading && currentList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                     <Loader2 className="animate-spin text-red-600" size={32} />
                     <span className="text-base font-mono">Cargando datos...</span>
                  </div>
               ) : (
                  <div className="space-y-8">
                     {categories.map(cat => (
                        <div key={cat} className="animate-fade-in">
                           <h5 className="text-xs font-bold text-red-500/80 uppercase tracking-[0.2em] mb-3 border-b border-zinc-800 pb-2">{cat}</h5>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {currentList.filter(i => i.category === cat).map(item => (
                                 <div 
                                    key={item.id} 
                                    className={`flex items-start justify-between gap-4 p-4 rounded-lg border transition-all ${
                                       item.completed 
                                       ? 'bg-green-950/10 border-green-900/30' 
                                       : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                                    }`}
                                 >
                                    <div 
                                       className="flex items-start gap-4 flex-1 cursor-pointer"
                                       onClick={() => toggleCheck(item.id, item.completed)}
                                    >
                                       <div className={`mt-1 transition-colors ${item.completed ? 'text-green-500' : 'text-zinc-500'}`}>
                                          {item.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                                       </div>
                                       <span className={`text-base font-medium leading-tight transition-colors ${item.completed ? 'text-zinc-600 line-through decoration-zinc-700' : 'text-zinc-200'}`}>
                                          {item.label}
                                       </span>
                                    </div>
                                    <button 
                                       onClick={() => deleteItem(item.id)}
                                       className="text-zinc-600 hover:text-red-500 transition-all p-1 hover:bg-red-950/30 rounded"
                                    >
                                       <Trash2 size={18} />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        </div>
                     ))}
                     {currentList.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-zinc-600 italic border-2 border-dashed border-zinc-800 rounded-xl">
                           <p>No hay items en esta lista.</p>
                           <p className="text-sm">Añade uno abajo.</p>
                        </div>
                     )}
                  </div>
               )}
            </div>

            {/* Input Area */}
            <div className="p-5 md:p-6 bg-zinc-900 border-t border-zinc-700 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
               <div className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    placeholder={`Añadir a ${activeChecklistTab === 'tasks' ? 'Tareas' : activeChecklistTab === 'locations' ? 'Localizaciones' : 'Equipo'}...`}
                    className="bg-black/50 border border-zinc-700 text-base text-white p-4 rounded-lg focus:outline-none focus:border-red-600 transition-colors"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItem()}
                  />
                  <div className="flex gap-3">
                    <select 
                      className="bg-black/50 border border-zinc-700 text-sm md:text-base text-zinc-300 p-3 rounded-lg focus:outline-none focus:border-red-600 flex-1 appearance-none"
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                    >
                      <option value="">-- Categoría (Opcional) --</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      <option value="Nueva Categoría">+ Nueva Categoría</option>
                    </select>
                    <button 
                      onClick={addItem}
                      className="bg-red-700 hover:bg-red-600 text-white px-6 rounded-lg transition-all flex items-center justify-center shadow-lg font-bold uppercase tracking-wider text-sm"
                    >
                      <Plus size={20} className="mr-2" /> Añadir
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 4: MASTER PRODUCTION BIBLE (EDITABLE) */}
        <section className="space-y-6">
            <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
              <Film className="text-red-500 w-8 h-8" />
              <h2 className="text-3xl md:text-4xl font-cinzel text-white">Production Bible: Master Plan</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* 1. SCRIPT BREAKDOWN */}
               <EditableBibleCard 
                  title="Script Breakdown Sheet" 
                  icon={Clapperboard} 
                  className="border-zinc-800"
                  sectionKey="breakdown"
                  content={bibleData.breakdown}
                  onSave={saveBibleSection}
                  isOnline={hasSupabaseCredentials()}
               />

               {/* 2. SHOOTING SCHEDULE LOGICS */}
               <EditableBibleCard 
                  title="Logística de Rodaje: Menorca" 
                  icon={CalendarClock} 
                  className="border-zinc-800"
                  sectionKey="schedule"
                  content={bibleData.schedule}
                  onSave={saveBibleSection}
                  isOnline={hasSupabaseCredentials()}
               />

               {/* 3. SFX NEEDS */}
               <EditableBibleCard 
                  title="Efectos Prácticos (SFX)" 
                  icon={Droplet} 
                  className="border-zinc-800"
                  sectionKey="sfx"
                  content={bibleData.sfx}
                  onSave={saveBibleSection}
                  isOnline={hasSupabaseCredentials()}
               />

               {/* 4. POST-PRODUCTION WORKFLOW */}
               <EditableBibleCard 
                  title="Workflow: Textura VHS 4K" 
                  icon={MonitorPlay} 
                  className="border-zinc-800"
                  sectionKey="workflow"
                  content={bibleData.workflow}
                  onSave={saveBibleSection}
                  isOnline={hasSupabaseCredentials()}
               />

               {/* 5. SEGURIDAD & LOGÍSTICA */}
               <EditableBibleCard 
                  title="Protocolo Seguridad: Isla" 
                  icon={Siren} 
                  className="border-zinc-800 col-span-1 md:col-span-2"
                  sectionKey="security"
                  content={bibleData.security}
                  onSave={saveBibleSection}
                  isOnline={hasSupabaseCredentials()}
               />

            </div>
        </section>

        {/* SECCIÓN 5: ESTRUCTURA & VISUALES (LAYOUT MEJORADO) - MANTENIDA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Timeline Guion */}
           <Card title="Estructura Narrativa" icon={Clock} color="border-zinc-800">
              <div className="space-y-6 relative ml-2">
                 <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-zinc-800"></div>
                 {acts.map((act) => (
                    <div key={act.id} className="relative pl-10 group">
                       <div className={`absolute left-2 top-2 w-3 h-3 rounded-full border-2 z-10 transition-all ${expandedAct === act.id ? 'bg-red-600 border-red-600 scale-125' : 'bg-black border-zinc-600'}`}></div>
                       
                       <div 
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${expandedAct === act.id ? 'bg-zinc-900 border-red-900/50 shadow-md' : 'bg-transparent border-transparent hover:bg-zinc-900/30'}`}
                          onClick={() => setExpandedAct(expandedAct === act.id ? null : act.id)}
                       >
                          <div className="flex justify-between items-center mb-1">
                             <span className="text-red-500 font-bold font-courier text-xs tracking-widest">{act.id}</span>
                             <span className="text-zinc-500 text-xs font-mono">{act.time}</span>
                          </div>
                          <h3 className="font-bold text-white text-lg mb-2">{act.title}</h3>
                          
                          {expandedAct === act.id && (
                             <ul className="space-y-2 mt-3 pl-2 border-l-2 border-zinc-800">
                                {act.points.map((p, i) => (
                                   <li key={i} className="text-sm text-zinc-400 leading-relaxed">{p}</li>
                                ))}
                             </ul>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </Card>

           {/* Referencias Visuales */}
           <div className="space-y-6">
              <Card title="Visual Ref" icon={Eye}>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/50 p-4 rounded-lg border border-zinc-800">
                       <h4 className="text-white font-bold mb-2 text-sm">Cámara</h4>
                       <p className="text-zinc-400 text-sm">Voyeur vs Caos Handheld. Textura VHS auténtica (tracking lines, ruido).</p>
                    </div>
                    <div className="bg-black/50 p-4 rounded-lg border border-zinc-800">
                       <h4 className="text-white font-bold mb-2 text-sm">Luz</h4>
                       <p className="text-zinc-400 text-sm">Mundo real frío y estéril vs Mundo VHS saturado y cálido.</p>
                    </div>
                 </div>
              </Card>

              <Card title="Sonido & BSO" icon={Music}>
                 <p className="text-sm text-zinc-400 mb-4">Estilo <span className="text-white font-bold">Trent Reznor / Cliff Martinez</span>. Zumbido eléctrico de 30Hz constante.</p>
                 <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300 border border-zinc-700">Drones Bajos</span>
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300 border border-zinc-700">Metal Chirriante</span>
                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300 border border-zinc-700">Latidos Sincopados</span>
                 </div>
              </Card>
           </div>
        </div>

      </main>

      {/* FOOTER FIXED */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur border-t border-zinc-800 p-4 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs text-zinc-500 font-courier">
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></div>
              <span className="font-bold tracking-wider text-red-700">GRABANDO SESIÓN</span>
           </div>
           <div>BLOODCASH TEAM © 2024</div>
        </div>
      </footer>

    </div>
  );
};

export default App;