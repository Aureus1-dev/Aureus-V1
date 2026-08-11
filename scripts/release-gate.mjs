#!/usr/bin/env node

const apiOrigin = requiredOrigin('RELEASE_API_ORIGIN');
const webOrigin = requiredOrigin('RELEASE_WEB_ORIGIN');
const requireVoice = process.env.RELEASE_REQUIRE_VOICE !== 'false';
const timeoutMs = Number(process.env.RELEASE_TIMEOUT_MS ?? 45_000);
const failures = [];
const evidence = [];

async function request(label, url, init = {}, expected = [200, 201]) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    evidence.push({ label, status: response.status, durationMs: Date.now() - started });
    if (!expected.includes(response.status)) {
      throw new Error(`${label} returned ${response.status}: ${text.slice(0, 300)}`);
    }
    return { response, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${label}: ${message}`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function requiredOrigin(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  const parsed = new URL(value);
  return parsed.origin;
}

function json(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} did not return JSON`);
  }
}

async function run() {
  const web = await request('web front door', `${webOrigin}/`);
  if (!/<title>Aureus<\/title>/i.test(web.text))
    failures.push('web front door did not render the Aureus application');
  if (/Cannot GET \/|Application loading/i.test(web.text))
    failures.push('web front door returned an API error or hosting interstitial');

  const live = await request('API liveness', `${apiOrigin}/health/live`);
  if (json(live.text, 'API liveness').status !== 'ok')
    failures.push('API liveness did not report ok');
  const ready = await request('API readiness', `${apiOrigin}/health/ready`);
  if (json(ready.text, 'API readiness').status !== 'ok')
    failures.push('API readiness did not report ok');

  const guest = json(
    (
      await request('guest session', `${apiOrigin}/auth/guest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: webOrigin },
        body: '{}',
      })
    ).text,
    'guest session',
  );
  const token = guest?.tokens?.accessToken;
  if (!token) throw new Error('guest session returned no access token');
  const auth = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    origin: webOrigin,
  };

  const conversation = json(
    (
      await request('create conversation', `${apiOrigin}/ai/conversations`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ title: 'Release canary' }),
      })
    ).text,
    'create conversation',
  );
  if (!conversation.id) throw new Error('conversation creation returned no id');

  try {
    const answer = json(
      (
        await request(
          'live Steward response',
          `${apiOrigin}/ai/conversations/${conversation.id}/messages`,
          {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({
              content: 'In one short sentence, explain how Aureus can help me plan next steps.',
            }),
          },
        )
      ).text,
      'live Steward response',
    );
    if (!answer.content || /\[stub AI response\]|placeholder/i.test(answer.content)) {
      failures.push('live Steward response was empty or a stub/placeholder');
    }
  } catch {
    // request() already recorded the blocking evidence; continue so voice is
    // independently checked in the same release packet.
  }

  if (requireVoice) {
    try {
      const voice = json(
        (
          await request('voice provider brokerage', `${apiOrigin}/ai/voice/sessions`, {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({ conversationId: conversation.id }),
          })
        ).text,
        'voice provider brokerage',
      );
      if (!voice.clientSecret || /^stub[_-]/i.test(voice.clientSecret))
        failures.push('voice brokerage returned no real ephemeral credential');
      if (!voice.provider || !voice.transport)
        failures.push('voice brokerage did not identify its provider and transport');
    } catch {
      // request() already recorded the blocking evidence.
    }
  }

  console.log(
    JSON.stringify(
      {
        result: failures.length ? 'HOLD' : 'AUTOMATED_GATE_PASSED',
        commit: process.env.RELEASE_COMMIT_SHA ?? 'unrecorded',
        webOrigin,
        apiOrigin,
        evidence,
        failures,
        founderWalkthroughRequired: true,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exitCode = 1;
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (!failures.some((failure) => failure.includes(message))) failures.push(message);
  console.error(JSON.stringify({ result: 'HOLD', failures }, null, 2));
  process.exitCode = 1;
});
