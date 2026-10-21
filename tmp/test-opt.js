const { extractOptionsFromBlock } = require('./src/utils/documentParser');
const q1 = `Given the vector $\\begin{pmatrix} 3 \\\\ -2 \\end{pmatrix}$ and $\\begin{pmatrix} 1 \\\\ 4 \\end{pmatrix}$, find their sum.
A. $\\begin{pmatrix} 4 \\\\ 2 \\end{pmatrix}$
B. $\\begin{pmatrix} 2 \\\\ -6 \\end{pmatrix}$
C. $\\begin{pmatrix} 4 \\\\ 6 \\end{pmatrix}$
D. $\\begin{pmatrix} 3 \\\\ -8 \\end{pmatrix}`;

console.log('Result:', JSON.stringify(extractOptionsFromBlock(q1), null, 2));
