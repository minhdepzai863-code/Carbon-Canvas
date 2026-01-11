
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { MoleculeData, Atom, Bond, TooltipInteractionPreference } from '../types';
import { 
  Loader2, MousePointer2, PlusCircle, AlertTriangle, Settings2, X, Trash2, 
  Info, Link as LinkIcon, RefreshCw, Layers, Scissors, PlusSquare, 
  ChevronRight, ChevronLeft, Check, FlaskConical, Search, Atom as AtomIcon, 
  Undo2, Redo2, Sparkles
} from 'lucide-react';

interface MoleculeVisualizerProps {
  data: MoleculeData | null;
  loading: boolean;
  onAnalyze?: (data: MoleculeData) => void;
}

type EditMode = 'view' | 'add-atom' | 'delete-atom' | 'bonding';

interface TooltipState {
    x: number;
    y: number;
    atom: Atom;
    valencyInfo: { current: number; max: number; warning?: boolean };
}

interface ElementInfo {
    color: string;
    radius: number;
    name: string;
    description: string;
    maxBonds: number;
    atomicNumber: number;
    category: string;
}

const PERIODIC_TABLE: Record<string, ElementInfo> = {
  H:  { color: '#FFFFFF', radius: 14, name: 'Hydrogen', description: 'Simplest element.', maxBonds: 1, atomicNumber: 1, category: 'Core Organogens' },
  C:  { color: '#404040', radius: 22, name: 'Carbon', description: 'The backbone of organic life.', maxBonds: 4, atomicNumber: 6, category: 'Core Organogens' },
  N:  { color: '#3050F8', radius: 22, name: 'Nitrogen', description: 'Found in amino acids.', maxBonds: 4, atomicNumber: 7, category: 'Core Organogens' },
  O:  { color: '#FF0D0D', radius: 22, name: 'Oxygen', description: 'Key in alcohols and carbonyls.', maxBonds: 2, atomicNumber: 8, category: 'Core Organogens' },
  F:  { color: '#90E050', radius: 20, name: 'Fluorine', description: 'Most electronegative.', maxBonds: 1, atomicNumber: 9, category: 'Halogens' },
  CL: { color: '#1FF01F', radius: 22, name: 'Chlorine', description: 'Common halogen.', maxBonds: 1, atomicNumber: 17, category: 'Halogens' },
  BR: { color: '#A62929', radius: 24, name: 'Bromine', description: 'Excellent leaving group.', maxBonds: 1, atomicNumber: 35, category: 'Halogens' },
  I:  { color: '#940094', radius: 26, name: 'Iodine', description: 'Large halogen.', maxBonds: 1, atomicNumber: 53, category: 'Halogens' },
  P:  { color: '#FF8000', radius: 24, name: 'Phosphorus', description: 'Found in DNA.', maxBonds: 5, atomicNumber: 15, category: 'Non-Metals' },
  S:  { color: '#FFFF30', radius: 24, name: 'Sulfur', description: 'Found in proteins.', maxBonds: 6, atomicNumber: 16, category: 'Non-Metals' },
  B:  { color: '#FFB5B5', radius: 22, name: 'Boron', description: 'Used in hydroboration.', maxBonds: 3, atomicNumber: 5, category: 'Metalloids' },
  UNKNOWN: { color: '#FF1493', radius: 20, name: 'Unknown', description: 'Mysterious element.', maxBonds: 4, atomicNumber: 0, category: 'Other' }
};

const CATEGORIES = ['Core Organogens', 'Halogens', 'Non-Metals', 'Metalloids'];

const CHEMICAL_GROUPS = [
    { label: 'Methyl', formula: '-CH3', atoms: [{ element: 'C' }, { element: 'H' }, { element: 'H' }, { element: 'H' }], bonds: [[0, 1], [0, 2], [0, 3]] },
    { label: 'Ethyl', formula: '-CH2CH3', atoms: [{ element: 'C' }, { element: 'C' }, { element: 'H' }, { element: 'H' }, { element: 'H' }, { element: 'H' }, { element: 'H' }], bonds: [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [1, 6]] },
    { label: 'Phenyl', formula: '-C6H5', atoms: [{ element: 'C' }, { element: 'C' }, { element: 'C' }, { element: 'C' }, { element: 'C' }, { element: 'C' }, { element: 'H' }, { element: 'H' }, { element: 'H' }, { element: 'H' }, { element: 'H' }], bonds: [[0, 1, 2], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 0, 1]] },
    { label: 'Hydroxyl', formula: '-OH', atoms: [{ element: 'O' }, { element: 'H' }], bonds: [[0, 1]] },
    { label: 'Amine', formula: '-NH2', atoms: [{ element: 'N' }, { element: 'H' }, { element: 'H' }], bonds: [[0, 1], [0, 2]] },
];

