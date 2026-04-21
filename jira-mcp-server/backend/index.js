import './firebase.js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import userConfigRoutes from './routes/userConfig.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.PORT || 4001);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, db: 'firestore' });
});

app.use('/api', userConfigRoutes);

app.use((err, _req, res, _next) => {
  res.status(500).json({
    message: 'Internal server error',
    error: err instanceof Error ? err.message : 'Unknown error',
  });
});

function startServer() {
  app.listen(PORT, () => {
    console.log(`Backend API listening on http://localhost:${PORT}`);
    console.log('Persistence: Firebase Firestore (collection userConfigs, document default)');
  });
}

try {
  startServer();
} catch (error) {
  console.error('Failed to start backend API:', error);
  process.exit(1);
}
