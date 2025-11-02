const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, 'certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
  console.log('✅ Created certs directory');
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✅ SSL certificates already exist!');
  console.log(`   Key: ${keyPath}`);
  console.log(`   Cert: ${certPath}`);
  process.exit(0);
}

console.log('🔐 Generating self-signed SSL certificate...');
console.log('   This may take a few seconds...\n');

try {
  // Generate self-signed certificate using OpenSSL (works on Windows with Git Bash)
  const command = `openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subjectaltname=DNS:localhost,IP:127.0.0.1,IP:192.168.1.11 -keyout "${keyPath}" -out "${certPath}" -days 365 -config "${path.join(__dirname, 'openssl.cnf')}"`;
  
  execSync(command, { stdio: 'inherit' });
  
  console.log('\n✅ SSL certificate generated successfully!');
  console.log(`   Key: ${keyPath}`);
  console.log(`   Cert: ${certPath}`);
  console.log('\n⚠️  Note: This is a self-signed certificate for development only.');
  console.log('   Browsers will show a security warning - you need to accept it.');
} catch (error) {
  console.error('\n❌ Error generating certificate:', error.message);
  console.log('\n📝 Manual alternative:');
  console.log('   If OpenSSL is not available, you can use mkcert:');
  console.log('   1. Install mkcert: https://github.com/FiloSottile/mkcert');
  console.log('   2. Run: mkcert -install');
  console.log('   3. Run: mkcert localhost 192.168.1.11 127.0.0.1');
  console.log('   4. Move the generated files to the certs/ folder');
  process.exit(1);
}
