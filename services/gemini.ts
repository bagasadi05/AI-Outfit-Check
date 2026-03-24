import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedLook, StylingPreferences } from "../types";

// Helper to get client (creates new instance to ensure latest key is used)
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes the reference image to get detailed descriptive tags.
 * This helps the image generator understand the pattern and fabric better.
 */
const analyzeReferenceImage = async (file: File): Promise<string> => {
    const ai = getClient();
    const imagePart = await fileToGenerativePart(file);
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    imagePart,
                    { text: "Describe this outfit in extreme detail for a fashion design spec. Focus strictly on: 1. The specific Fabric Pattern (e.g., floral, batik, geometric, abstract). 2. The Color Palette. 3. The Texture (satin, cotton, silk). 4. Key details (buttons, ruffles, neckline). Keep it concise, under 40 words." }
                ]
            }
        });
        return response.text?.trim() || "";
    } catch (e) {
        console.warn("Reference analysis failed, proceeding without detailed description.", e);
        return "";
    }
};

/**
 * Generates an image of the outfit based on a description.
 */
export const generateOutfitImage = async (imagePrompt: string, aspectRatio: string = "3:4"): Promise<string> => {
    const ai = getClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: imagePrompt + ", high quality, photorealistic, fashion photography, 8k, modest fashion" }]
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio
                }
            }
        });

        // Extract image
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        
        const candidate = response.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
            throw new Error(`AI Safety Block: ${candidate.finishReason}`);
        }
        
        throw new Error("No image generated.");
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
};

/**
 * Modifies the image based on the specific mode (outfit, bg, pose).
 */
