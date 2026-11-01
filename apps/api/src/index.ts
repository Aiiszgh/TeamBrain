// import http from 'http';
// import { createApp } from './app.js';
// import { connectDatabase } from './config/database.js';
// import { initSocketIO } from './socket/socketHandler.js';
// import { initMemoryChangeStream } from './services/changeStreamService.js';
// import { startExpirySweeper } from './sweeper/expirySweeper.js';
// import { config } from './config/env.js';

// // async function bootstrap() {
// //   await connectDatabase();

// //   const app = createApp();
// //   const server = http.createServer(app);

// //   const io = initSocketIO(server);
// //   initMemoryChangeStream(io);
// //   startExpirySweeper();

// //   server.listen(config.port, () => {
// //     console.log(`TeamBrain API server listening on http://localhost:${config.port}`);
// //   });
// // }

// import express from 'express';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export function createApp() {
//   const app = express();

//   // ... your existing middlewares and API routes (e.g., app.use('/api', ...)) ...

//   // Serve static assets from your frontend build folder
//   app.use(express.static(path.join(__dirname, '../frontend/dist'))); 

//   // Catch-all route to serve index.html for any frontend navigation
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
//   });

//   return app;
// }



// async function bootstrap() {
//   await connectDatabase();

//   const app = createApp();

//   // 👇 Add this route handler right here to fix "Cannot GET /"
//   app.get('/', (req, res) => {
//     res.send('TeamBrain API is up and running!');
//   });

//   const server = http.createServer(app);

//   const io = initSocketIO(server);
//   initMemoryChangeStream(io);
//   startExpirySweeper();

//   server.listen(config.port, () => {
//     console.log(`TeamBrain API server listening on http://localhost:${config.port}`);
//   });
// }


import http from 'http';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { initSocketIO } from './socket/socketHandler.js';
import { initMemoryChangeStream } from './services/changeStreamService.js';
import { startExpirySweeper } from './sweeper/expirySweeper.js';
import { config } from './config/env.js';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  const io = initSocketIO(server);
  initMemoryChangeStream(io);
  startExpirySweeper();

  server.listen(config.port, () => {
    console.log(`TeamBrain API server listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// bootstrap().catch((err) => {
//   console.error('Failed to start server:', err);
//   process.exit(1);
// });
