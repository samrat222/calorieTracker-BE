/**
 * Routes Index
 * Central export for all routes
 */

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const mealRoutes = require('./meal.routes');
const analyticsRoutes = require('./analytics.routes');

module.exports = {
  authRoutes,
  userRoutes,
  mealRoutes,
  analyticsRoutes,
};
