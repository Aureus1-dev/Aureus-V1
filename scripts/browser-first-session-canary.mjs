#!/usr/bin/env node

import { spawn } from 'node:child_process';

const webOrigin = requiredOrigin('RELEASE_WEB_ORIGIN');
const chromeBin = process.env.RELEASE_CHROME_BIN || 'google-chrome';
const timeoutMs = Number(process.env.RELEASE_BROWSER_TIMEOUT_MS ?? 60_000);
const testEmail = process.env.RELEASE_TEST_EMAIL?.trim() || '';
const testPassword = process.env.RELEASE_TEST_PASSWORD || '';
const evidence = [];
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

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result ?? {});
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chrome DevTools socket timed out')), 10_000);
      socket.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      socket.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error('Chrome DevTools socket failed to open'));
      }, { once: true });
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

  close() {
    this.socket.close();
  }
}

async function waitForChromeDebugger() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:9222/json/list');
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
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
  await poll('page ready', async () => (await evaluate('document.readyState')) === 'complete', 30_000);
}

async function clickButton(label) {
  const clicked = await evaluate(`(() => {
    const wanted = ${JSON.stringify(label)};
    const button = [...document.querySelectorAll('button')]
      .find((candidate) => candidate.textContent?.trim() === wanted);
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Button not found: ${label}`);
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
  if (testEmail && testPassword) {
    await navigate(`${webOrigin}/login`);
    await poll('login form visible', async () => (await bodyText()).includes('Sign in'));
    await setInput('input[type="email"]', testEmail);
    await setInput('input[type="password"]', testPassword);
    await clickButton('Sign in');
    evidence.push({ label: 'authenticated test account submitted' });
  } else {
    await navigate(webOrigin);
    evidence.push({ label: 'guest entry requested' });
  }

  await poll('Living Hall conversation ready', async () => {
    const text = await bodyText();
    return text.includes('How can we help?') && text.includes('Talk');
  });
}

async function runVoiceJourney() {
  await clickButton('Talk');
  await poll('voice start control visible', async () => (await bodyText()).includes('Start voice conversation'));
  await clickButton('Start voice conversation');

  await poll('voice reaches real ready state', async () => {
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
  }, 45_000);

  await clickButton('End conversation');
  await poll('voice end is acknowledged', async () => (await bodyText()).includes('Conversation ended'));
  await clickButton('Done');
  await poll('same session returns to text', async () => {
    const text = await bodyText();
    const composerPresent = Boolean(await evaluate('Boolean(document.querySelector("#conversation-composer"))'));
    return text.includes('How can we help?') && composerPresent;
  });
}

async function main() {
  chrome = spawn(chromeBin, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--remote-debugging-port=9222',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let chromeError = '';
  chrome.stderr.on('data', (chunk) => {
    chromeError += String(chunk).slice(-4000);
  });

  try {
    const socketUrl = await waitForChromeDebugger();
    cdp = await CdpClient.connect(socketUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await establishEntrySession();
    await runVoiceJourney();

    console.log(JSON.stringify({
      result: 'BROWSER_FIRST_SESSION_PASSED',
      webOrigin,
      accountMode: testEmail && testPassword ? 'authenticated-test-account' : 'guest',
      evidence,
    }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({
      result: 'HOLD',
      webOrigin,
      accountMode: testEmail && testPassword ? 'authenticated-test-account' : 'guest',
      evidence,
      failure: message,
      chromeError: chromeError.slice(-1500),
    }, null, 2));
    process.exitCode = 1;
  } finally {
    cdp?.close();
    chrome?.kill('SIGTERM');
  }
}

main();