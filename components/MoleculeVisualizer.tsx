
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { MoleculeData, Atom, Bond, TooltipInteractionPreference } from '../types';
import { 
  Loader2, MousePointer2, PlusCircle, AlertTriangle, Settings2, X, Trash2, 
  Info, Link as LinkIcon, RefreshCw, Layers, Scissors, PlusSquare, 
  ChevronRight, ChevronLeft, Check, FlaskConical, Search, Atom as AtomIcon, 
  Undo2, Redo2, Beaker
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
  // Core Organic
  H:  { color: '#FFFFFF', radius: 14, name: 'Hydrogen', description: 'Simplest element, found in almost all organic molecules.', maxBonds: 1, atomicNumber: 1, category: 'Core Organogens' },
  C:  { color: '#404040', radius: 22, name: 'Carbon', description: 'The backbone of organic life.', maxBonds: 4, atomicNumber: 6, category: 'Core Organogens' },
  N:  { color: '#3050F8', radius: 22, name: 'Nitrogen', description: 'Found in amino acids and DNA bases.', maxBonds: 4, atomicNumber: 7, category: 'Core Organogens' },
  O:  { color: '#FF0D0D', radius: 22, name: 'Oxygen', description: 'Key in alcohols, ethers, and carbonyls.', maxBonds: 2, atomicNumber: 8, category: 'Core Organogens' },
  
  // Halogens
  F:  { color: '#90E050', radius: 20, name: 'Fluorine', description: 'Smallest, most electronegative halogen.', maxBonds: 1, atomicNumber: 9, category: 'Halogens' },
  CL: { color: '#1FF01F', radius: 22, name: 'Chlorine', description: 'Common in chlorinated solvents and reagents.', maxBonds: 1, atomicNumber: 17, category: 'Halogens' },
  BR: { color: '#A62929', radius: 24, name: 'Bromine', description: 'Used in radical bromination and substitution.', maxBonds: 1, atomicNumber: 35, category: 'Halogens' },
  I:  { color: '#940094', radius: 26, name: 'Iodine', description: 'Large halogen, excellent leaving group.', maxBonds: 1, atomicNumber: 53, category: 'Halogens' },
  
  // Non-metals
  P:  { color: '#FF8000', radius: 24, name: 'Phosphorus', description: 'Found in DNA and Wittig reagents.', maxBonds: 5, atomicNumber: 15, category: 'Non-Metals' },
  S:  { color: '#FFFF30', radius: 24, name: 'Sulfur', description: 'Found in thiols, thioethers, and proteins.', maxBonds: 6, atomicNumber: 16, category: 'Non-Metals' },
  SE: { color: '#FFA824', radius: 24, name: 'Selenium', description: 'Used in specialized redox chemistry.', maxBonds: 6, atomicNumber: 34, category: 'Non-Metals' },
  
  // Metalloids
  B:  { color: '#FFB5B5', radius: 22, name: 'Boron', description: 'Used in hydroboration-oxidation reactions.', maxBonds: 3, atomicNumber: 5, category: 'Metalloids' },
  SI: { color: '#F0C8A0', radius: 24, name: 'Silicon', description: 'Found in protecting groups (e.g., TMS).', maxBonds: 4, atomicNumber: 14, category: 'Metalloids' },
  AS: { color: '#BD80E3', radius: 24, name: 'Arsenic', description: 'Toxic, but features in some specialized organometallics.', maxBonds: 3, atomicNumber: 33, category: 'Metalloids' },

  // Metals & Catalysts
  LI: { color: '#CC80FF', radius: 26, name: 'Lithium', description: 'Used in organolithium reagents (n-BuLi).', maxBonds: 1, atomicNumber: 3, category: 'Metals & Catalysts' },
  NA: { color: '#AB5CF2', radius: 28, name: 'Sodium', description: 'Common counterion and reducing agent.', maxBonds: 1, atomicNumber: 11, category: 'Metals & Catalysts' },
  MG: { color: '#8AFF00', radius: 28, name: 'Magnesium', description: 'The heart of Grignard reagents.', maxBonds: 2, atomicNumber: 12, category: 'Metals & Catalysts' },
  PD: { color: '#00698E', radius: 28, name: 'Palladium', description: 'The premier cross-coupling catalyst (Suzuki, Heck).', maxBonds: 4, atomicNumber: 46, category: 'Metals & Catalysts' },
  PT: { color: '#D0D0E0', radius: 28, name: 'Platinum', description: 'Used for catalytic hydrogenation.', maxBonds: 4, atomicNumber: 78, category: 'Metals & Catalysts' },
  CU: { color: '#C88033', radius: 26, name: 'Copper', description: 'Used in Gilman reagents and click chemistry.', maxBonds: 4, atomicNumber: 29, category: 'Metals & Catalysts' },
  
  UNKNOWN: { color: '#FF1493', radius: 20, name: 'Unknown', description: 'Mysterious element.', maxBonds: 4, atomicNumber: 0, category: 'Other' }
};

