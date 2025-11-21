
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MoleculeData, Atom, Bond } from '../types';
import { Loader2, MousePointer2, Link as LinkIcon, Scissors, Wand2, PlusCircle, AlertTriangle, Layers, Grid3X3, RefreshCw, Info } from 'lucide-react';

interface MoleculeVisualizerProps {
  data: MoleculeData | null;
  loading: boolean;
  onAnalyze?: (data: MoleculeData) => void;
}

type EditMode = 'view' | 'add-bond' | 'break-bond' | 'add-atom' | 'edit-stereo';

interface TooltipState {
    x: number;
    y: number;
    atom?: Atom;
    valencyInfo?: { current: number; max: number; warning?: boolean };
    bondInfo?: {
        source: { element: string; current: number; max: number };
        target: { element: string; current: number; max: number };
        order: number;
    };
}

// Comprehensive Periodic Table Data (CPK Colors)
const PERIODIC_TABLE: Record<string, { 
    color: string, 
    radius: number, 
    name: string, 
    description?: string, 
    maxBonds: number,
    atomicNumber: number,
    mass: number,
    oxidationStates: string
}> = {
  // Non-metals
  H:  { color: '#FFFFFF', radius: 12, name: 'Hydrogen', description: 'Lightest element, essential for hydrocarbons.', maxBonds: 1, atomicNumber: 1, mass: 1.008, oxidationStates: "+1, -1" },
  C:  { color: '#334155', radius: 20, name: 'Carbon', description: 'Backbone of organic chemistry.', maxBonds: 4, atomicNumber: 6, mass: 12.011, oxidationStates: "+4, +2, -4" },
  N:  { color: '#3b82f6', radius: 20, name: 'Nitrogen', description: 'Essential for amino acids and DNA.', maxBonds: 4, atomicNumber: 7, mass: 14.007, oxidationStates: "+5, +3, -3" }, // Can be 4 with charge
  O:  { color: '#ef4444', radius: 20, name: 'Oxygen', description: 'Highly electronegative, supports combustion.', maxBonds: 3, atomicNumber: 8, mass: 15.999, oxidationStates: "-2" }, // Can be 3 with charge
  P:  { color: '#f97316', radius: 22, name: 'Phosphorus', description: 'Key in ATP and DNA backbones.', maxBonds: 5, atomicNumber: 15, mass: 30.974, oxidationStates: "+5, +3, -3" },
  S:  { color: '#eab308', radius: 22, name: 'Sulfur', description: 'Forms disulfide bridges in proteins.', maxBonds: 6, atomicNumber: 16, mass: 32.06, oxidationStates: "+6, +4, -2" },
  SE: { color: '#ffa100', radius: 22, name: 'Selenium', description: 'Trace element, similar to Sulfur.', maxBonds: 6, atomicNumber: 34, mass: 78.96, oxidationStates: "+6, +4, -2" },
  
  // Halogens
  F:  { color: '#22c55e', radius: 18, name: 'Fluorine', description: 'Most electronegative element.', maxBonds: 1, atomicNumber: 9, mass: 18.998, oxidationStates: "-1" },
  CL: { color: '#10b981', radius: 20, name: 'Chlorine', description: 'Common in salts and industrial chemicals.', maxBonds: 1, atomicNumber: 17, mass: 35.45, oxidationStates: "-1, +1, +3, +5, +7" }, // Usually 1 in organics
  BR: { color: '#7f1d1d', radius: 20, name: 'Bromine', description: 'Liquid at room temperature.', maxBonds: 1, atomicNumber: 35, mass: 79.904, oxidationStates: "-1, +1, +3, +4, +5" },
  I:  { color: '#7e22ce', radius: 20, name: 'Iodine', description: 'Essential for thyroid function.', maxBonds: 1, atomicNumber: 53, mass: 126.90, oxidationStates: "-1, +1, +3, +5, +7" }, // Can be hypervalent but rare in basics
  
  // Noble Gases
  HE: { color: '#d9ffff', radius: 14, name: 'Helium', description: 'Inert gas, low density.', maxBonds: 0, atomicNumber: 2, mass: 4.0026, oxidationStates: "0" },
  NE: { color: '#b3e3f5', radius: 16, name: 'Neon', description: 'Used in neon signs.', maxBonds: 0, atomicNumber: 10, mass: 20.180, oxidationStates: "0" },
  AR: { color: '#80d1e3', radius: 20, name: 'Argon', description: 'Common inert atmosphere gas.', maxBonds: 0, atomicNumber: 18, mass: 39.948, oxidationStates: "0" },
  XE: { color: '#42ba94', radius: 22, name: 'Xenon', description: 'Heavy noble gas, forms some compounds.', maxBonds: 6, atomicNumber: 54, mass: 131.29, oxidationStates: "0, +2, +4, +6, +8" },

  // Alkali / Alkaline Earth
  LI: { color: '#cc80ff', radius: 22, name: 'Lithium', description: 'Used in batteries.', maxBonds: 1, atomicNumber: 3, mass: 6.94, oxidationStates: "+1" },
  NA: { color: '#ab5cf2', radius: 24, name: 'Sodium', description: 'Highly reactive metal.', maxBonds: 1, atomicNumber: 11, mass: 22.990, oxidationStates: "+1" },
  K:  { color: '#8f40d4', radius: 26, name: 'Potassium', description: 'Essential electrolyte.', maxBonds: 1, atomicNumber: 19, mass: 39.098, oxidationStates: "+1" },
  MG: { color: '#8aff00', radius: 24, name: 'Magnesium', description: 'Central atom in chlorophyll.', maxBonds: 2, atomicNumber: 12, mass: 24.305, oxidationStates: "+2" },
  CA: { color: '#3dff00', radius: 26, name: 'Calcium', description: 'Essential for bones and signaling.', maxBonds: 2, atomicNumber: 20, mass: 40.078, oxidationStates: "+2" },
  
  // Metals / Transition Metals
  AL: { color: '#bfa6a6', radius: 24, name: 'Aluminium', description: 'Lightweight metal.', maxBonds: 3, atomicNumber: 13, mass: 26.982, oxidationStates: "+3" },
  FE: { color: '#e06633', radius: 24, name: 'Iron', description: 'Essential for hemoglobin.', maxBonds: 6, atomicNumber: 26, mass: 55.845, oxidationStates: "+2, +3" },
  ZN: { color: '#7d80b0', radius: 24, name: 'Zinc', description: 'Important cofactor for enzymes.', maxBonds: 4, atomicNumber: 30, mass: 65.38, oxidationStates: "+2" },
  CU: { color: '#c88033', radius: 24, name: 'Copper', description: 'Excellent conductor.', maxBonds: 4, atomicNumber: 29, mass: 63.546, oxidationStates: "+1, +2" },
  AG: { color: '#c0c0c0', radius: 24, name: 'Silver', description: 'Highest electrical conductivity.', maxBonds: 2, atomicNumber: 47, mass: 107.87, oxidationStates: "+1" },
  AU: { color: '#ffd700', radius: 24, name: 'Gold', description: 'Resistant to corrosion.', maxBonds: 2, atomicNumber: 79, mass: 196.97, oxidationStates: "+1, +3" },
  HG: { color: '#b6b6b8', radius: 24, name: 'Mercury', description: 'Liquid metal.', maxBonds: 2, atomicNumber: 80, mass: 200.59, oxidationStates: "+1, +2" },
  PB: { color: '#575961', radius: 24, name: 'Lead', description: 'Dense, soft metal.', maxBonds: 4, atomicNumber: 82, mass: 207.2, oxidationStates: "+2, +4" },
  TI: { color: '#bfc2c7', radius: 24, name: 'Titanium', description: 'Strong, lightweight, biocompatible.', maxBonds: 4, atomicNumber: 22, mass: 47.867, oxidationStates: "+2, +3, +4" },
  SI: { color: '#f0c8a0', radius: 22, name: 'Silicon', description: 'Basis of semiconductors.', maxBonds: 4, atomicNumber: 14, mass: 28.085, oxidationStates: "+4, -4" },
  B:  { color: '#ffb5b5', radius: 20, name: 'Boron', description: 'Metalloid, electron deficient.', maxBonds: 3, atomicNumber: 5, mass: 10.81, oxidationStates: "+3" },
  
  // Extended Metals
  V:  { color: '#a6a6ab', radius: 23, name: 'Vanadium', description: 'Hard, grey, silvery metal.', maxBonds: 5, atomicNumber: 23, mass: 50.942, oxidationStates: "+2, +3, +4, +5" },
  CR: { color: '#8a99c7', radius: 23, name: 'Chromium', description: 'Used in stainless steel and plating.', maxBonds: 6, atomicNumber: 24, mass: 51.996, oxidationStates: "+2, +3, +6" },
  MN: { color: '#9c7ac7', radius: 23, name: 'Manganese', description: 'Found in many enzymes.', maxBonds: 7, atomicNumber: 25, mass: 54.938, oxidationStates: "+2, +3, +4, +6, +7" },
  CO: { color: '#f090a0', radius: 23, name: 'Cobalt', description: 'Key component of Vitamin B12.', maxBonds: 6, atomicNumber: 27, mass: 58.933, oxidationStates: "+2, +3" },
  NI: { color: '#50d050', radius: 23, name: 'Nickel', description: 'Corrosion-resistant metal.', maxBonds: 4, atomicNumber: 28, mass: 58.693, oxidationStates: "+2, +3" },
  PD: { color: '#006985', radius: 24, name: 'Palladium', description: 'Crucial catalyst (hydrogenation/coupling).', maxBonds: 4, atomicNumber: 46, mass: 106.42, oxidationStates: "+2, +4" },
  PT: { color: '#d0d0e0', radius: 24, name: 'Platinum', description: 'Dense, malleable, unreactive metal.', maxBonds: 6, atomicNumber: 78, mass: 195.08, oxidationStates: "+2, +4" },
  
  // Metalloids/Post-transition
  AS: { color: '#bd80e3', radius: 22, name: 'Arsenic', description: 'Metalloid, toxic in inorganic forms.', maxBonds: 5, atomicNumber: 33, mass: 74.922, oxidationStates: "+3, +5, -3" },
  SN: { color: '#668080', radius: 24, name: 'Tin', description: 'Used in solder and plating.', maxBonds: 4, atomicNumber: 50, mass: 118.71, oxidationStates: "+2, +4" },
  SB: { color: '#9e80b0', radius: 24, name: 'Antimony', description: 'Lustrous gray metalloid.', maxBonds: 5, atomicNumber: 51, mass: 121.76, oxidationStates: "+3, +5, -3" },

  // Default fallback
  UNKNOWN: { color: '#cbd5e1', radius: 20, name: 'Unknown', description: 'Element not in database.', maxBonds: 4, atomicNumber: 0, mass: 0, oxidationStates: "N/A" }
};

