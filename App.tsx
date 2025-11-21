import React, { useState, useEffect, useRef } from 'react';
import { 
  Atom, Beaker, BookOpen, BrainCircuit, Menu, MessageCircle, X, 
  Award, ArrowRight, Zap, Search, Save, Archive, FlaskConical, CheckCircle, Lock, Play, GraduationCap, ChevronDown, ChevronUp, Thermometer, Palette, Moon, Sun, Gauge, Flame, Droplets
} from 'lucide-react';
import { AppView, MoleculeData, QuizData, ReactionData, ArchiveItem, Module, UserStats } from './types';
import * as gemini from './services/geminiService';
import MoleculeVisualizer from './components/MoleculeVisualizer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Helper Components ---

const NavItem = ({ view, current, icon: Icon, label, onClick, delay }: any) => (
  <button
    onClick={() => onClick(view)}
    className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg transition-all duration-300 group relative overflow-hidden ${
      current === view 
        ? 'bg-skin-primary text-white shadow-lg shadow-skin-primary/20' 
        : 'text-skin-sidebar-text hover:bg-white/10 hover:text-white'
    } animate-slide-up`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 ${current === view ? 'hidden' : ''}`} />
    <Icon size={20} className={`transition-transform duration-300 ${current === view ? 'scale-110' : 'group-hover:scale-110'}`} />
    <span className="font-medium z-10">{label}</span>
  </button>
);

