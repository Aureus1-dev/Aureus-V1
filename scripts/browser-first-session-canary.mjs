#!/usr/bin/env node

import { spawn } from 'node:child_process';

const webOrigin = requiredOrigin('RELEASE_WEB_ORIGIN');
const chromeBin = process.env.RELEASE_CHROME_BIN || 'google-chrome';
const timeoutMs = Number(process.env.RELEASE_BROWSER_TIMEOUT_MS ?? 60_000);
const chromeDebuggerTimeoutMs = Number(process.env.RELEASE_CHROME_DEBUGGER_TIMEOUT_MS ?? 30_000);
const chromeUserDataDir = `/tmp/aureus-release-gate-chrome-${process.pid}`;
const testEmail = process.env.RELEASE_TEST_EMAIL?.trim() || '';
const testPassword = process.env.RELEASE_TEST_PASSWORD || '';
const canonicalTestAccountOrigin = 'https://aureus-v1.onrender.com';
const useAuthenticatedTestAccount =
  webOrigin === canonicalTestAccountOrigin && Boolean(testEmail && testPassword);
const evidence = [];
const browserDiagnostics = [];
const trackedRequests = new Map();
const pendingDiagnosticTasks = new Set();
const failedResponseBodiesPending = new Set();
let chrome;
let cdp;

function requiredOrigin(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return new URL(value).origin;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactDiagnosticText(value) {
  return String(value ?? '')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/\b(?:ek|sk)[_-][A-Za-z0-9._-]+\b/g, '[redacted-token]')
    .slice(0, 2000);
}

function decodeDiagnosticBody(body, base64Encoded) {
  if (!base64Encoded) return String(body ?? '');
  return Buffer.from(String(body ?? ''), 'base64').toString('utf8');
}

function trackDiagnosticTask(task) {
  pendingDiagnosticTasks.add(task);
  task.finally(() => pendingDiagnosticTasks.delete(task));
}

async function flushDiagnostics() {
  // A failed fetch() resolves as soon as response headers arrive, while CDP's
  // Network.loadingFinished event can arrive a beat later. Give that event a
  // short bounded window to register the body-capture task before closing the
  // debugger, otherwise the exact provider error that this gate exists to
  // preserve can be lost in a race.
  const captureTimeoutMs = 3_000;
  const deadline = Date.now() + captureTimeoutMs;
  while (Date.now() < deadline) {
    if (pendingDiagnosticTasks.size > 0) {
      await Promise.allSettled([...pendingDiagnosticTasks]);
    }
    if (pendingDiagnosticTasks.size === 0 && failedResponseBodiesPending.size === 0) {
      return;
    }
    await sleep(25);
  }

  if (pendingDiagnosticTasks.size > 0) {
    await Promise.allSettled([...pendingDiagnosticTasks]);
  }

  // Never emit apparently complete evidence while a failed provider response
  // is still waiting for a body event. If Chrome never delivers a terminal
  // network event, record that gap explicitly rather than silently dropping it.
  for (const requestId of [...failedResponseBodiesPending]) {
    const tracked = trackedRequests.get(requestId);
    browserDiagnostics.push({
      type: 'voice-provider-error-body-timeout',
      method: tracked?.method ?? null,
      status: tracked?.status ?? null,
      url: tracked?.url ?? null,
      timeoutMs: captureTimeoutMs,
    });
    failedResponseBodiesPending.delete(requestId);
  }
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result ?? {});
        return;
      }

      if (!message.method) return;
      for (const listener of this.listeners.get(message.method) ?? []) {
        listener(message.params ?? {});
      }
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chrome DevTools socket timed out')), 10_000);
      socket.addEventListener(
        'open',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      socket.addEventListener(
        'error',
        () => {
          clearTimeout(timer);
          reject(new Error('Chrome DevTools socket failed to open'));
        },
        { once: true },
      );
    });
    return new CdpClient(socket);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

