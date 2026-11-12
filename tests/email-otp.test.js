const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual service with isolated storage and a mocked email provider.
const storage = new Map();
let configured = true;
let response;
let sent;
const client = {
  auth: {
    verifyOtp: async args => { sent = args; return response; },
    resend: async args => { sent = args; return { error: null }; },
  },
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({
    data: { full_name: 'Test User', username: 'testuser', can: '1234567890' }, error: null,
  }) }) }) }),
};
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/authService.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  exports: exportsObject, console,
  require: name => {
    if (name.includes('async-storage')) return { __esModule: true, default: {
      getItem: async key => storage.get(key) || null,
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async key => storage.delete(key),
    } };
    if (name.includes('config/supabase')) return { supabase: client, isLiveSupabaseConfigured: () => configured };
    if (name.includes('validation')) return { formatCANDisplay: value => value, validateEmail: value => ({ isValid: /^[^@]+@[^@]+\.[^@]+$/.test(value) }) };
    throw new Error(name);
  },
});
(async () => {
  configured = false;
  assert.equal((await exportsObject.registerUser({})).success, false);
  configured = true;
  await assert.rejects(exportsObject.confirmRegistrationOTP('test@example.com', '12'));
  response = { error: new Error('expired'), data: {} };
  await assert.rejects(exportsObject.confirmRegistrationOTP('test@example.com', '123456'));
  assert.equal(storage.size, 0);
  response = { error: null, data: { session: {}, user: { id: '1', email: 'test@example.com' } } };
  await assert.rejects(exportsObject.confirmRegistrationOTP('test@example.com', '123456'));
  assert.equal(storage.size, 0);
  response.data.user.email_confirmed_at = '2026-11-12';
  const profile = await exportsObject.confirmRegistrationOTP(' TEST@example.com ', '123456');
  assert.equal(profile.isEmailVerified, true);
  assert.equal(sent.email, 'test@example.com');
  assert.equal(await exportsObject.getPendingEmailVerification(), null);
  assert.equal(JSON.parse(storage.get('@kuryentipid_active_session')).isEmailVerified, true);
  await exportsObject.resendRegistrationOTP(' TEST@example.com ');
  assert.equal(sent.type, 'signup');
  assert.equal(sent.email, 'test@example.com');
  assert.equal((await exportsObject.getPendingEmailVerification()).email, 'test@example.com');
  storage.set('@kuryentipid_pending_email_verification', 'invalid json');
  assert.equal(await exportsObject.getPendingEmailVerification(), null);
  console.log('Email OTP service checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
