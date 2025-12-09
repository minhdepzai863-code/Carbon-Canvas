import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MoleculeData, Atom, Bond } from '../types';
import { Loader2, MousePointer2, Link as LinkIcon, Scissors, Wand2, PlusCircle, AlertTriangle, Layers, Ruler, RefreshCw, Grid3X3, X, Trash2, Droplets, Stamp, Camera, Ghost } from 'lucide-react';

interface MoleculeVisualizerProps {
  data: MoleculeData | null;
  loading: boolean;
  onAnalyze?: (data: MoleculeData) => void;
}

type EditMode = 'view' | 'add-bond' | 'break-bond' | 'add-atom' | 'edit-stereo' | 'measure-angle' | 'delete-atom' | 'add-hydroxyl' | 'stamp';

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

// Comprehensive Periodic Table Data (CPK Colors) with Grid Positions (Standard 18-col layout)
const PERIODIC_TABLE: Record<string, { 
    color: string, 
    radius: number, 
    name: string, 
    description?: string, 
    maxBonds: number,
    atomicNumber: number,
    mass: number,
    oxidationStates: string,
    row: number,
    col: number
}> = {
  // Non-metals
  H:  { color: '#FFFFFF', radius: 14, name: 'Hydrogen', description: 'Lightest element.', maxBonds: 1, atomicNumber: 1, mass: 1.008, oxidationStates: "+1, -1", row: 1, col: 1 },
  C:  { color: '#404040', radius: 22, name: 'Carbon', description: 'Organic backbone.', maxBonds: 4, atomicNumber: 6, mass: 12.011, oxidationStates: "+4, +2, -4", row: 2, col: 14 },
  N:  { color: '#3050F8', radius: 22, name: 'Nitrogen', description: 'Amino acids/DNA.', maxBonds: 4, atomicNumber: 7, mass: 14.007, oxidationStates: "+5, +3, -3", row: 2, col: 15 },
  O:  { color: '#FF0D0D', radius: 22, name: 'Oxygen', description: 'Combustion/Respiration.', maxBonds: 2, atomicNumber: 8, mass: 15.999, oxidationStates: "-2", row: 2, col: 16 },
  P:  { color: '#FF8000', radius: 24, name: 'Phosphorus', description: 'ATP/DNA backbone.', maxBonds: 5, atomicNumber: 15, mass: 30.974, oxidationStates: "+5, +3, -3", row: 3, col: 15 },
  S:  { color: '#FFFF30', radius: 24, name: 'Sulfur', description: 'Disulfide bridges.', maxBonds: 6, atomicNumber: 16, mass: 32.06, oxidationStates: "+6, +4, -2", row: 3, col: 16 },
  SE: { color: '#ffa100', radius: 24, name: 'Selenium', description: 'Trace element.', maxBonds: 6, atomicNumber: 34, mass: 78.96, oxidationStates: "+6, +4, -2", row: 4, col: 16 },
  
  // Halogens
  F:  { color: '#90E050', radius: 20, name: 'Fluorine', description: 'Most electronegative.', maxBonds: 1, atomicNumber: 9, mass: 18.998, oxidationStates: "-1", row: 2, col: 17 },
  CL: { color: '#1FF01F', radius: 22, name: 'Chlorine', description: 'Salt former.', maxBonds: 1, atomicNumber: 17, mass: 35.45, oxidationStates: "-1...", row: 3, col: 17 },
  BR: { color: '#A62929', radius: 22, name: 'Bromine', description: 'Liquid halogen.', maxBonds: 1, atomicNumber: 35, mass: 79.904, oxidationStates: "-1...", row: 4, col: 17 },
  I:  { color: '#940094', radius: 22, name: 'Iodine', description: 'Thyroid function.', maxBonds: 1, atomicNumber: 53, mass: 126.90, oxidationStates: "-1...", row: 5, col: 17 },
  
  // Noble Gases
  HE: { color: '#d9ffff', radius: 16, name: 'Helium', description: 'Inert gas.', maxBonds: 0, atomicNumber: 2, mass: 4.0026, oxidationStates: "0", row: 1, col: 18 },
  NE: { color: '#b3e3f5', radius: 18, name: 'Neon', description: 'Inert gas.', maxBonds: 0, atomicNumber: 10, mass: 20.180, oxidationStates: "0", row: 2, col: 18 },
  AR: { color: '#80d1e3', radius: 22, name: 'Argon', description: 'Inert gas.', maxBonds: 0, atomicNumber: 18, mass: 39.948, oxidationStates: "0", row: 3, col: 18 },
  
  // Alkali / Alkali Earth
  LI: { color: '#CC80FF', radius: 24, name: 'Lithium', description: 'Batteries.', maxBonds: 1, atomicNumber: 3, mass: 6.94, oxidationStates: "+1", row: 2, col: 1 },
  NA: { color: '#AB5CF2', radius: 26, name: 'Sodium', description: 'Reactive metal.', maxBonds: 1, atomicNumber: 11, mass: 22.990, oxidationStates: "+1", row: 3, col: 1 },
  K:  { color: '#8F40D4', radius: 28, name: 'Potassium', description: 'Electrolyte.', maxBonds: 1, atomicNumber: 19, mass: 39.098, oxidationStates: "+1", row: 4, col: 1 },
  MG: { color: '#8AFF00', radius: 26, name: 'Magnesium', description: 'Chlorophyll.', maxBonds: 2, atomicNumber: 12, mass: 24.305, oxidationStates: "+2", row: 3, col: 2 },
  CA: { color: '#3DFF00', radius: 28, name: 'Calcium', description: 'Bones.', maxBonds: 2, atomicNumber: 20, mass: 40.078, oxidationStates: "+2", row: 4, col: 2 },
  
  // Transition Metals
  V:  { color: '#A6A6AB', radius: 26, name: 'Vanadium', description: 'Hard steel.', maxBonds: 5, atomicNumber: 23, mass: 50.94, oxidationStates: "Multi", row: 4, col: 5 },
  CR: { color: '#8A99C7', radius: 26, name: 'Chromium', description: 'Stainless steel.', maxBonds: 6, atomicNumber: 24, mass: 51.996, oxidationStates: "+6, +3", row: 4, col: 6 },
  MN: { color: '#9C7AC7', radius: 26, name: 'Manganese', description: 'Trace metal.', maxBonds: 7, atomicNumber: 25, mass: 54.938, oxidationStates: "+7, +4", row: 4, col: 7 },
  FE: { color: '#E06633', radius: 26, name: 'Iron', description: 'Hemoglobin.', maxBonds: 6, atomicNumber: 26, mass: 55.845, oxidationStates: "+3, +2", row: 4, col: 8 },
  CO: { color: '#F090A0', radius: 26, name: 'Cobalt', description: 'Vit B12.', maxBonds: 6, atomicNumber: 27, mass: 58.933, oxidationStates: "+3, +2", row: 4, col: 9 },
  NI: { color: '#50D050', radius: 26, name: 'Nickel', description: 'Coins.', maxBonds: 4, atomicNumber: 28, mass: 58.693, oxidationStates: "+2", row: 4, col: 10 },
  CU: { color: '#C88033', radius: 26, name: 'Copper', description: 'Conductor.', maxBonds: 4, atomicNumber: 29, mass: 63.546, oxidationStates: "+2, +1", row: 4, col: 11 },
  ZN: { color: '#7D80B0', radius: 26, name: 'Zinc', description: 'Enzymes.', maxBonds: 4, atomicNumber: 30, mass: 65.38, oxidationStates: "+2", row: 4, col: 12 },
  PD: { color: '#006985', radius: 28, name: 'Palladium', description: 'Catalyst.', maxBonds: 4, atomicNumber: 46, mass: 106.42, oxidationStates: "+2, +4", row: 5, col: 10 },
  PT: { color: '#D0D0E0', radius: 28, name: 'Platinum', description: 'Catalyst.', maxBonds: 4, atomicNumber: 78, mass: 195.08, oxidationStates: "+2, +4", row: 6, col: 10 },

  // Metalloids / Poor Metals
  AL: { color: '#BFA6A6', radius: 26, name: 'Aluminium', description: 'Light metal.', maxBonds: 3, atomicNumber: 13, mass: 26.982, oxidationStates: "+3", row: 3, col: 13 },
  SI: { color: '#F0C8A0', radius: 24, name: 'Silicon', description: 'Semiconductor.', maxBonds: 4, atomicNumber: 14, mass: 28.085, oxidationStates: "+4, -4", row: 3, col: 14 },
  B:  { color: '#FFB5B5', radius: 22, name: 'Boron', description: 'Electron deficient.', maxBonds: 3, atomicNumber: 5, mass: 10.81, oxidationStates: "+3", row: 2, col: 13 },
  AS: { color: '#BD80E3', radius: 24, name: 'Arsenic', description: 'Toxic.', maxBonds: 5, atomicNumber: 33, mass: 74.92, oxidationStates: "+5...", row: 4, col: 15 },
  SN: { color: '#668080', radius: 28, name: 'Tin', description: 'Metal.', maxBonds: 4, atomicNumber: 50, mass: 118.71, oxidationStates: "+4, +2", row: 5, col: 14 },
  SB: { color: '#9E63B5', radius: 28, name: 'Antimony', description: 'Metalloid.', maxBonds: 5, atomicNumber: 51, mass: 121.76, oxidationStates: "+5...", row: 5, col: 15 },

  // Default
  UNKNOWN: { color: '#FF1493', radius: 20, name: 'Unknown', description: '?', maxBonds: 4, atomicNumber: 0, mass: 0, oxidationStates: "N/A", row: 0, col: 0 }
};