const getElementData = (symbol: string) => {
    return PERIODIC_TABLE[symbol.toUpperCase()] || PERIODIC_TABLE.UNKNOWN;
};

const COMMON_ELEMENTS = ['C', 'H', 'O', 'N', 'P', 'S', 'Cl', 'Br'];

const MoleculeVisualizer: React.FC<MoleculeVisualizerProps> = ({ data, loading, onAnalyze }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<any>(null);
  const nodesRef = useRef<any[]>([]); 
  const transformRef = useRef(d3.zoomIdentity); 
  
  // Local state for editing
  const [localData, setLocalData] = useState<MoleculeData | null>(null);
  const [mode, setMode] = useState<EditMode>('view');
  const [selectedAtomId, setSelectedAtomId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState('C');
  const [customElement, setCustomElement] = useState('');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorAtomIds, setErrorAtomIds] = useState<Set<string>>(new Set());
  
  // Periodic Table UI
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);

  // Resonance UI
  const [resonanceIndex, setResonanceIndex] = useState(-1); // -1 = Main, 0..n = Contributors

  // Refs for access inside D3 event listeners
  const modeRef = useRef(mode);
  const selectedAtomRef = useRef(selectedAtomId);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedAtomRef.current = selectedAtomId; }, [selectedAtomId]);

  // Initialize local data
  useEffect(() => {
    if (data) {
      setLocalData(JSON.parse(JSON.stringify(data)));
      setMode('view');
      setSelectedAtomId(null);
      setTooltip(null);
      setErrorMsg(null);
      setErrorAtomIds(new Set());
      setResonanceIndex(-1);
      transformRef.current = d3.zoomIdentity; 
    }
  }, [data]);

  useEffect(() => {
      if (errorMsg) {
          const timer = setTimeout(() => setErrorMsg(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [errorMsg]);

  const triggerError = (msg: string, ids: string[]) => {
    setErrorMsg(msg);
    setErrorAtomIds(new Set(ids));
    // Clear highlight after animation
    setTimeout(() => setErrorAtomIds(new Set()), 600);
  };

  const getCurrentSnapshot = (): MoleculeData | null => {
    if (!localData) return null;
    
    const currentNodes = nodesRef.current;
    const atomPosMap = new Map<string, {x: number, y: number}>(
        currentNodes.map((n: any) => [n.id, { x: n.x, y: n.y }])
    );

    const atomsWithPos = localData.atoms.map(a => {
        const pos = atomPosMap.get(a.id);
        return pos ? { ...a, x: pos.x, y: pos.y } : a;
    });

    const cleanBonds = localData.bonds.map(b => ({
        source: typeof b.source === 'object' ? (b.source as any).id : b.source,
        target: typeof b.target === 'object' ? (b.target as any).id : b.target,
        order: b.order,
        stereo: b.stereo
    }));

    return {
        ...localData,
        atoms: atomsWithPos,
        bonds: cleanBonds
    };
  };

  const handleAnalyze = () => {
    const snapshot = getCurrentSnapshot();
    if (snapshot && onAnalyze) {
      onAnalyze(snapshot);
    }
  };

  const handleAddAtom = (screenX: number, screenY: number) => {
      const snapshot = getCurrentSnapshot();
      if (!snapshot) return;

      const symbol = (customElement.trim() || selectedElement).trim();
      const elementInfo = getElementData(symbol);
      if (elementInfo.name === 'Unknown' && symbol.toUpperCase() !== 'UNKNOWN') {
          alert(`"${symbol}" is not a recognized element in our database.`);
          return;
      }

      const transform = transformRef.current;
      const worldX = (screenX - transform.x) / transform.k;
      const worldY = (screenY - transform.y) / transform.k;

      const newAtom: Atom = {
          id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          element: symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase(),
          x: worldX,
          y: worldY
      };

      setLocalData({
          ...snapshot,
          atoms: [...snapshot.atoms, newAtom]
      });
  };
  
  const getCurrentBondCount = (atomId: string, bonds: Bond[]): number => {
      let count = 0;
      bonds.forEach(b => {
          const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
          const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
          if (s === atomId || t === atomId) {
              count += b.order;
          }
      });
      return count;
  }

  const handleResonanceSwitch = (index: number) => {
      if (!data) return;
      setResonanceIndex(index);

      const snapshot = getCurrentSnapshot();
      if (!snapshot) return;

      // If index is -1, restore original bonds. Else use contributor bonds.
      // Important: Use atoms from current snapshot to preserve positions, but bonds from source data.
      let newBonds: Bond[] = [];
      let newDesc = "";

      if (index === -1) {
          newBonds = data.bonds;
          newDesc = data.description;
      } else if (data.resonanceStructures && data.resonanceStructures[index]) {
          newBonds = data.resonanceStructures[index].bonds;
          newDesc = data.resonanceStructures[index].description;
      }

      // Deep copy bonds to separate from reference
      const bondsCopy = JSON.parse(JSON.stringify(newBonds));

      setLocalData({
          ...snapshot,
          bonds: bondsCopy,
          description: newDesc
      });
  };

  const handleStereoUpdate = (bondIndex: number, snapshot: MoleculeData) => {
        const bond = snapshot.bonds[bondIndex];
        
        // Stereo cycle only for single bonds
        if (bond.order !== 1) {
            triggerError("Stereochemistry only applies to single bonds.", []);
            return;
        }
        
        const stereoCycle = ['none', 'wedge', 'dash'];
        const currentIdx = stereoCycle.indexOf(bond.stereo || 'none');
        const nextStereo = stereoCycle[(currentIdx + 1) % stereoCycle.length];

        const updatedBonds = [...snapshot.bonds];
        updatedBonds[bondIndex] = { ...bond, stereo: nextStereo as any };
        setLocalData({ ...snapshot, bonds: updatedBonds });
  };

  const handleCycleBond = (bondIndex: number, snapshot: MoleculeData) => {
      const bond = snapshot.bonds[bondIndex];
      const sId = typeof bond.source === 'object' ? (bond.source as any).id : bond.source;
      const tId = typeof bond.target === 'object' ? (bond.target as any).id : bond.target;

      const sourceAtom = snapshot.atoms.find(a => a.id === sId);
      const targetAtom = snapshot.atoms.find(a => a.id === tId);
      
      if (!sourceAtom || !targetAtom) return;

      // Cycle Order: 1 -> 2 -> 3 -> 1
      const currentOrder = bond.order;
      let nextOrder = currentOrder >= 3 ? 1 : currentOrder + 1;
      const orderChange = nextOrder - currentOrder;
      
      // Validation
      if (orderChange > 0) {
           const sourceMax = getElementData(sourceAtom.element).maxBonds;
           const targetMax = getElementData(targetAtom.element).maxBonds;
           const sourceCurrent = getCurrentBondCount(sId, snapshot.bonds);
           const targetCurrent = getCurrentBondCount(tId, snapshot.bonds);

           if (sourceCurrent + orderChange > sourceMax) {
               triggerError(`Valency limit: ${sourceAtom.element} max ${sourceMax} bonds`, [sourceAtom.id]);
               return;
           }
           if (targetCurrent + orderChange > targetMax) {
               triggerError(`Valency limit: ${targetAtom.element} max ${targetMax} bonds`, [targetAtom.id]);
               return;
           }
      }
      
      const updatedBonds = [...snapshot.bonds];
      updatedBonds[bondIndex] = {
          ...bond,
          order: nextOrder,
          stereo: 'none' // Reset stereo when changing order to double/triple
      };
      setLocalData({ ...snapshot, bonds: updatedBonds });
  };

  const handleToggleBond = (targetId: string) => {
      const currentSelected = selectedAtomRef.current;
      if (!currentSelected || currentSelected === targetId) return;
      
      const snapshot = getCurrentSnapshot();
      if (!snapshot) return;

      const existingBondIndex = snapshot.bonds.findIndex(b => {
          const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
          const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
          return (s === currentSelected && t === targetId) || (s === targetId && t === currentSelected);
      });

      if (existingBondIndex >= 0) {
          // If bond exists, cycle it
          handleCycleBond(existingBondIndex, snapshot);
          setSelectedAtomId(null);
      } else {
          // Create New Bond
          const sourceAtom = snapshot.atoms.find(a => a.id === currentSelected);
          const targetAtom = snapshot.atoms.find(a => a.id === targetId);
          
          if (!sourceAtom || !targetAtom) return;

          const sourceMax = getElementData(sourceAtom.element).maxBonds;
          const targetMax = getElementData(targetAtom.element).maxBonds;
          const sourceCurrent = getCurrentBondCount(currentSelected, snapshot.bonds);
          const targetCurrent = getCurrentBondCount(targetId, snapshot.bonds);

          // Strict Valency Check for New Bond
          if (sourceCurrent + 1 > sourceMax) {
              triggerError(`Cannot add bond: ${sourceAtom.element} full (max ${sourceMax})`, [sourceAtom.id]);
              return;
          }
          if (targetCurrent + 1 > targetMax) {
              triggerError(`Cannot add bond: ${targetAtom.element} full (max ${targetMax})`, [targetAtom.id]);
              return;
          }

          const newBond: Bond = {
              source: currentSelected,
              target: targetId,
              order: 1,
              stereo: 'none'
          };
          setLocalData({ ...snapshot, bonds: [...snapshot.bonds, newBond] });
          setSelectedAtomId(null); 
      }
  };

  const handleBreakBond = (d: any) => {
      const snapshot = getCurrentSnapshot();
      if (!snapshot) return;

      const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
      const targetId = typeof d.target === 'object' ? d.target.id : d.target;

      const newBonds = snapshot.bonds.filter(b => {
          const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
          const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
          return !(s === sourceId && t === targetId) && !(s === targetId && t === sourceId);
      });

      setLocalData({ ...snapshot, bonds: newBonds });
  };

  const getWedgePath = (x1: number, y1: number, x2: number, y2: number, width: number = 6): string => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return "";
      
      const nx = (-dy / len) * width;
      const ny = (dx / len) * width;
      
      return `M ${x1} ${y1} L ${x2 + nx} ${y2 + ny} L ${x2 - nx} ${y2 - ny} Z`;
  };

  // --- D3 Graph Effect ---
  useEffect(() => {
    if (!localData || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; user-select: none;");

    // Preserve Node Positions
    const oldNodesMap = new Map<string, any>(nodesRef.current.map((n: any) => [n.id, n]));
    
    const nodes = localData.atoms.map(a => {
        const old = oldNodesMap.get(a.id);
        if (old) {
            return { ...a, x: old.x, y: old.y, vx: old.vx, vy: old.vy };
        }
        return { ...a };
    });
    
    const links = localData.bonds.map(b => ({ 
      source: typeof b.source === 'object' ? (b.source as any).id : b.source, 
      target: typeof b.target === 'object' ? (b.target as any).id : b.target, 
      order: b.order,
      stereo: b.stereo
    }));
    
    nodesRef.current = nodes;

    const g = svg.append("g").attr("class", "zoom-layer");

    const zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        transformRef.current = event.transform;
      });
    
    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, transformRef.current);

    // Background
    g.append("rect")
        .attr("width", width * 40)
        .attr("height", height * 40)
        .attr("x", -width * 20)
        .attr("y", -height * 20)
        .attr("fill", "transparent")
        .on("click", (event) => {
            const m = modeRef.current;
            if (m === 'add-atom') {
                const [screenX, screenY] = d3.pointer(event, svg.node()); 
                handleAddAtom(screenX, screenY);
            } else {
                setSelectedAtomId(null); 
            }
        });

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force("collide", d3.forceCollide().radius((d: any) => getElementData(d.element).radius + 5))
      .alphaDecay(0.02)
      .alpha(0.5); 

    simulationRef.current = sim;

    // --- LINKS ---
    const linkGroup = g.append("g").attr("class", "links");
    
    const linkGroups = linkGroup
      .selectAll("g")
      .data(links)
      .join("g")
      .attr("class", "link-wrapper")
      .on("click", (e, d: any) => {
        e.stopPropagation();
        if (modeRef.current === 'break-bond') {
          handleBreakBond(d);
        } else if (modeRef.current === 'add-bond') {
          const snapshot = getCurrentSnapshot();
          if (!snapshot) return;
          const sId = d.source.id;
          const tId = d.target.id;
          const idx = snapshot.bonds.findIndex(b => {
               const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
               const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
               return (s === sId && t === tId) || (s === tId && t === sId);
          });
          if (idx !== -1) handleCycleBond(idx, snapshot);
        } else if (modeRef.current === 'edit-stereo') {
            const snapshot = getCurrentSnapshot();
            if (!snapshot) return;
            const sId = d.source.id;
            const tId = d.target.id;
            const idx = snapshot.bonds.findIndex(b => {
               const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
               const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
               return (s === sId && t === tId) || (s === tId && t === sId);
            });
            if (idx !== -1) handleStereoUpdate(idx, snapshot);
        }
      })
      .on("mouseenter", function(event, d: any) {
          if (modeRef.current === 'break-bond') {
              d3.select(this).select(".bond-highlight")
                .attr("stroke", "#ef4444")
                .attr("opacity", 0.6);
          } else if (modeRef.current === 'add-bond') {
              d3.select(this).select(".bond-highlight")
                .attr("stroke", "#3b82f6")
                .attr("opacity", 0.6)
                .attr("cursor", "pointer");

              // Show valency for connected atoms
              const sId = d.source.id; 
              const tId = d.target.id;
              const sAtom = localData.atoms.find(a => a.id === sId);
              const tAtom = localData.atoms.find(a => a.id === tId);
              
              if (sAtom && tAtom) {
                  const sBonds = getCurrentBondCount(sId, localData.bonds);
                  const sMax = getElementData(sAtom.element).maxBonds;
                  const tBonds = getCurrentBondCount(tId, localData.bonds);
                  const tMax = getElementData(tAtom.element).maxBonds;
                  
                  setTooltip({
                      x: event.pageX,
                      y: event.pageY,
                      bondInfo: {
                          source: { element: sAtom.element, current: sBonds, max: sMax },
                          target: { element: tAtom.element, current: tBonds, max: tMax },
                          order: d.order
                      }
                  });
              }
          } else if (modeRef.current === 'edit-stereo') {
              d3.select(this).select(".bond-highlight")
                .attr("stroke", "#818cf8") // Indigo
                .attr("opacity", 0.6)
                .attr("cursor", "pointer");
          }
      })
      .on("mouseleave", function(_event, _d: any) {
           setTooltip(null);
           d3.select(this).select(".bond-highlight")
            .attr("stroke", "transparent")
            .attr("opacity", 0);
      });

    // Invisible Hit Line
    linkGroups.append("line")
        .attr("class", "bond-hit")
        .attr("stroke", "transparent")
        .attr("stroke-width", 20);

    // Highlight Path (underneath visible bond)
    linkGroups.append("path")
        .attr("class", "bond-highlight")
        .attr("stroke", "transparent") // Default transparent
        .attr("stroke-width", (d: any) => (d.order * 4) + 6) // Slightly wider than bond
        .attr("stroke-linecap", "round")
        .attr("fill", "none")
        .attr("opacity", 0);

    // Visible Bond Path
    linkGroups.append("path")
        .attr("class", "bond-visible")
        .attr("stroke", (d: any) => d.stereo === 'wedge' ? '#1e293b' : '#94a3b8')
        .attr("stroke-opacity", (d: any) => d.stereo === 'wedge' ? 1 : 0.8)
        .attr("stroke-width", (d: any) => d.order === 1 ? 4 : 3)
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", (d: any) => d.stereo === 'dash' ? "4,4" : null)
        .attr("fill", (d: any) => d.stereo === 'wedge' ? '#1e293b' : 'none');

    // --- NODES ---
    const nodeGroup = g.append("g").attr("class", "nodes");

    const nodeWrapper = nodeGroup
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "node-wrapper")
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      )
      .on("click", (e, d: any) => {
        e.stopPropagation(); 
        const m = modeRef.current;
        
        if (m === 'add-bond') {
           const currentSel = selectedAtomRef.current;
           if (currentSel === null) {
             setSelectedAtomId(d.id);
           } else if (currentSel === d.id) {
             setSelectedAtomId(null); 
           } else {
             handleToggleBond(d.id);
           }
        } 
      })
      .on("mouseenter", function(event, d: any) {
          const m = modeRef.current;
          const group = d3.select(this);

          if (m === 'view') {
              setTooltip({ x: event.pageX, y: event.pageY, atom: d });
          } else if (m === 'add-bond') {
              // Check Valency
              const currentBonds = getCurrentBondCount(d.id, localData.bonds);
              const maxBonds = getElementData(d.element).maxBonds;
              const isFull = currentBonds >= maxBonds;

              // Highlight eligible atom with Valency Check
              group.select(".atom-main")
                .transition().duration(100)
                .attr("stroke", isFull ? "#ef4444" : "#3b82f6") // Red if full, Blue if available
                .attr("stroke-width", isFull ? 4 : 3)
                .attr("fill-opacity", 0.9);

              // Show halo if not selected
              if (selectedAtomRef.current !== d.id) {
                  group.select(".selection-halo")
                    .transition().duration(100)
                    .attr("opacity", 0.5)
                    .attr("stroke", isFull ? "#ef4444" : "#3b82f6")
                    .attr("stroke-dasharray", "none");
              }

              // Show Valency Info
              setTooltip({ 
                  x: event.pageX, 
                  y: event.pageY, 
                  atom: d,
                  valencyInfo: { current: currentBonds, max: maxBonds, warning: isFull } 
              });
          }
      })
      .on("mouseleave", function(_event, d: any) {
          setTooltip(null);
          const m = modeRef.current;
          const group = d3.select(this);

          if (m === 'add-bond') {
               group.select(".atom-main")
                .transition().duration(100)
                .attr("stroke", "#1e293b")
                .attr("stroke-width", 1.5)
                .attr("fill-opacity", 1);

               if (selectedAtomRef.current !== d.id) {
                   group.select(".selection-halo")
                     .transition().duration(100)
                     .attr("opacity", 0);
               } else {
                   // Ensure selected style holds
                   group.select(".selection-halo")
                     .transition().duration(100)
                     .attr("opacity", 1)
                     .attr("stroke", "#3b82f6")
                     .attr("stroke-dasharray", "4,2");
               }
          }
      });

    nodeWrapper.append("circle")
      .attr("class", "selection-halo")
      .attr("r", (d: any) => getElementData(d.element).radius + 6)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "4,2")
      .attr("opacity", 0);

    nodeWrapper.append("circle")
      .attr("class", "atom-main")
      .attr("r", (d: any) => getElementData(d.element).radius)
      .attr("fill", (d: any) => getElementData(d.element).color)
      .attr("stroke", "#1e293b")
      .attr("stroke-width", 1.5);

    nodeWrapper.append("circle")
      .attr("r", (d: any) => getElementData(d.element).radius / 2.5)
      .attr("cx", (d: any) => -getElementData(d.element).radius / 3)
      .attr("cy", (d: any) => -getElementData(d.element).radius / 3)
      .attr("fill", "white")
      .attr("fill-opacity", 0.3)
      .attr("filter", "blur(1px)");

    nodeWrapper.append("text")
      .text((d: any) => d.element)
      .attr("y", 1.5)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-family", "Arial, sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", (d: any) => getElementData(d.element).radius * 0.8)
      .attr("fill", (d: any) => {
          const color = getElementData(d.element).color;
          const r = parseInt(color.substr(1, 2), 16);
          const g = parseInt(color.substr(3, 2), 16);
          const b = parseInt(color.substr(5, 2), 16);
          return (r*0.299 + g*0.587 + b*0.114) > 186 ? '#000' : '#FFF';
      })
      .attr("pointer-events", "none");

    sim.on("tick", () => {
      linkGroup.selectAll(".bond-hit")
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      const getBondPath = (d: any) => {
            const x1 = d.source.x, y1 = d.source.y;
            const x2 = d.target.x, y2 = d.target.y;

            if (d.stereo === 'wedge' && d.order === 1) {
                return getWedgePath(x1, y1, x2, y2);
            }
            
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx*dx + dy*dy) || 1;
            const nx = -dy / len; 
            const ny = dx / len; 
            
            const offset = 4;

            if (d.order === 1) {
                 return `M ${x1} ${y1} L ${x2} ${y2}`;
            }
            if (d.order === 2) {
                return `M ${x1 + nx*offset} ${y1 + ny*offset} L ${x2 + nx*offset} ${y2 + ny*offset} ` +
                       `M ${x1 - nx*offset} ${y1 - ny*offset} L ${x2 - nx*offset} ${y2 - ny*offset}`;
            }
            if (d.order === 3) {
                const off2 = offset * 1.5;
                return `M ${x1} ${y1} L ${x2} ${y2} ` +
                       `M ${x1 + nx*off2} ${y1 + ny*off2} L ${x2 + nx*off2} ${y2 + ny*off2} ` +
                       `M ${x1 - nx*off2} ${y1 - ny*off2} L ${x2 - nx*off2} ${y2 - ny*off2}`;
            }
            
            return `M ${x1} ${y1} L ${x2} ${y2}`;
      };

      linkGroup.selectAll(".bond-visible")
        .attr("d", (d: any) => getBondPath(d));

      linkGroup.selectAll(".bond-highlight")
        .attr("d", (d: any) => getBondPath(d));

      nodeWrapper
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (modeRef.current !== 'view' && modeRef.current !== 'add-atom') return; 
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      if (modeRef.current !== 'view' && modeRef.current !== 'add-atom') return;
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (modeRef.current !== 'view' && modeRef.current !== 'add-atom') return;
      if (!event.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      sim.stop();
    };
  }, [localData]);

  // Effect for visual error handling (flashing red)
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    
    svg.selectAll(".node-wrapper").each(function(d: any) {
        const isError = errorAtomIds.has(d.id);
        const group = d3.select(this);
        const circle = group.select(".atom-main");
        const elData = getElementData(d.element);

        if (isError) {
            circle.transition().duration(100)
                .attr("fill", "#ef4444")
                .attr("stroke", "#b91c1c")
                .attr("stroke-width", 4);
        } else {
            circle.transition().duration(300)
                .attr("fill", elData.color)
                .attr("stroke", "#1e293b")
                .attr("stroke-width", 1.5);
        }
    });
  }, [errorAtomIds]);

  useEffect(() => {
      if (!svgRef.current) return;
      const svg = d3.select(svgRef.current);
      svg.selectAll(".node-wrapper")
         .attr("cursor", mode === 'add-bond' ? 'pointer' : mode === 'view' ? 'grab' : 'default');
      
      svg.selectAll(".link-wrapper")
         .attr("cursor", (mode === 'break-bond' || mode === 'add-bond' || mode === 'edit-stereo') ? 'pointer' : 'default');

      svg.selectAll(".selection-halo")
         .attr("opacity", (d: any) => d.id === selectedAtomId ? 1 : 0)
         .attr("stroke", "#3b82f6")
         .attr("stroke-dasharray", "4,2");

  }, [mode, selectedAtomId]);

  const customElementInfo = customElement ? getElementData(customElement) : null;
  const isCustomValid = customElement && customElementInfo?.name !== 'Unknown';

  return (
    <div ref={containerRef} className="w-full h-full relative bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-30">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-blue-200 font-medium">Processing...</p>
          </div>
        </div>
      )}
      {!localData && !loading && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
          <p>Enter a molecule name to visualize.</p>
        </div>
      )}
      
      <svg ref={svgRef} className="w-full h-full"></svg>

      {/* Persistent Warning for Impossible Structures */}
      {localData && (localData.name.includes("Impossible") || localData.name.includes("Invalid")) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-red-900/90 border border-red-500 text-white p-4 rounded-xl shadow-2xl z-30 backdrop-blur-sm animate-fade-in flex items-start gap-3">
            <AlertTriangle className="text-red-400 shrink-0 mt-1" size={24} />
            <div>
                <h4 className="font-bold text-red-200 text-lg">Chemically Impossible</h4>
                <p className="text-sm text-red-100 mt-1 leading-relaxed opacity-90">
                    {localData.description}
                </p>
            </div>
        </div>
      )}
      
      {errorMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-40 animate-fade-in">
            <Info size={18} />
            <span className="text-sm font-bold">{errorMsg}</span>
        </div>
      )}

      {tooltip && (
          <div 
            className="fixed z-50 bg-slate-800 text-white p-2 rounded-lg shadow-xl border border-slate-600 text-xs pointer-events-none transform -translate-y-full -translate-x-1/2 mt-[-10px]"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
              {tooltip.atom && (
                 <>
                  <div className="font-bold text-base flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: getElementData(tooltip.atom.element).color }}></span>
                    {getElementData(tooltip.atom.element).name} ({tooltip.atom.element})
                  </div>
                  <div className="text-slate-300 mt-1 max-w-[150px]">
                      {getElementData(tooltip.atom.element).description}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 mt-2 border-t border-slate-700 pt-2">
                      <div>
                          <span className="uppercase text-[10px] font-bold">Atomic No.</span>
                          <div className="text-white font-mono">{getElementData(tooltip.atom.element).atomicNumber}</div>
                      </div>
                       <div>
                          <span className="uppercase text-[10px] font-bold">Mass</span>
                          <div className="text-white font-mono">{getElementData(tooltip.atom.element).mass}</div>
                      </div>
                      <div className="col-span-2">
                          <span className="uppercase text-[10px] font-bold">Oxidation States</span>
                          <div className="text-white font-mono">{getElementData(tooltip.atom.element).oxidationStates}</div>
                      </div>
                  </div>
                  {tooltip.valencyInfo && (
                    <div className="mt-1 pt-1 border-t border-slate-600 flex justify-between items-center">
                        <span className="text-slate-400">Valency:</span>
                        <span className={`font-mono font-bold ${
                            tooltip.valencyInfo.warning ? 'text-red-500 animate-pulse' : // More distinct warning
                            tooltip.valencyInfo.current === tooltip.valencyInfo.max ? 'text-yellow-400' : 'text-emerald-400'
                        }`}>
                            {tooltip.valencyInfo.current} / {tooltip.valencyInfo.max}
                            {tooltip.valencyInfo.warning && " (Max)"}
                        </span>
                    </div>
                  )}
                 </>
              )}
              
              {tooltip.bondInfo && (
                 <div className="text-sm">
                    <div className="font-bold text-blue-300 mb-2 text-center border-b border-slate-600 pb-1">Bond Order: {tooltip.bondInfo.order}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-700 p-1.5 rounded text-center">
                            <div className="font-bold mb-1">{tooltip.bondInfo.source.element}</div>
                            <div className={`font-mono ${tooltip.bondInfo.source.current > tooltip.bondInfo.source.max ? 'text-red-400' : 'text-slate-300'}`}>
                                {tooltip.bondInfo.source.current} / {tooltip.bondInfo.source.max}
                            </div>
                        </div>
                        <div className="bg-slate-700 p-1.5 rounded text-center">
                            <div className="font-bold mb-1">{tooltip.bondInfo.target.element}</div>
                            <div className={`font-mono ${tooltip.bondInfo.target.current > tooltip.bondInfo.target.max ? 'text-red-400' : 'text-slate-300'}`}>
                                {tooltip.bondInfo.target.current} / {tooltip.bondInfo.target.max}
                            </div>
                        </div>
                    </div>
                 </div>
              )}
          </div>
      )}

      {localData && (
         <>
            <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-lg border border-slate-200 flex flex-col gap-2 z-20">
                <button 
                    onClick={() => { setMode('view'); setSelectedAtomId(null); }}
                    title="View / Move Atoms"
                    className={`p-2 rounded transition-colors ${mode === 'view' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <MousePointer2 size={20} />
                </button>
                
                <button 
                    onClick={() => { setMode('add-atom'); setSelectedAtomId(null); }}
                    title="Add Atom"
                    className={`p-2 rounded transition-colors ${mode === 'add-atom' ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <PlusCircle size={20} />
                </button>

                <button 
                    onClick={() => { setMode('add-bond'); setSelectedAtomId(null); }}
                    title="Add Bond. Click 2 atoms to connect. Click bond to cycle order (1-2-3)."
                    className={`p-2 rounded transition-colors ${mode === 'add-bond' ? 'bg-emerald-100 text-emerald-600' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <LinkIcon size={20} />
                </button>
                <button 
                    onClick={() => { setMode('edit-stereo'); setSelectedAtomId(null); }}
                    title="Edit Stereochemistry (Click single bonds)"
                    className={`p-2 rounded transition-colors ${mode === 'edit-stereo' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Layers size={20} />
                </button>
                <button 
                    onClick={() => { setMode('break-bond'); setSelectedAtomId(null); }}
                    title="Break Bond (Click bond)"
                    className={`p-2 rounded transition-colors ${mode === 'break-bond' ? 'bg-red-100 text-red-600' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                    <Scissors size={20} />
                </button>
                <div className="h-px bg-slate-200 my-1"></div>
                <button 
                    onClick={handleAnalyze}
                    disabled={loading}
                    title="Analyze Result"
                    className="p-2 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                    <Wand2 size={20} />
                </button>
            </div>

            {mode === 'add-atom' && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white p-2 rounded-lg shadow-lg border border-slate-200 flex flex-col gap-2 z-20 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase mr-2">Element:</span>
                        {COMMON_ELEMENTS.map(el => (
                            <button
                                key={el}
                                onClick={() => { setSelectedElement(el); setCustomElement(''); setShowPeriodicTable(false); }}
                                className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center transition-all ${
                                    selectedElement === el && !customElement
                                        ? 'bg-slate-800 text-white scale-110 shadow-md' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {el}
                            </button>
                        ))}
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <button 
                            onClick={() => setShowPeriodicTable(!showPeriodicTable)}
                            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${showPeriodicTable ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            title="Select from Periodic Table"
                        >
                            <Grid3X3 size={16} />
                        </button>
                    </div>
                    
                    {showPeriodicTable && (
                        <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 grid grid-cols-8 gap-1 max-h-60 overflow-y-auto w-[320px]">
                            {Object.entries(PERIODIC_TABLE).filter(([k]) => k !== 'UNKNOWN').map(([symbol, info]) => (
                                <button
                                    key={symbol}
                                    onClick={() => { 
                                        setSelectedElement(symbol); 
                                        setCustomElement('');
                                        setShowPeriodicTable(false);
                                    }}
                                    className="aspect-square rounded flex flex-col items-center justify-center hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all text-xs"
                                    style={{ 
                                        backgroundColor: selectedElement === symbol ? '#cbd5e1' : 'transparent'
                                    }}
                                    title={info.name}
                                >
                                    <span className="font-bold" style={{ color: info.color === '#FFFFFF' ? '#000' : info.color }}>{symbol}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    
                    <div className="relative flex items-center gap-2 border-t border-slate-100 pt-2 mt-1">
                         <span className="text-[10px] text-slate-400 uppercase">Manual:</span>
                         <div className="relative flex-1">
                            <input 
                                type="text" 
                                value={customElement}
                                onChange={(e) => { 
                                    setCustomElement(e.target.value); 
                                    if(e.target.value) {
                                        setSelectedElement('');
                                        setShowPeriodicTable(false);
                                    }
                                }}
                                placeholder="Symbol"
                                maxLength={2}
                                className={`w-full h-8 pl-2 rounded border font-bold focus:outline-none focus:ring-2 uppercase text-sm ${
                                    customElement 
                                        ? isCustomValid 
                                            ? 'border-blue-500 ring-blue-500 bg-blue-50 text-blue-700' 
                                            : 'border-red-500 ring-red-500 bg-red-50 text-red-700'
                                        : 'border-slate-300'
                                }`}
                            />
                         </div>
                        {customElement && (
                            <span className={`text-xs font-bold whitespace-nowrap ${isCustomValid ? 'text-blue-600' : 'text-red-500'}`}>
                                {isCustomValid ? customElementInfo?.name : 'Invalid'}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Resonance Structure Switcher */}
            {localData.resonanceStructures && localData.resonanceStructures.length > 0 && (
                <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border border-slate-200 z-20 max-w-xs">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <RefreshCw size={12} /> Resonance
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-2">
                        <button
                            onClick={() => handleResonanceSwitch(-1)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                                resonanceIndex === -1 
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            Major
                        </button>
                        {localData.resonanceStructures.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleResonanceSwitch(idx)}
                                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                                    resonanceIndex === idx 
                                        ? 'bg-purple-100 text-purple-700 border-purple-200' 
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                Contrib {idx + 1}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 italic">
                        {resonanceIndex === -1 
                            ? "Most stable contributor (or hybrid)" 
                            : localData.resonanceStructures[resonanceIndex].description}
                    </p>
                </div>
            )}

            <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur p-4 rounded-lg border border-slate-700 max-w-md transition-all pointer-events-none">
                <h3 className={`text-white font-bold text-lg flex items-center gap-2 ${localData.name.includes("Impossible") || localData.name.includes("Invalid") ? "text-red-400" : ""}`}>
                    {localData.name.includes("Impossible") && <AlertTriangle className="text-red-500"/>}
                    {localData.name}
                </h3>
                <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                    {localData.description}
                </p>
                <div className="mt-2 flex gap-2 text-xs text-slate-400 items-center justify-between">
                    <div>
                        <span>{localData.atoms.length} Atoms</span>
                        <span className="mx-1">•</span>
                        <span>{localData.bonds.length} Bonds</span>
                    </div>
                    <div className="text-emerald-400 font-medium italic text-[10px]">
                        {mode === 'view' && 'Drag atoms to arrange. Hover for info.'}
                        {mode === 'add-atom' && 'Click empty space to add atom'}
                        {mode === 'add-bond' && 'Click 2 atoms to link. Click bond to cycle.'}
                        {mode === 'edit-stereo' && 'Click single bonds to toggle Wedge/Dash.'}
                        {mode === 'break-bond' && 'Click bond to break'}
                    </div>
                </div>
            </div>
         </>
      )}
    </div>
  );
};

export default MoleculeVisualizer;
