const fs = require('fs');
const path = require('path');

const srcDir = 'd:/Backup PC HP/Projetos/Mauricio/FotoClic-NEW/fotoclic';

function searchInDir(dir, query) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                searchInDir(fullPath, query);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.toLowerCase().includes(query.toLowerCase())) {
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes(query.toLowerCase())) {
                        console.log(`${fullPath}:${index + 1}: ${line.trim()}`);
                    }
                });
            }
        }
    }
}

console.log('--- Buscando por navigations ou redirecionamentos para "photographer" ---');
searchInDir(path.join(srcDir, 'components'), 'photographer');
searchInDir(path.join(srcDir, 'pages'), 'photographer');
