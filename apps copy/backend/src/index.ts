// backend/src/index.ts (Updated for Step 4)

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import parseRoutes from './routes/parse';
import generateRoutes from './routes/generate';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/parse', parseRoutes);
app.use('/api/generate', generateRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.2.0', // Updated for Step 4
    features: ['auth', 'file-upload', 'excel-parsing', 'ai-test-generation']
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: uploads/`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Available routes:`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/register`);
  console.log(`   GET  /api/auth/me`);
  console.log(`   POST /api/upload/excel`);
  console.log(`   POST /api/parse/excel/:fileId`);
  console.log(`   GET  /api/parse/result/:fileId`);
  console.log(`   POST /api/parse/validate`);
  console.log(`   POST /api/generate/tests`);
  console.log(`   GET  /api/generate/providers`);
  console.log(`   POST /api/generate/export/:format`);
});

export default app;