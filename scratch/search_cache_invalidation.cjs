const fs = require('fs');
const content = fs.readFileSync('d:/Backup PC HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/services/api.ts', 'utf8');
const lines = content.split('\n');

console.log('--- Buscando invalidação de allPhotographers no api.ts ---');
lines.forEach((line, index) => {
    if (line.includes('allPhotographers') && (line.includes('null') || line.includes('ts =') || line.includes('delete') || line.includes('='))) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