function isVoiceProviderUrl(url) {
  return typeof url === 'string' && url.startsWith('https://api.openai.com/v1/realtime/calls');
}

function installBrowserDiagnostics() {
  cdp.on('Network.requestWillBeSent', ({ requestId, request }) => {
    if (!isVoiceProviderUrl(request?.url)) return;
    trackedRequests.set(requestId, {
      url: request.url,
      method: request.method,
      status: null,
    });
    browserDiagnostics.push({
      type: 'voice-provider-request',
      method: request.method,
      url: request.url,
    });
  });

  cdp.on('Network.responseReceived', ({ requestId, response }) => {
    const tracked = trackedRequests.get(requestId);
    if (!tracked) return;
    tracked.status = response.status;
    if (tracked.method === 'POST' && response.status >= 400) {
      failedResponseBodiesPending.add(requestId);
    }
    browserDiagnostics.push({
      type: 'voice-provider-response',
      method: tracked.method,
      status: response.status,
      statusText: response.statusText,
      protocol: response.protocol,
      url: response.url,
      openaiRequestId:
        response.headers?.['x-request-id'] ?? response.headers?.['X-Request-Id'] ?? null,
    });
  });

  cdp.on('Network.loadingFinished', ({ requestId }) => {
    const tracked = trackedRequests.get(requestId);
    if (!tracked || tracked.method !== 'POST' || (tracked.status ?? 0) < 400) return;

    const task = cdp
      .send('Network.getResponseBody', { requestId })
      .then(({ body, base64Encoded }) => {
        browserDiagnostics.push({
          type: 'voice-provider-error-body',
          method: tracked.method,
          status: tracked.status,
          url: tracked.url,
          base64Encoded: Boolean(base64Encoded),
          body: redactDiagnosticText(decodeDiagnosticBody(body, base64Encoded)),
        });
      })
      .catch((error) => {
        browserDiagnostics.push({
          type: 'voice-provider-error-body-unavailable',
          method: tracked.method,
          status: tracked.status,
          url: tracked.url,
          error: redactDiagnosticText(error instanceof Error ? error.message : String(error)),
        });
      })
      .finally(() => {
        failedResponseBodiesPending.delete(requestId);
      });
    trackDiagnosticTask(task);
  });

  cdp.on('Network.loadingFailed', ({ requestId, errorText, blockedReason, corsErrorStatus }) => {
    const tracked = trackedRequests.get(requestId);
    if (!tracked) return;
    failedResponseBodiesPending.delete(requestId);
    browserDiagnostics.push({
      type: 'voice-provider-loading-failed',
      method: tracked.method,
      url: tracked.url,
      errorText,
      blockedReason: blockedReason ?? null,
      corsErrorStatus: corsErrorStatus ?? null,
    });
  });

  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    browserDiagnostics.push({
      type: 'browser-exception',
      text:
        exceptionDetails?.exception?.description ?? exceptionDetails?.text ?? 'unknown exception',
    });
  });
}

async function waitForChromeDebugger() {
  const deadline = Date.now() + chromeDebuggerTimeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:9222/json/list');
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find(
          (target) => target.type === 'page' && target.webSocketDebuggerUrl,
        );
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  throw new Error('Chrome did not expose a debuggable page');
}

async function evaluate(expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  }
  return result.result?.value;
}

async function bodyText() {
  return String(await evaluate('document.body?.innerText ?? ""'));
}

async function poll(label, predicate, limitMs = timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < limitMs) {
    const value = await predicate();
    if (value) {
      evidence.push({ label, durationMs: Date.now() - started });
      return value;
    }
    await sleep(150);
  }
  const text = (await bodyText()).slice(0, 1200);
  throw new Error(`${label} timed out. Current page text: ${text}`);
}

async function navigate(url) {
  await cdp.send('Page.navigate', { url });
  await poll(
    'page ready',
    async () => (await evaluate('document.readyState')) === 'complete',
    30_000,
  );
}

