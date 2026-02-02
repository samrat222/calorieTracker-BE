/**
 * BMI and Calorie Calculation Service
 * Implements BMI formula and Harris-Benedict equation for calorie goals
 */

/**
 * Calculate BMI (Body Mass Index)
 * Formula: BMI = weight (kg) / (height (m))²
 * 
 * @param {number} weight - Weight in kilograms
 * @param {number} height - Height in centimeters
 * @returns {number} - BMI value rounded to 1 decimal place
 */
const calculateBMI = (weight, height) => {
  if (!weight || !height || weight <= 0 || height <= 0) {
    return null;
  }

  // Convert height from cm to meters
  const heightInMeters = height / 100;
  
  // Calculate BMI
  const bmi = weight / (heightInMeters * heightInMeters);
  
  // Round to 1 decimal place
  return Math.round(bmi * 10) / 10;
};

/**
 * Get BMI category based on BMI value
 * @param {number} bmi - BMI value
 * @returns {string} - BMI category
 */
const getBMICategory = (bmi) => {
  if (!bmi || bmi <= 0) return 'Unknown';
  
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

/**
 * Calculate Basal Metabolic Rate (BMR) using Harris-Benedict equation
 * 
 * Men: BMR = 66.47 + (13.75 × weight) + (5.003 × height) - (6.755 × age)
 * Women: BMR = 655.1 + (9.563 × weight) + (1.850 × height) - (4.676 × age)
 * 
 * @param {number} weight - Weight in kilograms
 * @param {number} height - Height in centimeters
 * @param {number} age - Age in years
 * @param {string} gender - 'male' or 'female'
 * @returns {number} - BMR value (calories per day at rest)
 */
const calculateBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age || !gender) {
    return null;
  }

  if (weight <= 0 || height <= 0 || age <= 0) {
    return null;
  }

  let bmr;

  if (gender.toLowerCase() === 'male') {
    // Harris-Benedict equation for men
    bmr = 66.47 + (13.75 * weight) + (5.003 * height) - (6.755 * age);
  } else if (gender.toLowerCase() === 'female') {
    // Harris-Benedict equation for women
    bmr = 655.1 + (9.563 * weight) + (1.850 * height) - (4.676 * age);
  } else {
    return null;
  }

  return Math.round(bmr);
};

/**
 * Calculate daily calorie goal based on BMR and activity level
 * Daily Goal = BMR × activity level
 * 
 * Activity Levels:
 * - 1.2: Sedentary (little or no exercise)
 * - 1.375: Lightly active (light exercise 1-3 days/week)
 * - 1.55: Moderately active (moderate exercise 3-5 days/week)
 * - 1.725: Very active (hard exercise 6-7 days/week)
 * - 1.9: Extra active (very hard exercise, physical job)
 * 
 * @param {number} bmr - Basal Metabolic Rate
 * @param {number} activityLevel - Activity level multiplier
 * @param {string} goal - Fitness goal ('lose', 'gain', 'maintain')
 * @returns {number} - Daily calorie goal
 */
const calculateDailyCalorieGoal = (bmr, activityLevel, goal = "maintain") => {
  if (!bmr || !activityLevel || bmr <= 0 || activityLevel <= 0) {
    return null;
  }

  let dailyCalories = bmr * activityLevel;

  // Adjust based on goal
  if (goal === "lose") {
    dailyCalories -= 400;
  } else if (goal === "gain") {
    dailyCalories += 500;
  }

  return Math.round(dailyCalories);
};

/**
 * Calculate all health metrics for a user
 * @param {Object} userData - User's physical data
 * @param {number} userData.weight - Weight in kg
 * @param {number} userData.height - Height in cm
 * @param {number} userData.age - Age in years
 * @param {string} userData.gender - 'male' or 'female'
 * @param {number} userData.activityLevel - Activity level multiplier
 * @param {string} userData.goal - Fitness goal ('lose', 'gain', 'maintain')
 * @returns {Object} - Calculated metrics
 */
const calculateHealthMetrics = ({
  weight,
  height,
  age,
  gender,
  activityLevel,
  goal,
}) => {
  const bmi = calculateBMI(weight, height);
  const bmiCategory = getBMICategory(bmi);
  const bmr = calculateBMR(weight, height, age, gender);
  const dailyCalorieGoal = calculateDailyCalorieGoal(bmr, activityLevel, goal);

  return {
    bmi,
    bmiCategory,
    bmr,
    dailyCalorieGoal,
  };
};

/**
 * Validate activity level
 * @param {number} level - Activity level to validate
 * @returns {boolean} - Whether the level is valid
 */
const isValidActivityLevel = (level) => {
  const validLevels = [1.2, 1.375, 1.55, 1.725, 1.9];
  return validLevels.includes(level);
};

module.exports = {
  calculateBMI,
  getBMICategory,
  calculateBMR,
  calculateDailyCalorieGoal,
  calculateHealthMetrics,
  isValidActivityLevel,
};