const CATEGORIES = ['Core Organogens', 'Halogens', 'Non-Metals', 'Metalloids', 'Metals & Catalysts'];

const CHEMICAL_GROUPS = [
    { label: 'Methyl', formula: '-CH3', atoms: [{ element: 'C' }, { element: 'H' }, { element: 'H' }, { element: 'H' }], bonds: [[0, 1], [0, 2], [0, 3]] },
    { label: 'Ethyl', formula: '-CH2CH3', atoms: [{ element: 'C' }, { element: 'C' }, { element: 'H' }, { element: 'H' }, { element: 'H' }, { element: 'H' }, { element: 'H' }], bonds: [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [1, 6]] },
    { label: 'Phenyl', formula: '-C6H5', atoms: [{ element: 'C' }, { element: 'C' }, { element: 'C' }, { element: 'C' }, { element: 'C' }, { element: 'C' }, { element: 'H' }, { element: 'H' }, { element: 'H' }, { element: 'H' }, { element: 'H' }], bonds: [[0, 1, 2], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 0, 1], [1, 6, 1], [2, 7, 1], [3, 8, 1], [4, 9, 1], [5, 10, 1]] },
    { label: 'Acetyl', formula: '-COCH3', atoms: [{ element: 'C' }, { element: 'O' }, { element: 'C' }, { element: 'H' }, { element: 'H' }, { element: 'H' }], bonds: [[0, 1, 2], [0, 2, 1], [2, 3, 1], [2, 4, 1], [2, 5, 1]] },
    { label: 'Hydroxyl', formula: '-OH', atoms: [{ element: 'O' }, { element: 'H' }], bonds: [[0, 1]] },
    { label: 'Amine', formula: '-NH2', atoms: [{ element: 'N' }, { element: 'H' }, { element: 'H' }], bonds: [[0, 1], [0, 2]] },
    { label: 'Nitro', formula: '-NO2', atoms: [{ element: 'N' }, { element: 'O' }, { element: 'O' }], bonds: [[0, 1, 2], [0, 2, 1]] },
    { label: 'Cyano', formula: '-CN', atoms: [{ element: 'C' }, { element: 'N' }], bonds: [[0, 1, 3]] },
    { label: 'Carboxyl', formula: '-COOH', atoms: [{ element: 'C' }, { element: 'O' }, { element: 'O' }, { element: 'H' }], bonds: [[0, 1, 2], [0, 2, 1], [2, 3, 1]] },
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    showInfo: true
  });

  useEffect(() => {
    if (data) {
      setLocalData(JSON.parse(JSON.stringify(data)));
      setHistory([]);
      setRedoStack([]);
      setMode('view');
      setTooltip(null);
      setErrorMsg(null);
      setBondingFrom(null);
      nodesRef.current = [];
    }
  }, [data]);

  const getCurrentSnapshot = useCallback((): MoleculeData | null => {
    if (!localData) return null;
    const currentNodes = nodesRef.current;
    const atomPosMap = new Map<string, {x: number, y: number, vx: number, vy: number}>(
        currentNodes.map((n: any) => [n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }])
    );
    return {
        ...localData,
        atoms: localData.atoms.map(a => {
            const pos = atomPosMap.get(a.id);
            return pos ? { ...a, x: pos.x, y: pos.y, vx: pos.vx, vy: pos.vy } : a;
        }),
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
        setHistory(prev => [...prev.slice(-29), JSON.parse(JSON.stringify(snap))]); // Limit history to 30 steps
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
    setTooltip(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const current = getCurrentSnapshot();
    const next = redoStack[redoStack.length - 1];
    if (current) setHistory(h => [...h, JSON.parse(JSON.stringify(current))]);
    setRedoStack(rs => rs.slice(0, -1));
    setLocalData(next);
    setTooltip(null);
  };

  const handleUpdateLocal = (newData: MoleculeData) => {
      pushToHistory();
      const snapshot = getCurrentSnapshot();
      if (!snapshot) {
          setLocalData(newData);
          return;
      }

      const atomPosMap = new Map<string, any>(snapshot.atoms.map(a => [a.id, a]));
      const stabilizedAtoms = newData.atoms.map(a => {
          const prev = atomPosMap.get(a.id);
          if (prev) return { ...a, x: prev.x, y: prev.y, vx: prev.vx, vy: prev.vy };
          return a;
      });

      setLocalData({ ...newData, atoms: stabilizedAtoms });
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

  const swapElement = (atomId: string, element?: string) => {
      const current = getCurrentSnapshot();
      if (!current) return;
      const elements = ['C', 'H', 'O', 'N', 'P', 'S', 'F', 'CL'];
      const newAtoms = current.atoms.map(a => {
          if (a.id === atomId) {
              const targetElement = element || elements[(elements.indexOf(a.element.toUpperCase()) + 1) % elements.length];
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

  const addChemicalGroup = (atomId: string, group: typeof CHEMICAL_GROUPS[number]) => {
    const current = getCurrentSnapshot();
    if (!current) return;
    const baseAtom = current.atoms.find(a => a.id === atomId);
    if (!baseAtom) return;

    const newAtoms = [...current.atoms];
    const newBonds = [...current.bonds];
    const timestamp = Date.now();
    
    const addedIds: string[] = [];
    group.atoms.forEach((ga, i) => {
        const id = `grp-${timestamp}-${i}`;
        addedIds.push(id);
        newAtoms.push({ 
            id, 
            element: ga.element, 
            x: (baseAtom.x || 0) + (Math.random() - 0.5) * 80,
            y: (baseAtom.y || 0) + (Math.random() - 0.5) * 80
        });
    });

    group.bonds.forEach((bondDef) => {
        const sIdx = bondDef[0];
        const tIdx = bondDef[1];
        const order = bondDef[2] || 1;
        newBonds.push({ source: addedIds[sIdx], target: addedIds[tIdx], order });
    });

    newBonds.push({ source: atomId, target: addedIds[0], order: 1 });
    handleUpdateLocal({ ...current, atoms: newAtoms, bonds: newBonds });
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

  // --- 2D RENDERING LOGIC ---
  useEffect(() => {
    if (!localData || !svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

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
        const order = d.order;
        if (order === 1) {
            sel.append("path").attr("stroke", "#cbd5e1").attr("stroke-width", 4).attr("fill", "none");
        } else if (order === 2) {
            sel.append("path").attr("class", "bond-p1").attr("stroke", "#cbd5e1").attr("stroke-width", 3).attr("fill", "none");
            sel.append("path").attr("class", "bond-p2").attr("stroke", "#cbd5e1").attr("stroke-width", 3).attr("fill", "none");
        } else if (order === 3) {
            sel.append("path").attr("class", "bond-p1").attr("stroke", "#cbd5e1").attr("stroke-width", 2.5).attr("fill", "none");
            sel.append("path").attr("class", "bond-p2").attr("stroke", "#cbd5e1").attr("stroke-width", 2.5).attr("fill", "none");
            sel.append("path").attr("class", "bond-p3").attr("stroke", "#cbd5e1").attr("stroke-width", 2.5).attr("fill", "none");
        }
    });

    const nodeSelection = g.append("g").attr("class", "atoms")
        .selectAll("g")
        .data(nodes)
        .enter().append("g")
        .call(d3.drag<any, any>()
            .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on("end", (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }))
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
            if (mode === 'delete-atom') {
                 deleteAtom(d.id);
            } else if (mode === 'bonding' && bondingFrom && bondingFrom !== d.id) {
                const snapshot = getCurrentSnapshot();
                if(!snapshot) return;
                const existing = snapshot.bonds.find(b => {
                    const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
                    const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
                    return (s === bondingFrom && t === d.id) || (s === d.id && t === bondingFrom);
                });

                if (existing) {
                    const newBonds = snapshot.bonds.map(b => {
                        const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
                        const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
                        if ((s === bondingFrom && t === d.id) || (s === d.id && t === bondingFrom)) {
                            return { ...b, order: (b.order % 3) + 1 };
                        }
                        return b;
                    });
                    handleUpdateLocal({ ...snapshot, bonds: newBonds });
                } else {
                    handleUpdateLocal({ ...snapshot, bonds: [...snapshot.bonds, { source: bondingFrom, target: d.id, order: 1 }] });
                }
                setBondingFrom(null);
                setMode('view');
            }
        });

    nodeSelection.append("circle")
        .attr("class", "warning-ring")
        .attr("r", d => getElementData(d.element).radius + 12)
        .attr("fill", "none")
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "4,4")
        .style("opacity", d => {
            const count = getCurrentBondCount(d.id, localData.bonds);
            return count > getElementData(d.element).maxBonds ? 0.8 : 0;
        });

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
        .style("font-size", "14px")
        .style("pointer-events", "none");

    simulation.on("tick", () => {
        linksSelection.each(function(d: any) {
            const group = d3.select(this);
            if (d.order === 1) {
                group.select("path").attr("d", bondLine(d, 0));
            } else if (d.order === 2) {
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
        if (mode === 'bonding') { setMode('view'); setBondingFrom(null); }
    });

    return () => { simulation.stop(); };
  }, [localData, mode, bondingFrom]);

  const toggleInteractionPref = (key: keyof TooltipInteractionPreference) => {
      setInteractionPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredGroups = CHEMICAL_GROUPS.filter(g => 
    g.label.toLowerCase().includes(groupSearch.toLowerCase()) || 
    g.formula.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const renderTooltip = () => {
      if (!tooltip || !tooltip.atom) return null;
      const atomData = getElementData(tooltip.atom.element);
      
      return (
        <div 
            className="fixed bg-skin-surface/98 backdrop-blur-2xl text-skin-main p-6 rounded-[2.5rem] shadow-2xl z-[100] border border-skin-border text-sm min-w-[280px] animate-pop pointer-events-auto" 
            style={{ left: tooltip.x + 24, top: tooltip.y + 24 }}
            onMouseLeave={() => { setTooltip(null); setGroupSearch(""); }}
        >
            <div className="flex items-center gap-5 mb-5 pb-5 border-b border-skin-border">
                <div className="w-16 h-16 rounded-[1.25rem] border-4 border-white/50 flex items-center justify-center font-black text-2xl shadow-xl transform -rotate-3 transition-transform hover:rotate-0" style={{ backgroundColor: atomData.color, color: atomData.color === '#FFFFFF' ? '#334155' : '#fff' }}>
                    {tooltip.atom.element}
                </div>
                <div>
                    <div className="font-black text-xl leading-tight tracking-tight">{atomData.name}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${tooltip.valencyInfo.warning ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-skin-primary text-white shadow-lg shadow-skin-primary/30'}`}>
                            Valency: {tooltip.valencyInfo.current} / {tooltip.valencyInfo.max}
                        </span>
                    </div>
                </div>
            </div>

            {interactionPrefs.showInfo && (
                <p className="text-[11px] text-skin-muted mb-6 leading-relaxed bg-skin-base/80 p-4 rounded-2xl border border-skin-border/50 font-medium">
                    {atomData.description}
                </p>
            )}

            <div className="grid grid-cols-2 gap-3 mb-6">
                {interactionPrefs.showBond && (
                    <button onClick={() => startBonding(tooltip.atom.id)} className="flex items-center justify-center gap-2 bg-skin-primary text-white p-3.5 rounded-2xl hover:scale-105 active:scale-95 transition-all text-xs font-black shadow-lg shadow-skin-primary/20"><LinkIcon size={14}/> Link</button>
                )}
                {interactionPrefs.showSwap && (
                    <button onClick={() => swapElement(tooltip.atom.id)} className="flex items-center justify-center gap-2 bg-skin-surface border-2 border-skin-border text-skin-main p-3.5 rounded-2xl hover:bg-skin-base hover:border-skin-primary transition-all text-xs font-black"><RefreshCw size={14}/> Cycle</button>
                )}
                {interactionPrefs.showDelete && (
                    <button onClick={() => deleteAtom(tooltip.atom.id)} className="flex items-center justify-center gap-2 bg-red-50 text-red-600 border-2 border-red-100 p-3.5 rounded-2xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-xs font-black shadow-lg shadow-red-500/10"><Scissors size={14}/> Cut</button>
                )}
                {interactionPrefs.showGroup && (
                    <div className="relative group/sub col-span-1">
                        <button className="flex w-full items-center justify-center gap-2 bg-indigo-50 text-indigo-600 border-2 border-indigo-100 p-3.5 rounded-2xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all text-xs font-black shadow-lg shadow-indigo-500/10"><PlusSquare size={14}/> +Grp</button>
                        <div className="absolute left-full top-0 ml-4 hidden group-hover/sub:block bg-skin-surface border-2 border-skin-border rounded-[2rem] shadow-2xl p-4 w-56 animate-enter z-[110]">
                            <div className="flex items-center gap-2 mb-3 bg-skin-base p-2 rounded-xl border border-skin-border">
                                <Search size={14} className="text-skin-muted"/>
                                <input 
                                    value={groupSearch} 
                                    onChange={(e) => setGroupSearch(e.target.value)}
                                    placeholder="Search..." 
                                    className="bg-transparent text-[11px] font-bold outline-none w-full text-skin-main"
                                />
                            </div>
                            <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {filteredGroups.map((g, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => addChemicalGroup(tooltip.atom.id, g)} 
                                        className="w-full text-left px-3 py-2.5 hover:bg-skin-primary hover:text-white rounded-xl transition-all group/btn flex items-center justify-between"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black leading-none mb-1">{g.label}</span>
                                            <span className="text-[9px] font-bold opacity-60 group-hover/btn:opacity-100 transition-opacity">{g.formula}</span>
                                        </div>
                                        <ChevronRight size={14} className="opacity-0 group-hover/btn:opacity-100 transition-all translate-x-[-4px] group-hover/btn:translate-x-0"/>
                                    </button>
                                ))}
                                {filteredGroups.length === 0 && <p className="text-[10px] text-center text-skin-muted py-4">No groups found</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="pt-4 border-t border-skin-border/50 text-center">
                 <p className="text-[10px] text-skin-muted font-bold italic opacity-60">Hover actions apply to the active atom center.</p>
            </div>
        </div>
      );
  };

  const currentCategory = CATEGORIES[activeCategoryIdx];
  const elementsInCategory = Object.entries(PERIODIC_TABLE).filter(([_, info]) => info.category === currentCategory);

  return (
    <div ref={containerRef} className="w-full h-full relative bg-skin-sidebar-bg overflow-hidden flex flex-col">
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[6px] z-[60] animate-fade-in">
                <div className="bg-skin-surface p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 border border-skin-border animate-pop">
                    <div className="relative">
                        <Loader2 className="animate-spin w-12 h-12 text-skin-primary" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <AtomIcon size={18} className="text-skin-primary opacity-50"/>
                        </div>
                    </div>
                    <div className="text-center">
                        <span className="font-black text-skin-main tracking-tight text-xl block mb-1">Quantum Simulation</span>
                        <span className="text-xs text-skin-muted font-bold uppercase tracking-widest">Applying Organic Constraints...</span>
                    </div>
                </div>
            </div>
        )}
        
        {/* Toolbox */}
        <div className="absolute top-8 left-8 flex flex-col gap-4 bg-skin-surface/90 backdrop-blur-2xl border border-skin-border p-4 rounded-[2.5rem] shadow-2xl z-20">
            <button onClick={() => setMode('view')} className={`p-4 rounded-[1.5rem] transition-all ${mode === 'view' ? 'bg-skin-primary text-white shadow-2xl shadow-skin-primary/40 scale-110' : 'text-skin-muted hover:bg-skin-base'}`} title="Select & Inspect"><MousePointer2 size={24}/></button>
            <button onClick={() => setMode('add-atom')} className={`p-4 rounded-[1.5rem] transition-all ${mode === 'add-atom' ? 'bg-skin-primary text-white shadow-2xl shadow-skin-primary/40 scale-110' : 'text-skin-muted hover:bg-skin-base'}`} title="Seed Atoms"><PlusCircle size={24}/></button>
            <button onClick={() => setMode('delete-atom')} className={`p-4 rounded-[1.5rem] transition-all ${mode === 'delete-atom' ? 'bg-red-500 text-white shadow-2xl shadow-red-500/40 scale-110' : 'text-skin-muted hover:bg-red-100 hover:text-red-500'}`} title="Delete Tool"><Trash2 size={24}/></button>
            <div className="h-px bg-skin-border mx-3"></div>
            
            {/* History Controls */}
            <button onClick={handleUndo} disabled={history.length === 0} className={`p-4 rounded-[1.5rem] transition-all ${history.length > 0 ? 'text-skin-main hover:bg-skin-base active:scale-95' : 'text-skin-muted opacity-30 cursor-not-allowed'}`} title="Undo Action"><Undo2 size={24}/></button>
            <button onClick={handleRedo} disabled={redoStack.length === 0} className={`p-4 rounded-[1.5rem] transition-all ${redoStack.length > 0 ? 'text-skin-main hover:bg-skin-base active:scale-95' : 'text-skin-muted opacity-30 cursor-not-allowed'}`} title="Redo Action"><Redo2 size={24}/></button>
            
            <div className="h-px bg-skin-border mx-3"></div>
            <button onClick={() => setShowChemTable(!showChemTable)} className={`p-4 rounded-[1.5rem] transition-all ${showChemTable ? 'bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40' : 'text-skin-muted hover:bg-skin-base'}`} title="Laboratory Stash"><FlaskConical size={24}/></button>
            <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-[1.5rem] transition-all ${showSettings ? 'bg-skin-primary text-white shadow-2xl shadow-skin-primary/40' : 'text-skin-muted hover:bg-skin-base'}`} title="UI Configuration"><Settings2 size={24}/></button>
        </div>

        {/* Paginated Periodic Table Picker */}
        {showChemTable && (
            <div className="absolute top-8 right-8 bg-skin-surface/90 backdrop-blur-2xl border border-skin-border p-8 rounded-[3.5rem] shadow-2xl z-20 animate-enter w-[420px] overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-black text-sm flex items-center gap-2 uppercase tracking-widest text-skin-muted"><FlaskConical size={18} className="text-emerald-500"/> Reagent Catalog</h3>
                        <p className="text-[10px] text-skin-muted mt-1 font-bold">SELECT SEED ELEMENT</p>
                    </div>
                    <button onClick={() => setShowChemTable(false)} className="p-2.5 hover:bg-skin-base rounded-full transition-colors"><X size={18}/></button>
                </div>
                
                {/* Category Navigation Header */}
                <div className="flex items-center justify-between mb-8 bg-skin-base/50 p-3 rounded-2xl border border-skin-border">
                    <button 
                        onClick={() => setActiveCategoryIdx(p => (p - 1 + CATEGORIES.length) % CATEGORIES.length)}
                        className="p-2 hover:bg-skin-surface rounded-xl transition-all hover:text-skin-primary"
                    >
                        <ChevronLeft size={20}/>
                    </button>
                    <div className="text-center flex-1">
                        <span className="text-[10px] font-black text-skin-muted uppercase tracking-widest block mb-1">Category {activeCategoryIdx + 1} of {CATEGORIES.length}</span>
                        <h4 className="text-xs font-black text-skin-main uppercase tracking-tight">{currentCategory}</h4>
                    </div>
                    <button 
                        onClick={() => setActiveCategoryIdx(p => (p + 1) % CATEGORIES.length)}
                        className="p-2 hover:bg-skin-surface rounded-xl transition-all hover:text-skin-primary"
                    >
                        <ChevronRight size={20}/>
                    </button>
                </div>

                <div key={currentCategory} className="grid grid-cols-4 gap-4 animate-enter">
                    {elementsInCategory.map(([symbol, data]) => (
                        <button 
                            key={symbol} 
                            onClick={() => setSelectedElement(symbol)}
                            className={`relative h-18 rounded-[1.5rem] border-2 flex flex-col items-center justify-center transition-all group overflow-hidden ${selectedElement === symbol ? 'border-skin-primary ring-4 ring-skin-primary/10 shadow-xl scale-110 z-10' : 'border-skin-border hover:border-skin-muted bg-skin-base/30'}`}
                            style={{ backgroundColor: selectedElement === symbol ? data.color : 'transparent' }}
                        >
                            <span className="text-[10px] font-black absolute top-1.5 left-2.5 opacity-40">{data.atomicNumber}</span>
                            <span className={`text-xl font-black ${selectedElement === symbol ? (data.color === '#FFFFFF' ? 'text-slate-800' : 'text-white') : 'text-skin-main'}`}>{symbol}</span>
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${selectedElement === symbol ? (data.color === '#FFFFFF' ? 'text-slate-500' : 'text-white/60') : 'text-skin-muted'}`}>{data.name}</span>
                            {selectedElement === symbol && <div className="absolute bottom-1.5 right-2"><Check size={12} className={selectedElement === symbol && data.color === '#FFFFFF' ? 'text-emerald-500' : 'text-white'}/></div>}
                        </button>
                    ))}
                    {/* Filling grid if needed */}
                    {Array.from({ length: Math.max(0, 8 - elementsInCategory.length) }).map((_, i) => (
                        <div key={i} className="h-18 rounded-[1.5rem] border-2 border-dashed border-skin-border/20"></div>
                    ))}
                </div>
                
                <div className="mt-8 flex justify-center gap-1.5">
                    {CATEGORIES.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all ${i === activeCategoryIdx ? 'w-6 bg-skin-primary' : 'w-1.5 bg-skin-border'}`}></div>
                    ))}
                </div>

                <div className="mt-6 pt-6 border-t border-skin-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse border-2 border-white shadow-sm"></div>
                         <span className="text-[10px] font-black text-skin-muted uppercase tracking-widest">Reagent Ready</span>
                    </div>
                </div>
            </div>
        )}

        {/* Configuration Panel */}
        {showSettings && (
            <div className="absolute top-8 left-28 ml-8 bg-skin-surface border-2 border-skin-border p-10 rounded-[4rem] shadow-2xl z-[70] animate-enter w-[360px]">
                <div className="flex justify-between items-center mb-10 pb-6 border-b border-skin-border">
                    <div>
                        <h3 className="font-black text-xl flex items-center gap-3"><Settings2 size={24} className="text-skin-primary"/> Interaction</h3>
                        <p className="text-[10px] text-skin-muted font-black tracking-widest mt-2 uppercase opacity-60">Global Laboratory Prefs</p>
                    </div>
                    <button onClick={() => setShowSettings(false)} className="text-skin-muted hover:text-skin-main p-3.5 hover:bg-skin-base rounded-full transition-colors"><X size={24}/></button>
                </div>
                
                <div className="space-y-4">
                    {[
                        { key: 'showBond', label: 'Covalent Bonding', icon: LinkIcon, desc: 'Allow orbital overlaps' },
                        { key: 'showDelete', label: 'Molecular Cut', icon: Scissors, desc: 'Cleave atomic bonds' },
                        { key: 'showSwap', label: 'Transmutation', icon: RefreshCw, desc: 'Cycle nucleus identity' },
                        { key: 'showGroup', label: 'Fragment Library', icon: Layers, desc: 'Insert complex R-groups' },
                        { key: 'showInfo', label: 'Atomic Insights', icon: Info, desc: 'Show chemical metadata' },
                    ].map((item) => (
                        <button 
                            key={item.key}
                            onClick={() => toggleInteractionPref(item.key as any)}
                            className={`flex items-center justify-between w-full p-5 rounded-[1.75rem] border-2 transition-all group ${interactionPrefs[item.key as keyof TooltipInteractionPreference] ? 'bg-skin-primary border-skin-primary text-white shadow-xl shadow-skin-primary/20' : 'bg-skin-surface border-skin-border text-skin-muted hover:border-skin-muted'}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`p-2.5 rounded-xl ${interactionPrefs[item.key as keyof TooltipInteractionPreference] ? 'bg-white/20' : 'bg-skin-base'}`}>
                                    <item.icon size={20}/>
                                </div>
                                <div className="text-left">
                                    <span className="text-sm font-black tracking-tight block leading-none mb-1">{item.label}</span>
                                    <span className="text-[10px] font-bold opacity-60">{item.desc}</span>
                                </div>
                            </div>
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${interactionPrefs[item.key as keyof TooltipInteractionPreference] ? 'bg-white border-white' : 'border-skin-border group-hover:border-skin-muted'}`}>
                                {interactionPrefs[item.key as keyof TooltipInteractionPreference] && <div className="w-3.5 h-3.5 bg-skin-primary rounded-full shadow-sm"/>}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {mode === 'bonding' && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-skin-primary text-white px-12 py-5 rounded-full shadow-2xl z-20 flex items-center gap-6 animate-slide-up border-4 border-white/20">
                <LinkIcon size={24} className="animate-pulse"/>
                <span className="text-lg font-black tracking-tight uppercase">Linking Active Centers...</span>
                <button onClick={() => { setMode('view'); setBondingFrom(null); }} className="ml-6 bg-white/20 hover:bg-white/40 p-2.5 rounded-full transition-colors"><X size={22}/></button>
            </div>
        )}

        {errorMsg && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-red-500 text-white px-10 py-5 rounded-[2rem] shadow-2xl z-50 flex items-center gap-5 animate-pop border-b-8 border-red-700">
                <AlertTriangle size={28} /> <span className="font-black text-xl uppercase tracking-tight">{errorMsg}</span>
            </div>
        )}

        {/* View Selection (Only 2D SVG remains) */}
        <div className="flex-1 w-full h-full relative">
            <svg ref={svgRef} className="w-full h-full cursor-crosshair touch-none select-none flex-1"></svg>
        </div>

        {renderTooltip()}
        
        {/* Real-time Lab Telemetry */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-skin-surface/80 backdrop-blur-2xl border border-skin-border px-10 py-5 rounded-[2.5rem] shadow-2xl z-10 flex items-center gap-12">
            <div className="flex items-center gap-4">
                 <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-skin-muted uppercase tracking-widest leading-none mb-1">Total Atoms</span>
                    <span className="text-xl font-black text-skin-main leading-none">{localData?.atoms.length || 0}</span>
                 </div>
            </div>
            <div className="h-10 w-px bg-skin-border/50"></div>
            <div className="flex items-center gap-4">
                 <div className="w-4 h-4 rounded-full bg-skin-primary shadow-lg shadow-skin-primary/30"></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-skin-muted uppercase tracking-widest leading-none mb-1">Bond Links</span>
                    <span className="text-xl font-black text-skin-main leading-none">{localData?.bonds.length || 0}</span>
                 </div>
            </div>
            <div className="h-10 w-px bg-skin-border/50"></div>
            <div className="flex items-center gap-4">
                 <div className={`w-4 h-4 rounded-full transition-all ${localData?.atoms.some(a => getCurrentBondCount(a.id, localData.bonds) > getElementData(a.element).maxBonds) ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' : 'bg-slate-200 opacity-30'}`}></div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black text-skin-muted uppercase tracking-widest leading-none mb-1">Violations</span>
                    <span className="text-xl font-black text-skin-main leading-none">{localData?.atoms.filter(a => getCurrentBondCount(a.id, localData.bonds) > getElementData(a.element).maxBonds).length || 0}</span>
                 </div>
            </div>
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: rgba(var(--color-bg-main), 0.5);
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(var(--color-primary), 0.3);
                border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(var(--color-primary), 0.5);
            }
        `}} />
    </div>
  );
};

export default MoleculeVisualizer;
