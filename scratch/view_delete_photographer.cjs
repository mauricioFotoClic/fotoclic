const fs = require('fs');
const content = fs.readFileSync('d:/Backup PC HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/services/api.ts', 'utf8');
const lines = content.split('\n');

console.log('--- Visualizando deletePhotographer no api.ts ---');
for (let i = 1525; i < 1610; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
