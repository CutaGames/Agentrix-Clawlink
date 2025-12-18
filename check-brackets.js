const fs = require('fs');
const code = fs.readFileSync('./frontend/components/payment/SmartCheckout.tsx', 'utf8');
const lines = code.split('\n');
let parenDepth = 0;
let lastDecrease = 0;
for(let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const prevDepth = parenDepth;
    for(let i = 0; i < line.length; i++) {
        if(line[i] === '(') parenDepth++;
        if(line[i] === ')') parenDepth--;
    }
    if(parenDepth < prevDepth && prevDepth >= 2) {
        console.log('Line', lineNum + 1, 'depth decreased from', prevDepth, 'to', parenDepth, ':', line.substring(0, 60));
    }
    if(parenDepth < 0) {
        console.log('NEGATIVE at line', lineNum + 1);
        break;
    }
}
console.log('Final paren depth:', parenDepth);
