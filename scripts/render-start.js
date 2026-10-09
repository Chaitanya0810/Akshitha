const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
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
  let baseSeeded = false;
  try {
    baseSeeded = Boolean(await prisma.school.findUnique({ where: { code: 'MIS-IDR' } }));
  } finally {
    await prisma.$disconnect();
  }
  if (!baseSeeded) run('npm', ['run', 'prisma:seed', `--workspace=${apiWorkspace}`]);
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
