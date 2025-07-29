const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('Admin@123456', 12);
    
    // Use upsert to update existing user or create new one
    const admin = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {
        // Update existing user to be admin
        name: 'System Admin',
        password: hashedPassword,
        role: 'ADMIN',
        department: 'IT',
        isActive: true
      },
      create: {
        // Create new user if doesn't exist
        email: 'admin@test.com',
        name: 'System Admin',
        password: hashedPassword,
        role: 'ADMIN',
        department: 'IT'
      }
    });
    
    console.log('✅ Admin user ready:', admin.email);
    console.log('📧 Email: admin@test.com');
    console.log('🔑 Password: Admin@123456');
    console.log('👤 Role:', admin.role);
    console.log('🏢 Department:', admin.department);
    
    // Also check what other users exist
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });
    
    console.log('\n📋 All users in database:');
    allUsers.forEach(user => {
      console.log(`   ${user.email} - ${user.role} - ${user.name} (Active: ${user.isActive})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();