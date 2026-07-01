const fs = require('fs');

const appFile = 'd:/Backup PC HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/App.tsx';
const content = fs.readFileSync(appFile, 'utf8');
const lines = content.split('\n');

console.log('--- Buscando todas as ocorrências de handleNavigate ou onNavigate no App.tsx ---');
lines.forEach((line, index) => {
    if (line.includes('handleNavigate') || line.includes('onNavigate') || line.includes('setCurrentPage')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
