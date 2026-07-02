const fs = require('fs');
const content = fs.readFileSync('d:/Backup PC HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/services/api.ts', 'utf8');
const lines = content.split('\n');

console.log('--- Buscando carts no api.ts ---');
lines.forEach((line, index) => {
    if (line.includes('from("carts")') || line.includes("from('carts')")) {
        console.log(`${index + 1}: ${line.trim()}`);
        for (let i = index - 2; i < index + 10 && i < lines.length; i++) {
            console.log(`  ${i + 1}: ${lines[i]}`);
        }
    }
});
