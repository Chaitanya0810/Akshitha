const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const root = path.resolve(__dirname, '..');
const apiWorkspace = '@school-management-system/api';
const webWorkspace = '@school-management-system/web';
const schemaPath = 'packages/api/prisma/schema.render.prisma';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...(options.env || {}) },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

async function initializeDatabase() {
  run('npx', ['prisma', 'db', 'push', '--schema', schemaPath]);
  const prisma = new PrismaClient();
  try {
    const school = await prisma.school.upsert({
      where: { code: 'MIS-IDR' },
      update: { name: 'School Management System' },
      create: {
        name: 'School Management System',
        code: 'MIS-IDR',
        address: 'Indore, Madhya Pradesh',
        phone: '0731-1234567',
        email: 'info@medicaps.edu.in',
      },
    });
    let session = await prisma.academicSession.findFirst({
      where: { schoolId: school.id, status: 'ACTIVE' },
    });
    if (!session) {
      session = await prisma.academicSession.create({
        data: {
          name: '2026-27',
          startDate: new Date('2026-04-01'),
          endDate: new Date('2027-03-31'),
          status: 'ACTIVE',
          schoolId: school.id,
        },
      });
    }

    let class10 = await prisma.class.findFirst({
      where: { schoolId: school.id, grade: 10 },
    });
    if (!class10) {
      class10 = await prisma.class.create({
        data: { name: 'Class 10', grade: 10, schoolId: school.id },
      });
    }
    for (const sectionName of ['A', 'B']) {
      const section = await prisma.section.findFirst({
        where: { classId: class10.id, name: sectionName },
      });
      if (!section) {
        await prisma.section.create({
          data: { name: sectionName, classId: class10.id, capacity: 40 },
        });
      }
    }

    const subjects = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Studies'];
    for (const [index, name] of subjects.entries()) {
      const existing = await prisma.subject.findFirst({
        where: { classId: class10.id, name },
      });
      if (!existing) {
        await prisma.subject.create({
          data: {
            name,
            code: `C10-${name.substring(0, 3).toUpperCase()}${index}`,
            classId: class10.id,
          },
        });
      }
    }

    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
      where: { email: 'admin@medicaps.edu.in' },
      update: { role: 'SUPER_ADMIN', schoolId: school.id, isActive: true },
      create: {
        email: 'admin@medicaps.edu.in',
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        schoolId: school.id,
      },
    });
    const teacherHash = await bcrypt.hash('teacher123', 10);
    await prisma.user.upsert({
      where: { email: 'teacher@medicaps.edu.in' },
      update: { role: 'CLASS_TEACHER', schoolId: school.id, isActive: true },
      create: {
        email: 'teacher@medicaps.edu.in',
        passwordHash: teacherHash,
        firstName: 'Sample',
        lastName: 'Teacher',
        role: 'CLASS_TEACHER',
        schoolId: school.id,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
  run('npm', ['run', 'prisma:seed-demo', `--workspace=${apiWorkspace}`]);
}

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd || root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...(options.env || {}) },
  });
  child.on('exit', (code) => {
    stop(code || 0);
  });
  children.push(child);
  return child;
}

const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exit(code);
}

process.on('SIGTERM', () => stop(0));
process.on('SIGINT', () => stop(0));

initializeDatabase().then(() => {
  start('npm', ['run', 'start', `--workspace=${apiWorkspace}`], { env: { PORT: '4000' } });
  start('npm', ['run', 'start', `--workspace=${webWorkspace}`, '--', '--hostname', '0.0.0.0']);
}).catch((error) => {
  console.error('Database initialization failed:', error.message);
  process.exit(1);
});
