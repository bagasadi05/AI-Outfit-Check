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
    // If we have a reference file for Outfit, we want LOW creativity (high fidelity).
    // If we are just generating from text, we allow more creativity.
    let temperature = Math.max(0.1, Math.min(1.0, creativityLevel / 100));
    
    if (mode === 'outfit' && referenceFile) {
        // Force lower temperature for virtual try-on to adhere to the reference image
        temperature = 0.2; 
    }

    // Base instruction depending on mode
    let instructions = "";

    if (mode === 'outfit') {
        instructions = `You are a professional fashion photo retoucher performing a VIRTUAL TRY-ON.
        TASK: Dress the person in the first image with the outfit from the second image.
        
        CRITICAL RULES:
        1. DO NOT change the body shape, head size, or pose.
        2. Keep the original background exactly as it is.
        3. Focus strictly on inpainting the clothing area only.`;
        
        if (referenceFile) {
            // Step 1: Analyze the reference image to get text details
            // We do this to reinforce the visual input with text description
            const refAnalysis = await analyzeReferenceImage(referenceFile);

            const refPart = await fileToGenerativePart(referenceFile);
            parts.push(refPart);
            
            instructions += `\n\n[STRICT OUTFIT REPLICATION]
            The second image is the EXACT garment to be worn.
            - TEXTURE MAPPING: You must transfer the fabric pattern, print, and material from the Reference Image onto the Model.
            - PATTERN FIDELITY: If the reference has a specific print (e.g. batik, floral), it MUST appear on the result. Do not replace it with a generic pattern.
            - STRUCTURAL MATCH: Match the neckline, sleeve length, and cut exactly.
            - Reference Description: ${refAnalysis}
            - Blend the outfit naturally at the neck and wrists.`;
        }
    } else if (mode === 'bg') {
        instructions = `You are an expert compositor.
        TASK: Change the background of this image to: "${prompt}".
        
        CRITICAL RULES:
        1. PRESERVE THE PERSON EXACTLY. Do not change their face, expression, or outfit.
        2. Perform precise segmentation of the person.
        3. Replace ONLY the background pixels.
        4. Adjust the lighting on the person slightly to match the new environment, but do not alter their identity.`;

        if (referenceFile) {
            const refPart = await fileToGenerativePart(referenceFile);
            parts.push(refPart);
            instructions += `\nBACKGROUND SOURCE: Use the second image as the new background. Composite the person from the first image into this scene naturally.`;
        } else {
            instructions += `\nGenerate a photorealistic background based on the text description.`;
        }
    } else if (mode === 'pose') {
        instructions = `TASK: Regenerate the person with a NEW POSE: "${prompt}".
        
        CRITICAL RULES:
        1. Keep the same outfit style and hijab style.
        2. The result must look like the SAME PERSON, just moving.
        3. Photorealistic, 8k quality.`;

        if (referenceFile) {
            const refPart = await fileToGenerativePart(referenceFile);
            parts.push(refPart);
            instructions += `\nPOSE REFERENCE: Use the second image as a reference for the POSE. Transfer the posture, gesture, and body angle from the second image to the person in the first image.`;
        }
    }

    // Append Face Lock Instructions
    if (faceLock) {
        instructions += `\n\n[STRICT IDENTITY PROTECTION]
        - The person's face (eyes, nose, mouth, jawline) and skin tone MUST remain bit-for-bit identical to the source image.
        - Do NOT regenerate or "improve" the face.
        - If the new outfit interacts with the neck/chin, ensure seamless blending without altering the jawline.
        - Treat the face area as a frozen layer.`;
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

/**
 * Generates a video using Veo 3 based on an input image.
 */
export const generateFashionVideo = async (imageFile: File, prompt: string): Promise<string> => {
    // Create new client to grab the latest key selected by user
    const ai = getClient();
    const imagePart = await fileToGenerativePart(imageFile);

    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt || "Fashion model posing naturally, subtle cinematic movement, high quality, 4k",
            image: {
                imageBytes: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType,
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '9:16' // Standard for social media/fashion clips
            }
        });

        // Poll until done
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (!downloadLink) {
            throw new Error("Video generation completed but no download link found.");
        }

        // Fetch the actual video bytes using the API Key
        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.statusText}`);
        }
        
        const videoBlob = await response.blob();
        return URL.createObjectURL(videoBlob);

    } catch (error) {
        console.error("Error generating video:", error);
        throw error;
    }
};

/**
 * Analyzes an uploaded outfit and provides styling advice.
 */
export const analyzeUploadedLook = async (file: File, query: string): Promise<string> => {
    const ai = getClient();
    const imagePart = await fileToGenerativePart(file);

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    imagePart,
                    { text: query }
                ]
            }
        });
        
        return response.text || "No analysis generated.";
    } catch (error) {
        console.error("Error analyzing outfit:", error);
        throw error;
    }
};