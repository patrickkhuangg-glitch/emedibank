import test from 'node:test';
import assert from 'node:assert/strict';
import { NextResponse } from 'next/server.js';
const emailLinks = loadModule('src/lib/auth/email-links.ts');
import { loadModule } from './helpers/load-module.mjs';
function fixture(error = null, throws = false) {
    let calls = 0;
    const verify = async () => {
        calls++;
        if (throws)
            throw new Error('Connection unavailable');
        return { error, data: { user: error ? null : { id: 'recipient' } } };
    };
    const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: { role: 'student' } }) };
    const route = loadModule('src/app/auth/confirm/route.ts', {
        'next/server': { NextResponse },
        '@/lib/auth/email-links': emailLinks,
        '@/lib/supabase/server': { createClient: async () => ({ auth: { verifyOtp: verify, exchangeCodeForSession: verify }, from: () => chain }) },
    }, { TextDecoder });
    return { route, calls: () => calls };
}
const body = new URLSearchParams({ type: 'recovery', token_hash: 'a'.repeat(64) });
const request = (origin = 'https://studocyte.test', site = 'same-origin') => new Request('https://studocyte.test/auth/confirm', {
    method: 'POST', headers: { Origin: origin, 'Sec-Fetch-Site': site, 'Content-Type': 'application/x-www-form-urlencoded' }, body,
});
test('native form landing permits browser Origin while protecting the email token from Referer', () => {
    const { route, calls } = fixture();
    const page = route.GET(new Request('https://studocyte.test/auth/confirm?' + body));
    assert.equal(page.headers.get('referrer-policy'), 'strict-origin');
    assert.equal(calls(), 0);
});
test('foreign and opaque origins are rejected without consuming or falsely expiring the link', async () => {
    const { route, calls } = fixture();
    for (const [origin, site] of [['null', 'same-origin'], ['https://foreign.test', 'cross-site'], ['https://studocyte.test', 'cross-site']]) {
        const response = await route.POST(request(origin, site));
        assert.equal(response.status, 403);
        assert.doesNotMatch(await response.text(), /expired/);
    }
    assert.equal(calls(), 0);
    const accepted = await route.POST(request());
    assert.equal(accepted.status, 303);
    assert.equal(accepted.headers.get('location'), 'https://studocyte.test/update-password');
    assert.equal(calls(), 1);
});
test('only confirmed expired credentials show expiry; network and validation failures stay distinct', async () => {
    const expired = await fixture({ code: 'otp_expired', status: 403 }).route.POST(request());
    assert.equal(expired.status, 400);
    assert.match(await expired.text(), /expired or has already been used/);
    for (const candidate of [fixture({ code: 'unexpected_failure', status: 500 }), fixture(null, true)]) {
        const response = await candidate.route.POST(request());
        assert.equal(response.status, 503);
        const html = await response.text();
        assert.doesNotMatch(html, /expired/);
        assert.match(html, /try again shortly/);
    }
    const invalid = await fixture({ code: 'validation_failed', status: 400 }).route.POST(request());
    assert.equal(invalid.status, 400);
    assert.doesNotMatch(await invalid.text(), /expired/);
});
