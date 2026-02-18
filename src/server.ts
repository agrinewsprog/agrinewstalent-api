import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    const server = app.listen(env.port, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║   🚀 Server Started Successfully!             ║
║                                                ║
║   Environment: ${env.nodeEnv.padEnd(33)}║
║   Port: ${env.port.toString().padEnd(40)}║
║   URL: http://localhost:${env.port.toString().padEnd(24)}║
║                                                ║
╚════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');

        await disconnectDatabase();
        console.log('Database connection closed');

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
