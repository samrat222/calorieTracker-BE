/**
 * Google Gemini Service
 * Handles food image and text analysis using Gemini Vision API
 */

const { getModel, isConfigured } = require("../config/gemini");

/**
 * Prompt for food image analysis
 */
const FOOD_ANALYSIS_PROMPT = `
Analyze this food image and identify all food items visible.

For each food item provide:
1. Food name
2. Estimated quantity and unit (grams, ml, pieces, etc.)
3. Estimated nutritional values:
   - Calories (kcal)
   - Protein (grams)
   - Carbohydrates (grams)
   - Fats (grams)
   - Fiber (grams, if applicable)

Return ONLY valid JSON in this exact structure:

{
  "success": true,
  "foodItems": [
    {
      "foodName": "item name",
      "quantity": 100,
      "unit": "grams",
      "calories": 150,
      "protein": 5.5,
      "carbs": 20.0,
      "fats": 6.0,
      "fiber": 2.0
    }
  ],
  "totalNutrition": {
    "calories": 150,
    "protein": 5.5,
    "carbs": 20.0,
    "fats": 6.0,
    "fiber": 2.0
  },
  "mealDescription": "Brief description of the meal"
}

If not food-related:

{
  "success": false,
  "error": "Could not identify food in the image",
  "foodItems": [],
  "totalNutrition": null
}
`;

/**
 * Utility: Safely extract JSON from LLM output
 */
const extractJson = (text) => {
  let cleaned = text.trim();

  // Remove markdown code fences
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

  cleaned = cleaned.trim();

  return JSON.parse(cleaned);
};

/**
 * Analyze food image using Gemini
 * STRICT: Accepts buffer only
 */
const analyzeImage = async (imageBuffer, mimeType = "image/jpeg") => {
  if (!isConfigured()) {
    throw new Error("Gemini API is not configured.");
  }

  if (!Buffer.isBuffer(imageBuffer)) {
    throw new Error("analyzeImage requires an image buffer.");
  }

  const model = getModel();
  if (!model) {
    throw new Error("Failed to initialize Gemini model.");
  }

  try {
    const base64Image = imageBuffer.toString("base64");

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: FOOD_ANALYSIS_PROMPT },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const response = await result.response;
    const text = response.text();

    const parsed = extractJson(text);

    return {
      success: parsed.success !== false,
      foodItems: parsed.foodItems || [],
      totalNutrition: parsed.totalNutrition || null,
      mealDescription: parsed.mealDescription || "",
      error: parsed.error || null,
    };
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error.message);

    // 🔄 Handle Rate Limit by Rotating Key and Retrying once
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('429')) {
      const { rotateKey } = require("../config/gemini");
      if (rotateKey()) {
        console.log("♻️ Retrying image analysis with new key...");
        return analyzeImage(imageBuffer, mimeType);
      }
    }

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: "Failed to parse nutrition data from Gemini response.",
        foodItems: [],
        totalNutrition: null,
      };
    }

    throw error;
  }
};

/**
 * Analyze food based on text description
 */
const analyzeTextDescription = async (description) => {
  if (!isConfigured()) {
    throw new Error("Gemini API is not configured.");
  }

  const model = getModel();
  if (!model) {
    throw new Error("Failed to initialize Gemini model.");
  }

  const prompt = `
Based on this food description:

"${description}"

Estimate nutritional values and return ONLY valid JSON in this exact structure:

Instructions:
1. Identify all food items and their quantities from the description.
2. If a quantity is specified (e.g., "2 eggs", "200g chicken"), calculate nutrition for that specific amount.
3. If no quantity is specified, assume a standard serving size.
4. Sum up all items for totalNutrition.

{
  "success": true,
  "foodItems": [
    {
      "foodName": "item name",
      "quantity": 100,
      "unit": "grams", // or "large", "cup", etc.
      "calories": 150,
      "protein": 5.5,
      "carbs": 20.0,
      "fats": 6.0,
      "fiber": 2.0
    }
  ],
  "totalNutrition": {
    "calories": 150,
    "protein": 5.5,
    "carbs": 20.0,
    "fats": 6.0,
    "fiber": 2.0
  },
  "mealDescription": "${description}"
}

If the description is not food-related or too vague, return:

{
  "success": false,
  "error": "Could not estimate nutrition for this description",
  "foodItems": [],
  "totalNutrition": null
}
`;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const response = await result.response;
    const text = response.text();

    const parsed = extractJson(text);

    return {
      success: parsed.success !== false,
      foodItems: parsed.foodItems || [],
      totalNutrition: parsed.totalNutrition || null,
      mealDescription: parsed.mealDescription || description,
      error: parsed.error || null,
    };
  } catch (error) {
    console.error("Gemini Text Analysis Error:", error.message);

    // 🔄 Handle Rate Limit by Rotating Key and Retrying once
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('429')) {
      const { rotateKey } = require("../config/gemini");
      if (rotateKey()) {
        console.log("♻️ Retrying text analysis with new key...");
        return analyzeTextDescription(description);
      }
    }

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: "Failed to parse nutrition data.",
        foodItems: [],
        totalNutrition: null,
      };
    }

    throw error;
  }
};

module.exports = {
  analyzeImage,
  analyzeTextDescription,
};
