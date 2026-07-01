const fs = require('fs');

const modalFile = 'd:/Backup PC HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/components/RegisterModal.tsx';
const content = fs.readFileSync(modalFile, 'utf8');
const lines = content.split('\n');

console.log('--- Buscando todas as ocorrências de onLoginSuccess no RegisterModal.tsx ---');
lines.forEach((line, index) => {
    if (line.includes('onLoginSuccess')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
