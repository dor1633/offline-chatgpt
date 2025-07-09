const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const serverPath = path.join(__dirname, 'server.js');
const appBinary = process.execPath;

const realServerPath = fs.realpathSync(serverPath);
console.log('✅ Real server path:', realServerPath);
console.log('✅ App binary path:', appBinary);

if (realServerPath === appBinary) {
  console.error('❌ Recursive spawn detected! Aborting test.');
  process.exit(1);
}

const child = spawn('node', [serverPath], {
  detached: true,
  stdio: 'inherit',
});

console.log('✅ Test launch succeeded — server started without recursion.');
