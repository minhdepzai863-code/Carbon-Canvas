
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  MOLECULE_VIEWER = 'MOLECULE_VIEWER',
  REACTION_TUTOR = 'REACTION_TUTOR',
  QUIZ_ARENA = 'QUIZ_ARENA',
  CHAT_TUTOR = 'CHAT_TUTOR',
  ARCHIVE = 'ARCHIVE',
  STUDY_HUB = 'STUDY_HUB'
}

export interface Atom {
  id: string;
  element: string;
  x?: number;
  y?: number;
}

export interface Bond {
  source: string;
  target: string;
  order: number; // 1, 2, 3 for single, double, triple
  stereo?: 'none' | 'wedge' | 'dash'; // Stereochemistry
}

export interface ResonanceStructure {
  description: string;
  bonds: Bond[];
}

export interface MoleculeData {
  name: string;
  description: string;
  atoms: Atom[];
  bonds: Bond[];
  resonanceStructures?: ResonanceStructure[];
  symmetry?: {
    pointGroup: string;
    elements: string[];
  };
}

export interface ArchiveItem {
  id: string;
  name: string;
  timestamp: number;
  data: MoleculeData;
}

export interface QuizQuestion {
  id: number;
  type: 'mcq' | 'fitb' | 'short_answer';
  question: string;
  options?: string[]; // Only for MCQ
  correctAnswer: string; // Text answer for all types
  explanation: string;
}

export interface QuizData {
  topic: string;
  questions: QuizQuestion[];
}

export interface ReactionStep {
  step: number;
  description: string;
  keyConcept: string;
}

export interface ReactionData {
  name: string;
  steps: ReactionStep[];
  references?: string[];
}

export interface VideoResource {
  title: string;
  url: string;
  source: string;
}

export interface StudyGuide {
  topic: string;
  summary: string;
  keyPoints: string[];
  commonMistakes: string[];
  resources: VideoResource[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  status: 'locked' | 'active' | 'completed';
  score?: number;
  topic: string; // Matches quiz topic
}

export interface UserStats {
  quizzesTaken: number;
  totalScore: number;
  reactionsMastered: number;
  moleculesGenerated: number;
}
