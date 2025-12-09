import React, { useState, useEffect, useRef } from 'react';
import { 
  Atom, Beaker, BookOpen, BrainCircuit, Menu, MessageCircle, X, 
  Award, ArrowRight, Zap, Search, Save, Archive, FlaskConical, CheckCircle, Lock, Play, GraduationCap, ChevronDown, ChevronUp, Thermometer, Palette, Moon, Sun, Gauge, Flame, Droplets, Video, ExternalLink, Book, FileText, Library, Loader2, AlertTriangle, Trash2, Eye
} from 'lucide-react';
import { AppView, MoleculeData, QuizData, ReactionData, ArchiveItem, Module, UserStats, StudyGuide } from './types';
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

  // Study Hub State
  const [activeModule, setActiveModule] = useState<Module | null>(null); // Used for Dashboard panel
  const [selectedStudyModule, setSelectedStudyModule] = useState<Module | null>(null); // Used for Main Study Hub View
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [loadingStudy, setLoadingStudy] = useState(false);

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
  const [selectedOption, setSelectedOption] = useState<number | null>(null); // For MCQ
  const [textAnswer, setTextAnswer] = useState(""); // For FRQ/FITB
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Chat State
  const [chatHistory, setChatHistory] = useState<{id: string, role: 'user'|'model', text: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Effect to Apply Theme ---
  useEffect(() => {
    document.body.className = `theme-${currentTheme}`;
  }, [currentTheme]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // --- Handlers ---

  const handleSyllabusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSyllabus = e.target.value;
    setSelectedSyllabus(newSyllabus);
    setModules(CURRICULA[newSyllabus]);
    setExpandedCurriculum(false); 
  };

  const handleOpenStudyHubPanel = async (module: Module) => {
      // Opens the slide-over panel in Dashboard
      setActiveModule(module);
      fetchStudyGuide(module);
  };

  const handleSelectStudyHubModule = (module: Module) => {
      // Selects module in the full Study Hub View
      setSelectedStudyModule(module);
      fetchStudyGuide(module);
  };

  const fetchStudyGuide = async (module: Module) => {
      setLoadingStudy(true);
      setStudyGuide(null);
      try {
          const guide = await gemini.generateStudyGuide(module.topic);
          setStudyGuide(guide);
      } catch (error) {
          alert("Could not generate study guide.");
      } finally {
          setLoadingStudy(false);
      }
  };

  const handleCloseStudyHubPanel = () => {
      setActiveModule(null);
      setStudyGuide(null);
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

  const handleRemoveFromArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setArchive(prev => prev.filter(item => item.id !== id));
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
    setTextAnswer("");
    
    try {
      const data = await gemini.generateQuiz(targetTopic);
      setQuizData(data);
    } catch (error) {
      alert("Failed to create quiz.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleQuizAnswerMCQ = (optionIdx: number) => {
    if (showExplanation) return;
    setSelectedOption(optionIdx);
    setShowExplanation(true);
    // MCQ Check
    if (quizData?.questions[currentQuestionIdx].options && 
        quizData.questions[currentQuestionIdx].options![optionIdx] === quizData.questions[currentQuestionIdx].correctAnswer) {
        setQuizScore(s => s + 1);
    } else if (quizData?.questions[currentQuestionIdx].options![optionIdx] === quizData.questions[currentQuestionIdx].correctAnswer) {
       // Fallback if correctAnswer matches string
       setQuizScore(s => s + 1);
    }
  };

  const handleQuizAnswerText = (e: React.FormEvent) => {
      e.preventDefault();
      if (showExplanation) return;
      setShowExplanation(true);
      
      // Simple case-insensitive check for FITB. 
      // For short answer, we essentially 'reveal' the answer and let the user self-assess (or just give point if they tried)
      const q = quizData?.questions[currentQuestionIdx];
      if (!q) return;

      if (q.type === 'fitb') {
          if (textAnswer.trim().toLowerCase() === q.correctAnswer.toLowerCase()) {
              setQuizScore(s => s + 1);
          }
      } else {
          // Short answer: Always give points for effort in this demo, or strict string match?
          // Let's require > 5 chars for 'effort'
          if (textAnswer.length > 3) setQuizScore(s => s + 1);
      }
  };

  const nextQuestion = () => {
    if (!quizData) return;
    if (currentQuestionIdx < quizData.questions.length - 1) {
      setCurrentQuestionIdx(c => c + 1);
      setSelectedOption(null);
      setTextAnswer("");
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
              newModules[currentIndex] = { ...newModules[currentIndex], status: 'completed', score: percentage };
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
    
    // Check if user is viewing a molecule and inject context
    let messageText = chatInput;
    if (moleculeData && (view === AppView.MOLECULE_VIEWER || view === AppView.CHAT_TUTOR)) {
         messageText = `[Context: User is currently viewing a molecule named "${moleculeData.name}". Description: "${moleculeData.description}". Atoms: ${moleculeData.atoms.length}. Bonds: ${moleculeData.bonds.length}.] \n\n User Question: ${chatInput}`;
    }

    const userMsg = { id: Date.now().toString(), role: 'user' as const, text: chatInput }; // Display original text
    const apiMsg = { id: Date.now().toString(), role: 'user' as const, text: messageText }; // Send context text

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);
    
    const apiHistory = chatHistory.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
    }));

    try {
        const responseText = await gemini.chatWithTutor(apiHistory, apiMsg.text);
        setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model' as const, text: responseText }]);
    } catch (e) {
        setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model' as const, text: "Sorry, I encountered an error." }]);
    } finally {
        setChatLoading(false);
    }
  };

  const renderChatComponent = (compact = false) => (
      <div className={`flex flex-col h-full bg-skin-surface border border-skin-border rounded-xl shadow-sm ${compact ? '' : 'animate-fade-in'}`}>
          <div className="p-4 border-b border-skin-border flex items-center justify-between bg-skin-surface z-10 rounded-t-xl">
              <div>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-skin-main">
                      <MessageCircle className="text-skin-primary" /> {compact ? "AI Tutor" : "Chat with AI Tutor"}
                  </h2>
                  {moleculeData && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-skin-primary font-bold uppercase tracking-wide">
                          <Eye size={10} /> Viewing: {moleculeData.name}
                      </div>
                  )}
              </div>
              <span className="text-xs bg-skin-primary-light text-skin-primary px-2 py-1 rounded-full font-medium">Gemini 2.5</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-skin-base">
            {chatHistory.length === 0 && (
                <div className="text-center py-10 text-skin-muted animate-enter">
                    <div className="w-12 h-12 bg-skin-surface rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-skin-border">
                         <MessageCircle className="w-6 h-6 text-skin-primary-light" />
                    </div>
                    <p className="text-sm">Ask me anything about Organic Chemistry!</p>
                </div>
            )}
            {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
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
                    <div className="bg-skin-surface border border-skin-border p-3 rounded-2xl rounded-bl-none shadow-sm">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-skin-muted rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-1.5 h-1.5 bg-skin-muted rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-1.5 h-1.5 bg-skin-muted rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 bg-skin-surface border-t border-skin-border rounded-b-xl">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={moleculeData ? `Ask about ${moleculeData.name}...` : "Ask a question..."}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-skin-border focus:ring-2 focus:ring-skin-primary outline-none bg-skin-base text-skin-main transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="bg-skin-primary text-white p-2 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 active:scale-95"
                  >
                      <ArrowRight size={18}/>
                  </button>
              </form>
          </div>
      </div>
  );

  // --- Views ---

  const renderDashboard = () => {
      const avgScore = userStats.quizzesTaken > 0 ? Math.round(userStats.totalScore / userStats.quizzesTaken) : 0;
      const displayedModules = expandedCurriculum ? modules : modules.slice(0, 5);
      
      const chartData = modules.map(m => ({ 
          name: m.title.split(' ')[0], 
          score: m.score || 0, 
          status: m.status
      }));

      return (
        <div className="p-8 animate-fade-in overflow-y-auto h-full relative">
            {/* ... Header ... */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4 animate-slide-up">
                <div>
                    <h1 className="text-4xl font-bold text-skin-main tracking-tight">Welcome back, Chemist!</h1>
                    <p className="text-skin-muted mt-2 text-lg">Your laboratory is ready for discovery.</p>
                </div>
                
                {/* Improved Curriculum Selector */}
                <div className="flex flex-col items-end gap-1.5">
                     <span className="text-[11px] font-black text-skin-muted uppercase tracking-widest flex items-center gap-1.5">
                         <GraduationCap size={14} className="text-skin-primary"/> Active Curriculum
                     </span>
                     <div className="relative z-20 group">
                        <select 
                            value={selectedSyllabus} 
                            onChange={handleSyllabusChange} 
                            className="appearance-none pl-4 pr-10 py-3 bg-skin-surface border border-skin-border text-skin-main font-bold text-sm rounded-xl shadow-sm hover:border-skin-primary focus:outline-none focus:ring-2 focus:ring-skin-primary/50 transition-all cursor-pointer min-w-[240px]"
                        >
                            <option className="bg-skin-surface text-skin-main" value="UNDERGRAD">Undergraduate</option>
                            <option className="bg-skin-surface text-skin-main" value="ALEVEL">A-Level (UK)</option>
                            <option className="bg-skin-surface text-skin-main" value="IB">IB Diploma</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-skin-muted pointer-events-none group-hover:text-skin-primary transition-colors" size={16} />
                    </div>
                </div>
            </div>

            {/* ... Stats Cards ... */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <DashboardCard title="Modules Done" value={modules.filter(m => m.status === 'completed').length + '/' + modules.length} subtitle="Syllabus Progress" icon={BookOpen} colorClass="bg-emerald-500" delay={100} />
                <DashboardCard title="Avg Quiz Score" value={`${avgScore}%`} subtitle={`${userStats.quizzesTaken} Quizzes Taken`} icon={Award} colorClass="bg-amber-500" delay={200} />
                <DashboardCard title="Reactions" value={userStats.reactionsMastered} subtitle="Applied in Lab" icon={Beaker} colorClass="bg-indigo-500" delay={300} />
                <DashboardCard title="Archive" value={archive.length} subtitle="Saved Molecules" icon={Archive} colorClass="bg-blue-500" delay={400} />
            </div>

            {/* ... Main Grid ... */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Curriculum List */}
                <div className="bg-skin-surface p-6 rounded-xl border border-skin-border shadow-sm animate-enter delay-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-skin-main">Your Curriculum</h3>
                        <span className="text-xs font-bold text-skin-primary bg-skin-primary-light px-3 py-1 rounded-full">{Math.round((modules.filter(m => m.status === 'completed').length / modules.length) * 100)}% Complete</span>
                    </div>
                    <div className="space-y-4">
                        {displayedModules.map((module, idx) => (
                            <div key={module.id} className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${module.status === 'locked' ? 'bg-skin-base border-skin-border opacity-60' : module.status === 'active' ? 'bg-skin-surface border-skin-primary shadow-sm ring-1 ring-skin-primary-light' : 'bg-emerald-50/10 border-emerald-500/30'} animate-enter`} style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleOpenStudyHubPanel(module)}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${module.status === 'locked' ? 'bg-skin-border text-skin-muted' : module.status === 'active' ? 'bg-skin-primary text-white' : 'bg-emerald-500 text-white'}`}>
                                            {module.status === 'locked' ? <Lock size={16}/> : modules.findIndex(m => m.id === module.id) + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-skin-main">{module.title}</h4>
                                            <p className="text-xs text-skin-muted mt-0.5">{module.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                         <button onClick={() => handleOpenStudyHubPanel(module)} className="p-2 text-skin-muted hover:text-skin-primary hover:bg-skin-base rounded-lg transition-colors" title="Quick View"><BookOpen size={18} /></button>
                                        {module.status === 'active' && (
                                            <button onClick={() => { setView(AppView.QUIZ_ARENA); startQuiz(module.topic, module.id); }} className="bg-skin-primary text-white p-2.5 rounded-lg hover:brightness-110 transition-all shadow-md shadow-skin-primary/30" title="Start Quiz"><Play size={18} fill="currentColor" /></button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {modules.length > 5 && (
                            <button onClick={() => setExpandedCurriculum(!expandedCurriculum)} className="w-full py-3 mt-2 flex items-center justify-center gap-2 text-skin-muted hover:text-skin-primary hover:bg-skin-base rounded-lg transition-colors text-sm font-medium">
                                {expandedCurriculum ? <>Show Less <ChevronUp size={16} /></> : <>View Full Curriculum ({modules.length - 5} more) <ChevronDown size={16} /></>}
                            </button>
                        )}
                    </div>
                </div>
                 
                 {/* Charts & Archive Preview */}
                 <div className="flex flex-col gap-8">
                     <div className="bg-skin-surface p-6 rounded-xl border border-skin-border shadow-sm h-80 animate-enter delay-300 flex flex-col">
                         <h3 className="text-lg font-bold text-skin-main mb-6 flex items-center gap-2"><Award size={18} className="text-skin-primary"/> Performance Analytics</h3>
                         <div className="flex-1 w-full h-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{top: 10, right: 10, left: -20, bottom: 0}} barGap={0}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="rgb(var(--color-primary))" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="rgb(var(--color-primary))" stopOpacity={0.3}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(var(--color-border))" opacity={0.5}/>
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{fontSize: 11, fill: 'rgb(var(--color-text-muted))', fontWeight: 600}} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        domain={[0, 100] as [number, number]} 
                                        axisLine={false} 
                                        tickLine={false}
                                        tick={{fontSize: 11, fill: 'rgb(var(--color-text-muted))', fontWeight: 600}} 
                                    />
                                    <Tooltip 
                                        cursor={{fill: 'rgb(var(--color-bg-main))', opacity: 0.5}} 
                                        contentStyle={{ backgroundColor: 'rgb(var(--color-surface))', borderRadius: '8px', border: '1px solid rgb(var(--color-border))', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                                        labelStyle={{ fontWeight: 'bold', color: 'rgb(var(--color-text-main))', marginBottom: '4px' }}
                                    />
                                    <Bar 
                                        dataKey="score" 
                                        radius={[4, 4, 4, 4] as [number, number, number, number]} 
                                        barSize={24} 
                                        fill="url(#colorScore)"
                                        background={{ fill: 'rgba(var(--color-border), 0.3)', radius: 4 }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                         </div>
                     </div>
                     
                     <div className="bg-skin-surface p-6 rounded-xl border border-skin-border shadow-sm flex-1 animate-enter delay-400">
                          <h3 className="text-lg font-bold text-skin-main mb-4 flex items-center gap-2"><Archive size={18} className="text-blue-500"/> Recent Saves</h3>
                          <div className="space-y-3">
                              {archive.slice(0, 3).map(item => (
                                  <div key={item.id} className="flex justify-between items-center p-3 bg-skin-base rounded-lg group">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">2D</div>
                                          <div>
                                              <p className="font-bold text-sm text-skin-main">{item.name}</p>
                                              <p className="text-[10px] text-skin-muted">{new Date(item.timestamp).toLocaleDateString()}</p>
                                          </div>
                                      </div>
                                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => loadFromArchive(item)} className="p-1.5 text-skin-primary hover:bg-skin-surface rounded-md"><Eye size={16}/></button>
                                          <button onClick={(e) => handleRemoveFromArchive(item.id, e)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"><Trash2 size={16}/></button>
                                      </div>
                                  </div>
                              ))}
                              {archive.length === 0 && <p className="text-sm text-skin-muted italic text-center py-4">No saved molecules yet.</p>}
                          </div>
                     </div>
                 </div>
            </div>
            
            {/* Slide-over Study Panel */}
            {activeModule && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleCloseStudyHubPanel}></div>
                    <div className="relative w-full max-w-lg bg-skin-surface h-full shadow-2xl p-8 overflow-y-auto border-l border-skin-border animate-slide-up">
                        <button onClick={handleCloseStudyHubPanel} className="absolute top-6 right-6 p-2 rounded-full hover:bg-skin-base"><X size={20}/></button>
                        <span className="text-xs font-bold text-skin-primary uppercase tracking-wider mb-2 block">Study Module</span>
                        <h2 className="text-3xl font-bold text-skin-main mb-4">{activeModule.title}</h2>
                        
                        {loadingStudy ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-skin-primary"/></div>
                        ) : studyGuide ? (
                             <div className="space-y-8">
                                 <div className="bg-skin-base p-4 rounded-xl border border-skin-border">
                                     <h3 className="font-bold text-skin-main flex items-center gap-2 mb-2"><BrainCircuit size={18}/> Summary</h3>
                                     <p className="text-sm text-skin-sidebar-text leading-relaxed">{studyGuide.summary}</p>
                                 </div>
                                 
                                 <div>
                                     <h3 className="font-bold text-skin-main mb-3 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-500"/> Key Concepts</h3>
                                     <ul className="space-y-2">
                                         {studyGuide.keyPoints.map((kp, i) => (
                                             <li key={i} className="flex gap-3 text-sm text-skin-sidebar-text">
                                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                                                 {kp}
                                             </li>
                                         ))}
                                     </ul>
                                 </div>

                                 <div>
                                     <h3 className="font-bold text-skin-main mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500"/> Common Pitfalls</h3>
                                     <ul className="space-y-2">
                                         {studyGuide.commonMistakes.map((cm, i) => (
                                             <li key={i} className="flex gap-3 text-sm text-skin-sidebar-text bg-amber-50/50 p-2 rounded border border-amber-100/50">
                                                 <X size={14} className="text-amber-500 mt-0.5 shrink-0"/>
                                                 {cm}
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                                 
                                 <div>
                                     <h3 className="font-bold text-skin-main mb-3 flex items-center gap-2"><Library size={18} className="text-blue-500"/> Resources</h3>
                                     <div className="grid gap-3">
                                         {studyGuide.resources.map((res, i) => (
                                             <a key={i} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-skin-border hover:border-skin-primary hover:bg-skin-base transition-all group">
                                                 <div className="w-10 h-10 rounded bg-skin-primary-light flex items-center justify-center text-skin-primary group-hover:scale-110 transition-transform">
                                                     {res.source === 'YouTube' ? <Video size={18}/> : <ExternalLink size={18}/>}
                                                 </div>
                                                 <div>
                                                     <p className="font-bold text-sm text-skin-main">{res.title}</p>
                                                     <p className="text-xs text-skin-muted">{res.source}</p>
                                                 </div>
                                                 <ArrowRight size={16} className="ml-auto text-skin-muted group-hover:text-skin-primary"/>
                                             </a>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                        ) : (
                            <p className="text-skin-muted">Content unavailable.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
      );
  };
  
  // --- Main Layout ---
  return (
    <div className="flex h-screen w-full bg-skin-base text-skin-main font-sans overflow-hidden transition-colors duration-500">
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-skin-sidebar-bg border-r border-skin-border flex flex-col transition-all duration-300 relative z-20 shadow-xl`}>
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {sidebarOpen && (
              <div className="flex items-center gap-2 animate-fade-in">
                  <div className="w-8 h-8 bg-gradient-to-br from-skin-primary to-purple-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">C</div>
                  <span className="font-bold text-lg text-white tracking-tight">CarbonCanvas</span>
              </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-skin-sidebar-text hover:bg-white/10 rounded-lg transition-colors">
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          <div className="text-[10px] font-bold text-skin-sidebar-text/50 uppercase tracking-wider px-4 mb-2 mt-4">{sidebarOpen ? 'Main Menu' : 'Menu'}</div>
          <NavItem view={AppView.DASHBOARD} current={view} icon={Atom} label="Dashboard" onClick={setView} delay={100} />
          <NavItem view={AppView.MOLECULE_VIEWER} current={view} icon={Search} label="Molecule Lab" onClick={setView} delay={150} />
          <NavItem view={AppView.QUIZ_ARENA} current={view} icon={Zap} label="Quiz Arena" onClick={setView} delay={200} />
          <NavItem view={AppView.REACTION_TUTOR} current={view} icon={Beaker} label="Reaction Tutor" onClick={setView} delay={250} />
          <NavItem view={AppView.STUDY_HUB} current={view} icon={Library} label="Study Hub" onClick={setView} delay={300} />
          <NavItem view={AppView.CHAT_TUTOR} current={view} icon={MessageCircle} label="AI Tutor" onClick={setView} delay={350} />
        </nav>

        {/* Theme Selector */}
        <div className="p-4 border-t border-white/10 relative">
             <button 
                onClick={() => setThemeMenuOpen(!themeMenuOpen)} 
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${themeMenuOpen ? 'bg-white/10' : 'hover:bg-white/5'} text-skin-sidebar-text`}
             >
                 <Palette size={20} />
                 {sidebarOpen && <span className="text-sm font-medium">Theme</span>}
                 {sidebarOpen && <ChevronUp size={16} className={`ml-auto transition-transform ${themeMenuOpen ? 'rotate-180' : ''}`}/>}
             </button>
             
             {themeMenuOpen && (
                 <div className={`absolute bottom-full left-4 right-4 mb-2 bg-skin-surface rounded-xl shadow-xl border border-skin-border p-2 animate-pop ${!sidebarOpen ? 'left-14 w-48' : ''}`}>
                     {THEMES.map(theme => (
                         <button
                            key={theme.id}
                            onClick={() => { setCurrentTheme(theme.id); setThemeMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${currentTheme === theme.id ? 'bg-skin-primary/10 text-skin-primary' : 'text-skin-main hover:bg-skin-base'}`}
                         >
                             <div className={`w-6 h-6 rounded-md flex items-center justify-center ${theme.color} text-white`}>
                                 <theme.icon size={14} />
                             </div>
                             <span className="font-medium">{theme.name}</span>
                             {currentTheme === theme.id && <CheckCircle size={14} className="ml-auto"/>}
                         </button>
                     ))}
                 </div>
             )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-skin-base">
          {view === AppView.DASHBOARD && renderDashboard()}
          
          {view === AppView.MOLECULE_VIEWER && (
              <div className="h-full flex flex-col animate-fade-in">
                  <div className="p-4 border-b border-skin-border bg-skin-surface flex justify-between items-center z-20 shadow-sm">
                      <div className="flex gap-4 items-center">
                          <h2 className="text-xl font-bold text-skin-main flex items-center gap-2"><FlaskConical className="text-skin-primary"/> Molecular Visualizer</h2>
                          <form onSubmit={handleMoleculeSearch} className="flex gap-2">
                              <input 
                                value={moleculeInput} 
                                onChange={(e) => setMoleculeInput(e.target.value)} 
                                className="px-4 py-2 rounded-lg border border-skin-border bg-skin-base text-skin-main focus:ring-2 focus:ring-skin-primary outline-none" 
                                placeholder="Enter IUPAC name..."
                              />
                              <button type="submit" disabled={loadingMolecule} className="bg-skin-primary text-white px-4 py-2 rounded-lg hover:brightness-110 flex items-center gap-2 disabled:opacity-50">
                                  {loadingMolecule ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
                                  Generate
                              </button>
                          </form>
                      </div>
                      <div className="flex gap-2">
                           <button onClick={() => setShowConditions(!showConditions)} className={`p-2 rounded-lg border ${showConditions ? 'bg-skin-primary text-white border-skin-primary' : 'bg-skin-base border-skin-border text-skin-main hover:bg-skin-border'} transition-colors`} title="Reaction Conditions">
                               <Thermometer size={20} />
                           </button>
                           <button onClick={handleSaveToArchive} className="p-2 rounded-lg bg-skin-base border border-skin-border text-skin-main hover:bg-skin-border transition-colors" title="Save to Archive"><Save size={20} /></button>
                      </div>
                  </div>
                  
                  {/* Reaction Conditions Toolbar */}
                  {showConditions && (
                      <div className="bg-skin-surface border-b border-skin-border p-3 flex gap-4 items-center animate-slide-up z-10 shadow-sm">
                           <div className="flex items-center gap-2">
                               <Flame size={16} className="text-red-500"/>
                               <label className="text-xs font-bold text-skin-muted">Temp (C)</label>
                               <input type="number" value={reactionTemp} onChange={(e) => setReactionTemp(parseInt(e.target.value))} className="w-16 p-1 border border-skin-border rounded bg-skin-base text-sm"/>
                           </div>
                           <div className="flex items-center gap-2">
                               <Gauge size={16} className="text-blue-500"/>
                               <label className="text-xs font-bold text-skin-muted">Press (atm)</label>
                               <input type="number" value={reactionPressure} onChange={(e) => setReactionPressure(parseFloat(e.target.value))} className="w-16 p-1 border border-skin-border rounded bg-skin-base text-sm"/>
                           </div>
                           <div className="flex items-center gap-2">
                               <Droplets size={16} className="text-cyan-500"/>
                               <label className="text-xs font-bold text-skin-muted">Solvent</label>
                               <input value={reactionSolvent} onChange={(e) => setReactionSolvent(e.target.value)} className="w-24 p-1 border border-skin-border rounded bg-skin-base text-sm"/>
                           </div>
                           <form onSubmit={handleApplyReaction} className="flex gap-2 ml-auto">
                               <input 
                                    value={reactionReagentInput} 
                                    onChange={(e) => setReactionReagentInput(e.target.value)} 
                                    placeholder="Add Reagent (e.g. HBr)" 
                                    className="px-3 py-1 border border-skin-border rounded bg-skin-base text-sm w-48"
                               />
                               <button type="submit" className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-bold hover:bg-purple-700">React</button>
                           </form>
                      </div>
                  )}

                  <div className="flex-1 relative bg-skin-sidebar-bg">
                      <MoleculeVisualizer data={moleculeData} loading={loadingMolecule} onAnalyze={handleAnalyzeMolecule} />
                      
                      {/* Floating Chat Overlay */}
                      <div className="absolute bottom-6 right-6 w-96 h-96 shadow-2xl rounded-xl z-30 animate-enter">
                          {renderChatComponent(true)}
                      </div>
                  </div>
              </div>
          )}

          {view === AppView.QUIZ_ARENA && (
              <div className="p-8 h-full overflow-y-auto animate-fade-in flex flex-col items-center">
                  <div className="w-full max-w-2xl">
                      <div className="text-center mb-8">
                          <h2 className="text-3xl font-bold text-skin-main mb-2">Quiz Arena</h2>
                          <p className="text-skin-muted">Test your mastery of {activeModuleId ? "module concepts" : "organic chemistry"}.</p>
                      </div>

                      {!quizData ? (
                          <div className="bg-skin-surface p-8 rounded-2xl shadow-lg border border-skin-border text-center">
                              <Zap size={48} className="mx-auto text-amber-500 mb-4" />
                              <h3 className="text-xl font-bold text-skin-main mb-4">Ready to Challenge Yourself?</h3>
                              
                              <div className="mb-6">
                                  <label className="block text-left text-sm font-bold text-skin-muted mb-2">Select Topic</label>
                                  <select 
                                    value={quizTopic} 
                                    onChange={(e) => setQuizTopic(e.target.value)}
                                    className="w-full p-3 bg-skin-base border border-skin-border rounded-xl text-skin-main"
                                  >
                                      {modules.map(m => (
                                          <option key={m.id} value={m.topic}>{m.topic}</option>
                                      ))}
                                  </select>
                              </div>
                              
                              <button 
                                onClick={() => startQuiz()} 
                                disabled={loadingQuiz}
                                className="w-full bg-skin-primary text-white py-3 rounded-xl font-bold text-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                              >
                                  {loadingQuiz ? <Loader2 className="animate-spin"/> : <Play fill="currentColor"/>} Start Quiz
                              </button>
                          </div>
                      ) : !quizCompleted ? (
                          <div className="bg-skin-surface p-8 rounded-2xl shadow-lg border border-skin-border animate-enter">
                              <div className="flex justify-between items-center mb-6">
                                  <span className="text-sm font-bold text-skin-muted">Question {currentQuestionIdx + 1} of {quizData.questions.length}</span>
                                  <span className="text-sm font-bold text-skin-primary bg-skin-primary-light px-3 py-1 rounded-full">Score: {quizScore}</span>
                              </div>
                              
                              <h3 className="text-xl font-bold text-skin-main mb-6">{quizData.questions[currentQuestionIdx].question}</h3>
                              
                              {quizData.questions[currentQuestionIdx].type === 'mcq' ? (
                                  <div className="space-y-3 mb-6">
                                      {quizData.questions[currentQuestionIdx].options?.map((opt, i) => (
                                          <button
                                              key={i}
                                              onClick={() => handleQuizAnswerMCQ(i)}
                                              className={`w-full p-4 text-left rounded-xl border transition-all ${
                                                  showExplanation 
                                                    ? opt === quizData.questions[currentQuestionIdx].correctAnswer 
                                                        ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
                                                        : selectedOption === i 
                                                            ? 'bg-red-100 border-red-500 text-red-800'
                                                            : 'bg-skin-base border-skin-border opacity-50'
                                                    : 'bg-skin-base border-skin-border hover:border-skin-primary hover:bg-skin-surface'
                                              }`}
                                          >
                                              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span> {opt}
                                          </button>
                                      ))}
                                  </div>
                              ) : (
                                  <form onSubmit={handleQuizAnswerText} className="mb-6">
                                      <input 
                                        value={textAnswer}
                                        onChange={(e) => setTextAnswer(e.target.value)}
                                        disabled={showExplanation}
                                        placeholder="Type your answer..."
                                        className="w-full p-4 bg-skin-base border border-skin-border rounded-xl text-skin-main focus:ring-2 focus:ring-skin-primary outline-none"
                                      />
                                      {!showExplanation && <button type="submit" className="mt-2 text-skin-primary font-bold text-sm hover:underline">Submit Answer</button>}
                                  </form>
                              )}

                              {showExplanation && (
                                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6 animate-fade-in">
                                      <h4 className="font-bold text-blue-800 mb-1 flex items-center gap-2"><BookOpen size={16}/> Explanation</h4>
                                      <p className="text-blue-900 text-sm">{quizData.questions[currentQuestionIdx].explanation}</p>
                                      <p className="text-xs text-blue-700 mt-2 font-mono">Correct Answer: {quizData.questions[currentQuestionIdx].correctAnswer}</p>
                                  </div>
                              )}

                              {showExplanation && (
                                  <button onClick={nextQuestion} className="w-full bg-skin-primary text-white py-3 rounded-xl font-bold hover:brightness-110 flex items-center justify-center gap-2">
                                      {currentQuestionIdx < quizData.questions.length - 1 ? 'Next Question' : 'Finish Quiz'} <ArrowRight size={18}/>
                                  </button>
                              )}
                          </div>
                      ) : (
                          <div className="bg-skin-surface p-8 rounded-2xl shadow-lg border border-skin-border text-center animate-pop">
                              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg text-white">
                                  <Award size={40} />
                              </div>
                              <h2 className="text-3xl font-bold text-skin-main mb-2">Quiz Complete!</h2>
                              <p className="text-xl text-skin-muted mb-6">You scored <span className="text-skin-primary font-bold">{Math.round((quizScore / quizData.questions.length) * 100)}%</span></p>
                              
                              <div className="grid grid-cols-2 gap-4 mb-8">
                                  <div className="p-4 bg-skin-base rounded-xl border border-skin-border">
                                      <div className="text-2xl font-bold text-emerald-500">{quizScore}</div>
                                      <div className="text-xs text-skin-muted uppercase font-bold">Correct</div>
                                  </div>
                                  <div className="p-4 bg-skin-base rounded-xl border border-skin-border">
                                      <div className="text-2xl font-bold text-red-500">{quizData.questions.length - quizScore}</div>
                                      <div className="text-xs text-skin-muted uppercase font-bold">Incorrect</div>
                                  </div>
                              </div>
                              
                              <button onClick={() => startQuiz()} className="bg-skin-primary text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 shadow-lg">Try Another</button>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {view === AppView.REACTION_TUTOR && (
             <div className="p-8 h-full overflow-y-auto animate-fade-in flex flex-col items-center">
                 <div className="w-full max-w-4xl">
                     <div className="text-center mb-8">
                          <h2 className="text-3xl font-bold text-skin-main mb-2">Reaction Mechanism Tutor</h2>
                          <p className="text-skin-muted">Master step-by-step organic mechanisms with AI verification.</p>
                      </div>
                      
                      <div className="bg-skin-surface p-6 rounded-xl border border-skin-border shadow-sm mb-8">
                          <form onSubmit={handleReactionSearch} className="flex gap-4">
                              <input 
                                value={reactionInput}
                                onChange={(e) => setReactionInput(e.target.value)}
                                className="flex-1 px-4 py-3 bg-skin-base border border-skin-border rounded-xl text-skin-main focus:ring-2 focus:ring-skin-primary outline-none"
                                placeholder="Describe a reaction (e.g. Acid catalyzed hydration of propene)..."
                              />
                              <button type="submit" disabled={loadingReaction} className="bg-skin-primary text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 disabled:opacity-50">
                                  {loadingReaction ? <Loader2 className="animate-spin"/> : "Explain Mechanism"}
                              </button>
                          </form>
                      </div>
                      
                      {reactionData && (
                          <div className="space-y-6 animate-slide-up">
                               {reactionData.steps.map((step, idx) => (
                                   <div key={idx} className="bg-skin-surface p-6 rounded-xl border border-skin-border shadow-sm relative overflow-hidden group hover:border-skin-primary transition-colors">
                                       <div className="absolute top-0 left-0 w-1.5 h-full bg-skin-primary"></div>
                                       <div className="flex gap-4">
                                           <div className="w-10 h-10 rounded-full bg-skin-primary-light text-skin-primary flex items-center justify-center font-bold text-lg shrink-0 border border-skin-primary/20">
                                               {step.step}
                                           </div>
                                           <div>
                                               <h4 className="text-lg font-bold text-skin-main mb-2">{step.keyConcept}</h4>
                                               <p className="text-skin-sidebar-text leading-relaxed">{step.description}</p>
                                           </div>
                                       </div>
                                   </div>
                               ))}
                               
                               {reactionData.references && (
                                   <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-500">
                                       <strong className="block mb-2 text-slate-700">References:</strong>
                                       <ul className="list-disc pl-4 space-y-1">
                                           {reactionData.references.map((ref, i) => <li key={i}>{ref}</li>)}
                                       </ul>
                                   </div>
                               )}
                          </div>
                      )}
                 </div>
             </div>
          )}

          {view === AppView.STUDY_HUB && (
              <div className="p-8 h-full overflow-y-auto animate-fade-in">
                  <div className="flex justify-between items-end mb-8">
                      <div>
                          <h2 className="text-3xl font-bold text-skin-main">Study Hub</h2>
                          <p className="text-skin-muted mt-2">Access comprehensive guides and resources for your curriculum.</p>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {modules.map(module => (
                          <div key={module.id} onClick={() => handleSelectStudyHubModule(module)} className="bg-skin-surface p-6 rounded-xl border border-skin-border hover:border-skin-primary hover:shadow-md transition-all cursor-pointer group">
                              <div className="flex justify-between items-start mb-4">
                                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${module.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-skin-primary-light text-skin-primary'}`}>
                                      {module.status === 'completed' ? <CheckCircle size={24}/> : <Book size={24}/>}
                                  </div>
                                  <span className="text-xs font-bold text-skin-muted bg-skin-base px-2 py-1 rounded border border-skin-border">{module.id.toUpperCase()}</span>
                              </div>
                              <h3 className="font-bold text-lg text-skin-main mb-2 group-hover:text-skin-primary transition-colors">{module.title}</h3>
                              <p className="text-sm text-skin-muted line-clamp-2">{module.description}</p>
                              
                              <div className="mt-4 pt-4 border-t border-skin-border flex items-center justify-between text-sm">
                                  <span className="text-skin-muted font-medium">{module.topic}</span>
                                  <ArrowRight size={16} className="text-skin-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0"/>
                              </div>
                          </div>
                      ))}
                  </div>

                  {selectedStudyModule && (
                      <div className="fixed inset-0 z-50 flex justify-end">
                         <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedStudyModule(null)}></div>
                         <div className="relative w-full max-w-2xl bg-skin-surface h-full shadow-2xl p-8 overflow-y-auto border-l border-skin-border animate-slide-up">
                              <button onClick={() => setSelectedStudyModule(null)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-skin-base"><X size={20}/></button>
                              <h2 className="text-3xl font-bold text-skin-main mb-1">{selectedStudyModule.title}</h2>
                              <p className="text-skin-muted mb-6 text-lg">{selectedStudyModule.description}</p>
                              
                              {loadingStudy ? (
                                  <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-skin-primary"/></div>
                              ) : studyGuide ? (
                                   <div className="space-y-8 animate-fade-in">
                                       <div className="prose prose-sm max-w-none text-skin-sidebar-text">
                                           <h3 className="text-xl font-bold text-skin-main mb-2">Topic Summary</h3>
                                           <div className="bg-skin-base p-6 rounded-xl border border-skin-border leading-relaxed">
                                               {studyGuide.summary}
                                           </div>
                                       </div>

                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl">
                                                <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2"><CheckCircle size={18}/> Key Points</h4>
                                                <ul className="space-y-2">
                                                    {studyGuide.keyPoints.map((kp, i) => (
                                                        <li key={i} className="text-sm text-emerald-900 flex gap-2">
                                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span> {kp}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-xl">
                                                <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2"><AlertTriangle size={18}/> Common Mistakes</h4>
                                                <ul className="space-y-2">
                                                    {studyGuide.commonMistakes.map((cm, i) => (
                                                        <li key={i} className="text-sm text-amber-900 flex gap-2">
                                                             <X size={14} className="mt-0.5 text-amber-500 shrink-0"/> {cm}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                       </div>

                                       <div>
                                           <h3 className="text-xl font-bold text-skin-main mb-4">Curated Resources</h3>
                                           <div className="grid gap-4">
                                               {studyGuide.resources.map((res, i) => (
                                                   <a key={i} href={res.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 p-4 rounded-xl border border-skin-border bg-skin-surface hover:border-skin-primary hover:shadow-lg transition-all group">
                                                       <div className="w-12 h-12 rounded-lg bg-skin-primary-light flex items-center justify-center text-skin-primary group-hover:scale-110 transition-transform">
                                                           {res.source === 'YouTube' ? <Video size={24}/> : <BookOpen size={24}/>}
                                                       </div>
                                                       <div className="flex-1">
                                                           <h4 className="font-bold text-skin-main text-lg group-hover:text-skin-primary transition-colors">{res.title}</h4>
                                                           <p className="text-sm text-skin-muted">{res.source} • <span className="text-skin-primary font-medium">Click to open</span></p>
                                                       </div>
                                                       <ExternalLink size={20} className="text-skin-muted group-hover:text-skin-primary"/>
                                                   </a>
                                               ))}
                                           </div>
                                       </div>
                                   </div>
                              ) : (
                                  <div className="text-center py-10">
                                      <p className="text-skin-muted">Select a module to view study materials.</p>
                                  </div>
                              )}
                         </div>
                      </div>
                  )}
              </div>
          )}

          {view === AppView.CHAT_TUTOR && (
              <div className="h-full p-8 animate-fade-in max-w-4xl mx-auto w-full">
                   {renderChatComponent()}
              </div>
          )}

      </div>
    </div>
  );
};

export default App;