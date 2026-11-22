const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const wwwDir = path.join(rootDir, 'www');

fs.rmSync(wwwDir, { recursive: true, force: true });
fs.mkdirSync(wwwDir, { recursive: true });

const ignored = new Set([
  'node_modules', '.git', '.github', 'android', 'dist', 'www',
  'main.js', 'prepare-web.js', 'package.json', 'package-lock.json',
  'capacitor.config.json', '.gitignore', 'README.md', 'LICENSE'
]);

const rootItems = fs.readdirSync(rootDir).filter(item => !ignored.has(item));

// 1. Buscar index.html en la raíz (sin importar mayúsculas/minúsculas)
const rootIndex = rootItems.find(f => f.toLowerCase() === 'index.html');
if (rootIndex) {
  for (const item of rootItems) {
    fs.cpSync(path.join(rootDir, item), path.join(wwwDir, item), { recursive: true });
  }
  if (rootIndex !== 'index.html') {
    fs.renameSync(path.join(wwwDir, rootIndex), path.join(wwwDir, 'index.html'));
  }
  console.log(`OK: ${rootIndex} preparado en www/index.html`);
  process.exit(0);
}

// 2. Buscar si la web está dentro de una subcarpeta común
const candidateDirs = ['docs', 'public', 'src', 'app', 'web', 'site', 'build'];
for (const dirName of candidateDirs) {
  const fullSubDir = path.join(rootDir, dirName);
  if (fs.existsSync(fullSubDir) && fs.statSync(fullSubDir).isDirectory()) {
    const subItems = fs.readdirSync(fullSubDir);
    const subIndex = subItems.find(f => f.toLowerCase() === 'index.html');
    if (subIndex) {
      for (const item of subItems) {
        fs.cpSync(path.join(fullSubDir, item), path.join(wwwDir, item), { recursive: true });
      }
      if (subIndex !== 'index.html') {
        fs.renameSync(path.join(wwwDir, subIndex), path.join(wwwDir, 'index.html'));
      }
      console.log(`OK: archivos copiados desde ${dirName}/ a www/index.html`);
      process.exit(0);
    }
  }
}

// 3. Si hay un archivo .html con otro nombre en la raíz (ej. qplan.html)
const htmlFiles = rootItems.filter(f => f.toLowerCase().endsWith('.html'));
if (htmlFiles.length > 0) {
  for (const item of rootItems) {
    fs.cpSync(path.join(rootDir, item), path.join(wwwDir, item), { recursive: true });
  }
  fs.copyFileSync(path.join(wwwDir, htmlFiles[0]), path.join(wwwDir, 'index.html'));
  console.log(`OK: ${htmlFiles[0]} copiado como www/index.html`);
  process.exit(0);
}

console.error('ERROR: No se encontró ningún archivo .html en el repositorio.');
console.error('Archivos encontrados en la raíz:', rootItems);
process.exit(1);