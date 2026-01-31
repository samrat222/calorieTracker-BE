/**
 * Server Entry Point
 * Starts the Express server and handles graceful shutdown
 */

// Load environment variables first
require('dotenv').config();

const app = require('./src/app');
const { connectDatabase, disconnectDatabase } = require('./src/config/database');

// Get port from environment
const PORT = process.env.PORT || 5000;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🥗  Calorie Tracker API Server                      ║
║                                                       ║
║   🚀 Server running on port ${PORT}                     ║
║   📊 Environment: ${process.env.NODE_ENV || 'development'}                    ║
║   🔗 Health check: http://localhost:${PORT}/api/health  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    // ============================================
    // Graceful Shutdown Handling
    // ============================================

    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('HTTP server closed.');

        try {
          // Disconnect from database
          await disconnectDatabase();
          console.log('Graceful shutdown completed.');
          process.exit(0);
        } catch (error) {
          console.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown due to timeout.');
        process.exit(1);
      }, 30000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