// Templates Definition
const TEMPLATES: Record<string, { name: string, atoms: {element: string, dx: number, dy: number}[], bonds: {s: number, t: number, order: number}[] }> = {
    'benzene': {
        name: 'Benzene',
        atoms: [
            { element: 'C', dx: 0, dy: -40 }, { element: 'C', dx: 35, dy: -20 },
            { element: 'C', dx: 35, dy: 20 }, { element: 'C', dx: 0, dy: 40 },
            { element: 'C', dx: -35, dy: 20 }, { element: 'C', dx: -35, dy: -20 }
        ],
        bonds: [
            { s: 0, t: 1, order: 2 }, { s: 1, t: 2, order: 1 },
            { s: 2, t: 3, order: 2 }, { s: 3, t: 4, order: 1 },
            { s: 4, t: 5, order: 2 }, { s: 5, t: 0, order: 1 }
        ]
    },
    'cyclohexane': {
        name: 'Cyclohexane',
        atoms: [
            { element: 'C', dx: 0, dy: -40 }, { element: 'C', dx: 35, dy: -20 },
            { element: 'C', dx: 35, dy: 20 }, { element: 'C', dx: 0, dy: 40 },
            { element: 'C', dx: -35, dy: 20 }, { element: 'C', dx: -35, dy: -20 }
        ],
        bonds: [
            { s: 0, t: 1, order: 1 }, { s: 1, t: 2, order: 1 },
            { s: 2, t: 3, order: 1 }, { s: 3, t: 4, order: 1 },
            { s: 4, t: 5, order: 1 }, { s: 5, t: 0, order: 1 }
        ]
    },
    'cyclopentane': {
        name: 'Cyclopentane',
        atoms: [
            { element: 'C', dx: 0, dy: -35 }, { element: 'C', dx: 33, dy: -10 },
            { element: 'C', dx: 20, dy: 30 }, { element: 'C', dx: -20, dy: 30 },
            { element: 'C', dx: -33, dy: -10 }
        ],
        bonds: [
            { s: 0, t: 1, order: 1 }, { s: 1, t: 2, order: 1 },
            { s: 2, t: 3, order: 1 }, { s: 3, t: 4, order: 1 },
            { s: 4, t: 0, order: 1 }
        ]
    },
    'carboxyl': {
        name: 'Carboxyl (-COOH)',
        atoms: [
            { element: 'C', dx: 0, dy: 0 },
            { element: 'O', dx: 25, dy: -25 },
            { element: 'O', dx: 25, dy: 25 },
            { element: 'H', dx: 45, dy: 25 }
        ],
        bonds: [
            { s: 0, t: 1, order: 2 },
            { s: 0, t: 2, order: 1 },
            { s: 2, t: 3, order: 1 }
        ]
    },
    'nitro': {
        name: 'Nitro (-NO2)',
        atoms: [
            { element: 'N', dx: 0, dy: 0 },
            { element: 'O', dx: 25, dy: -20 },
            { element: 'O', dx: 25, dy: 20 }
        ],
        bonds: [
            { s: 0, t: 1, order: 2 },
            { s: 0, t: 2, order: 1 }
        ]
    },
    'methyl': {
        name: 'Methyl (-CH3)',
        atoms: [
            { element: 'C', dx: 0, dy: 0 },
            { element: 'H', dx: 20, dy: -15 },
            { element: 'H', dx: 20, dy: 15 },
            { element: 'H', dx: 30, dy: 0 }
        ],
        bonds: [
            { s: 0, t: 1, order: 1 }, { s: 0, t: 2, order: 1 }, { s: 0, t: 3, order: 1 }
        ]
    }
};

