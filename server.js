/**
 * Server Entry Point
 * Starts the Express server and handles graceful shutdown
 */

// Load environment variables first
require("dotenv").config();

// 🔥 FORCE IPv4 FIRST (Fix EAI_AGAIN DNS issue)
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const app = require("./src/app");
const {
  connectDatabase,
  disconnectDatabase,
} = require("./src/config/database");

// Get port from environment
const PORT = process.env.PORT || 5000;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    await connectDatabase();

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🥗  Calorie Tracker API Server                      ║
║                                                       ║
║   🚀 Server running on port ${PORT}                     ║
║   📊 Environment: ${process.env.NODE_ENV || "development"}                    ║
║   🔗 Health check: http://localhost:${PORT}/api/health  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log("HTTP server closed.");

        try {
          await disconnectDatabase();
          console.log("Graceful shutdown completed.");
          process.exit(0);
        } catch (error) {
          console.error("Error during graceful shutdown:", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error("Forced shutdown due to timeout.");
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
