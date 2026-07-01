const fs = require('fs');

const appFile = 'd:/Backup PC HP/Projetos/Mauricio/FotoClic-NEW/fotoclic/App.tsx';
const content = fs.readFileSync(appFile, 'utf8');
const lines = content.split('\n');

console.log('--- Buscando todos os useEffects no App.tsx ---');
let insideEffect = false;
let effectLines = [];
let braceCount = 0;

lines.forEach((line, index) => {
    if (line.includes('useEffect(')) {
        insideEffect = true;
        effectLines = [`Line ${index + 1}: ${line.trim()}`];
        braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
    } else if (insideEffect) {
        effectLines.push(line.trim());
        braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
        if (line.includes('}, [') || line.includes('}, []);') || braceCount <= 0) {
            console.log(effectLines.join('\n'));
            console.log('--------------------------------------');
            insideEffect = false;
        }
    }
});
