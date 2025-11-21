
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MoleculeData, QuizData, ReactionData } from '../types';

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
      description: "List of valid resonance contributors if applicable (e.g. for benzene, ozone, amides).",
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
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.INTEGER },
          explanation: { type: Type.STRING }
        },
        required: ["id", "question", "options", "correctAnswer", "explanation"]
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
    }
  },
  required: ["name", "steps"]
};

export const generateMoleculeData = async (moleculeName: string): Promise<MoleculeData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a 2D graph representation for the molecule: ${moleculeName}.
      Include a list of atoms with unique string IDs and elements (e.g., C, H, O, N).
      Include a list of bonds referencing these IDs with order (1=single, 2=double).
      For stereochemistry, use the 'stereo' field ('wedge', 'dash', or 'none') on bonds where relevant (especially for chiral centers).
      Provide a brief chemical description.
      If the molecule has significant resonance structures (e.g., Benzene, Nitrate, Amide), include them in the 'resonanceStructures' field.
      Ensure the graph structure is chemically accurate.`,
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
    // Clean the data to ensure we are sending pure JSON, not D3 objects
    const cleanAtoms = data.atoms.map(a => ({ id: a.id, element: a.element }));
    const cleanBonds = data.bonds.map(b => ({
      // Handle both string IDs and D3 object references
      source: typeof b.source === 'object' ? (b.source as any).id : b.source,
      target: typeof b.target === 'object' ? (b.target as any).id : b.target,
      order: b.order,
      stereo: b.stereo
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgrade to Pro for critical chemical reasoning
      contents: `Analyze this user-modified molecular structure (atoms/bonds graph).
      
      STRICT CHEMICAL REALISM RULES:
      1. Verify Valency: Do NOT halluciante stable structures for impossible valencies (e.g., Carbon with 5 bonds, Oxygen with 3 single bonds without charge).
      2. Verify Oxidation States: Check if metal oxidation states are realistic (e.g., Mg is +2, not +1 or +3 in standard organics).
      3. Verify Existence: Ensure the resulting compound appears in standard chemical databases (PubChem, ChemSpider, University texts).
      4. Stereochemistry: If wedge/dash bonds are used, verify if they represent a valid chiral center or isomer.
      
      Input Data:
      Atoms: ${JSON.stringify(cleanAtoms)}
      Bonds: ${JSON.stringify(cleanBonds)}
      
      Task:
      - If the structure is CHEMICALLY IMPOSSIBLE (e.g., Pentavalent Carbon, Mg(I) zwitterions, unstable anions like CCl2-):
          - Return a molecule with name "Impossible Structure".
          - In the description, clearly explain WHY it is invalid (e.g., "Carbon cannot have 5 bonds", "Magnesium(I) is unstable").
          - You may return the structure AS IS to show the error, or break the impossible bonds.
      - If the structure is VALID:
          - Identify the molecule.
          - Provide its IUPAC name or common name.
          - Describe its properties.
          - IMPORTANT: If the molecule exhibits RESOANCE (e.g. delocalized electrons), provide the alternative bond configurations in 'resonanceStructures'.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: moleculeSchema,
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    return JSON.parse(response.text || '{}') as MoleculeData;
  } catch (error) {
    console.error("GenAI Error (Analyze):", error);
    throw error;
  }
};

export const applyReaction = async (data: MoleculeData, reactionPrompt: string, conditions: string): Promise<MoleculeData> => {
    try {
      const cleanAtoms = data.atoms.map(a => ({ id: a.id, element: a.element }));
      const cleanBonds = data.bonds.map(b => ({
        source: typeof b.source === 'object' ? (b.source as any).id : b.source,
        target: typeof b.target === 'object' ? (b.target as any).id : b.target,
        order: b.order,
        stereo: b.stereo
      }));
  
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Use Pro for chemical reasoning
        contents: `Given the reactant molecule structure below, predict the major organic product when reacting with: "${reactionPrompt}" under these conditions: "${conditions}".
        
        Reactant Data:
        Atoms: ${JSON.stringify(cleanAtoms)}
        Bonds: ${JSON.stringify(cleanBonds)}
        
        STRICT PRE-ANALYSIS CHECK:
        Before determining the product, you MUST validate the compatibility of the Reagents and Conditions.
        - Are the conditions ("${conditions}") appropriate for the reagent ("${reactionPrompt}")?
        - Is the substrate reactive under these specific conditions?
        
        IF conditions are chemically unreasonable (e.g., "Friedel Crafts with water", "Grignard with acid", "Oxidation without oxidant") or insufficient:
           - Return the ORIGINAL structure.
           - Set name to "No Reaction".
           - Set description to "Reaction failed: [Explanation of why conditions are invalid or incompatible]."
        
        IF conditions are valid:
           1. Determine the reaction type (e.g., Sn2, Hydrogenation, Oxidation) based on Reagents AND Conditions.
           2. Modify the structure to represent the product.
           3. Update the 'name' and 'description'.
           4. Consider Stereochemistry: If the reaction is stereospecific (e.g., Sn2 inversion, Syn-addition), reflect this in the product's bonds (wedge/dash).
           5. Ensure stoichiometry and charge balance make sense.
           6. Do not invent impossible intermediates as final products.
           
        If the reaction is valid but produces no reaction for other reasons (e.g. steric hindrance, no leaving group), return "No Reaction" with explanation.
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: moleculeSchema,
          thinkingConfig: { thinkingBudget: 2048 }
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
      contents: `Create a challenging 5-question multiple choice quiz about: ${topic} in Organic Chemistry.
      Ensure questions test conceptual understanding (stereochemistry, resonance, mechanisms).`,
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
      model: 'gemini-3-pro-preview', // Using Pro for complex reasoning
      contents: `Explain the reaction mechanism for: ${reactionQuery}.
      Break it down into logical steps suitable for visualization.
      Include key concepts (nucleophile, electrophile, transition state) for each step.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: reactionSchema,
        thinkingConfig: { thinkingBudget: 1024 } // Enable thinking for complex mechanisms
      }
    });
    return JSON.parse(response.text || '{}') as ReactionData;
  } catch (error) {
    console.error("GenAI Error (Reaction):", error);
    throw error;
  }
};

export const chatWithTutor = async (history: {role: 'user'|'model', parts: {text: string}[]}[], message: string): Promise<string> => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history,
        config: {
            systemInstruction: "You are a helpful, encouraging, and expert Organic Chemistry tutor. Keep answers concise and focused on visualization concepts. If a user asks about a chemically impossible structure, explain clearly why it cannot exist."
        }
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I'm having trouble thinking about that right now.";
}
