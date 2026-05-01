const fs = require('fs');
const path = require('path');

const files = [
    {
        path: 'd:\\Backup PC HP\\Projetos\\Mauricio\\FotoClic-NEW\\fotoclic\\api\\abacate-checkout.js',
        replacements: [
            {
                from: /unitPrice: Math.round\(item\.price \* 100\)/g,
                to: "unitPrice: Math.round(item.price)"
            },
            {
                from: /totalCents = items.reduce\(\(acc, item\) => acc \+ Math\.round\(item\.price \* 100\), 0\)/g,
                to: "totalCents = items.reduce((acc, item) => acc + Math.round(item.price), 0)"
            },
            {
                from: /details: result.errors \|\| null/g,
                to: "details: result.errors || result.message || null"
            }
        ]
    },
    {
        path: 'd:\\Backup PC HP\\Projetos\\Mauricio\\FotoClic-NEW\\fotoclic\\fotoclic\\api\\abacate-checkout.js',
        replacements: [
            {
                from: /unitPrice: Math.round\(item\.price \* 100\)/g,
                to: "unitPrice: Math.round(item.price)"
            },
            {
                from: /totalCents = items.reduce\(\(acc, item\) => acc \+ Math\.round\(item\.price \* 100\), 0\)/g,
                to: "totalCents = items.reduce((acc, item) => acc + Math.round(item.price), 0)"
            },
            {
                from: /details: result.errors \|\| null/g,
                to: "details: result.errors || result.message || null"
            }
        ]
    },
    {
        path: 'd:\\Backup PC HP\\Projetos\\Mauricio\\FotoClic-NEW\\fotoclic\\services\\api.ts',
        replacements: [
            {
                from: /if \(\!response\.ok\) throw new Error\(data\.error \|\| 'Failed to create Abacate Pay checkout'\);/g,
                to: "if (!response.ok) { const detailStr = data.details ? JSON.stringify(data.details) : ''; throw new Error((data.error + ' ' + detailStr).trim() || 'Failed to create Abacate Pay checkout'); }"
            }
        ]
    },
    {
        path: 'd:\\Backup PC HP\\Projetos\\Mauricio\\FotoClic-NEW\\fotoclic\\fotoclic\\services\\api.ts',
        replacements: [
            {
                from: /if \(\!response\.ok\) throw new Error\(data\.error \|\| 'Failed to create Abacate Pay checkout'\);/g,
                to: "if (!response.ok) { const detailStr = data.details ? JSON.stringify(data.details) : ''; throw new Error((data.error + ' ' + detailStr).trim() || 'Failed to create Abacate Pay checkout'); }"
            }
        ]
    }
];

files.forEach(file => {
    try {
        let content = fs.readFileSync(file.path, 'utf8');
        let originalContent = content;
        file.replacements.forEach(rep => {
            content = content.replace(rep.from, rep.to);
        });
        if (content !== originalContent) {
            fs.writeFileSync(file.path, content);
            console.log('Updated', file.path);
        } else {
            console.log('No changes needed or regex failed for', file.path);
        }
    } catch (e) {
        console.error('Failed to update', file.path, e.message);
    }
});
