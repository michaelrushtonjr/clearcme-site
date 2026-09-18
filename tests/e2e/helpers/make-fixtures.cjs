/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs');
const sharp=require('sharp');
(async()=>{
 const dir='tests/fixtures/certs';
 const text='Fictional Run D CME - Jordan Lee - 2 hours - 2026-09-01';
 const stream=`BT /F1 18 Tf 50 740 Td (${text}) Tj ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n${xref}\n%%EOF\n`;
 fs.writeFileSync(`${dir}/run-d-fictional.pdf`,pdf);
 await sharp(Buffer.from(`<svg width="900" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="600" fill="white"/><text x="40" y="100" font-size="28">FICTIONAL TEST CERTIFICATE</text><text x="40" y="170" font-size="19">${text}</text><text x="40" y="240" font-size="20">Test fixture only — not evidence of actual CME</text></svg>`)).jpeg({quality:70}).toFile(`${dir}/run-d-fictional.jpg`);
})();
