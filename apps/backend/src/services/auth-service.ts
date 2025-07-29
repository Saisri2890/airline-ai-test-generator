// backend/src/services/auth-service.ts
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    department?: string;
    // ADDED: AI configuration fields
    aiModel?: string;
    aiApiKey?: boolean;
    isActive: boolean;
    lastLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
  token: string;
}

export class AuthService {
    
  async login(email: string, password: string): Promise<AuthResult> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department || undefined,
        // ADDED: Return AI configuration fields
        aiModel: user.aiModel || undefined,
        aiApiKey: user.aiApiKey || false,
        isActive: user.isActive,
        lastLogin: user.lastLogin || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  async register(userData: {
    email: string;
    name: string;
    password: string;
    role?: string;
    department?: string;
  }): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password
    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: (userData.role as any) || 'QA_ANALYST',
        department: userData.department,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department || undefined,
        // ADDED: Return AI configuration fields
        aiModel: user.aiModel || undefined,
        aiApiKey: user.aiApiKey || false,
        isActive: user.isActive,
        lastLogin: user.lastLogin || undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        // ADDED: Include AI configuration fields
        aiModel: true,
        aiApiKey: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // FIXED: Updated to handle AI configuration fields
  async updateProfile(userId: string, data: { 
    name?: string; 
    department?: string;
    aiModel?: string;
    aiApiKey?: string; // The actual API key value
  }) {
    console.log('🔄 Updating profile for user:', userId);
    console.log('🔄 Update data:', data);

    // Prepare update data
    const updateData: any = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    
    if (data.department !== undefined) {
      updateData.department = data.department;
    }
    
    if (data.aiModel !== undefined) {
      updateData.aiModel = data.aiModel;
    }
    
    // Handle API key - if provided, set aiApiKey to true
    if (data.aiApiKey !== undefined) {
      if (data.aiApiKey && data.aiApiKey.trim() !== '') {
        updateData.aiApiKey = true;
        // TODO: In production, you should encrypt and store the actual API key
        // For now, we just store the boolean flag
        console.log('✅ API key provided - setting aiApiKey to true');
      } else {
        updateData.aiApiKey = false;
        console.log('✅ API key cleared - setting aiApiKey to false');
      }
    }

    console.log('🔄 Final update data:', updateData);

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        // ADDED: Return AI configuration fields
        aiModel: true,
        aiApiKey: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    console.log('✅ Profile updated successfully:', user);
    return user;
  }
}

export const authService = new AuthService();