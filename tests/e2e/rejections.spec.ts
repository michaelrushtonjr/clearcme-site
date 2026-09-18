import {test,expect} from '@playwright/test';
import {createFreshUser,signIn,localPrisma} from './helpers/fresh-account';
import {Evidence} from './helpers/evidence';
test('file rejection feedback',async({page},info)=>{
 test.skip(info.project.name==='app-shell');const e=new Evidence(page,info.project.name);await e.protect();await createFreshUser();await signIn(page);
 for(const kind of ['oversized','wrong-mime']) {
  await e.visit('/dashboard/upload',`rejection-${kind}-before`);
  const input=info.project.name==='phone'?page.locator('input[type=file][accept="application/pdf,image/jpeg,image/png"]'):page.locator('input[type=file]').last();
  await input.setInputFiles(kind==='oversized'?{name:'oversized.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(11*1024*1024)}:{name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('wrong type')});
  await page.waitForTimeout(info.project.name==='phone'?4500:500);await e.capture(`rejection-${kind}-result`);
  if(info.project.name==='desktop') {
   await expect(page.getByText('Compliance Updated',{exact:true})).toHaveCount(0);
   await expect(page.getByText(kind==='oversized'?'File too large. Choose a file under 10 MB.':'Unsupported file type. Choose a PDF, JPG, or PNG.',{exact:true})).toBeVisible();
   await page.getByRole('button',{name:'Choose another file',exact:true}).click();
   await expect(page.getByText('Drag & drop certificates',{exact:true})).toBeVisible();await e.capture(`rejection-${kind}-retry-ready`);
  }
 }
 await (await localPrisma()).$disconnect();
});
