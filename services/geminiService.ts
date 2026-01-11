
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MoleculeData, QuizData, ReactionData, StudyGuide, DailyMolecule } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema Definitions
const bondProperties = {
  source: { type: Type.STRING },
  target: { type: Type.STRING },
  order: { type: Type.INTEGER },
  stereo: { type: Type.STRING, enum: ['none', 'wedge', 'dash'] }
};

const moleculeSchema = {
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
    }
  },
  required: ["name", "atoms", "bonds", "description"]
};

const quizSchema = {
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

const studyGuideSchema = {
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
  required: ["topic", "summary", "keyPoints", "resources", "commonMistakes"]
};

export const generateMoleculeData = async (moleculeName: string): Promise<MoleculeData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Generate a 2D graph representation for: ${moleculeName}.
      Include atoms, bonds (order 1-3, stereo wedge/dash), and chemical description.`,
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

export const generateQuiz = async (topic: string): Promise<QuizData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a 5-question organic chemistry quiz on the topic: ${topic}.`,
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

export const generateStudyGuide = async (topic: string): Promise<StudyGuide> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a comprehensive study guide for the chemistry topic: "${topic}". 
      Include a high-level summary, exactly 5 key conceptual points, 3 common student mistakes, 
      and 3 recommended video lesson titles/links from popular platforms like Khan Academy or MasterOrganicChemistry.`,
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
        model: 'gemini-3-flash-preview',
        history: history,
        config: {
            systemInstruction: "You are an expert Organic Chemistry tutor. Be precise, helpful, and use markdown for chemical formulas."
        }
    });
    const result = await chat.sendMessage({ message });
    return result.text || "I'm having trouble thinking about that right now.";
};
