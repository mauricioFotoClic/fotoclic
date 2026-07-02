const fs = require('fs');
const content = fs.readFileSync('d:/Backup PC HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/services/api.ts', 'utf8');
const lines = content.split('\n');

console.log('--- Visualizando deleteCustomer no api.ts ---');
for (let i = 1608; i < 1640; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
}
