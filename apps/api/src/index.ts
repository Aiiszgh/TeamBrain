import http from 'http';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { initSocketIO } from './socket/socketHandler.js';
import { startExpirySweeper } from './sweeper/expirySweeper.js';
import { config } from './config/env.js';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  initSocketIO(server);
  startExpirySweeper();

  server.listen(config.port, () => {
    console.log(`TeamBrain API server listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
