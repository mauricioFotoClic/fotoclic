const fs = require('fs');
const path = require('path');

const srcDir = 'd:/Backup PC HP/Projetos/Mauricio/FotoClic-NEW/fotoclic';

function searchInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                searchInDir(fullPath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('window.location')) {
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (line.includes('window.location')) {
                        console.log(`${fullPath}:${index + 1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

console.log('--- Buscando uso de window.location no projeto ---');
searchInDir(path.join(srcDir, 'components'));
searchInDir(path.join(srcDir, 'pages'));
searchInDir(path.join(srcDir, 'services'));
searchInDir(path.join(srcDir, 'utils'));
searchInDir(srcDir);