export const generateVirtualTryOn = async (
    modelFile: File, 
    prompt: string, 
    referenceFile: File | null,
    creativityLevel: number = 50,
    mode: 'outfit' | 'bg' | 'pose' = 'outfit',
    aspectRatio: string = "3:4",
    faceLock: boolean = true
): Promise<string> => {
    const ai = getClient();
    const modelPart = await fileToGenerativePart(modelFile);
    
    const parts: any[] = [modelPart];
    
    // Adjusted Temperature Logic:
    // We want enough creativity to allow pose changes, but not too much to lose the identity.
    let temperature = Math.max(0.4, Math.min(1.0, creativityLevel / 100));
    
    if (mode === 'outfit' && referenceFile) {
        // If there's a reference outfit, we need some fidelity, but still allow pose changes.
        temperature = Math.max(0.4, temperature); 
    }

    // Base instruction depending on mode
    let instructions = "";

    if (mode === 'outfit') {
        instructions = `You are an expert AI image editor.
        TASK: Change the person's OUTFIT to match the description: "${prompt}".
        
        CRITICAL RULES:
        1. CHANGE THE POSE: You MUST change the person's pose to match the requested action or a natural, dynamic pose if none is specified. Do NOT keep the original pose.
        2. STRICT BACKGROUND PRESERVATION: The background pixels (walls, furniture, outdoor scenery) MUST remain identical to the first image. DO NOT change the location. Inpaint the background naturally where the old pose used to be.
        3. STRICT IDENTITY PRESERVATION: Use the first image as a strict visual reference for the person's identity (face, facial features, skin tone).
        4. Apply the requested outfit naturally to the new pose.`;
        
        if (referenceFile) {
            const refAnalysis = await analyzeReferenceImage(referenceFile);
            const refPart = await fileToGenerativePart(referenceFile);
            parts.push(refPart);
            
            instructions += `\n\n[STRICT OUTFIT REPLICATION]
            The second image is the EXACT garment to be worn.
            - TEXTURE MAPPING: Transfer the fabric pattern, print, and material from the Reference Image onto the Model.
            - STRUCTURAL MATCH: Match the neckline, sleeve length, and cut exactly.
            - Reference Description: ${refAnalysis}`;
        }
    } else if (mode === 'bg') {
        instructions = `You are an expert compositor.
        TASK: Change the BACKGROUND of this image to: "${prompt}".
        
        CRITICAL RULES:
        1. STRICT PERSON PRESERVATION: PRESERVE THE PERSON EXACTLY. Do not change their face, expression, pose, or outfit.
        2. Replace ONLY the background pixels.
        3. Adjust the lighting on the person slightly to match the new environment, but do not alter their identity.`;

        if (referenceFile) {
            const refPart = await fileToGenerativePart(referenceFile);
            parts.push(refPart);
            instructions += `\nBACKGROUND SOURCE: Use the second image as the new background. Composite the person from the first image into this scene naturally.`;
        } else {
            instructions += `\nGenerate a photorealistic background based on the text description.`;
        }
    } else if (mode === 'pose') {
        instructions = `You are an expert AI image editor.
        TASK: Regenerate the person with a NEW POSE: "${prompt}".
        
        CRITICAL RULES:
        1. CHANGE THE POSE: You MUST change the person's pose to match the requested action.
        2. STRICT OUTFIT PRESERVATION: Keep the exact same clothing style, colors, and hijab style as the original image.
        3. STRICT BACKGROUND PRESERVATION: The background pixels (walls, furniture, outdoor scenery) MUST remain identical to the first image. DO NOT change the location. Inpaint the background naturally where the old pose used to be.
        4. STRICT IDENTITY PRESERVATION: The result must look like the EXACT SAME PERSON, just moving.`;

        if (referenceFile) {
            const refPart = await fileToGenerativePart(referenceFile);
            parts.push(refPart);
            instructions += `\nPOSE REFERENCE: Use the second image as a reference for the POSE. Transfer the posture, gesture, and body angle from the second image to the person in the first image.`;
        }
    }

    // Append Face Lock Instructions
    if (faceLock) {
        instructions += `\n\n[STRICT IDENTITY PROTECTION]
        - The person's facial features (eyes, nose, mouth, jawline) and skin tone MUST strongly resemble the source image.
        - You are allowed to adjust the angle of the head to match the new pose, but the identity MUST remain the same.
        - Do not change the person's ethnicity, age, or core facial structure.`;
    } else {
        instructions += `\n\nNote: Maintain general resemblance to the original person, but minor adjustments to expression or angle are permitted if needed for realism.`;
    }

    instructions += `\n\nEnsure high quality, realistic textures. Maintain the modest fashion aesthetic.`;

    parts.push({ text: instructions });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                // Using temperature to control how much "hallucination" is allowed.
                temperature: temperature,
                imageConfig: {
                    aspectRatio: aspectRatio
                }
            }
        });

        // Extract image
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        
        const candidate = response.candidates?.[0];
        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
             throw new Error(`AI Safety Block: ${candidate.finishReason}`);
        }

        throw new Error("No image generated.");
    } catch (error) {
        console.error("Error generating virtual try-on:", error);
        throw error;
    }
};

/**
 * Recommends a descriptive outfit prompt based on image analysis.
 */
export const getOutfitRecommendations = async (file: File): Promise<string> => {
    const ai = getClient();
    const imagePart = await fileToGenerativePart(file);

    const prompt = `
    You are a professional Hijab Fashion Stylist. 
    Analyze the person in the image (skin tone, body shape, apparent style).
    
    Create a detailed, creative, and stylish PROMPT description for a full hijab outfit makeover that would suit them perfectly.
    Focus on colors that flatter their skin tone, cuts that suit their body shape, and trending modest fashion styles.
    
    Describe:
    1. The Hijab style and color.
    2. The Top/Outerwear (material, cut).
    3. The Bottoms (skirt/pants style).
    4. Accessories or shoes.
    
    Output ONLY the descriptive prompt text in English, ready to be used for image generation. Do not include introductory text like "Here is a prompt".
    Keep it under 60 words.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    imagePart,
                    { text: prompt }
                ]
            }
        });
        
        if (!response.text) {
             throw new Error("No recommendation returned.");
        }
        
        return response.text.trim();
    } catch (error) {
        console.error("Error getting recommendations:", error);
        throw error;
    }
};

