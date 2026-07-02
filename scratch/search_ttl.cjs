const fs = require('fs');
const content = fs.readFileSync('d:/Backup PC HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/services/api.ts', 'utf8');
const lines = content.split('\n');

console.log('--- Buscando CACHE_TTL no api.ts ---');
lines.forEach((line, index) => {
    if (line.includes('CACHE_TTL')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
