import { Router } from 'express';
import { authService } from '../services/auth-service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// User Registration
router.post('/register', async (req, res) => {
  try {
    const { email, name, password, role, department } = req.body;

    // Validation
    if (!email || !name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, name, and password are required'
      });
    }

    const result = await authService.register({
      email,
      name,
      password,
      role,
      department
    });

    res.json({
      success: true,
      data: result,
      message: 'Registration successful'
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const result = await authService.login(email, password);

    res.json({
      success: true,
      data: result,
      message: 'Login successful'
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
});

// Get Current User
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    const user = await authService.getCurrentUser(userId);

    res.json({
      success: true,
      data: { user },
      message: 'User retrieved successfully'
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update Profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { name, department } = req.body;

    const user = await authService.updateProfile(userId, {
      name,
      department
    });

    res.json({
      success: true,
      data: { user },
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Logout (client-side handles token removal)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

export default router;