const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const schemaPath = path.join(root, 'packages/api/prisma/schema.prisma');
const renderSchemaPath = path.join(root, 'packages/api/prisma/schema.render.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');
const pgSchema = schema.replace(/provider\s*=\s*"mysql"/, 'provider = "postgresql"');
if (schema === pgSchema) throw new Error('The default Prisma MySQL provider was not found.');
fs.writeFileSync(renderSchemaPath, pgSchema);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

const env = { ...process.env };
env.DATABASE_URL ||= 'postgresql://demo:demo@127.0.0.1:5432/demo?schema=public';
const generated = spawnSync('npx', ['prisma', 'generate', '--schema', renderSchemaPath], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env,
});
if (generated.error) throw generated.error;
if (generated.status !== 0) process.exit(generated.status || 1);
run('npm', ['run', 'build']);
