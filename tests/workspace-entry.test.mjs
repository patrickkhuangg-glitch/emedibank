import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModule } from './helpers/load-module.mjs';

function actions() {
  const writes = [], redirects = [];
  const actionsModule = loadModule('src/lib/exam/actions.ts', {
    'next/headers': {cookies:async () => ({set:(...args) => writes.push(args)})},
    'next/navigation': {redirect:(path) => { redirects.push(path); throw new Error('NEXT_REDIRECT'); }},
    './current': {EXAM_COOKIE:'eb_exam'},
  });
  return {actionsModule,writes,redirects};
}

test('each exam selection writes its scope before redirecting to the correct dashboard', async () => {
  for(const slug of ['ucat','gamsat','isat','interviews']) {
    const {actionsModule,writes,redirects} = actions();
    const form = new FormData(); form.set('exam', slug);
    await assert.rejects(actionsModule.selectExamFormAction(form), /NEXT_REDIRECT/);
    assert.equal(writes.length, 1); assert.equal(writes[0][0], 'eb_exam'); assert.equal(writes[0][1], slug);
    assert.equal(writes[0][2].path, '/'); assert.equal(writes[0][2].sameSite, 'lax');
    assert.deepEqual(redirects, [slug === 'interviews' ? '/interviews' : '/dashboard']);
  }
});

test('missing, blank and file-valued exam submissions do not change the selected exam', async () => {
  for(const value of [null, '', '   ', new Blob(['ucat'])]) {
    const {actionsModule,writes,redirects} = actions();
    const form = new FormData(); if(value !== null) form.set('exam', value);
    await assert.rejects(actionsModule.selectExamFormAction(form), /Choose an exam/);
    assert.equal(writes.length, 0); assert.equal(redirects.length, 0);
  }
});