const DashboardCard = ({ title, value, subtitle, icon: Icon, colorClass, delay }: any) => (
  <div 
    className={`bg-skin-surface border border-skin-border p-6 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-enter`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorClass}`}>
      <Icon className="text-white" size={24} />
    </div>
    <h3 className="text-3xl font-bold text-skin-main">{value}</h3>
    <p className="text-skin-main font-medium mt-1 opacity-90">{title}</p>
    <p className="text-skin-muted text-sm mt-1">{subtitle}</p>
  </div>
);

// --- Theme Configuration ---
type ThemeId = 'default' | 'emerald' | 'purple' | 'dark';

interface ThemeConfig {
  id: ThemeId;
  name: string;
  icon: any;
  color: string;
}

const THEMES: ThemeConfig[] = [
  { id: 'default', name: 'Scientific Blue', icon: Atom, color: 'bg-blue-600' },
  { id: 'emerald', name: 'Bio Emerald', icon: FlaskConical, color: 'bg-emerald-600' },
  { id: 'purple', name: 'Noble Purple', icon: Award, color: 'bg-violet-600' },
  { id: 'dark', name: 'Night Mode', icon: Moon, color: 'bg-slate-800' },
];

const CURRICULA: Record<string, Module[]> = {
  UNDERGRAD: [
    { id: 'u1', title: 'Structure & Bonding', description: 'Lewis structures, hybridization, and molecular geometry.', status: 'active', topic: 'Chemical Bonding' },
    { id: 'u2', title: 'Acids and Bases', description: 'pKa, resonance effects, and Lewis acid-base theory.', status: 'locked', topic: 'Acids and Bases' },
    { id: 'u3', title: 'Alkanes & Nomenclature', description: 'IUPAC naming, conformational analysis (Newman projections).', status: 'locked', topic: 'Alkanes' },
    { id: 'u4', title: 'Stereochemistry', description: 'Chirality, enantiomers, diastereomers, and R/S configuration.', status: 'locked', topic: 'Stereochemistry' },
    { id: 'u5', title: 'Nucleophilic Substitution', description: 'SN1 and SN2 mechanisms, kinetics, and stereochemical outcomes.', status: 'locked', topic: 'Nucleophilic Substitution' },
    { id: 'u6', title: 'Elimination Reactions', description: 'E1 and E2 mechanisms, Zaitsev vs Hofmann products.', status: 'locked', topic: 'Elimination Reactions' },
    { id: 'u7', title: 'Alkenes: Reactions', description: 'Electrophilic addition, hydration, and oxidation.', status: 'locked', topic: 'Alkenes' },
    { id: 'u8', title: 'Alkynes', description: 'Synthesis and reactions of alkynes.', status: 'locked', topic: 'Alkynes' },
    { id: 'u9', title: 'Alcohols and Ethers', description: 'Synthesis, oxidation, and protection groups.', status: 'locked', topic: 'Alcohols' },
    { id: 'u10', title: 'Spectroscopy (NMR/IR/MS)', description: 'Structure elucidation using spectral data.', status: 'locked', topic: 'Spectroscopy' },
    { id: 'u11', title: 'Conjugated Systems', description: 'Dienes, UV-Vis, and molecular orbital theory.', status: 'locked', topic: 'Conjugated Systems' },
    { id: 'u12', title: 'Aromatic Compounds', description: 'Benzene, aromaticity (Hückel rule).', status: 'locked', topic: 'Aromaticity' },
    { id: 'u13', title: 'Electrophilic Aromatic Subst.', description: 'Halogenation, nitration, sulfonation, Friedel-Crafts.', status: 'locked', topic: 'EAS' },
    { id: 'u14', title: 'Aldehydes and Ketones', description: 'Nucleophilic addition reactions.', status: 'locked', topic: 'Carbonyls' },
    { id: 'u15', title: 'Carboxylic Acids', description: 'Acidity, synthesis, and reactions.', status: 'locked', topic: 'Carboxylic Acids' },
    { id: 'u16', title: 'Acid Derivatives', description: 'Esters, amides, anhydrides, and acid chlorides.', status: 'locked', topic: 'Acid Derivatives' },
    { id: 'u17', title: 'Enols and Enolates', description: 'Alpha-carbon chemistry, aldol condensations.', status: 'locked', topic: 'Enolates' },
    { id: 'u18', title: 'Amines', description: 'Basicity, synthesis, and reactions.', status: 'locked', topic: 'Amines' },
  ],
  ALEVEL: [
    { id: 'a1', title: 'Atomic Structure', description: 'Protons, neutrons, electrons, and orbitals.', status: 'active', topic: 'Atomic Structure' },
    { id: 'a2', title: 'Amount of Substance', description: 'Moles, empirical formulas, and stoichiometry.', status: 'locked', topic: 'Stoichiometry' },
    { id: 'a3', title: 'Bonding', description: 'Ionic, covalent, metallic bonding and intermolecular forces.', status: 'locked', topic: 'Bonding' },
    { id: 'a4', title: 'Intro to Organic Chem', description: 'Functional groups, IUPAC naming, isomerism.', status: 'locked', topic: 'Organic Basics' },
    { id: 'a5', title: 'Alkanes', description: 'Fractional distillation, cracking, combustion, radical substitution.', status: 'locked', topic: 'Alkanes' },
    { id: 'a6', title: 'Halogenoalkanes', description: 'Nucleophilic substitution, elimination, ozone layer.', status: 'locked', topic: 'Halogenoalkanes' },
    { id: 'a7', title: 'Alkenes', description: 'Electrophilic addition, polymerization, stereoisomerism.', status: 'locked', topic: 'Alkenes' },
    { id: 'a8', title: 'Alcohols', description: 'Production, oxidation, elimination to alkenes.', status: 'locked', topic: 'Alcohols' },
    { id: 'a9', title: 'Organic Analysis', description: 'Mass spec (fragmentation), IR spec.', status: 'locked', topic: 'Spectroscopy' },
    { id: 'a10', title: 'Thermodynamics', description: 'Enthalpy, Born-Haber cycles, entropy, Gibbs free energy.', status: 'locked', topic: 'Thermodynamics' },
    { id: 'a11', title: 'Kinetics', description: 'Rate equations, orders of reaction, Arrhenius.', status: 'locked', topic: 'Kinetics' },
    { id: 'a12', title: 'Equilibrium (Kp)', description: 'Gas phase equilibria and equilibrium constants.', status: 'locked', topic: 'Equilibrium' },
    { id: 'a13', title: 'Aldehydes & Ketones', description: 'Carbonyl tests (Tollens/Fehlings), reduction, hydroxynitriles.', status: 'locked', topic: 'Carbonyls' },
    { id: 'a14', title: 'Carboxylic Acids', description: 'Acidity, esters, triglycerides, acylation.', status: 'locked', topic: 'Carboxylic Acids' },
    { id: 'a15', title: 'Aromatic Chemistry', description: 'Benzene structure, delocalization, electrophilic substitution.', status: 'locked', topic: 'Aromatics' },
    { id: 'a16', title: 'Amines & Polymers', description: 'Basicity, nucleophilic reactions, polyamides/polyesters.', status: 'locked', topic: 'Amines' },
    { id: 'a17', title: 'Amino Acids & DNA', description: 'Chirality, zwitterions, peptides, protein structure.', status: 'locked', topic: 'Biochemistry' },
    { id: 'a18', title: 'NMR Synthesis', description: 'Proton and C13 NMR, chromatography, organic synthesis.', status: 'locked', topic: 'Advanced Analysis' },
  ],
  IB: [
     { id: 'ib1', title: 'Stoichiometric Relationships', description: 'The mole concept, reacting masses and volumes.', status: 'active', topic: 'Stoichiometry' },
     { id: 'ib2', title: 'Atomic Structure', description: 'Electron configuration, emission spectra.', status: 'locked', topic: 'Atomic Structure' },
     { id: 'ib3', title: 'Periodicity', description: 'Periodic trends: radius, ionization energy, electronegativity.', status: 'locked', topic: 'Periodicity' },
     { id: 'ib4', title: 'Chemical Bonding', description: 'Ionic, covalent, metallic, VSEPR theory.', status: 'locked', topic: 'Bonding' },
     { id: 'ib5', title: 'Energetics/Thermochem', description: 'Enthalpy cycles, bond enthalpies, entropy (HL).', status: 'locked', topic: 'Energetics' },
     { id: 'ib6', title: 'Chemical Kinetics', description: 'Collision theory, rates of reaction, mechanisms (HL).', status: 'locked', topic: 'Kinetics' },
     { id: 'ib7', title: 'Equilibrium', description: 'Le Chatelier, equilibrium law, Gibb\'s energy (HL).', status: 'locked', topic: 'Equilibrium' },
     { id: 'ib8', title: 'Acids and Bases', description: 'pH scale, strong/weak, buffers (HL), salt hydrolysis.', status: 'locked', topic: 'Acids and Bases' },
     { id: 'ib9', title: 'Redox Processes', description: 'Oxidation states, voltaic/electrolytic cells.', status: 'locked', topic: 'Redox' },
     { id: 'ib10', title: 'Organic Fundamentals', description: 'Homologous series, functional groups, naming.', status: 'locked', topic: 'Organic Basics' },
     { id: 'ib11', title: 'Measurement & Data', description: 'Spectroscopic identification (IR, H-NMR, MS).', status: 'locked', topic: 'Spectroscopy' },
     { id: 'ib12', title: 'Advanced Organic (HL)', description: 'Sn1/Sn2, E1/E2, retro-synthesis, stereoisomerism.', status: 'locked', topic: 'Advanced Organic' },
     { id: 'ib13', title: 'Biochemistry (Option)', description: 'Proteins, lipids, carbohydrates, enzymes.', status: 'locked', topic: 'Biochemistry' },
     { id: 'ib14', title: 'Medicinal Chem (Option)', description: 'Drug action, aspirin, penicillin, opiates.', status: 'locked', topic: 'Medicinal Chemistry' },
  ]
};

const App = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('default');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  // User Progress State
  const [selectedSyllabus, setSelectedSyllabus] = useState('UNDERGRAD');
  const [modules, setModules] = useState<Module[]>(CURRICULA.UNDERGRAD);
  const [userStats, setUserStats] = useState<UserStats>({
    quizzesTaken: 0,
    totalScore: 0,
    reactionsMastered: 0,
    moleculesGenerated: 0
  });
  const [archive, setArchive] = useState<ArchiveItem[]>([]);
  const [expandedCurriculum, setExpandedCurriculum] = useState(false);

  // Molecule State
  const [moleculeInput, setMoleculeInput] = useState("Caffeine");
  const [moleculeData, setMoleculeData] = useState<MoleculeData | null>(null);
  const [loadingMolecule, setLoadingMolecule] = useState(false);
  const [reactionReagentInput, setReactionReagentInput] = useState("");
  
  // Reaction Conditions State
  const [reactionTemp, setReactionTemp] = useState(25);
  const [reactionPressure, setReactionPressure] = useState(1);
  const [reactionCatalyst, setReactionCatalyst] = useState("");
  const [reactionSolvent, setReactionSolvent] = useState("Ethanol");
  const [showConditions, setShowConditions] = useState(false);


  // Reaction Tutor State
  const [reactionInput, setReactionInput] = useState("SN2 reaction of methyl bromide with hydroxide");
  const [reactionData, setReactionData] = useState<ReactionData | null>(null);
  const [loadingReaction, setLoadingReaction] = useState(false);

  // Quiz State
  const [quizTopic, setQuizTopic] = useState("Stereochemistry");
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Chat State
  const [chatHistory, setChatHistory] = useState<{id: string, role: 'user'|'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // --- Effect to Apply Theme ---
  useEffect(() => {
    document.body.className = `theme-${currentTheme}`;
  }, [currentTheme]);

  // --- Handlers ---

  const handleSyllabusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSyllabus = e.target.value;
    setSelectedSyllabus(newSyllabus);
    setModules(CURRICULA[newSyllabus]);
    setExpandedCurriculum(false); 
  };

  const handleMoleculeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moleculeInput) return;
    setLoadingMolecule(true);
    try {
      const data = await gemini.generateMoleculeData(moleculeInput);
      setMoleculeData(data);
      setUserStats(prev => ({ ...prev, moleculesGenerated: prev.moleculesGenerated + 1 }));
    } catch (error) {
      alert("Failed to generate molecule. Please try again.");
    } finally {
      setLoadingMolecule(false);
    }
  };

  const handleAnalyzeMolecule = async (modifiedData: MoleculeData) => {
    setLoadingMolecule(true);
    try {
        const analyzedData = await gemini.analyzeMolecule(modifiedData);
        setMoleculeData(analyzedData);
    } catch (error) {
        alert("Failed to analyze modification.");
    } finally {
        setLoadingMolecule(false);
    }
  };

  const handleApplyReaction = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!moleculeData || !reactionReagentInput) return;
      
      setLoadingMolecule(true);
      try {
          const conditions = {
              temp: reactionTemp,
              pressure: reactionPressure,
              catalyst: reactionCatalyst,
              solvent: reactionSolvent
          };

          const productData = await gemini.applyReaction(moleculeData, reactionReagentInput, conditions);
          setMoleculeData(productData);
          // Don't clear reagents to allow easy tweaking of conditions
          setUserStats(prev => ({ ...prev, reactionsMastered: prev.reactionsMastered + 1 }));
      } catch (error) {
          alert("Failed to simulate reaction.");
      } finally {
          setLoadingMolecule(false);
      }
  };

  const handleSaveToArchive = () => {
      if (!moleculeData) return;
      const newItem: ArchiveItem = {
          id: Date.now().toString(),
          name: moleculeData.name,
          timestamp: Date.now(),
          data: moleculeData
      };
      setArchive(prev => [newItem, ...prev]);
      alert("Molecule saved to Archive!");
  };

  const loadFromArchive = (item: ArchiveItem) => {
      setMoleculeData(item.data);
      setView(AppView.MOLECULE_VIEWER);
  };

  const handleReactionSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!reactionInput) return;
    setLoadingReaction(true);
    try {
      const data = await gemini.generateReactionSteps(reactionInput);
      setReactionData(data);
    } catch (error) {
      alert("Failed to generate reaction steps.");
    } finally {
      setLoadingReaction(false);
    }
  }

  const startQuiz = async (topic?: string, moduleId?: string) => {
    const targetTopic = topic || quizTopic;
    setLoadingQuiz(true);
    setQuizData(null);
    setQuizCompleted(false);
    setQuizScore(0);
    setCurrentQuestionIdx(0);
    setActiveModuleId(moduleId || null);
    
    try {
      const data = await gemini.generateQuiz(targetTopic);
      setQuizData(data);
    } catch (error) {
      alert("Failed to create quiz.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleQuizAnswer = (optionIdx: number) => {
    if (showExplanation) return;
    setSelectedOption(optionIdx);
    setShowExplanation(true);
    if (optionIdx === quizData?.questions[currentQuestionIdx].correctAnswer) {
      setQuizScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (!quizData) return;
    if (currentQuestionIdx < quizData.questions.length - 1) {
      setCurrentQuestionIdx(c => c + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
      if (!quizData) return;
      setQuizCompleted(true);
      
      const percentage = (quizScore / quizData.questions.length) * 100;
      
      // Update Stats
      setUserStats(prev => ({
          ...prev,
          quizzesTaken: prev.quizzesTaken + 1,
          totalScore: prev.totalScore + percentage
      }));

      // Unlock Module logic
      if (activeModuleId && percentage >= 60) {
          setModules(prev => {
              const currentIndex = prev.findIndex(m => m.id === activeModuleId);
              if (currentIndex === -1) return prev;

              const newModules = [...prev];
              
              // Mark current as completed
              newModules[currentIndex] = { ...newModules[currentIndex], status: 'completed', score: percentage };
              
              // Unlock next if exists
              if (currentIndex + 1 < newModules.length) {
                  newModules[currentIndex + 1] = { ...newModules[currentIndex + 1], status: 'active' };
              }
              return newModules;
          });
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user' as const, text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    
    const apiHistory = chatHistory.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
    }));

    try {
        const responseText = await gemini.chatWithTutor(apiHistory, userMsg.text);
        setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model' as const, text: responseText }]);
    } catch (e) {
        setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model' as const, text: "Sorry, I encountered an error." }]);
    } finally {
        setChatLoading(false);
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);


  // --- Views ---

  const renderDashboard = () => {
      const avgScore = userStats.quizzesTaken > 0 ? Math.round(userStats.totalScore / userStats.quizzesTaken) : 0;
      
      // Prepare chart data from modules
      const chartData = modules.map(m => ({
          name: m.title.split(' ')[0], // Short name
          score: m.score || 0,
          status: m.status
      }));

      const displayedModules = expandedCurriculum ? modules : modules.slice(0, 5);

      return (
        <div className="p-8 animate-fade-in overflow-y-auto h-full">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-slide-up">
            <div>
                <h1 className="text-4xl font-bold text-skin-main tracking-tight">Welcome back, Chemist!</h1>
                <p className="text-skin-muted mt-2 text-lg">Your laboratory is ready for discovery.</p>
            </div>
            <div className="flex items-center gap-3 bg-skin-surface p-2 rounded-xl border border-skin-border shadow-sm">
                <GraduationCap className="text-skin-muted ml-2" size={20} />
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-skin-muted uppercase tracking-wider">Curriculum</span>
                    <select 
                        value={selectedSyllabus}
                        onChange={handleSyllabusChange}
                        className="text-sm font-bold text-skin-main bg-transparent border-none focus:ring-0 cursor-pointer pr-8 outline-none"
                    >
                        <option value="UNDERGRAD">Undergraduate</option>
                        <option value="ALEVEL">A-Level (UK)</option>
                        <option value="IB">IB Diploma</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <DashboardCard 
            title="Modules Done" 
            value={modules.filter(m => m.status === 'completed').length + '/' + modules.length} 
            subtitle="Syllabus Progress" 
            icon={BookOpen} 
            colorClass="bg-emerald-500"
            delay={100}
            />
            <DashboardCard 
            title="Avg Quiz Score" 
            value={`${avgScore}%`} 
            subtitle={`${userStats.quizzesTaken} Quizzes Taken`} 
            icon={Award} 
            colorClass="bg-amber-500" 
            delay={200}
            />
            <DashboardCard 
            title="Reactions" 
            value={userStats.reactionsMastered} 
            subtitle="Applied in Lab" 
            icon={Beaker} 
            colorClass="bg-indigo-500" 
            delay={300}
            />
            <DashboardCard 
            title="Archive" 
            value={archive.length} 
            subtitle="Saved Molecules" 
            icon={Archive} 
            colorClass="bg-blue-500" 
            delay={400}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Learning Path / Modules */}
            <div className="bg-skin-surface p-6 rounded-xl border border-skin-border shadow-sm animate-enter delay-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-skin-main">Your Curriculum</h3>
                    <span className="text-xs font-bold text-skin-primary bg-skin-primary-light px-3 py-1 rounded-full">
                        {Math.round((modules.filter(m => m.status === 'completed').length / modules.length) * 100)}% Complete
                    </span>
                </div>
                <div className="space-y-4">
                    {displayedModules.map((module, idx) => (
                        <div 
                            key={module.id} 
                            className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-md hover:-translate-x-[-4px] ${
                            module.status === 'locked' ? 'bg-skin-base border-skin-border opacity-60' : 
                            module.status === 'active' ? 'bg-skin-surface border-skin-primary shadow-sm ring-1 ring-skin-primary-light' :
                            'bg-emerald-50/10 border-emerald-500/30'
                        } animate-enter`}
                        style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-transform ${
                                        module.status === 'locked' ? 'bg-skin-border text-skin-muted' : 
                                        module.status === 'active' ? 'bg-skin-primary text-white scale-110' :
                                        'bg-emerald-500 text-white'
                                    }`}>
                                        {module.status === 'locked' ? <Lock size={16}/> : modules.findIndex(m => m.id === module.id) + 1}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-skin-main">{module.title}</h4>
                                        <p className="text-xs text-skin-muted mt-0.5">{module.description}</p>
                                    </div>
                                </div>
                                {module.status === 'active' && (
                                    <button 
                                        onClick={() => { setView(AppView.QUIZ_ARENA); startQuiz(module.topic, module.id); }}
                                        className="bg-skin-primary text-white p-2.5 rounded-lg hover:brightness-110 transition-all hover:scale-105 active:scale-95 shadow-md shadow-skin-primary/30"
                                    >
                                        <Play size={18} fill="currentColor" />
                                    </button>
                                )}
                                {module.status === 'completed' && (
                                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                                        {module.score}% <CheckCircle size={16} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {modules.length > 5 && (
                        <button 
                            onClick={() => setExpandedCurriculum(!expandedCurriculum)}
                            className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-skin-muted hover:text-skin-primary hover:bg-skin-base rounded-lg transition-colors text-sm font-medium"
                        >
                            {expandedCurriculum ? (
                                <>Show Less <ChevronUp size={16} /></>
                            ) : (
                                <>View Full Curriculum ({modules.length - 5} more) <ChevronDown size={16} /></>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-8">
                {/* Performance Chart */}
                <div className="bg-skin-surface p-6 rounded-xl border border-skin-border shadow-sm h-80 animate-enter delay-300">
                    <h3 className="text-lg font-bold text-skin-main mb-4">Performance History</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--color-border))"/>
                            <XAxis dataKey="name" tick={{fontSize: 10, fill: 'rgb(var(--color-text-muted))'}} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} hide />
                            <Tooltip 
                                cursor={{fill: 'rgb(var(--color-bg-main))'}} 
                                contentStyle={{ backgroundColor: 'rgb(var(--color-surface))', borderRadius: '8px', border: '1px solid rgb(var(--color-border))' }}
                            />
                            <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={32} fill="rgb(var(--color-primary))">
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.status === 'completed' ? '#10b981' : 'rgb(var(--color-text-muted))'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                 {/* Quick Archive Access */}
                 <div className="bg-skin-sidebar-bg p-6 rounded-xl text-skin-sidebar-text flex-1 relative overflow-hidden animate-enter delay-400 shadow-lg">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-2 text-white">Saved Molecules</h3>
                        <p className="text-white/60 mb-4">Access your personal library of structures.</p>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {archive.slice(0, 3).map(item => (
                                <button 
                                    key={item.id}
                                    onClick={() => loadFromArchive(item)}
                                    className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded text-xs font-mono whitespace-nowrap border border-white/10 transition-colors"
                                >
                                    {item.name}
                                </button>
                            ))}
                            {archive.length === 0 && <span className="text-xs text-white/40 italic">No saved items yet.</span>}
                        </div>
                        <button 
                             onClick={() => setView(AppView.ARCHIVE)}
                             className="mt-4 text-skin-primary hover:text-white text-sm font-bold flex items-center gap-1 transition-colors"
                        >
                            View All <ArrowRight size={14} />
                        </button>
                    </div>
                    <Archive className="absolute -bottom-6 -right-6 w-32 h-32 text-white opacity-5 rotate-12" />
                </div>
            </div>
        </div>
        </div>
      );
  };

  const renderMoleculeViewer = () => (
    <div className="flex flex-col h-full relative animate-fade-in">
      {/* Top Control Bar */}
      <div className="p-4 border-b border-skin-border bg-skin-surface flex flex-col md:flex-row gap-4 items-start md:items-center shadow-sm z-30">
        {/* Search Form */}
        <form onSubmit={handleMoleculeSearch} className="flex gap-2 flex-1 w-full md:w-auto">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-3 text-skin-muted w-5 h-5 group-focus-within:text-skin-primary transition-colors" />
            <input 
              type="text" 
              value={moleculeInput}
              onChange={(e) => setMoleculeInput(e.target.value)}
              placeholder="Search Molecule..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-skin-border bg-skin-base focus:ring-2 focus:ring-skin-primary focus:border-transparent focus:outline-none transition-all"
            />
          </div>
          <button 
            type="submit" 
            disabled={loadingMolecule}
            className="bg-skin-primary text-white px-6 py-2.5 rounded-lg font-medium hover:brightness-110 transition-all disabled:opacity-50 hover:shadow-lg shadow-skin-primary/20 whitespace-nowrap"
          >
            {loadingMolecule ? 'Loading...' : 'Visualize'}
          </button>
        </form>

        {/* Reaction Simulator */}
        <div className="h-8 w-px bg-skin-border hidden md:block"></div>
        
        <form onSubmit={handleApplyReaction} className="flex flex-col md:flex-row gap-2 flex-[1.5] w-full md:w-auto relative">
            <div className="relative flex-1 group">
                <FlaskConical className="absolute left-3 top-3 text-amber-500 w-5 h-5" />
                <input 
                    type="text" 
                    value={reactionReagentInput}
                    onChange={(e) => setReactionReagentInput(e.target.value)}
                    placeholder="React with..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-skin-border bg-amber-50/10 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                />
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setShowConditions(!showConditions)}
                    className={`px-3 py-2.5 rounded-lg border transition-all flex items-center gap-2 ${
                        showConditions 
                            ? 'bg-amber-500 text-white border-amber-600' 
                            : 'bg-skin-base border-skin-border text-skin-muted hover:bg-skin-surface'
                    }`}
                    title="Reaction Conditions"
                >
                    <Thermometer size={20} />
                    <span className="text-xs font-bold hidden lg:inline">Conditions</span>
                    <ChevronDown size={16} className={`transition-transform ${showConditions ? 'rotate-180' : ''}`} />
                </button>

                <button 
                    type="submit"
                    disabled={loadingMolecule || !moleculeData}
                    className="bg-amber-500 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-amber-600 transition-all disabled:opacity-50 whitespace-nowrap shadow-lg shadow-amber-500/20"
                >
                    React
                </button>
            </div>
            
            {/* Advanced Conditions Dropdown */}
            {showConditions && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-skin-surface border border-skin-border p-5 rounded-xl shadow-xl z-40 animate-enter origin-top-right">
                    <h4 className="text-sm font-bold text-skin-main mb-4 flex items-center gap-2">
                        <Thermometer size={16} className="text-amber-500"/> Reaction Conditions
                    </h4>
                    
                    {/* Temperature Slider */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-skin-muted flex items-center gap-1"><Flame size={12}/> Temp</span>
                            <span className="font-mono font-bold text-skin-main">{reactionTemp}°C</span>
                        </div>
                        <input 
                            type="range" 
                            min="-78" max="500" step="10"
                            value={reactionTemp}
                            onChange={(e) => setReactionTemp(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] text-skin-muted mt-1">
                            <span>-78°C</span>
                            <span>500°C</span>
                        </div>
                    </div>

                    {/* Pressure Slider */}
                    <div className="mb-4">
                         <div className="flex justify-between text-xs mb-1">
                            <span className="text-skin-muted flex items-center gap-1"><Gauge size={12}/> Pressure</span>
                            <span className="font-mono font-bold text-skin-main">{reactionPressure} atm</span>
                        </div>
                        <input 
                            type="range" 
                            min="1" max="100" step="1"
                            value={reactionPressure}
                            onChange={(e) => setReactionPressure(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                         <div className="flex justify-between text-[10px] text-skin-muted mt-1">
                            <span>1 atm</span>
                            <span>100 atm</span>
                        </div>
                    </div>
                    
                    {/* Solvent & Catalyst */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-skin-muted uppercase block mb-1">Catalyst</label>
                            <select 
                                value={reactionCatalyst}
                                onChange={(e) => setReactionCatalyst(e.target.value)}
                                className="w-full text-xs p-2 rounded border border-skin-border bg-skin-base outline-none focus:border-amber-500"
                            >
                                <option value="">None</option>
                                <option value="H2SO4">H₂SO₄ (Acid)</option>
                                <option value="Pt">Platinum (Pt)</option>
                                <option value="Pd/C">Pd/C</option>
                                <option value="FeBr3">FeBr₃</option>
                                <option value="AlCl3">AlCl₃</option>
                                <option value="Light">UV Light (hv)</option>
                                <option value="Peroxide">Peroxides</option>
                            </select>
                        </div>
                         <div>
                            <label className="text-[10px] font-bold text-skin-muted uppercase block mb-1">Solvent</label>
                            <select 
                                value={reactionSolvent}
                                onChange={(e) => setReactionSolvent(e.target.value)}
                                className="w-full text-xs p-2 rounded border border-skin-border bg-skin-base outline-none focus:border-amber-500"
                            >
                                <option value="Standard">Standard</option>
                                <option value="Water">Water (H₂O)</option>
                                <option value="Ethanol">Ethanol</option>
                                <option value="Ether">Diethyl Ether</option>
                                <option value="DCM">Dichloromethane</option>
                                <option value="DMSO">DMSO (Polar Aprotic)</option>
                                <option value="Acetone">Acetone</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-skin-border text-[10px] text-skin-muted italic">
                        * Conditions affect equilibrium (Le Chatelier's) and kinetics.
                    </div>
                </div>
            )}
        </form>

        {/* Save Button */}
        <button 
            onClick={handleSaveToArchive}
            disabled={!moleculeData}
            title="Save to Archive"
            className="p-2.5 rounded-lg border border-skin-border text-skin-muted hover:bg-skin-base hover:text-skin-primary transition-all disabled:opacity-50 active:scale-95 ml-auto"
        >
            <Save size={20} />
        </button>
      </div>

      {/* Main Visualizer */}
      <div className="flex-1 bg-skin-base p-4 relative">
        <MoleculeVisualizer 
          data={moleculeData} 
          loading={loadingMolecule} 
          onAnalyze={handleAnalyzeMolecule}
        />
      </div>
    </div>
  );

  const renderArchive = () => (
      <div className="p-8 h-full bg-skin-base overflow-y-auto animate-fade-in">
          <h2 className="text-2xl font-bold text-skin-main mb-6 flex items-center gap-3">
              <Archive className="text-skin-primary" /> Saved Visualizations
          </h2>
          
          {archive.length === 0 ? (
              <div className="text-center py-20 opacity-50 animate-enter">
                  <Save size={64} className="mx-auto mb-4 text-skin-muted" />
                  <p className="text-xl text-skin-main">Your archive is empty.</p>
                  <p className="text-skin-muted">Generate and save molecules in the Visualizer!</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {archive.map((item, idx) => (
                      <div 
                        key={item.id} 
                        className="bg-skin-surface p-5 rounded-xl border border-skin-border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group animate-enter"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 bg-skin-primary-light rounded-lg flex items-center justify-center text-skin-primary group-hover:scale-110 transition-transform">
                                  <Atom size={24} />
                              </div>
                              <span className="text-xs text-skin-muted font-mono">
                                  {new Date(item.timestamp).toLocaleDateString()}
                              </span>
                          </div>
                          <h3 className="font-bold text-skin-main text-lg mb-1 truncate" title={item.name}>{item.name}</h3>
                          <p className="text-xs text-skin-muted mb-4 line-clamp-2 h-8">{item.data.description}</p>
                          
                          <div className="flex gap-2">
                              <button 
                                  onClick={() => loadFromArchive(item)}
                                  className="flex-1 bg-skin-primary text-white py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-colors shadow-md shadow-skin-primary/20"
                              >
                                  Load
                              </button>
                              <button 
                                  onClick={() => setArchive(prev => prev.filter(i => i.id !== item.id))}
                                  className="p-2 rounded-lg border border-skin-border text-skin-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                  <X size={16} />
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
  );

  const renderReactionTutor = () => (
    <div className="p-8 h-full overflow-y-auto animate-fade-in">
       <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-skin-main mb-6 flex items-center gap-3">
            <Zap className="text-amber-500" /> Reaction Mechanism Tutor
        </h2>
        
        <form onSubmit={handleReactionSearch} className="flex gap-2 mb-10 animate-slide-up">
            <input 
              type="text" 
              value={reactionInput}
              onChange={(e) => setReactionInput(e.target.value)}
              placeholder="Describe a reaction..."
              className="flex-1 px-4 py-3 rounded-xl border border-skin-border bg-skin-surface focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm transition-all"
            />
            <button 
              type="submit" 
              disabled={loadingReaction}
              className="bg-skin-sidebar-bg text-white px-8 py-3 rounded-xl font-bold hover:bg-skin-sidebar-bg/90 transition-all hover:shadow-lg disabled:opacity-50 active:scale-95"
            >
               {loadingReaction ? 'Analyzing...' : 'Explain'}
            </button>
        </form>

        {loadingReaction && (
            <div className="flex flex-col items-center py-20 animate-enter">
                <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                <p className="text-skin-muted animate-pulse">Deconstructing mechanism steps...</p>
            </div>
        )}

        {reactionData && !loadingReaction && (
            <div className="space-y-6 animate-slide-up">
                <div className="bg-skin-surface p-6 rounded-xl border border-skin-border shadow-sm mb-8">
                    <h3 className="text-xl font-bold text-skin-main">{reactionData.name}</h3>
                    <p className="text-skin-muted mt-1">Step-by-step breakdown</p>
                </div>

                <div className="relative">
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-skin-border"></div>
                    {reactionData.steps.map((step, idx) => (
                        <div key={idx} className="relative pl-20 mb-8 group animate-enter" style={{ animationDelay: `${idx * 150}ms` }}>
                            <div className="absolute left-0 w-16 h-16 rounded-full bg-skin-surface border-4 border-amber-100 text-amber-600 flex items-center justify-center font-bold text-xl z-10 shadow-sm group-hover:border-amber-500 group-hover:scale-110 transition-all">
                                {step.step}
                            </div>
                            <div className="bg-skin-surface p-6 rounded-xl border border-skin-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                                <div className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
                                    {step.keyConcept}
                                </div>
                                <p className="text-skin-main leading-relaxed">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
       </div>
    </div>
  );

  const renderQuizArena = () => (
    <div className="p-8 h-full flex flex-col items-center justify-center bg-skin-base overflow-y-auto animate-fade-in">
      {!quizData && !loadingQuiz && !quizCompleted && (
        <div className="max-w-md w-full bg-skin-surface p-8 rounded-2xl shadow-xl border border-skin-border text-center animate-pop">
          <div className="w-20 h-20 bg-skin-primary-light rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <BrainCircuit className="text-skin-primary w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-skin-main mb-2">Knowledge Check</h2>
          <p className="text-skin-muted mb-8">Select a topic to generate a personalized quiz using AI.</p>
          
          <select 
            value={quizTopic} 
            onChange={(e) => setQuizTopic(e.target.value)}
            className="w-full mb-4 px-4 py-3 rounded-lg border border-skin-border bg-skin-base focus:ring-2 focus:ring-skin-primary outline-none transition-all"
          >
            <option>Stereochemistry</option>
            <option>Resonance Structures</option>
            <option>Nucleophilic Substitution</option>
            <option>Electrophilic Addition</option>
            <option>IR Spectroscopy</option>
            <option>Aromaticity</option>
          </select>

          <button 
            onClick={() => startQuiz()}
            className="w-full bg-skin-primary text-white py-3 rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-skin-primary/30 active:scale-95"
          >
            Start Custom Quiz
          </button>
          
          <div className="mt-6 text-xs text-skin-muted border-t border-skin-border pt-4">
              Tip: Go to the Dashboard to take structured Module quizzes.
          </div>
        </div>
      )}

      {loadingQuiz && (
         <div className="text-center animate-enter">
            <div className="w-16 h-16 border-4 border-skin-primary-light border-t-skin-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-skin-primary font-medium">Generating unique questions...</p>
         </div>
      )}

      {quizData && !loadingQuiz && !quizCompleted && (
        <div className="max-w-2xl w-full animate-slide-up">
            <div className="mb-6 flex justify-between items-center text-sm font-medium text-skin-muted">
                <span>Question {currentQuestionIdx + 1} of {quizData.questions.length}</span>
                <span className="bg-skin-primary-light text-skin-primary px-3 py-1 rounded-full">Score: {quizScore}</span>
            </div>

            <div className="bg-skin-surface p-8 rounded-2xl shadow-lg border border-skin-border mb-6">
                <h3 className="text-xl font-bold text-skin-main mb-6 leading-snug">
                    {quizData.questions[currentQuestionIdx].question}
                </h3>
                
                <div className="space-y-3">
                    {quizData.questions[currentQuestionIdx].options.map((option, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleQuizAnswer(idx)}
                            disabled={showExplanation}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex justify-between items-center group ${
                                showExplanation 
                                    ? idx === quizData.questions[currentQuestionIdx].correctAnswer 
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                                        : idx === selectedOption
                                            ? 'bg-red-50 border-red-500 text-red-900'
                                            : 'bg-skin-base border-skin-border text-skin-muted opacity-50'
                                    : 'bg-skin-surface border-skin-border hover:border-skin-primary hover:shadow-md text-skin-main hover:bg-skin-base'
                            }`}
                        >
                            <span className="group-hover:translate-x-1 transition-transform">{option}</span>
                            {showExplanation && idx === quizData.questions[currentQuestionIdx].correctAnswer && (
                                <Award className="w-5 h-5 text-emerald-600 animate-pop" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {showExplanation && (
                <div className="bg-skin-primary-light/30 p-6 rounded-xl border border-skin-primary-light mb-6 animate-enter">
                    <h4 className="font-bold text-skin-primary-dark mb-2">Explanation</h4>
                    <p className="text-skin-primary-dark opacity-90">{quizData.questions[currentQuestionIdx].explanation}</p>
                </div>
            )}

            {showExplanation && (
                <div className="flex justify-end animate-enter delay-100">
                     <button 
                        onClick={nextQuestion}
                        className="bg-skin-sidebar-bg text-white px-8 py-3 rounded-xl font-bold hover:bg-skin-sidebar-bg/90 transition-all hover:shadow-lg flex items-center gap-2 active:scale-95"
                     >
                        {currentQuestionIdx === quizData.questions.length - 1 ? 'Finish' : 'Next Question'}
                        <ArrowRight size={18} />
                     </button>
                </div>
            )}
        </div>
      )}

      {quizCompleted && (
        <div className="max-w-md w-full bg-skin-surface p-8 rounded-2xl shadow-xl border border-skin-border text-center animate-pop">
             <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <Award className="text-yellow-600 w-12 h-12" />
             </div>
             <h2 className="text-3xl font-bold text-skin-main mb-2">Quiz Complete!</h2>
             <p className="text-skin-muted mb-6">You scored</p>
             <div className="text-5xl font-bold text-skin-primary mb-8">
                {Math.round((quizScore / (quizData?.questions.length || 1)) * 100)}%
             </div>
             {activeModuleId && (
                 <div className={`mb-6 p-3 rounded-lg ${
                    (quizScore / (quizData?.questions.length || 1)) * 100 >= 60 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                 }`}>
                     {(quizScore / (quizData?.questions.length || 1)) * 100 >= 60 
                        ? "Module Completed! Next module unlocked." 
                        : "Score >60% required to pass this module."}
                 </div>
             )}
             <button 
                onClick={() => { setQuizData(null); setQuizCompleted(false); setActiveModuleId(null); }}
                className="bg-skin-sidebar-bg text-white px-8 py-3 rounded-xl font-bold hover:bg-skin-sidebar-bg/90 transition-all shadow-lg w-full"
             >
                Back to Menu
             </button>
        </div>
      )}
    </div>
  );

  const renderChatTutor = () => (
      <div className="flex flex-col h-full bg-skin-surface animate-fade-in">
          <div className="p-4 border-b border-skin-border flex items-center justify-between bg-skin-surface z-10 shadow-sm">
              <h2 className="text-lg font-bold flex items-center gap-2 text-skin-main">
                  <MessageCircle className="text-skin-primary" /> AI Tutor
              </h2>
              <span className="text-xs bg-skin-primary-light text-skin-primary px-2 py-1 rounded-full font-medium">Gemini Powered</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-skin-base">
            {chatHistory.length === 0 && (
                <div className="text-center py-10 text-skin-muted animate-enter">
                    <div className="w-16 h-16 bg-skin-surface rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-skin-border">
                         <MessageCircle className="w-8 h-8 text-skin-primary-light" />
                    </div>
                    <p>Ask me anything about Organic Chemistry!</p>
                    <p className="text-xs mt-2">e.g., "What is chirality?" or "Explain resonance in benzene."</p>
                </div>
            )}
            {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === 'user' 
                            ? 'bg-skin-primary text-white rounded-br-none shadow-md' 
                            : 'bg-skin-surface border border-skin-border text-skin-main rounded-bl-none shadow-sm'
                    }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                </div>
            ))}
            {chatLoading && (
                <div className="flex justify-start animate-enter">
                    <div className="bg-skin-surface border border-skin-border p-4 rounded-2xl rounded-bl-none shadow-sm">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-skin-muted rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-2 h-2 bg-skin-muted rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-2 h-2 bg-skin-muted rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 bg-skin-surface border-t border-skin-border">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your question..."
                    className="flex-1 px-4 py-3 rounded-xl border border-skin-border focus:ring-2 focus:ring-skin-primary outline-none bg-skin-base text-skin-main transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="bg-skin-primary text-white p-3 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-skin-primary/20 active:scale-95"
                  >
                      <ArrowRight />
                  </button>
              </form>
          </div>
      </div>
  );

  // --- Main Layout ---

  return (
    <div className="flex h-screen bg-skin-base overflow-hidden transition-colors duration-500">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-skin-sidebar-bg text-skin-sidebar-text transition-all duration-500 ease-in-out flex flex-col border-r border-skin-border z-50 shadow-2xl`}>
        <div className="p-6 flex items-center justify-between">
          {sidebarOpen && (
             <div className="flex items-center gap-2 font-bold text-white text-xl tracking-tight animate-enter">
                <Atom className="text-skin-primary" /> Carbon<span className="opacity-50">Canvas</span>
             </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white">
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto scrollbar-hide">
          <NavItem view={AppView.DASHBOARD} current={view} icon={BookOpen} label={sidebarOpen && "Dashboard"} onClick={setView} delay={100} />
          <NavItem view={AppView.MOLECULE_VIEWER} current={view} icon={Atom} label={sidebarOpen && "3D Visualizer"} onClick={setView} delay={150} />
          <NavItem view={AppView.ARCHIVE} current={view} icon={Archive} label={sidebarOpen && "Archive"} onClick={setView} delay={200} />
          <NavItem view={AppView.REACTION_TUTOR} current={view} icon={Beaker} label={sidebarOpen && "Reactions"} onClick={setView} delay={250} />
          <NavItem view={AppView.QUIZ_ARENA} current={view} icon={BrainCircuit} label={sidebarOpen && "Quiz Arena"} onClick={setView} delay={300} />
          <NavItem view={AppView.CHAT_TUTOR} current={view} icon={MessageCircle} label={sidebarOpen && "AI Tutor"} onClick={setView} delay={350} />
        </nav>

        {/* Theme Selector & Status */}
        <div className="p-4 border-t border-white/10 space-y-4">
            {sidebarOpen && (
              <div className="relative">
                <button 
                  onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white group"
                >
                  <Palette size={18} className="text-skin-primary group-hover:rotate-12 transition-transform" />
                  <span className="font-medium text-sm">Theme</span>
                  <ChevronUp size={16} className={`ml-auto transition-transform ${themeMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className={`absolute bottom-full left-0 w-full mb-2 bg-skin-surface border border-skin-border rounded-xl shadow-xl overflow-hidden transition-all duration-300 origin-bottom ${themeMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                   {THEMES.map(theme => (
                     <button
                        key={theme.id}
                        onClick={() => { setCurrentTheme(theme.id); setThemeMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-skin-base transition-colors ${currentTheme === theme.id ? 'bg-skin-primary-light text-skin-primary-dark' : 'text-skin-main'}`}
                     >
                        <div className={`w-4 h-4 rounded-full ${theme.color}`}></div>
                        <span className="text-sm font-medium">{theme.name}</span>
                     </button>
                   ))}
                </div>
              </div>
            )}

            <div className={`bg-black/20 rounded-xl p-4 border border-white/5 ${!sidebarOpen && 'hidden'} animate-enter delay-500`}>
                <h4 className="text-xs font-bold text-white/40 uppercase mb-2">Status</h4>
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Online & Ready
                </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden bg-skin-base transition-colors duration-500">
        {view === AppView.DASHBOARD && renderDashboard()}
        {view === AppView.MOLECULE_VIEWER && renderMoleculeViewer()}
        {view === AppView.ARCHIVE && renderArchive()}
        {view === AppView.REACTION_TUTOR && renderReactionTutor()}
        {view === AppView.QUIZ_ARENA && renderQuizArena()}
        {view === AppView.CHAT_TUTOR && renderChatTutor()}
      </main>
    </div>
  );
};

export default App;