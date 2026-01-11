
import React, { useState, useEffect, useRef } from 'react';
import { 
  Atom, Beaker, BookOpen, Menu, MessageCircle, X, 
  Award, ArrowRight, Zap, Search, FlaskConical, Play, 
  Library, Loader2, Sparkles, ChevronRight, Book, Video, AlertCircle, CheckCircle2, ArrowLeft
} from 'lucide-react';
import { AppView, MoleculeData, QuizData, Module, UserStats, StudyGuide } from './types';
import * as gemini from './services/geminiService';
import MoleculeVisualizer from './components/MoleculeVisualizer';

const NavItem = ({ view, current, icon: Icon, label, onClick }: any) => (
  <button
    onClick={() => onClick(view)}
    className={`flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg transition-all duration-200 group ${
      current === view 
        ? 'bg-skin-primary text-white shadow-md' 
        : 'text-skin-sidebar-text hover:bg-white/10'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const CURRICULA: Record<string, Module[]> = {
  UNDERGRAD: [
    { id: 'u1', title: 'Structure & Bonding', description: 'Lewis structures, hybridization, and molecular geometry.', status: 'active', topic: 'Chemical Bonding' },
    { id: 'u2', title: 'Acids and Bases', description: 'pKa, resonance effects, and Lewis acid-base theory.', status: 'active', topic: 'Acids and Bases' },
    { id: 'u3', title: 'Alkanes & Nomenclature', description: 'IUPAC naming, conformational analysis (Newman projections).', status: 'active', topic: 'Alkanes' },
    { id: 'u4', title: 'Stereochemistry', description: 'Chirality, enantiomers, diastereomers, and R/S configuration.', status: 'active', topic: 'Stereochemistry' },
  ],
  ALEVEL: [
    { id: 'a1', title: 'Atomic Structure', description: 'Protons, neutrons, electrons, and orbitals.', status: 'active', topic: 'Atomic Structure' },
    { id: 'a2', title: 'Stoichiometry', description: 'Moles, empirical formulas, and calculation of substance amount.', status: 'active', topic: 'Stoichiometry' },
  ]
};

const App = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedSyllabus, setSelectedSyllabus] = useState('UNDERGRAD');
  
  // App States
  const [moleculeInput, setMoleculeInput] = useState("Aspirin");
  const [moleculeData, setMoleculeData] = useState<MoleculeData | null>(null);
  const [loadingMolecule, setLoadingMolecule] = useState(false);
  
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);

  // Study Hub States
  const [activeLesson, setActiveLesson] = useState<StudyGuide | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', parts: {text: string}[]}[]>([
    { role: 'model', parts: [{ text: "Hello! I am your Organic Chemistry tutor. What can I help you with today?" }] }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);

  const handleMoleculeSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!moleculeInput) return;
    setLoadingMolecule(true);
    try {
      const data = await gemini.generateMoleculeData(moleculeInput);
      setMoleculeData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMolecule(false);
    }
  };

  const startQuiz = async (topic: string) => {
    setLoadingQuiz(true);
    setView(AppView.QUIZ_ARENA);
    try {
      const data = await gemini.generateQuiz(topic);
      setQuizData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const loadLesson = async (module: Module) => {
    setLoadingLesson(true);
    setActiveLesson(null);
    try {
      const guide = await gemini.generateStudyGuide(module.topic);
      setActiveLesson(guide);
    } catch (error) {
      console.error("Lesson generation error:", error);
    } finally {
      setLoadingLesson(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || loadingChat) return;
    const userMessage = { role: 'user' as const, parts: [{ text: chatInput }] };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    const currentInput = chatInput;
    setChatInput("");
    setLoadingChat(true);
    try {
      const responseText = await gemini.chatWithTutor(newHistory, currentInput);
      setChatHistory(prev => [...prev, { role: 'model' as const, parts: [{ text: responseText }] }]);
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-skin-base text-skin-main font-sans overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-skin-sidebar-bg border-r border-skin-border flex flex-col transition-all duration-300 z-30`}>
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {sidebarOpen && <div className="font-bold text-lg text-white tracking-tight">CarbonCanvas</div>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-skin-sidebar-text hover:bg-white/10 rounded-lg">
            <Menu size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-2">
          <NavItem view={AppView.DASHBOARD} current={view} icon={Atom} label="Dashboard" onClick={setView} />
          <NavItem view={AppView.MOLECULE_VIEWER} current={view} icon={Search} label="Molecule Lab" onClick={setView} />
          <NavItem view={AppView.QUIZ_ARENA} current={view} icon={Zap} label="Quiz Arena" onClick={setView} />
          <NavItem view={AppView.STUDY_HUB} current={view} icon={Library} label="Study Hub" onClick={setView} />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {view === AppView.DASHBOARD && (
          <div className="p-8 animate-fade-in overflow-y-auto h-full">
            <header className="mb-10 flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight">Chemistry Portal</h1>
                <p className="text-skin-muted mt-2 text-lg">Master organic reactions through interactive visualization.</p>
              </div>
              <div className="bg-skin-surface border border-skin-border p-2 rounded-xl flex gap-2">
                 <button 
                  onClick={() => setSelectedSyllabus('UNDERGRAD')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${selectedSyllabus === 'UNDERGRAD' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`}
                 >Undergrad</button>
                 <button 
                  onClick={() => setSelectedSyllabus('ALEVEL')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${selectedSyllabus === 'ALEVEL' ? 'bg-skin-primary text-white' : 'text-skin-muted hover:bg-skin-base'}`}
                 >A-Level</button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-skin-surface p-6 rounded-2xl border border-skin-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                  <FlaskConical className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Molecular Lab</h3>
                <p className="text-skin-muted text-sm mb-4">Build and visualize structures using AI prediction.</p>
                <button onClick={() => setView(AppView.MOLECULE_VIEWER)} className="flex items-center gap-2 text-skin-primary font-bold hover:gap-3 transition-all">
                  Go to Lab <ArrowRight size={16} />
                </button>
              </div>

              <div className="bg-skin-surface p-6 rounded-2xl border border-skin-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center mb-4">
                  <Award className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Quiz Arena</h3>
                <p className="text-skin-muted text-sm mb-4">Challenge your conceptual understanding of functional groups.</p>
                <button onClick={() => setView(AppView.QUIZ_ARENA)} className="flex items-center gap-2 text-amber-600 font-bold hover:gap-3 transition-all">
                  Start Quiz <ArrowRight size={16} />
                </button>
              </div>

              <div className="bg-skin-surface p-6 rounded-2xl border border-skin-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center mb-4">
                  <Library className="text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Study Hub</h3>
                <p className="text-skin-muted text-sm mb-4">Access detailed curriculum lessons and AI study guides.</p>
                <button onClick={() => setView(AppView.STUDY_HUB)} className="flex items-center gap-2 text-indigo-600 font-bold hover:gap-3 transition-all">
                  Explore <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {view === AppView.MOLECULE_VIEWER && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-skin-border bg-skin-surface flex items-center gap-4 z-10 shadow-sm">
              <form onSubmit={handleMoleculeSearch} className="flex-1 max-w-md flex gap-2">
                <input 
                  value={moleculeInput} 
                  onChange={(e) => setMoleculeInput(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-skin-base border border-skin-border focus:ring-2 focus:ring-skin-primary outline-none transition-all"
                  placeholder="Enter molecule name..."
                />
                <button 
                  type="submit" 
                  disabled={loadingMolecule}
                  className="bg-skin-primary text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingMolecule ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />} Generate
                </button>
              </form>
            </div>
            <div className="flex-1 bg-slate-50 relative">
              <MoleculeVisualizer data={moleculeData} loading={loadingMolecule} />
            </div>
          </div>
        )}

        {view === AppView.QUIZ_ARENA && (
          <div className="p-8 h-full overflow-y-auto max-w-3xl mx-auto w-full">
             {!quizData && !loadingQuiz ? (
               <div className="text-center py-20">
                 <Zap className="mx-auto mb-6 text-amber-500" size={48} />
                 <h2 className="text-3xl font-bold mb-4">Ready for a challenge?</h2>
                 <p className="text-skin-muted mb-8">Choose a topic to test your knowledge.</p>
                 <div className="grid grid-cols-2 gap-4">
                    {CURRICULA[selectedSyllabus].map(module => (
                      <button 
                        key={module.id}
                        onClick={() => startQuiz(module.topic)}
                        className="p-4 border border-skin-border rounded-2xl hover:bg-skin-primary hover:text-white transition-all font-bold text-left group flex justify-between items-center"
                      >
                        {module.topic}
                        <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                 </div>
               </div>
             ) : loadingQuiz ? (
               <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 className="animate-spin text-skin-primary" size={48} />
                  <p className="font-bold text-lg">Generating personalized quiz...</p>
               </div>
             ) : (
               <div className="space-y-6 animate-enter">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold">Topic: {quizData.topic}</h2>
                    <button onClick={() => setQuizData(null)} className="text-skin-muted hover:text-skin-main"><X /></button>
                  </div>
                  {quizData.questions.map((q, idx) => (
                    <div key={q.id} className="bg-skin-surface p-6 rounded-2xl border border-skin-border shadow-sm">
                      <span className="text-skin-primary font-black uppercase text-xs tracking-widest mb-2 block">Question {idx + 1}</span>
                      <p className="text-lg font-bold mb-4">{q.question}</p>
                      <div className="space-y-2">
                        {q.options?.map((opt, i) => (
                          <button key={i} className="w-full text-left p-4 rounded-xl border border-skin-border hover:border-skin-primary hover:bg-skin-base transition-all font-medium">
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
        )}

        {view === AppView.STUDY_HUB && (
          <div className="p-8 h-full overflow-y-auto">
            {!activeLesson && !loadingLesson ? (
              <div className="max-w-6xl mx-auto">
                <div className="mb-10 text-center">
                  <h2 className="text-3xl font-bold mb-2">Curriculum Library</h2>
                  <p className="text-skin-muted">Select a topic to generate your interactive study guide.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {CURRICULA[selectedSyllabus].map(module => (
                    <button 
                      key={module.id}
                      onClick={() => loadLesson(module)}
                      className="bg-skin-surface p-6 rounded-2xl border border-skin-border shadow-sm hover:border-skin-primary hover:shadow-lg transition-all text-left flex flex-col h-full group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-skin-base flex items-center justify-center mb-4 group-hover:bg-skin-primary group-hover:text-white transition-colors">
                        <Book size={20} />
                      </div>
                      <h3 className="font-bold text-lg mb-2">{module.title}</h3>
                      <p className="text-sm text-skin-muted flex-1 mb-6">{module.description}</p>
                      <div className="flex items-center gap-2 text-xs font-bold text-skin-primary">
                        Open Lesson <ArrowRight size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : loadingLesson ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="animate-spin text-skin-primary" size={48} />
                <p className="font-bold text-lg">Assembling study materials...</p>
                <p className="text-sm text-skin-muted">Gemini is curating key points and resources for you.</p>
              </div>
            ) : activeLesson && (
              <div className="max-w-4xl mx-auto animate-enter">
                <button 
                  onClick={() => setActiveLesson(null)}
                  className="flex items-center gap-2 text-skin-muted hover:text-skin-primary font-bold mb-8 transition-colors"
                >
                  <ArrowLeft size={18} /> Back to Library
                </button>
                
                <header className="mb-12">
                  <span className="text-skin-primary font-black uppercase tracking-widest text-xs">Topic Study Guide</span>
                  <h1 className="text-4xl font-black mt-2 mb-6">{activeLesson.topic}</h1>
                  <div className="bg-skin-primary-light/30 border-l-4 border-skin-primary p-6 rounded-r-2xl">
                    <p className="text-lg font-medium leading-relaxed italic text-skin-main">
                      {activeLesson.summary}
                    </p>
                  </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                  <div className="lg:col-span-2 space-y-8">
                    <section>
                      <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                        <CheckCircle2 size={24} className="text-emerald-500" /> Key Learning Points
                      </h3>
                      <div className="space-y-3">
                        {activeLesson.keyPoints.map((pt, i) => (
                          <div key={i} className="bg-skin-surface border border-skin-border p-4 rounded-xl flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                            <p className="text-sm font-medium">{pt}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="bg-red-50 border border-red-100 p-6 rounded-2xl">
                      <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4">
                        <AlertCircle size={22} /> Common Mistakes
                      </h3>
                      <ul className="space-y-2">
                        {activeLesson.commonMistakes.map((err, i) => (
                          <li key={i} className="flex gap-2 text-sm font-medium text-red-600">
                            <span className="opacity-50">•</span> {err}
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <aside className="space-y-6">
                    <div className="bg-skin-sidebar-bg p-6 rounded-2xl text-white shadow-xl">
                      <h3 className="font-bold flex items-center gap-2 mb-6">
                        <Video size={18} /> Watch & Learn
                      </h3>
                      <div className="space-y-4">
                        {activeLesson.resources.map((res, i) => (
                          <a 
                            key={i}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all group"
                          >
                            <span className="text-[10px] font-black uppercase text-skin-sidebar-text block mb-1">{res.source}</span>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-bold line-clamp-1">{res.title}</span>
                              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="bg-skin-surface border border-skin-border p-6 rounded-2xl">
                      <h3 className="font-bold mb-4">Quick Actions</h3>
                      <div className="space-y-2">
                        <button 
                          onClick={() => startQuiz(activeLesson!.topic)}
                          className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                        >
                          <Zap size={18} /> Test Yourself
                        </button>
                        <button 
                          onClick={() => { setMoleculeInput(activeLesson!.topic); setView(AppView.MOLECULE_VIEWER); }}
                          className="w-full bg-skin-base border border-skin-border py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                          <FlaskConical size={18} /> Explore Lab
                        </button>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