const getElementData = (symbol: string) => PERIODIC_TABLE[symbol.toUpperCase()] || PERIODIC_TABLE.UNKNOWN;

const MoleculeVisualizer: React.FC<MoleculeVisualizerProps> = ({ data, loading, onAnalyze }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<any[]>([]); 
  const transformRef = useRef(d3.zoomIdentity); 
  const simulationRef = useRef<any>(null);
  
  const [localData, setLocalData] = useState<MoleculeData | null>(null);
  const [history, setHistory] = useState<MoleculeData[]>([]);
  const [redoStack, setRedoStack] = useState<MoleculeData[]>([]);

  const [mode, setMode] = useState<EditMode>('view');
  const [selectedElement, setSelectedElement] = useState('C');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showChemTable, setShowChemTable] = useState(true);
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [bondingFrom, setBondingFrom] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");

  const [interactionPrefs, setInteractionPrefs] = useState<TooltipInteractionPreference>({
    showDelete: true,
    showBond: true,
    showSwap: true,
    showGroup: true,
    showInfo: true,
    quantumView: false
  });

  useEffect(() => {
    if (data) {
      setLocalData(JSON.parse(JSON.stringify(data)));
      setHistory([]);
      setRedoStack([]);
      setMode('view');
      nodesRef.current = [];
    }
  }, [data]);

  const getCurrentSnapshot = useCallback((): MoleculeData | null => {
    if (!localData) return null;
    return {
        ...localData,
        atoms: nodesRef.current.map((n: any) => ({ ...n })),
        bonds: localData.bonds.map(b => ({
            source: typeof b.source === 'object' ? (b.source as any).id : b.source,
            target: typeof b.target === 'object' ? (b.target as any).id : b.target,
            order: b.order,
            stereo: b.stereo
        }))
    };
  }, [localData]);

  const pushToHistory = useCallback(() => {
    const snap = getCurrentSnapshot();
    if (snap) {
        setHistory(prev => [...prev.slice(-29), JSON.parse(JSON.stringify(snap))]);
        setRedoStack([]);
    }
  }, [getCurrentSnapshot]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const current = getCurrentSnapshot();
    const prev = history[history.length - 1];
    if (current) setRedoStack(rs => [...rs, JSON.parse(JSON.stringify(current))]);
    setHistory(h => h.slice(0, -1));
    setLocalData(prev);
  };

  const handleUpdateLocal = (newData: MoleculeData) => {
      pushToHistory();
      setLocalData(newData);
      setTooltip(null);
  };

  const deleteAtom = (atomId: string) => {
      const current = getCurrentSnapshot();
      if (!current) return;
      const newAtoms = current.atoms.filter(a => a.id !== atomId);
      const newBonds = current.bonds.filter(b => {
          const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
          const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
          return s !== atomId && t !== atomId;
      });
      handleUpdateLocal({ ...current, atoms: newAtoms, bonds: newBonds });
  };

  const swapElement = (atomId: string) => {
      const current = getCurrentSnapshot();
      if (!current) return;
      const elements = ['C', 'H', 'O', 'N', 'P', 'S', 'F', 'CL'];
      const newAtoms = current.atoms.map(a => {
          if (a.id === atomId) {
              const targetElement = elements[(elements.indexOf(a.element.toUpperCase()) + 1) % elements.length];
              return { ...a, element: targetElement };
          }
          return a;
      });
      handleUpdateLocal({ ...current, atoms: newAtoms });
  };

  const startBonding = (atomId: string) => {
      setBondingFrom(atomId);
      setMode('bonding');
      setTooltip(null);
  };

  const handleAddAtom = (screenX: number, screenY: number) => {
      const snapshot = getCurrentSnapshot();
      if (!snapshot) return;
      const transform = transformRef.current;
      const worldX = (screenX - transform.x) / transform.k;
      const worldY = (screenY - transform.y) / transform.k;
      const newAtom: Atom = { id: `new-${Date.now()}`, element: selectedElement, x: worldX, y: worldY };
      handleUpdateLocal({ ...snapshot, atoms: [...snapshot.atoms, newAtom] });
  };

  const getCurrentBondCount = (atomId: string, bonds: Bond[]): number => {
      let count = 0;
      bonds.forEach(b => {
          const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
          const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
          if (s === atomId || t === atomId) count += b.order;
      });
      return count;
  }

  useEffect(() => {
    if (!localData || !svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Define Glow Filter
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "quantum-glow");
    filter.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", "12").attr("result", "blur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const nodes = localData.atoms.map(a => ({ ...a }));
    const links = localData.bonds.map(b => ({
        source: typeof b.source === 'object' ? (b.source as any).id : b.source,
        target: typeof b.target === 'object' ? (b.target as any).id : b.target,
        order: b.order,
        stereo: b.stereo
    }));

    nodesRef.current = nodes;

    const g = svg.append("g");
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .on("zoom", (event) => {
          g.attr("transform", event.transform as any);
          transformRef.current = event.transform;
      });
    svg.call(zoomBehavior as any).call(zoomBehavior.transform as any, transformRef.current);

    const simulation = d3.forceSimulation(nodes as any)
        .force("link", d3.forceLink(links).id((d: any) => d.id).distance(80))
        .force("charge", d3.forceManyBody().strength(-600))
        .force("collision", d3.forceCollide().radius(45))
        .force("center", d3.forceCenter(width / 2, height / 2));
    
    simulationRef.current = simulation;

    const bondGroup = g.append("g").attr("class", "bonds");
    const bondLine = (d: any, offset: number) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return "";
        const nx = -dy / length;
        const ny = dx / length;
        const x1 = d.source.x + nx * offset;
        const y1 = d.source.y + ny * offset;
        const x2 = d.target.x + nx * offset;
        const y2 = d.target.y + ny * offset;
        return `M ${x1} ${y1} L ${x2} ${y2}`;
    };

    const linksSelection = bondGroup.selectAll(".bond-set")
        .data(links)
        .enter().append("g")
        .attr("class", "bond-set");

    linksSelection.each(function(d: any) {
        const sel = d3.select(this);
        if (d.order === 1) {
            sel.append("path").attr("stroke", "#cbd5e1").attr("stroke-width", 4).attr("fill", "none");
        } else if (d.order === 2) {
            sel.append("path").attr("class", "bond-p1").attr("stroke", "#cbd5e1").attr("stroke-width", 3).attr("fill", "none");
            sel.append("path").attr("class", "bond-p2").attr("stroke", "#cbd5e1").attr("stroke-width", 3).attr("fill", "none");
        } else if (d.order === 3) {
            sel.append("path").attr("class", "bond-p1").attr("stroke", "#cbd5e1").attr("stroke-width", 2.5).attr("fill", "none");
            sel.append("path").attr("class", "bond-p2").attr("stroke", "#cbd5e1").attr("stroke-width", 2.5).attr("fill", "none");
            sel.append("path").attr("class", "bond-p3").attr("stroke", "#cbd5e1").attr("stroke-width", 2.5).attr("fill", "none");
        }
    });

    const nodeSelection = g.append("g").attr("class", "atoms")
        .selectAll("g")
        .data(nodes)
        .enter().append("g")
        .on("mouseenter", (event, d: any) => {
             const atomData = getElementData(d.element);
             const currentBonds = getCurrentBondCount(d.id, localData.bonds);
             setTooltip({
                 x: event.pageX,
                 y: event.pageY,
                 atom: d,
                 valencyInfo: { current: currentBonds, max: atomData.maxBonds, warning: currentBonds > atomData.maxBonds }
             });
        })
        .on("click", (event, d: any) => {
            event.stopPropagation();
            if (mode === 'delete-atom') deleteAtom(d.id);
            else if (mode === 'bonding' && bondingFrom && bondingFrom !== d.id) {
                const snapshot = getCurrentSnapshot();
                if(!snapshot) return;
                handleUpdateLocal({ ...snapshot, bonds: [...snapshot.bonds, { source: bondingFrom, target: d.id, order: 1 }] });
                setBondingFrom(null);
                setMode('view');
            }
        });

    // Quantum Cloud Overlay
    if (interactionPrefs.quantumView) {
        nodeSelection.append("circle")
            .attr("r", d => getElementData(d.element).radius + 30)
            .attr("fill", d => getElementData(d.element).color)
            .attr("opacity", 0.15)
            .style("filter", "url(#quantum-glow)");
    }

    nodeSelection.append("circle")
        .attr("r", d => getElementData(d.element).radius)
        .attr("fill", d => getElementData(d.element).color)
        .attr("stroke", d => d.id === bondingFrom ? "#3b82f6" : "#fff")
        .attr("stroke-width", d => d.id === bondingFrom ? 6 : 3)
        .style("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.15))");

    nodeSelection.append("text")
        .text(d => d.element)
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .style("fill", d => getElementData(d.element).color === '#FFFFFF' ? '#334155' : '#fff')
        .style("font-weight", "900")
        .style("font-size", "14px");

    simulation.on("tick", () => {
        linksSelection.each(function(d: any) {
            const group = d3.select(this);
            if (d.order === 1) group.select("path").attr("d", bondLine(d, 0));
            else if (d.order === 2) {
                group.select(".bond-p1").attr("d", bondLine(d, -3));
                group.select(".bond-p2").attr("d", bondLine(d, 3));
            } else if (d.order === 3) {
                group.select(".bond-p1").attr("d", bondLine(d, -5));
                group.select(".bond-p2").attr("d", bondLine(d, 0));
                group.select(".bond-p3").attr("d", bondLine(d, 5));
            }
        });
        nodeSelection.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    svg.on("click", (event) => {
        if (mode === 'add-atom') handleAddAtom(d3.pointer(event)[0], d3.pointer(event)[1]);
    });

    return () => { simulation.stop(); };
  }, [localData, mode, bondingFrom, interactionPrefs.quantumView]);

  const toggleInteractionPref = (key: keyof TooltipInteractionPreference) => {
      setInteractionPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderTooltip = () => {
      if (!tooltip || !tooltip.atom) return null;
      const atomData = getElementData(tooltip.atom.element);
      return (
        <div 
            className="fixed bg-skin-surface/98 backdrop-blur-2xl text-skin-main p-6 rounded-[2.5rem] shadow-2xl z-[100] border border-skin-border text-sm min-w-[280px] animate-pop" 
            style={{ left: tooltip.x + 24, top: tooltip.y + 24 }}
            onMouseLeave={() => setTooltip(null)}
        >
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-skin-border">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl" style={{ backgroundColor: atomData.color, color: atomData.color === '#FFFFFF' ? '#334155' : '#fff' }}>
                    {tooltip.atom.element}
                </div>
                <div>
                    <div className="font-black text-lg">{atomData.name}</div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${tooltip.valencyInfo.warning ? 'bg-red-500 text-white' : 'bg-skin-primary text-white'}`}>
                        Bonds: {tooltip.valencyInfo.current} / {tooltip.valencyInfo.max}
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => startBonding(tooltip.atom.id)} className="flex items-center justify-center gap-2 bg-skin-primary text-white p-2 rounded-xl text-xs font-bold"><LinkIcon size={14}/> Link</button>
                <button onClick={() => swapElement(tooltip.atom.id)} className="flex items-center justify-center gap-2 bg-skin-base text-skin-main p-2 rounded-xl text-xs font-bold"><RefreshCw size={14}/> Cycle</button>
                <button onClick={() => deleteAtom(tooltip.atom.id)} className="flex items-center justify-center gap-2 bg-red-50 text-red-600 p-2 rounded-xl text-xs font-bold"><Scissors size={14}/> Cut</button>
            </div>
        </div>
      );
  };

  const currentCategory = CATEGORIES[activeCategoryIdx];
  const elementsInCategory = Object.entries(PERIODIC_TABLE).filter(([_, info]) => info.category === currentCategory);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-skin-sidebar-bg overflow-hidden flex flex-col">
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[60]">
                <div className="bg-skin-surface p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4 border border-skin-border animate-pop">
                    <Loader2 className="animate-spin w-12 h-12 text-skin-primary" />
                    <span className="font-black text-skin-main uppercase tracking-widest text-xs">Simulating Quantum State...</span>
                </div>
            </div>
        )}
        
        <div className="absolute top-8 left-8 flex flex-col gap-4 bg-skin-surface/90 backdrop-blur-2xl border border-skin-border p-3 rounded-[2rem] shadow-2xl z-20">
            <button onClick={() => setMode('view')} className={`p-3 rounded-xl ${mode === 'view' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`}><MousePointer2 size={24}/></button>
            <button onClick={() => setMode('add-atom')} className={`p-3 rounded-xl ${mode === 'add-atom' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`}><PlusCircle size={24}/></button>
            <button onClick={() => setMode('delete-atom')} className={`p-3 rounded-xl ${mode === 'delete-atom' ? 'bg-red-500 text-white' : 'text-skin-muted hover:bg-red-50'}`}><Trash2 size={24}/></button>
            <div className="h-px bg-skin-border mx-2"></div>
            <button onClick={handleUndo} className="p-3 text-skin-main hover:bg-skin-base"><Undo2 size={24}/></button>
            <button onClick={() => setShowChemTable(!showChemTable)} className={`p-3 rounded-xl ${showChemTable ? 'bg-emerald-500 text-white' : 'text-skin-muted hover:bg-skin-base'}`}><FlaskConical size={24}/></button>
            <button onClick={() => toggleInteractionPref('quantumView')} className={`p-3 rounded-xl ${interactionPrefs.quantumView ? 'bg-indigo-500 text-white' : 'text-skin-muted hover:bg-skin-base'}`}><Sparkles size={24}/></button>
            <button onClick={() => setShowSettings(!showSettings)} className={`p-3 rounded-xl ${showSettings ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`}><Settings2 size={24}/></button>
        </div>

        {showChemTable && (
            <div className="absolute top-8 right-8 bg-skin-surface/90 backdrop-blur-2xl border border-skin-border p-6 rounded-[2.5rem] shadow-2xl z-20 animate-enter w-[340px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-xs uppercase tracking-widest text-skin-muted">Element Stash</h3>
                    <button onClick={() => setShowChemTable(false)} className="p-1 hover:bg-skin-base rounded-full"><X size={16}/></button>
                </div>
                <div className="flex items-center justify-between mb-4 bg-skin-base p-2 rounded-xl">
                    <button onClick={() => setActiveCategoryIdx(p => (p - 1 + CATEGORIES.length) % CATEGORIES.length)}><ChevronLeft size={16}/></button>
                    <span className="text-[10px] font-black uppercase text-skin-main">{currentCategory}</span>
                    <button onClick={() => setActiveCategoryIdx(p => (p + 1) % CATEGORIES.length)}><ChevronRight size={16}/></button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {elementsInCategory.map(([symbol, data]) => (
                        <button 
                            key={symbol} 
                            onClick={() => setSelectedElement(symbol)}
                            className={`h-12 rounded-xl border-2 flex items-center justify-center transition-all ${selectedElement === symbol ? 'border-skin-primary bg-skin-primary text-white scale-110 shadow-lg' : 'border-skin-border bg-skin-base'}`}
                        >
                            <span className="text-sm font-black">{symbol}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {showSettings && (
            <div className="absolute top-8 left-28 bg-skin-surface border border-skin-border p-6 rounded-[2rem] shadow-2xl z-[70] animate-enter w-[280px]">
                <h3 className="font-black text-sm mb-4">Interaction Rules</h3>
                <div className="space-y-2">
                    {['showBond', 'showDelete', 'showSwap', 'showGroup'].map((key) => (
                        <button 
                            key={key}
                            onClick={() => toggleInteractionPref(key as any)}
                            className={`flex items-center justify-between w-full p-3 rounded-xl border ${interactionPrefs[key as keyof TooltipInteractionPreference] ? 'bg-skin-primary text-white' : 'bg-skin-base text-skin-muted'}`}
                        >
                            <span className="text-xs font-bold uppercase">{key.replace('show', '')} Tool</span>
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        <div className="flex-1 w-full h-full relative">
            <svg ref={svgRef} className="w-full h-full cursor-crosshair touch-none select-none"></svg>
        </div>

        {renderTooltip()}
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-skin-surface/80 backdrop-blur-2xl border border-skin-border px-8 py-3 rounded-full shadow-2xl z-10 flex items-center gap-8">
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-skin-muted uppercase tracking-widest">Total Atoms</span>
                <span className="text-lg font-black text-skin-main leading-none">{localData?.atoms.length || 0}</span>
            </div>
            <div className="w-px h-6 bg-skin-border"></div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-skin-muted uppercase tracking-widest">Bonds</span>
                <span className="text-lg font-black text-skin-main leading-none">{localData?.bonds.length || 0}</span>
            </div>
        </div>
    </div>
  );
};

export default MoleculeVisualizer;
