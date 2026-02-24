import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

const startServer = async () => {
  try {
    console.log('Connecting to database...');
    await connectDatabase();
    console.log('Database connected successfully');

    const server = app.listen(env.port, '0.0.0.0', () => {
      const port = env.port;
      console.log('');
      console.log('=== Server Started ===');
      console.log('Environment: ' + env.nodeEnv);
      console.log('Port: ' + port);
      console.log('API: http://127.0.0.1:' + port);
      console.log('API: http://localhost:' + port);
      console.log('Health: http://127.0.0.1:' + port + '/api/health');
      console.log('');
      console.log('/api/health OK');
      console.log('/api/auth OK');
      console.log('/api/offers OK');
      console.log('/api/applications OK');
      console.log('/api/universities OK');
      console.log('/api/programs OK');
      console.log('/api/courses OK');
      console.log('/api/promotions OK');
      console.log('/api/notifications OK');
      console.log('/api/agreements OK');
      console.log('/api/companies OK');
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(signal + ' received. Starting graceful shutdown...');
      server.close(async () => {
        console.log('HTTP server closed');
        await disconnectDatabase();
        console.log('Database connection closed');
        process.exit(0);
      });
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