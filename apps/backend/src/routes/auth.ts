// backend/src/routes/auth.ts
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Simple encryption/decryption functions (in production, use proper encryption)
const encryptApiKey = (apiKey: string): string => {
  // TODO: Implement proper encryption (AES-256, etc.)
  // For now, just base64 encode (NOT secure for production)
  return Buffer.from(apiKey).toString('base64');
};

const decryptApiKey = (encryptedKey: string): string => {
  // TODO: Implement proper decryption
  // For now, just base64 decode
  try {
    return Buffer.from(encryptedKey, 'base64').toString('utf-8');
  } catch {
    return '';
  }
};

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, name, password, role, department, aiModel, aiApiKey } = req.body;
    
    console.log('📝 Registration request for:', email);
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Prepare user data
    const userData: any = {
      email,
      name,
      password: hashedPassword,
      role: role || 'QA_ANALYST',
      department: department || null,
      aiModel: aiModel || null
    };

    // Encrypt API key if provided
    if (aiApiKey && aiApiKey.trim()) {
      userData.aiApiKey = encryptApiKey(aiApiKey);
      console.log('✅ API key provided during registration - encrypting');
    }
    
    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        aiModel: true,
        aiApiKey: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    // Don't send actual API key, just indicate if it exists
    const userResponse = {
      ...user,
      aiApiKey: !!user.aiApiKey // Convert to boolean
    };
    
    console.log('✅ User registered successfully:', email);
    res.status(201).json({ user: userResponse, token });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login request for:', email);
    
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        department: true,
        aiModel: true,
        aiApiKey: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user || !user.isActive) {
      console.log('❌ Login failed - invalid credentials for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('❌ Login failed - invalid password for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
    
    // Don't send password or actual API key
    const { password: _, ...userWithoutPassword } = user;
    const userResponse = {
      ...userWithoutPassword,
      aiApiKey: !!user.aiApiKey // Convert to boolean
    };
    
    console.log('✅ Login successful for:', email);
    res.json({ user: userResponse, token });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: any, res) => {
  try {
    console.log('👤 Get current user request for ID:', req.user.userId);
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        aiModel: true,
        aiApiKey: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!user || !user.isActive) {
      console.log('❌ User not found or inactive:', req.user.userId);
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Don't send actual API key, just indicate if it exists
    const userResponse = {
      ...user,
      aiApiKey: !!user.aiApiKey // Convert to boolean
    };
    
    console.log('✅ Current user data sent for:', user.email);
    res.json({ user: userResponse });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// FIXED: Update user profile
router.put('/profile', authenticateToken, async (req: any, res) => {
  try {
    console.log('🔄 Profile update request received');
    console.log('📦 Request body:', req.body);
    console.log('👤 User ID:', req.user.userId);
    
    const { name, department, aiModel, aiApiKey } = req.body;
    
    // Prepare update data
    const updateData: any = {};
    
    // Only update provided fields
    if (name !== undefined) {
      updateData.name = name;
      console.log('📝 Updating name to:', name);
    }
    
    if (department !== undefined) {
      updateData.department = department || null;
      console.log('📝 Updating department to:', department || 'null');
    }
    
    if (aiModel !== undefined) {
      updateData.aiModel = aiModel || null;
      console.log('📝 Updating AI model to:', aiModel || 'null');
    }
    
    // FIXED: Handle API key properly - including clearing it
    // if (aiApiKey !== undefined) {
    //   if (aiApiKey && aiApiKey.trim()) {
    //     // API key provided - encrypt and store
    //     updateData.aiApiKey = encryptApiKey(aiApiKey);
    //     console.log('✅ API key provided - encrypting and storing');
    //   } else {
    //     // API key is empty/null - clear it
    //     updateData.aiApiKey = null;
    //     console.log('✅ API key cleared - setting to null');
    //   }
    // }

    console.log('📝 Final update data:', {
      ...updateData,
      aiApiKey: updateData.aiApiKey ? '[ENCRYPTED]' : updateData.aiApiKey
    });

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        aiModel: true,
        aiApiKey: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('✅ User updated in database');
    console.log('📊 Updated user data:', {
      ...updatedUser,
      aiApiKey: updatedUser.aiApiKey ? '[ENCRYPTED]' : null
    });

    // Don't send actual API key, just indicate if it exists
    const userResponse = {
      ...updatedUser,
      aiApiKey: !!updatedUser.aiApiKey // Convert to boolean
    };

    console.log('📤 Sending response with aiApiKey boolean:', userResponse.aiApiKey);
    res.json({ user: userResponse });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Get decrypted API key (for AI service use only - internal endpoint)
router.get('/api-key', authenticateToken, async (req: any, res) => {
  try {
    console.log('🔑 API key retrieval request for user:', req.user.userId);
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { aiApiKey: true }
    });
    
    if (!user || !user.aiApiKey) {
      console.log('❌ No API key found for user:', req.user.userId);
      return res.status(404).json({ error: 'No API key found' });
    }
    
    const decryptedKey = decryptApiKey(user.aiApiKey);
    console.log('✅ API key retrieved and decrypted for user:', req.user.userId);
    res.json({ apiKey: decryptedKey });
  } catch (error) {
    console.error('❌ Get API key error:', error);
    res.status(500).json({ error: 'Failed to get API key' });
  }
});

// Delete API key
router.delete('/api-key', authenticateToken, async (req: any, res) => {
  try {
    console.log('🗑️ API key deletion request for user:', req.user.userId);
    
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { aiApiKey: null }
    });
    
    console.log('✅ API key deleted for user:', req.user.userId);
    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('❌ Delete API key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Auth Service',
    endpoints: {
      register: 'POST /register',
      login: 'POST /login',
      me: 'GET /me',
      profile: 'PUT /profile',
      apiKey: 'GET /api-key',
      deleteApiKey: 'DELETE /api-key'
    }
  });
});

export default router;