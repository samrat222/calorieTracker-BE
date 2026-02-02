const cron = require('node-cron');
const { prisma } = require('../config/database');
const notificationService = require('./notification.service');
const { getStartOfToday, getEndOfToday } = require('../utils/constants');

/**
 * Scheduler Service
 * Handles periodic tasks like sending calorie reminders
 */

/**
 * Initialize all cron jobs
 */
const initializeScheduler = () => {
  console.log('🕒 Scheduler Service Initialized');

  // 1. 9:30 AM - Breakfast reminder
  cron.schedule('30 9 * * *', async () => {
    console.log('[CRON] Running 9:30 AM Breakfast reminder');
    await sendCalorieReminders('BREAKFAST');
  });

  // 2. 1:30 PM - Lunch status
  cron.schedule('30 13 * * *', async () => {
    console.log('[CRON] Running 1:30 PM Lunch status reminder');
    await sendCalorieReminders('LUNCH');
  });

  // 3. 5:30 PM - Snacks status
  cron.schedule('30 17 * * *', async () => {
    console.log('[CRON] Running 5:30 PM Snacks status reminder');
    await sendCalorieReminders('SNACKS');
  });

  // 4. 9:30 PM - Dinner / End of day status
  cron.schedule('30 21 * * *', async () => {
    console.log('[CRON] Running 9:30 PM Dinner status reminder');
    await sendCalorieReminders('DINNER');
  });

  // 5. 12:57 AM - Test reminder
  // cron.schedule('58 0 * * *', async () => {
  //   console.log('[CRON] Running 12:57 AM Test reminder');
  //   await sendCalorieReminders('TEST');
  // });
  
};

/**
 * Send calorie reminders to all users with FCM tokens
 * @param {string} type - Time of day (BREAKFAST, LUNCH, SNACKS, DINNER)
 */
const sendCalorieReminders = async (type) => {
  try {
    // 1. Get all users who have an FCM token
    const users = await prisma.user.findMany({
      where: {
        fcmToken: { not: null },
      },
      select: {
        id: true,
        fcmToken: true,
        dailyCalorieGoal: true,
      }
    });

    console.log(`[CRON] Found ${users.length} users with FCM tokens for ${type} reminder`);

    const todayStart = getStartOfToday();
    const todayEnd = getEndOfToday();

    for (const user of users) {
      // 2. Get today's calorie summary for the user
      const dailySummary = await prisma.dailySummary.findFirst({
        where: {
          userId: user.id,
          date: {
            gte: todayStart,
            lte: todayEnd,
          }
        }
      });

      const caloriesConsumed = dailySummary ? dailySummary.totalCalories : 0;
      const dailyGoal = user.dailyCalorieGoal || 2000;
      const remainingCalories = Math.max(0, dailyGoal - caloriesConsumed);

      let title = '';
      let body = '';

      // 3. Craft message based on time of day
      switch (type) {
        case 'BREAKFAST':
          title = 'Good Morning! ☀️';
          body = `Today's goal is ${dailyGoal} kcal. Don't forget to log your breakfast!`;
          break;
        case 'LUNCH':
          title = 'Lunch Time! 🍱';
          body = `You have consumed ${caloriesConsumed} kcal so far. You have ${remainingCalories} kcal remaining for today.`;
          break;
        case 'SNACKS':
          title = 'Healthy Snack? 🍎';
          body = `Current status: ${caloriesConsumed}/${dailyGoal} kcal. ${remainingCalories} kcal left for your evening.`;
          break;
        case 'DINNER':
          title = 'Evening Wrap-up 🌙';
          body = dailyGoal > caloriesConsumed 
            ? `Day almost over! You still have ${remainingCalories} kcal left. Log your last meal.`
            : `Great job! You reached your daily goal of ${dailyGoal} kcal.`;
          break;
        case 'TEST':
          title = 'Testing System... 🧪';
          body = `System check at 8:31 PM. Consumed: ${caloriesConsumed} kcal, Remaining: ${remainingCalories} kcal.`;
          break;
      }

      // 4. Send notification
      await notificationService.createAndSendNotification({
        userId: user.id,
        title,
        body,
        type: 'REMINDER',
        metadata: {
          remainingCalories: remainingCalories.toString(),
          caloriesConsumed: caloriesConsumed.toString(),
          type
        }
      });
    }
  } catch (error) {
    console.error(`[CRON ERROR] Failed to send ${type} reminders:`, error);
  }
};

module.exports = {
  initializeScheduler,
};
