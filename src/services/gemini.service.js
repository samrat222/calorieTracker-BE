/**
 * Google Gemini Service
 * Handles food image analysis using Gemini Vision API
 */

const { getModel, isConfigured } = require("../config/gemini");

/**
 * The prompt to send to Gemini for food analysis
 * Designed to return structured JSON data
 */
const FOOD_ANALYSIS_PROMPT = `Analyze this food image and identify all food items visible. For each food item, provide:
1. Food name
2. Estimated quantity and unit (grams, ml, pieces, etc.)
3. Estimated nutritional values:
   - Calories (kcal)
   - Protein (grams)
   - Carbohydrates (grams)
   - Fats (grams)
   - Fiber (grams) - if applicable

Return the response in the following JSON format ONLY (no additional text):
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

If you cannot identify the food or the image is not food-related, return:
{
  "success": false,
  "error": "Could not identify food in the image",
  "foodItems": [],
  "totalNutrition": null
}

Be as accurate as possible with nutritional estimates. Use standard portion sizes when quantity is unclear.`;

/**
 * Analyze a food image using Gemini Vision API
 * @param {Buffer|string} imageSource - Image data as buffer or Cloudinary URL
 * @param {string} mimeType - MIME type of the image (e.g., 'image/jpeg') - only used for buffers
 * @returns {Promise<Object>} - Analysis result with food items and nutrition data
 */
const analyzeImage = async (imageSource, mimeType = "image/jpeg") => {
  if (!isConfigured()) {
    throw new Error(
      "Gemini API is not configured. Please set GEMINI_API_KEY environment variable.",
    );
  }

  const model = getModel();
  if (!model) {
    throw new Error("Failed to initialize Gemini model");
  }

  try {
    let imagePart;

    // Check if imageSource is a URL (Cloudinary) or buffer
    if (typeof imageSource === "string") {
      // URL-based image (e.g., Cloudinary)
      imagePart = {
        url: imageSource,
      };
    } else {
      // Buffer-based image (fallback for local processing)
      const base64Image = imageSource.toString("base64");
      imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      };
    }

    // Send request to Gemini
    const result = await model.generateContent([
      FOOD_ANALYSIS_PROMPT,
      imagePart,
    ]);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    // Remove any markdown code blocks if present
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const analysisResult = JSON.parse(jsonText);

    // Validate the response structure
    if (!analysisResult || typeof analysisResult !== "object") {
      throw new Error("Invalid response format from Gemini");
    }

    return {
      success: analysisResult.success !== false,
      foodItems: analysisResult.foodItems || [],
      totalNutrition: analysisResult.totalNutrition || null,
      mealDescription: analysisResult.mealDescription || "",
      error: analysisResult.error || null,
    };
  } catch (error) {
    console.error("Gemini API Error:", error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: "Failed to parse nutrition data from image analysis",
        foodItems: [],
        totalNutrition: null,
      };
    }

    throw error;
  }
};

/**
 * Analyze food from text description using Gemini
 * @param {string} description - Text description of the food
 * @returns {Promise<Object>} - Analysis result with nutrition estimates
 */
const analyzeTextDescription = async (description) => {
  if (!isConfigured()) {
    throw new Error(
      "Gemini API is not configured. Please set GEMINI_API_KEY environment variable.",
    );
  }

  const model = getModel();
  if (!model) {
    throw new Error("Failed to initialize Gemini model");
  }

  const textPrompt = `Based on this food description, estimate the nutritional values:

"${description}"

Return the response in the following JSON format ONLY (no additional text):
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
  "mealDescription": "${description}"
}

If the description is not food-related or too vague, return:
{
  "success": false,
  "error": "Could not estimate nutrition for this description",
  "foodItems": [],
  "totalNutrition": null
}`;

  try {
    const result = await model.generateContent(textPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const analysisResult = JSON.parse(jsonText);

    return {
      success: analysisResult.success !== false,
      foodItems: analysisResult.foodItems || [],
      totalNutrition: analysisResult.totalNutrition || null,
      mealDescription: analysisResult.mealDescription || description,
      error: analysisResult.error || null,
    };
  } catch (error) {
    console.error("Gemini Text Analysis Error:", error);

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: "Failed to parse nutrition data",
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
