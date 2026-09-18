import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/lib/client-sign-out',()=>({signOutAndClear:vi.fn()}));
import SettingsClient from '@/app/dashboard/settings/SettingsClient';
test('reminder switches expose their visible names and independent checked states',()=>{
 const html=renderToStaticMarkup(createElement(SettingsClient,{user:{id:'fixture',name:null,email:'fixture@local.test',image:null,specialty:null,practiceArea:null},licenses:[],subscription:null,licenseRequirements:[],requirementCompletions:[],emailPreference:{renewalReminders:true,monthlyDigest:false}}));
 expect(html).toMatch(/role="switch" aria-label="Renewal reminders" aria-checked="true"/);
 expect(html).toMatch(/role="switch" aria-label="Monthly digest" aria-checked="false"/);
});
