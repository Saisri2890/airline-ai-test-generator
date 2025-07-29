// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import parseRoutes from './routes/parse';
import generateRoutes from './routes/generate';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.2.0',
    service: 'Airline AI Test Generator Backend',
    features: [
      'authentication',
      'file-upload', 
      'excel-parsing', 
      'ai-test-generation',
      'multi-format-export'
    ],
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/parse', parseRoutes);
app.use('/api/generate', generateRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Airline AI Test Generator Backend API',
    version: '2.2.0',
    status: 'running',
    documentation: {
      health: '/health',
      auth: '/api/auth',
      upload: '/api/upload',
      parse: '/api/parse',
      generate: '/api/generate'
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access',
      error: 'Invalid or missing authentication token'
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: {
      auth: '/api/auth',
      upload: '/api/upload',
      parse: '/api/parse',
      generate: '/api/generate'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ============================================');
  console.log(`   Airline AI Test Generator Backend`);
  console.log('   ============================================');
  console.log(`   🌐 Server running on: http://localhost:${PORT}`);
  console.log(`   📊 Health check: http://localhost:${PORT}/health`);
  console.log(`   📁 Uploads directory: ${uploadsDir}`);
  console.log(`   🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('   ============================================');
  console.log('\n📋 Available API Endpoints:');
  console.log('   Authentication:');
  console.log('     POST /api/auth/login       - User login');
  console.log('     POST /api/auth/register    - User registration');
  console.log('     GET  /api/auth/me          - Get current user');
  console.log('\n   File Management:');
  console.log('     POST /api/upload/excel     - Upload Excel file');
  console.log('     GET  /api/upload/:fileId   - Get file info');
  console.log('     DELETE /api/upload/:fileId - Delete file');
  console.log('\n   Excel Parsing:');
  console.log('     POST /api/parse/excel/:fileId - Parse Excel file');
  console.log('     POST /api/parse/validate      - Validate user story');
  console.log('     GET  /api/parse/format-help   - Get format help');
  console.log('     GET  /api/parse/preview/:fileId - Preview file');
  console.log('\n   AI Test Generation:');
  console.log('     POST /api/generate/tests        - Generate test cases');
  console.log('     GET  /api/generate/providers    - Get AI providers');
  console.log('     POST /api/generate/export/:format - Export test cases');
  console.log('\n✅ Server ready for requests!\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;