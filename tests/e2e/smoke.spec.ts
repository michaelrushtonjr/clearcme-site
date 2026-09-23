import { test, expect } from '@playwright/test';
import { createFreshUser, signIn, localPrisma } from './helpers/fresh-account';
import { Evidence } from './helpers/evidence';
test('fresh account pipe smoke', async ({page}, info)=>{
  test.skip(info.project.name==='app-shell','Initial pipe smoke uses desktop and phone');
  const e=new Evidence(page,info.project.name); await e.protect();
  try {
    const user=await createFreshUser();
    expect(user.name).toBeNull(); expect(user.licenseType).toBeNull(); expect(user.specialty).toBeNull();
    await signIn(page);
    await e.visit('/dashboard','smoke-fresh-dashboard');
    expect(page.url()).toMatch(/\/dashboard(?:\/setup)?$/);
    await expect(page.getByRole('heading').first()).toBeVisible();
  } catch(error) { e.log('smoke-failure',{error:String(error)}); throw error; }
  finally { await (await localPrisma()).$disconnect(); }
});
