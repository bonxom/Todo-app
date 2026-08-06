import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { getServerConfig, validateServerEnv } from './config/env.js';

const { host, port } = getServerConfig();

if (!process.env.VERCEL) {
  const start = async () => {
    validateServerEnv();
    await connectDB();
    app.listen(port, host, () => {
      console.log(`Server is running on http://${host}:${port}`);
    });
  };

  start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