async function clickButton(label) {
  const clicked = await evaluate(`(() => {
    const wanted = ${JSON.stringify(label)};
    const button = [...document.querySelectorAll('button')]
      .find((candidate) =>
        !candidate.disabled &&
        (candidate.textContent?.trim() === wanted || candidate.getAttribute('aria-label') === wanted)
      );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Button not found: ${label}`);
}

async function buttonExists(label) {
  return Boolean(
    await evaluate(`(() => {
      const wanted = ${JSON.stringify(label)};
      return [...document.querySelectorAll('button')].some((candidate) =>
        !candidate.disabled &&
        (candidate.textContent?.trim() === wanted || candidate.getAttribute('aria-label') === wanted)
      );
    })()`),
  );
}

async function setInput(selector, value) {
  const changed = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) return false;
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter?.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  if (!changed) throw new Error(`Input not found: ${selector}`);
}

async function establishEntrySession() {
  if (useAuthenticatedTestAccount) {
    await navigate(`${webOrigin}/login`);
    await poll('login form visible', async () => (await bodyText()).includes('Sign in'));
    await setInput('input[type="email"]', testEmail);
    await setInput('input[type="password"]', testPassword);
    await clickButton('Sign in');
    evidence.push({ label: 'authenticated test account submitted' });
  } else {
    await navigate(webOrigin);
    evidence.push({
      label:
        testEmail && testPassword
          ? 'guest entry requested; test credentials withheld from non-canonical origin'
          : 'guest entry requested',
    });
  }

  await poll('Living Hall conversation ready', async () => {
    const text = await bodyText();
    return text.includes('How can we help?') && (await buttonExists('Talk to your steward'));
  });
}

async function runVoiceJourney() {
  await clickButton('Talk to your steward');
  await poll('voice start control visible', async () =>
    (await bodyText()).includes('Start voice conversation'),
  );
  await clickButton('Start voice conversation');

  await poll(
    'voice reaches real ready state',
    async () => {
      const text = await bodyText();
      const failure = [
        'The voice connection was interrupted',
        'Voice is temporarily unavailable',
        'Connection interrupted',
        'Voice could not start',
        'Microphone access is needed',
      ].find((candidate) => text.includes(candidate));
      if (failure) throw new Error(`Voice failed before Listening: ${failure}`);
      return text.includes('Listening…');
    },
    45_000,
  );

  await clickButton('End conversation');
  await poll('voice end is acknowledged', async () =>
    (await bodyText()).includes('Conversation ended'),
  );
  await clickButton('Done');
  await poll('same session returns to text', async () => {
    const text = await bodyText();
    const composerPresent = Boolean(
      await evaluate('Boolean(document.querySelector("#conversation-composer"))'),
    );
    return text.includes('How can we help?') && composerPresent;
  });
}

async function main() {
  chrome = spawn(
    chromeBin,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=9222',
      `--user-data-dir=${chromeUserDataDir}`,
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  let chromeError = '';
  chrome.stderr.on('data', (chunk) => {
    chromeError += String(chunk).slice(-4000);
  });

  try {
    const socketUrl = await waitForChromeDebugger();
    cdp = await CdpClient.connect(socketUrl);
    installBrowserDiagnostics();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    await establishEntrySession();
    await runVoiceJourney();
    await flushDiagnostics();

    console.log(
      JSON.stringify(
        {
          result: 'BROWSER_FIRST_SESSION_PASSED',
          webOrigin,
          accountMode: useAuthenticatedTestAccount ? 'authenticated-test-account' : 'guest',
          evidence,
          browserDiagnostics,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await flushDiagnostics();
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify(
        {
          result: 'HOLD',
          webOrigin,
          accountMode: useAuthenticatedTestAccount ? 'authenticated-test-account' : 'guest',
          evidence,
          browserDiagnostics,
          failure: message,
          chromeError: chromeError.slice(-1500),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    cdp?.close();
    chrome?.kill('SIGTERM');
  }
}

main();