const getElementData = (symbol: string) => {
    return PERIODIC_TABLE[symbol.toUpperCase()] || PERIODIC_TABLE.UNKNOWN;
};

const COMMON_ELEMENTS = ['C', 'H', 'O', 'N', 'P', 'S', 'F', 'Cl', 'Br'];

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
  const [suggestions, setSuggestions] = useState<any[]>([]); // Suggestions state
  const [showPeriodicTable, setShowPeriodicTable] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorAtomIds, setErrorAtomIds] = useState<Set<string>>(new Set());
  
  // Template State
  const [selectedTemplate, setSelectedTemplate] = useState<string>('benzene');
  
  // UI Toggles
  const [resonanceIndex, setResonanceIndex] = useState(-1);
  const [angleSelection, setAngleSelection] = useState<string[]>([]);
  const [measuredAngle, setMeasuredAngle] = useState<string | null>(null);
  const [showHydrogens, setShowHydrogens] = useState(true);

  const modeRef = useRef(mode);
  const selectedAtomRef = useRef(selectedAtomId);
  const angleSelectionRef = useRef(angleSelection);
  const selectedTemplateRef = useRef(selectedTemplate);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { selectedAtomRef.current = selectedAtomId; }, [selectedAtomId]);
  useEffect(() => { angleSelectionRef.current = angleSelection; }, [angleSelection]);
  useEffect(() => { selectedTemplateRef.current = selectedTemplate; }, [selectedTemplate]);

  useEffect(() => {
    if (data) {
      setLocalData(JSON.parse(JSON.stringify(data)));
      setMode('view');
      setSelectedAtomId(null);
      setTooltip(null);
      setErrorMsg(null);
      setErrorAtomIds(new Set());
      setResonanceIndex(-1);
      setAngleSelection([]);
      setMeasuredAngle(null);
      setShowPeriodicTable(false);
      transformRef.current = d3.zoomIdentity; 
      // Reset nodes ref to ensure new molecule gets centered
      nodesRef.current = [];
    }
  }, [data]);

  useEffect(() => {
      if (errorMsg) {
          const timer = setTimeout(() => setErrorMsg(null), 4000);
          return () => clearTimeout(timer);
      }
  }, [errorMsg]);

  const triggerError = (msg: string, ids: string[]) => {
    setErrorMsg(msg);
    setErrorAtomIds(new Set(ids));
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
        bonds: cleanBonds,
        symmetry: localData.symmetry
    };
  };

  const handleAnalyze = () => {
    const snapshot = getCurrentSnapshot();
    if (snapshot && onAnalyze) onAnalyze(snapshot);
  };

  const handleExportImage = () => {
    if (!svgRef.current) return;
    
    // Create a canvas
    const canvas = document.createElement('canvas');
    const bbox = svgRef.current.getBoundingClientRect();
    canvas.width = bbox.width * 2; // High res
    canvas.height = bbox.height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fill background (Using a safe dark fallback if CSS variable isn't parsed by canvas)
    ctx.fillStyle = "#0f172a"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // XML Serialization
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const img = new Image();
    const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        
        // Download
        const a = document.createElement('a');
        a.download = `molecule-${Date.now()}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleAddAtom = (screenX: number, screenY: number) => {
      const snapshot = getCurrentSnapshot();
      if (!snapshot) return;

      let inputStr = (customElement.trim() || selectedElement).trim();
      
      // Resolve Name to Symbol if user typed a full name (e.g. "Carbon" -> "C")
      let symbol = inputStr;
      if (!PERIODIC_TABLE[inputStr.toUpperCase()]) {
          const found = Object.entries(PERIODIC_TABLE).find(([, v]) => v.name.toLowerCase() === inputStr.toLowerCase());
          if (found) symbol = found[0];
      }

      // Format Symbol: "CL" -> "Cl", "c" -> "C"
      const finalSymbol = symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();

      const transform = transformRef.current;
      const worldX = (screenX - transform.x) / transform.k;
      const worldY = (screenY - transform.y) / transform.k;
      const newAtom: Atom = {
          id: `new-${Date.now()}`,
          element: finalSymbol,
          x: worldX,
          y: worldY
      };
      setLocalData({ ...snapshot, atoms: [...snapshot.atoms, newAtom] });
  };

  const handleAddTemplate = (screenX: number, screenY: number, targetAtomId?: string) => {
      const snapshot = getCurrentSnapshot();
      if (!snapshot) return;

      const template = TEMPLATES[selectedTemplateRef.current];
      if (!template) return;

      const newAtoms: Atom[] = [];
      const newBonds: Bond[] = [];
      const timestamp = Date.now();
      
      let startX = 0, startY = 0;

      if (targetAtomId) {
          const target = snapshot.atoms.find(a => a.id === targetAtomId);
          if (target && target.x && target.y) {
              startX = target.x + 40; // Offset slightly
              startY = target.y;
          }
      } else {
          const transform = transformRef.current;
          startX = (screenX - transform.x) / transform.k;
          startY = (screenY - transform.y) / transform.k;
      }

      // Create Atoms
      template.atoms.forEach((tAtom, idx) => {
          newAtoms.push({
              id: `tmpl-${timestamp}-${idx}`,
              element: tAtom.element,
              x: startX + tAtom.dx,
              y: startY + tAtom.dy
          });
      });

      // Create Internal Bonds
      template.bonds.forEach(tBond => {
          newBonds.push({
              source: newAtoms[tBond.s].id,
              target: newAtoms[tBond.t].id,
              order: tBond.order,
              stereo: 'none'
          });
      });

      // If attached to an atom, add the connecting bond
      if (targetAtomId) {
          // Check valency of target
          const target = snapshot.atoms.find(a => a.id === targetAtomId);
          if (target) {
              const targetData = getElementData(target.element);
              const currentBonds = getCurrentBondCount(targetAtomId, snapshot.bonds);
              if (currentBonds >= targetData.maxBonds) {
                  triggerError(`${target.element} is full. Cannot attach group.`, [targetAtomId]);
                  return;
              }
              // Attach to first atom of template (usually the attachment point)
              newBonds.push({
                  source: targetAtomId,
                  target: newAtoms[0].id,
                  order: 1,
                  stereo: 'none'
              });
          }
      }

      setLocalData({
          ...snapshot,
          atoms: [...snapshot.atoms, ...newAtoms],
          bonds: [...snapshot.bonds, ...newBonds]
      });
  };

  const handleDeleteAtom = (atomId: string) => {
    const snapshot = getCurrentSnapshot();
    if (!snapshot) return;

    // Remove atom
    const newAtoms = snapshot.atoms.filter(a => a.id !== atomId);

    // Remove connected bonds
    const newBonds = snapshot.bonds.filter(b => {
        const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
        const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
        return s !== atomId && t !== atomId;
    });

    setLocalData({ ...snapshot, atoms: newAtoms, bonds: newBonds });
    setSelectedAtomId(null);
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

  const handleAddHydroxyl = (targetAtomId: string) => {
    const snapshot = getCurrentSnapshot();
    if (!snapshot) return;

    const targetAtom = snapshot.atoms.find(a => a.id === targetAtomId);
    if (!targetAtom) return;

    // 1. Chemistry Rule Check: Valency
    const targetElData = getElementData(targetAtom.element);
    const currentBonds = getCurrentBondCount(targetAtomId, snapshot.bonds);

    if (currentBonds >= targetElData.maxBonds) {
        triggerError(`${targetAtom.element} has max bonds (${targetElData.maxBonds}). Cannot add -OH.`, [targetAtomId]);
        return;
    }

    // 2. Position Calculation (Simple Physics Helper)
    // Place O slightly offset to let D3 force resolve the geometry
    const ox = (targetAtom.x || 0) + 30;
    const oy = (targetAtom.y || 0) + 30;
    const hx = ox + 20;
    const hy = oy + 20;

    const oId = `new-O-${Date.now()}`;
    const hId = `new-H-${Date.now()}`;

    const newO: Atom = { id: oId, element: 'O', x: ox, y: oy };
    const newH: Atom = { id: hId, element: 'H', x: hx, y: hy };

    const bond1: Bond = { source: targetAtomId, target: oId, order: 1, stereo: 'none' };
    const bond2: Bond = { source: oId, target: hId, order: 1, stereo: 'none' };

    setLocalData({
        ...snapshot,
        atoms: [...snapshot.atoms, newO, newH],
        bonds: [...snapshot.bonds, bond1, bond2]
    });
  };

  const handleResonanceSwitch = (index: number) => {
      if (!data) return;
      setResonanceIndex(index);
      const snapshot = getCurrentSnapshot();
      if (!snapshot) return;
      let newBonds: Bond[] = index === -1 ? data.bonds : (data.resonanceStructures?.[index]?.bonds || data.bonds);
      setLocalData({
          ...snapshot,
          bonds: JSON.parse(JSON.stringify(newBonds)),
          description: index === -1 ? data.description : (data.resonanceStructures?.[index]?.description || data.description)
      });
  };

  const handleCycleBond = (bondIndex: number, snapshot: MoleculeData) => {
      const bond = snapshot.bonds[bondIndex];
      const sourceId = typeof bond.source === 'object' ? (bond.source as any).id : bond.source;
      const targetId = typeof bond.target === 'object' ? (bond.target as any).id : bond.target;

      const currentOrder = bond.order;
      let nextOrder = currentOrder >= 3 ? 1 : currentOrder + 1;

      // Valency Check
      if (nextOrder > currentOrder) {
          const sourceData = getElementData(snapshot.atoms.find(a => a.id === sourceId)?.element || 'C');
          const targetData = getElementData(snapshot.atoms.find(a => a.id === targetId)?.element || 'C');
          
          const sourceCurrent = getCurrentBondCount(sourceId, snapshot.bonds);
          const targetCurrent = getCurrentBondCount(targetId, snapshot.bonds);
          
          if (sourceCurrent - currentOrder + nextOrder > sourceData.maxBonds) {
              triggerError(`${sourceData.name} exceeds max bonds (${sourceData.maxBonds})`, [sourceId]);
              return;
          }
          if (targetCurrent - currentOrder + nextOrder > targetData.maxBonds) {
             triggerError(`${targetData.name} exceeds max bonds (${targetData.maxBonds})`, [targetId]);
             return;
          }
      }

      const updatedBonds = [...snapshot.bonds];
      updatedBonds[bondIndex] = { ...bond, order: nextOrder, stereo: 'none' };
      setLocalData({ ...snapshot, bonds: updatedBonds });
  };

  const handleEditStereo = (bondIndex: number, snapshot: MoleculeData) => {
      const bond = snapshot.bonds[bondIndex];
      if (bond.order > 1) {
          triggerError("Stereochemistry applies to single bonds.", []);
          return;
      }
      const currentStereo = bond.stereo || 'none';
      const nextStereo = currentStereo === 'none' ? 'wedge' : currentStereo === 'wedge' ? 'dash' : 'none';
      const updatedBonds = [...snapshot.bonds];
      updatedBonds[bondIndex] = { ...bond, stereo: nextStereo };
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
          // If bond exists, we don't cycle here anymore to avoid confusion. User must click bond directly.
          setSelectedAtomId(null);
      } else {
          // Create Bond Valency Check
          const sourceData = getElementData(snapshot.atoms.find(a => a.id === currentSelected)?.element || 'C');
          const targetData = getElementData(snapshot.atoms.find(a => a.id === targetId)?.element || 'C');
          const sourceCurrent = getCurrentBondCount(currentSelected, snapshot.bonds);
          const targetCurrent = getCurrentBondCount(targetId, snapshot.bonds);

          if (sourceCurrent + 1 > sourceData.maxBonds) {
              triggerError(`${sourceData.name} full`, [currentSelected]);
              return;
          }
          if (targetCurrent + 1 > targetData.maxBonds) {
              triggerError(`${targetData.name} full`, [targetId]);
              return;
          }

          const newBond: Bond = { source: currentSelected, target: targetId, order: 1, stereo: 'none' };
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

  const calculateAngle = (id1: string, id2: string, id3: string, nodes: any[]) => {
      const p1 = nodes.find(n => n.id === id1);
      const p2 = nodes.find(n => n.id === id2); // Vertex
      const p3 = nodes.find(n => n.id === id3);
      if (!p1 || !p2 || !p3) return null;

      const v1x = p1.x - p2.x, v1y = p1.y - p2.y;
      const v2x = p3.x - p2.x, v2y = p3.y - p2.y;
      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.sqrt(v1x*v1x + v1y*v1y);
      const mag2 = Math.sqrt(v2x*v2x + v2y*v2y);
      if (mag1 === 0 || mag2 === 0) return null;

      const angleRad = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
      return ((angleRad * 180) / Math.PI).toFixed(1);
  };

  const getWedgePath = (x1: number, y1: number, x2: number, y2: number, width: number = 10): string => {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return "";
      // Normal vector
      const nx = (-dy / len) * width, ny = (dx / len) * width;
      return `M ${x1} ${y1} L ${x2 + nx} ${y2 + ny} L ${x2 - nx} ${y2 - ny} Z`;
  };

  useEffect(() => {
    if (!localData || !svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; user-select: none;");

    // Create definitions for gradients or patterns
    const defs = svg.append("defs");

    // 1. Drop Shadow Filter
    const filter = defs.append("filter")
        .attr("id", "atom-shadow")
        .attr("height", "150%")
        .attr("width", "150%");
    
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 2.5)
        .attr("result", "blur");
    
    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 2)
        .attr("dy", 2)
        .attr("result", "offsetBlur");
    
    filter.append("feComposite")
        .attr("in", "offsetBlur")
        .attr("operator", "out")
        .attr("in2", "SourceAlpha")
        .attr("result", "shadow");
        
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const oldNodesMap = new Map<string, any>(nodesRef.current.map((n: any) => [n.id, n]));
    
    // Filter Atoms for "Skeletal Mode" (Hide Hydrogens attached to Carbon)
    const hiddenAtomIds = new Set<string>();
    
    if (!showHydrogens) {
        localData.atoms.forEach(atom => {
             if (atom.element === 'H') {
                 // Check if connected to a Carbon
                 const isConnectedToCarbon = localData.bonds.some(b => {
                     const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
                     const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
                     if (s !== atom.id && t !== atom.id) return false;
                     
                     const partnerId = s === atom.id ? t : s;
                     const partner = localData.atoms.find(a => a.id === partnerId);
                     return partner && partner.element === 'C';
                 });
                 if (isConnectedToCarbon) hiddenAtomIds.add(atom.id);
             }
        });
    }

    const nodes = localData.atoms
        .filter(a => !hiddenAtomIds.has(a.id))
        .map(a => {
            const old = oldNodesMap.get(a.id);
            return old ? { ...a, x: old.x, y: old.y, vx: old.vx, vy: old.vy } : { ...a };
        });
    
    // Check if we have pre-existing positions (if so, we are editing, not loading fresh)
    const hasExistingPositions = nodes.length > 0 && nodes.some((n: any) => n.x !== undefined && !isNaN(n.x));

    // 2. Gradients
    const uniqueElements = Array.from(new Set(nodes.map((n: any) => n.element)));
    uniqueElements.forEach(elem => {
        const atomData = getElementData(elem);
        const baseColor = atomData.color;
        
        const grad = defs.append("radialGradient")
            .attr("id", `grad-${elem}`)
            .attr("cx", "35%")
            .attr("cy", "35%")
            .attr("r", "60%")
            .attr("fx", "20%")
            .attr("fy", "20%");
            
        grad.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#ffffff")
            .attr("stop-opacity", 0.9); // Sharper highlight for glossy look
            
        grad.append("stop")
            .attr("offset", "20%")
            .attr("stop-color", d3.rgb(baseColor).brighter(0.5).toString())
            .attr("stop-opacity", 1);
            
        grad.append("stop")
            .attr("offset", "50%")
            .attr("stop-color", baseColor)
            .attr("stop-opacity", 1);
            
        grad.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", d3.rgb(baseColor).darker(2).toString())
            .attr("stop-opacity", 1);
    });

    const links = localData.bonds
        .filter(b => {
             const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
             const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
             return !hiddenAtomIds.has(s) && !hiddenAtomIds.has(t);
        })
        .map(b => ({ 
            source: typeof b.source === 'object' ? (b.source as any).id : b.source, 
            target: typeof b.target === 'object' ? (b.target as any).id : b.target, 
            order: b.order, 
            stereo: b.stereo 
        }));
        
    nodesRef.current = nodes;

    const g = svg.append("g").attr("class", "zoom-layer");
    
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 8])
      .on("zoom", (event) => {
          g.attr("transform", event.transform as any);
          transformRef.current = event.transform;
      });

    // Apply zoom behavior and RESTORE previous transform immediately
    svg.call(zoomBehavior as any)
       .call(zoomBehavior.transform as any, transformRef.current);

    // Force Simulation
    simulationRef.current = d3.forceSimulation(nodes as any)
        .force("link", d3.forceLink(links).id((d: any) => d.id).distance(60))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("collision", d3.forceCollide().radius(30));

    // Only add Centering force if we don't have established positions (Initial Load)
    // This prevents the whole molecule from "jumping" or shifting when an atom is added/removed.
    if (!hasExistingPositions) {
        simulationRef.current.force("center", d3.forceCenter(width / 2, height / 2));
    }

    // Bond Groups
    const linkGroup = g.append("g")
        .attr("class", "links")
        .selectAll("g")
        .data(links)
        .enter().append("g")
        .attr("class", "bond-group")
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            event.stopPropagation();
            const m = modeRef.current;
            const snapshot = getCurrentSnapshot();
            if (!snapshot) return;
            const bondIndex = snapshot.bonds.findIndex(b => {
               const s = typeof b.source === 'object' ? (b.source as any).id : b.source;
               const t = typeof b.target === 'object' ? (b.target as any).id : b.target;
               const ds = typeof d.source === 'object' ? d.source.id : d.source;
               const dt = typeof d.target === 'object' ? d.target.id : d.target;
               return (s===ds && t===dt) || (s===dt && t===ds);
            });

            if (bondIndex === -1) return;

            if (m === 'break-bond') {
                handleBreakBond(d);
            } else if (m === 'add-bond') {
                handleCycleBond(bondIndex, snapshot);
            } else if (m === 'edit-stereo') {
                handleEditStereo(bondIndex, snapshot);
            }
        })
        .on("mouseenter", function() {
             if (['add-bond', 'break-bond', 'edit-stereo'].includes(modeRef.current)) {
                 d3.select(this).select(".bond-highlight").attr("opacity", 0.3);
             }
        })
        .on("mouseleave", function() {
            d3.select(this).select(".bond-highlight").attr("opacity", 0);
        });

    linkGroup.append("path")
        .attr("class", "bond-highlight")
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 14) // Wider highlight
        .attr("stroke-linecap", "round")
        .attr("fill", "none")
        .attr("opacity", 0);

    linkGroup.append("path")
        .attr("class", "bond-path")
        .attr("stroke", "#cbd5e1") // Lighter grey for "stick" appearance
        .attr("stroke-width", 6) // Thicker bond stick
        .attr("stroke-linecap", "round")
        .attr("fill", "none");

    // Atom Groups
    const node = g.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodes)
        .enter().append("g")
        .call(d3.drag<any, any>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        )
        .on("click", (event, d: any) => {
            event.stopPropagation();
            if (modeRef.current === 'delete-atom') {
                handleDeleteAtom(d.id);
            } else if (modeRef.current === 'add-hydroxyl') {
                handleAddHydroxyl(d.id);
            } else if (modeRef.current === 'stamp') {
                handleAddTemplate(0, 0, d.id);
            } else if (modeRef.current === 'add-bond') {
                 if (!selectedAtomRef.current) {
                    setSelectedAtomId(d.id);
                 } else {
                    handleToggleBond(d.id);
                 }
            } else if (modeRef.current === 'measure-angle') {
                const currentSel = [...angleSelectionRef.current];
                if (!currentSel.includes(d.id)) {
                    const newSel = [...currentSel, d.id];
                    setAngleSelection(newSel);
                    if (newSel.length === 3) {
                        const angle = calculateAngle(newSel[0], newSel[1], newSel[2], nodesRef.current);
                        setMeasuredAngle(angle);
                        setTimeout(() => {
                            setAngleSelection([]);
                            setMeasuredAngle(null);
                        }, 3000);
                    }
                }
            }
        })
        .on("mouseover", (event, d: any) => {
             const atomData = getElementData(d.element);
             const currentBonds = getCurrentBondCount(d.id, localData.bonds);
             setTooltip({
                 x: event.pageX,
                 y: event.pageY,
                 atom: d,
                 valencyInfo: { current: currentBonds, max: atomData.maxBonds, warning: currentBonds > atomData.maxBonds }
             });
        })
        .on("mouseout", () => {
            setTooltip(null);
        });

    node.append("circle")
        .attr("r", (d: any) => getElementData(d.element).radius + 6)
        .attr("fill", "none")
        .attr("stroke", (d: any) => {
            if (errorAtomIds.has(d.id)) return "#ef4444";
            if (angleSelectionRef.current.includes(d.id)) return "#f59e0b";
            if (selectedAtomRef.current === d.id) return "#3b82f6";
            return "transparent";
        })
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", (d: any) => selectedAtomRef.current === d.id ? "4 2" : "0")
        .attr("class", "selection-halo");

    node.append("circle")
        .attr("r", (d: any) => getElementData(d.element).radius)
        .attr("fill", (d: any) => `url(#grad-${d.element})`)
        .attr("stroke", (d: any) => d3.rgb(getElementData(d.element).color).darker(1.5).toString())
        .attr("stroke-width", 1)
        .attr("class", "atom-circle")
        .style("filter", "url(#atom-shadow)");

    node.append("text")
        .text((d: any) => d.element)
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .style("font-size", "14px")
        .style("font-family", "Arial, sans-serif")
        .style("font-weight", "900")
        .style("fill", (d: any) => {
             const c = d3.color(getElementData(d.element).color);
             const l = c ? (c as any).rgb().r * 0.299 + (c as any).rgb().g * 0.587 + (c as any).rgb().b * 0.114 : 0;
             return l > 160 ? "#1a1a1a" : "#FFFFFF";
        })
        .style("text-shadow", "0px 1px 2px rgba(0,0,0,0.4)") // Soft shadow for readability
        .style("pointer-events", "none");


    simulationRef.current.on("tick", () => {
        linkGroup.each(function(d: any) {
            const group = d3.select(this);
            const x1 = d.source.x;
            const y1 = d.source.y;
            const x2 = d.target.x;
            const y2 = d.target.y;

            group.select(".bond-highlight").attr("d", `M${x1},${y1} L${x2},${y2}`);

            let pathData = "";
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist === 0) return;
            
            const offsetX = (dy / dist) * 5; // Slightly wider gap for double bonds due to thicker sticks
            const offsetY = (-dx / dist) * 5;

            if (d.stereo === 'wedge') {
                pathData = getWedgePath(x1, y1, x2, y2, 8);
                group.select(".bond-path").attr("fill", "#cbd5e1").attr("stroke", "none");
            } else if (d.stereo === 'dash') {
                pathData = `M${x1},${y1} L${x2},${y2}`;
                group.select(".bond-path").attr("stroke-dasharray", "4,4").attr("fill", "none").attr("stroke", "#cbd5e1");
            } else {
                group.select(".bond-path").attr("stroke-dasharray", null as any).attr("fill", "none").attr("stroke", "#cbd5e1");
                if (d.order === 3) {
                    pathData = `M${x1 + offsetX*1.6},${y1 + offsetY*1.6} L${x2 + offsetX*1.6},${y2 + offsetY*1.6} ` +
                               `M${x1},${y1} L${x2},${y2} ` +
                               `M${x1 - offsetX*1.6},${y1 - offsetY*1.6} L${x2 - offsetX*1.6},${y2 - offsetY*1.6}`;
                } else if (d.order === 2) {
                    pathData = `M${x1 + offsetX},${y1 + offsetY} L${x2 + offsetX},${y2 + offsetY} ` +
                               `M${x1 - offsetX},${y1 - offsetY} L${x2 - offsetX},${y2 - offsetY}`;
                } else {
                    pathData = `M${x1},${y1} L${x2},${y2}`;
                }
            }
            group.select(".bond-path").attr("d", pathData);
        });
        node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
        if (!event.active) simulationRef.current.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event: any, d: any) {
        if (!event.active) simulationRef.current.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    svg.on("click", (event) => {
        const coords = d3.pointer(event);
        if (modeRef.current === 'add-atom' && !showPeriodicTable) {
             handleAddAtom(coords[0], coords[1]);
        } else if (modeRef.current === 'stamp') {
            handleAddTemplate(coords[0], coords[1]);
        } else {
             setSelectedAtomId(null);
        }
    });

    return () => {
        simulationRef.current?.stop();
    };
  }, [localData, mode, angleSelection, selectedAtomId, errorAtomIds, showHydrogens]); 

  const renderPeriodicTable = () => {
      const elements = Object.entries(PERIODIC_TABLE).filter(([k]) => k !== 'UNKNOWN');
      return (
          <div className="absolute top-20 left-16 bg-skin-surface/95 backdrop-blur-md border border-skin-border p-4 rounded-xl shadow-2xl z-50 animate-enter max-w-[800px] overflow-auto max-h-[80vh]">
              <div className="flex justify-between items-center mb-4 border-b border-skin-border pb-2">
                  <h3 className="font-bold text-skin-main flex items-center gap-2"><Grid3X3 size={18}/> Periodic Table</h3>
                  <button onClick={() => setShowPeriodicTable(false)} className="text-skin-muted hover:text-skin-main"><X size={20}/></button>
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(18, minmax(36px, 1fr))' }}>
                  {elements.map(([symbol, data]) => (
                      <button
                          key={symbol}
                          onClick={() => {
                              setSelectedElement(symbol);
                              setCustomElement('');
                              setShowPeriodicTable(false);
                          }}
                          className={`
                            w-9 h-9 flex flex-col items-center justify-center rounded border text-[10px] transition-transform hover:scale-110
                            ${selectedElement === symbol ? 'ring-2 ring-skin-primary z-10' : ''}
                          `}
                          style={{
                              gridColumn: data.col,
                              gridRow: data.row,
                              backgroundColor: data.color,
                              color: d3.color(data.color) && (d3.color(data.color) as any).rgb().r * 0.299 + (d3.color(data.color) as any).rgb().g * 0.587 + (d3.color(data.color) as any).rgb().b * 0.114 > 160 ? '#222' : '#fff',
                              borderColor: 'rgba(0,0,0,0.1)'
                          }}
                      >
                          <span className="font-bold text-xs">{symbol}</span>
                      </button>
                  ))}
              </div>
              <div className="mt-4 text-xs text-skin-muted grid grid-cols-4 gap-2">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#404040] rounded-sm"></div> Non-metals</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#CC80FF] rounded-sm"></div> Alkali Metals</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#A6A6AB] rounded-sm"></div> Transition Metals</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#d9ffff] rounded-sm"></div> Noble Gases</div>
              </div>
          </div>
      );
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-skin-sidebar-bg overflow-hidden" onMouseLeave={() => setTooltip(null)}>
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50">
                <Loader2 className="animate-spin w-10 h-10 text-white" />
            </div>
        )}
        
        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 bg-skin-surface border border-skin-border p-2 rounded-lg shadow-lg z-10">
            <button onClick={() => setMode('view')} className={`p-2 rounded ${mode === 'view' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`} title="View/Drag"><MousePointer2 size={20}/></button>
            <button onClick={() => setMode('add-atom')} className={`p-2 rounded ${mode === 'add-atom' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`} title="Add Atom"><PlusCircle size={20}/></button>
            <button onClick={() => setMode('add-bond')} className={`p-2 rounded ${mode === 'add-bond' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`} title="Add/Edit Bond (Cycle Order)"><LinkIcon size={20}/></button>
            <button onClick={() => setMode('edit-stereo')} className={`p-2 rounded ${mode === 'edit-stereo' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`} title="Edit Stereochemistry"><Layers size={20}/></button>
            <button onClick={() => setMode('stamp')} className={`p-2 rounded ${mode === 'stamp' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`} title="Templates / Functional Groups"><Stamp size={20}/></button>
            <button onClick={() => setMode('break-bond')} className={`p-2 rounded ${mode === 'break-bond' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`} title="Break Bond"><Scissors size={20}/></button>
            <button onClick={() => setMode('measure-angle')} className={`p-2 rounded ${mode === 'measure-angle' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`} title="Measure Angle"><Ruler size={20}/></button>
            <button onClick={() => setMode('add-hydroxyl')} className={`p-2 rounded ${mode === 'add-hydroxyl' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`} title="Add Hydroxyl Group (-OH)"><Droplets size={20}/></button>
            
            <div className="h-px bg-skin-border my-1"></div>
            
             <button 
                onClick={() => setShowHydrogens(!showHydrogens)} 
                className={`p-2 rounded ${!showHydrogens ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`} 
                title={showHydrogens ? "Hide Hydrogens (Skeletal Mode)" : "Show Hydrogens"}
            >
                <Ghost size={20}/>
            </button>

            <button onClick={() => setMode('delete-atom')} className={`p-2 rounded ${mode === 'delete-atom' ? 'bg-red-500 text-white' : 'text-skin-muted hover:bg-red-100 hover:text-red-500'}`} title="Delete Atom"><Trash2 size={20}/></button>
            
            <div className="h-px bg-skin-border my-1"></div>
            <button onClick={handleAnalyze} className="p-2 rounded hover:bg-skin-base text-green-500" title="Analyze Structure"><Wand2 size={20}/></button>
            <button onClick={() => setLocalData(data ? JSON.parse(JSON.stringify(data)) : null)} className="p-2 rounded hover:bg-skin-base text-yellow-500" title="Reset"><RefreshCw size={20}/></button>
            <button onClick={handleExportImage} className="p-2 rounded hover:bg-skin-base text-cyan-500" title="Export Image"><Camera size={20}/></button>
        </div>

        {/* Template Selector */}
        {mode === 'stamp' && (
            <div className="absolute top-4 left-16 ml-4 bg-skin-surface border border-skin-border p-2 rounded-lg shadow-lg z-10 flex gap-2 items-center animate-slide-up">
                {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                    <button 
                        key={key}
                        onClick={() => setSelectedTemplate(key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedTemplate === key ? 'bg-skin-primary text-white' : 'bg-skin-base text-skin-main hover:bg-skin-border'}`}
                        title={tmpl.name}
                    >
                        {tmpl.name}
                    </button>
                ))}
            </div>
        )}

        {/* Quick Element Selector & Periodic Table Toggle */}
        {mode === 'add-atom' && (
            <div className="absolute top-4 left-16 ml-4 bg-skin-surface border border-skin-border p-2 rounded-lg shadow-lg z-10 flex gap-2 items-center animate-slide-up">
                <div className="flex gap-1">
                    {COMMON_ELEMENTS.slice(0, 5).map(el => (
                        <button key={el} onClick={() => {setSelectedElement(el); setCustomElement(''); setSuggestions([]); }} className={`w-8 h-8 rounded font-bold text-xs shadow-sm transition-all ${selectedElement === el && !customElement ? 'bg-skin-primary text-white scale-110' : 'bg-skin-base text-skin-muted hover:bg-skin-border'}`}>
                            {el}
                        </button>
                    ))}
                </div>
                <div className="w-px h-6 bg-skin-border mx-1"></div>
                <button 
                    onClick={() => setShowPeriodicTable(!showPeriodicTable)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${showPeriodicTable ? 'bg-skin-primary text-white' : 'bg-skin-base text-skin-main hover:bg-skin-border'}`}
                >
                    <Grid3X3 size={14}/> Table
                </button>
                <div className="relative">
                     <input 
                        value={customElement}
                        onChange={(e) => {
                            const val = e.target.value;
                            setCustomElement(val);
                            if (val) {
                                const results = Object.entries(PERIODIC_TABLE)
                                    .filter(([sym, data]) => 
                                        sym !== 'UNKNOWN' && 
                                        (sym.toLowerCase().startsWith(val.toLowerCase()) || data.name.toLowerCase().includes(val.toLowerCase()))
                                    )
                                    .map(([sym, data]) => ({ sym, ...data }))
                                    .slice(0, 5);
                                setSuggestions(results);
                            } else {
                                setSuggestions([]);
                            }
                        }}
                        placeholder="Sym"
                        className="w-12 h-8 bg-skin-base border border-skin-border rounded text-center text-xs focus:ring-2 ring-skin-primary outline-none text-skin-main uppercase"
                    />
                    {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 w-48 bg-skin-surface border border-skin-border rounded shadow-lg z-50 mt-1 max-h-48 overflow-y-auto">
                            {suggestions.map(s => (
                                <button 
                                    key={s.sym}
                                    onClick={() => {
                                        setCustomElement(s.sym);
                                        setSuggestions([]);
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-skin-base flex items-center justify-between text-xs border-b border-skin-border last:border-0"
                                >
                                    <span className="font-bold text-skin-main">{s.name}</span>
                                    <span className="text-skin-muted bg-skin-base px-1.5 py-0.5 rounded border border-skin-border">{s.sym}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {showPeriodicTable && renderPeriodicTable()}

        {/* Error Message */}
        {errorMsg && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-pop">
                <AlertTriangle size={18} /> {errorMsg}
            </div>
        )}

        {/* Info Message */}
        {data?.name === 'Impossible' && (
             <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-amber-100 border border-amber-400 text-amber-800 px-6 py-3 rounded-xl shadow-lg z-40 max-w-md flex gap-3">
                 <AlertTriangle className="shrink-0" />
                 <div>
                     <h4 className="font-bold">Chemically Impossible</h4>
                     <p className="text-sm">{data.description}</p>
                 </div>
             </div>
        )}

        {/* Measured Angle */}
        {measuredAngle && (
             <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-skin-primary text-white px-4 py-2 rounded-lg shadow-lg z-50 font-bold">
                Angle: {measuredAngle}°
            </div>
        )}

        <svg ref={svgRef} className="w-full h-full cursor-crosshair touch-none"></svg>

        {/* Tooltip */}
        {tooltip && (
            <div className="fixed bg-skin-surface text-skin-main p-3 rounded shadow-xl z-50 pointer-events-none border border-skin-border text-sm" style={{ left: tooltip.x + 15, top: tooltip.y + 15 }}>
                <div className="font-bold border-b border-skin-border pb-1 mb-1">{tooltip.atom?.element} <span className="text-skin-muted text-xs">#{tooltip.atom?.id.slice(-4)}</span></div>
                {tooltip.valencyInfo && (
                     <div>Valency: {tooltip.valencyInfo.current} / {tooltip.valencyInfo.max} {tooltip.valencyInfo.warning && <span className="text-red-500 font-bold ml-1">!</span>}</div>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-skin-muted mt-1 border-t border-skin-border pt-1">
                    <span>Mass: {getElementData(tooltip.atom?.element || '').mass}</span>
                    <span>At #: {getElementData(tooltip.atom?.element || '').atomicNumber}</span>
                    <span className="col-span-2">Oxidation: {getElementData(tooltip.atom?.element || '').oxidationStates}</span>
                </div>
            </div>
        )}
        
        {/* Resonance Selector */}
        {data?.resonanceStructures && data.resonanceStructures.length > 0 && (
             <div className="absolute bottom-6 right-6 bg-skin-surface/90 backdrop-blur p-4 rounded-xl border border-skin-border max-w-sm shadow-xl animate-slide-up">
                 <div className="flex items-center justify-between mb-3">
                     <h4 className="text-sm font-bold text-skin-main flex items-center gap-2"><Layers size={16}/> Resonance</h4>
                 </div>
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                     <button 
                        onClick={() => handleResonanceSwitch(-1)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${resonanceIndex === -1 ? 'bg-skin-primary border-skin-primary text-white' : 'bg-skin-base border-skin-border text-skin-muted hover:bg-skin-surface'}`}
                     >
                         Major
                     </button>
                     {data.resonanceStructures.map((_, i) => (
                         <button 
                            key={i}
                            onClick={() => handleResonanceSwitch(i)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border whitespace-nowrap ${resonanceIndex === i ? 'bg-skin-primary border-skin-primary text-white' : 'bg-skin-base border-skin-border text-skin-muted hover:bg-skin-surface'}`}
                         >
                            Structure {i + 1}
                         </button>
                     ))}
                 </div>
                 <p className="text-xs text-skin-muted mt-2 italic">
                     {resonanceIndex === -1 ? data.description : data.resonanceStructures[resonanceIndex].description}
                 </p>
             </div>
        )}

        {/* Symmetry Info */}
        {data?.symmetry && (
             <div className="absolute bottom-6 left-6 bg-skin-surface/90 backdrop-blur p-4 rounded-xl border border-skin-border shadow-xl animate-slide-up">
                 <h4 className="text-sm font-bold text-skin-main flex items-center gap-2 mb-2"><RefreshCw size={16}/> Symmetry</h4>
                 <div className="text-xs text-skin-main">
                     <span className="font-bold">Point Group:</span> {data.symmetry.pointGroup}
                 </div>
                 <div className="text-xs text-skin-muted mt-1">
                     Elements: {data.symmetry.elements.join(", ")}
                 </div>
             </div>
        )}
    </div>
  );
};

export default MoleculeVisualizer;