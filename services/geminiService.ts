import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MoleculeData, QuizData, ReactionData, StudyGuide } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Schema Definitions
const bondProperties = {
  source: { type: Type.STRING },
  target: { type: Type.STRING },
  order: { type: Type.INTEGER },
  stereo: { type: Type.STRING, enum: ['none', 'wedge', 'dash'] }
};

const moleculeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    atoms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          element: { type: Type.STRING },
        },
        required: ["id", "element"]
      }
    },
    bonds: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: bondProperties,
        required: ["source", "target", "order"]
      }
    },
    resonanceStructures: {
      type: Type.ARRAY,
      description: "List of valid resonance contributors if applicable.",
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          bonds: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: bondProperties,
              required: ["source", "target", "order"]
            }
          }
        },
        required: ["description", "bonds"]
      }
    },
    symmetry: {
      type: Type.OBJECT,
      properties: {
        pointGroup: { type: Type.STRING },
        elements: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["pointGroup", "elements"]
    }
  },
  required: ["name", "atoms", "bonds", "description"]
};

const quizSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          type: { type: Type.STRING, enum: ['mcq', 'fitb', 'short_answer'] },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["id", "type", "question", "correctAnswer", "explanation"]
      }
    }
  },
  required: ["topic", "questions"]
};

const reactionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.INTEGER },
          description: { type: Type.STRING },
          keyConcept: { type: Type.STRING }
        },
        required: ["step", "description", "keyConcept"]
      }
    },
    references: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of academic textbooks or papers verifying this mechanism."
    }
  },
  required: ["name", "steps"]
};

const studyGuideSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    summary: { type: Type.STRING },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
    resources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING },
          source: { type: Type.STRING }
        },
        required: ["title", "url", "source"]
      }
    }
  },
  required: ["topic", "summary", "keyPoints", "resources"]
};

export const generateMoleculeData = async (moleculeName: string): Promise<MoleculeData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a 2D graph representation for: ${moleculeName}.
      Include atoms, bonds (order 1-3, stereo wedge/dash), and chemical description.
      Include resonance structures if applicable.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: moleculeSchema
      }
    });
    
    return JSON.parse(response.text || '{}') as MoleculeData;
  } catch (error) {
    console.error("GenAI Error (Molecule):", error);
    throw error;
  }
};

export const analyzeMolecule = async (data: MoleculeData): Promise<MoleculeData> => {
  try {
    const cleanAtoms = data.atoms.map(a => ({ id: a.id, element: a.element }));
    const cleanBonds = data.bonds.map(b => ({
      source: typeof b.source === 'object' ? (b.source as any).id : b.source,
      target: typeof b.target === 'object' ? (b.target as any).id : b.target,
      order: b.order,
      stereo: b.stereo
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze this user-modified molecular structure.
      
      STRICT CHECKS:
      1. Valency & Oxidation States: Report IMPOSSIBLE structures immediately.
      2. Stability: Flag unstable intermediates (e.g., Carbon anions without stabilization).
      3. Existence: Must match known chemistry.
      
      Input Data:
      Atoms: ${JSON.stringify(cleanAtoms)}
      Bonds: ${JSON.stringify(cleanBonds)}
      
      If IMPOSSIBLE: Return Name "Impossible", Description "Why it fails".
      If VALID: Return Name, Description, Resonance, Symmetry.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: moleculeSchema
      }
    });

    return JSON.parse(response.text || '{}') as MoleculeData;
  } catch (error) {
    console.error("GenAI Error (Analyze):", error);
    throw error;
  }
};

export interface ReactionConditions {
    temp: number;
    pressure: number;
    catalyst: string;
    solvent: string;
}

export const applyReaction = async (data: MoleculeData, reactionPrompt: string, conditions: ReactionConditions): Promise<MoleculeData> => {
    try {
      const cleanAtoms = data.atoms.map(a => ({ id: a.id, element: a.element }));
      const cleanBonds = data.bonds.map(b => ({
        source: typeof b.source === 'object' ? (b.source as any).id : b.source,
        target: typeof b.target === 'object' ? (b.target as any).id : b.target,
        order: b.order,
        stereo: b.stereo
      }));
  
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Predict the major organic product.
        Reactant: ${JSON.stringify(cleanAtoms)} bonds ${JSON.stringify(cleanBonds)}
        Reagent: ${reactionPrompt}
        Conditions: ${conditions.temp}C, ${conditions.pressure}atm, ${conditions.catalyst}, ${conditions.solvent}
        
        RULES:
        1. Apply Thermodynamics (High Temp -> Elimination) & Kinetics.
        2. Check Catalyst/Solvent compatibility.
        3. If conditions prevent reaction, return "No Reaction".
        4. Return product structure.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: moleculeSchema
        }
      });
  
      return JSON.parse(response.text || '{}') as MoleculeData;
    } catch (error) {
      console.error("GenAI Error (Apply Reaction):", error);
      throw error;
    }
  };

export const generateQuiz = async (topic: string): Promise<QuizData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a 5-question quiz on: ${topic}.
      Focus on conceptual understanding and university/A-level application.
      
      VARIETY RULES:
      - Question 1-2: 'mcq' (Multiple Choice) with 4 options.
      - Question 3-4: 'fitb' (Fill in the Blank). The answer should be a single word or short phrase.
      - Question 5: 'short_answer' (Concept explanation).
      
      Ensure the 'correctAnswer' field is the exact string needed for grading.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema
      }
    });
    return JSON.parse(response.text || '{}') as QuizData;
  } catch (error) {
    console.error("GenAI Error (Quiz):", error);
    throw error;
  }
};

export const generateReactionSteps = async (reactionQuery: string): Promise<ReactionData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Explain the reaction mechanism for: ${reactionQuery}.
      1. Break down into clear steps.
      2. NO HALLUCINATIONS: Verify against standard texts (Clayden, McMurry, Carey).
      3. Include a list of 2-3 academic references (Book Title, Chapter or Author) in the 'references' field.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: reactionSchema
      }
    });
    return JSON.parse(response.text || '{}') as ReactionData;
  } catch (error) {
    console.error("GenAI Error (Reaction):", error);
    throw error;
  }
};

export const generateStudyGuide = async (topic: string): Promise<StudyGuide> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a study guide for the Organic Chemistry topic: ${topic}.
            1. Provide a concise summary.
            2. List key bullet points.
            3. List common student mistakes.
            4. Provide 'resources':
               - Generate a YouTube Search URL for "The Organic Chemistry Tutor ${topic}".
               - Generate a SaveMyExams Search URL for "${topic}".
               - Generate a Khan Academy Search URL for "${topic}".
               - Title them clearly (e.g. "Video: The Organic Chemistry Tutor", "Practice: SaveMyExams").`,
            config: {
                responseMimeType: "application/json",
                responseSchema: studyGuideSchema
            }
        });
        return JSON.parse(response.text || '{}') as StudyGuide;
    } catch (error) {
        console.error("GenAI Error (Study Guide):", error);
        throw error;
    }
};

export const chatWithTutor = async (history: {role: 'user'|'model', parts: {text: string}[]}[], message: string): Promise<string> => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history,
        config: {
            systemInstruction: "You are an expert Organic Chemistry tutor. Be concise, encouraging, and accurate."
        }
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I'm having trouble thinking about that right now.";
}