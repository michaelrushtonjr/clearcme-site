import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import ManualCertificateEntry from '@/components/ManualCertificateEntry';
test('every manual-entry label targets a unique field, including when two forms render',()=>{
 const html=renderToStaticMarkup(createElement(Fragment,null,createElement(ManualCertificateEntry),createElement(ManualCertificateEntry)));
 const targets=[...html.matchAll(/<label[^>]*for="([^"]+)"/g)].map(m=>m[1]);
 expect(targets).toHaveLength(10);expect(new Set(targets).size).toBe(10);
 for(const id of targets)expect(html).toMatch(new RegExp(`<(?:input|select)[^>]*id="${id}"`));
});
