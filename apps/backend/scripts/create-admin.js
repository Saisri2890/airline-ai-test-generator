// backend/scripts/create-admin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔧 Creating default users...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('Admin@123456', 10);
      const admin = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          name: 'System Administrator',
          password: hashedPassword,
          role: 'ADMIN',
          department: 'IT Administration',
        }
      });

      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@test.com');
      console.log('🔑 Password: Admin@123456');
      console.log('👤 Role: ADMIN');
    }

    // Check if QA Lead exists
    const existingQALead = await prisma.user.findFirst({
      where: { role: 'QA_LEAD' }
    });

    if (!existingQALead) {
      // Create QA Lead user
      const qaLeadPassword = await bcrypt.hash('QALead@123456', 10);
      const qaLead = await prisma.user.create({
        data: {
          email: 'qalead@test.com',
          name: 'QA Lead User',
          password: qaLeadPassword,
          role: 'QA_LEAD',
          department: 'Quality Assurance',
        }
      });

      console.log('\n✅ QA Lead user created successfully!');
      console.log('📧 Email: qalead@test.com');
      console.log('🔑 Password: QALead@123456');
      console.log('👤 Role: QA_LEAD');
    }

    // Check if QA Analyst exists
    const existingQAAnalyst = await prisma.user.findFirst({
      where: { role: 'QA_ANALYST' }
    });

    if (!existingQAAnalyst) {
      // Create QA Analyst user
      const qaAnalystPassword = await bcrypt.hash('QAAnalyst@123456', 10);
      const qaAnalyst = await prisma.user.create({
        data: {
          email: 'qaanalyst@test.com',
          name: 'QA Analyst User',
          password: qaAnalystPassword,
          role: 'QA_ANALYST',
          department: 'Quality Assurance',
        }
      });

      console.log('\n✅ QA Analyst user created successfully!');
      console.log('📧 Email: qaanalyst@test.com');
      console.log('🔑 Password: QAAnalyst@123456');
      console.log('👤 Role: QA_ANALYST');
    }

    console.log('\n🎉 All default users are ready!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('┌─────────────────────────────────────────────┐');
    console.log('│ ADMIN: admin@test.com / Admin@123456        │');
    console.log('│ QA LEAD: qalead@test.com / QALead@123456     │');
    console.log('│ QA ANALYST: qaanalyst@test.com / QAAnalyst@123456 │');
    console.log('└─────────────────────────────────────────────┘');
    
  } catch (error) {
    console.error('❌ Error creating users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createAdminUser()
  .then(() => {
    console.log('\n✅ Setup complete! You can now start the server.');
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });