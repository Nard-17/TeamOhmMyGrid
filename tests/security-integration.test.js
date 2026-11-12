// ==============================================================================
// KuryenTipid - Security & Integration Test Suite
// Verifies CAN verification, Duplicate Prevention, Multi-Identifier Login,
// Anti-Enumeration Protection, and Brute-Force Rate Limiting
// ==============================================================================

const assert = require('assert');

// In-Memory Storage Mock for AsyncStorage
const memoryStore = new Map();
const mockAsyncStorage = {
  getItem: async (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
  setItem: async (key, val) => {
    memoryStore.set(key, val);
  },
  removeItem: async (key) => {
    memoryStore.delete(key);
  },
  clear: async () => {
    memoryStore.clear();
  },
};

// Seed utility customer database
const DEFAULT_CUSTOMERS = [
  {
    can: '1234567890',
    sin: '1234-5678-90',
    accountHolderName: 'Nena Villanueva',
    serviceAddress: 'Block 14 Lot 8, Sampaguita St., Quezon City',
    isRegistered: false,
  },
  {
    can: '1234567891',
    sin: '1234-5678-91',
    accountHolderName: 'Jaeda Marthena Iral',
    serviceAddress: 'Unit 402, Katipunan Ave., Loyola Heights, Quezon City',
    isRegistered: false,
  },
];

function secureHash(password, salt) {
  let hash = 0;
  const combined = password + ':' + salt + ':kuryentipid_salt_2026';
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'phash_' + Math.abs(hash).toString(16) + '_' + combined.length;
}

// Security & Rate Limiting Engine Implementation
async function checkRateLimit(rawIdentifier) {
  const identifier = rawIdentifier.trim().toLowerCase();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  const json = await mockAsyncStorage.getItem('@rate_limits');
  const attempts = json ? JSON.parse(json) : [];

  const recent = attempts.filter((a) => a.identifier === identifier && now - a.timestamp < windowMs);

  if (recent.length >= maxAttempts) {
    const oldest = recent[0].timestamp;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      message: `Too many failed login attempts. Please wait ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
    };
  }

  return { allowed: true, remainingAttempts: maxAttempts - recent.length };
}

async function recordFailedAttempt(rawIdentifier) {
  const identifier = rawIdentifier.trim().toLowerCase();
  const now = Date.now();
  const json = await mockAsyncStorage.getItem('@rate_limits');
  const attempts = json ? JSON.parse(json) : [];
  attempts.push({ identifier, timestamp: now });
  await mockAsyncStorage.setItem('@rate_limits', JSON.stringify(attempts));
}

async function clearRateLimit(rawIdentifier) {
  const identifier = rawIdentifier.trim().toLowerCase();
  const json = await mockAsyncStorage.getItem('@rate_limits');
  if (!json) return;
  const attempts = JSON.parse(json);
  const filtered = attempts.filter((a) => a.identifier !== identifier);
  await mockAsyncStorage.setItem('@rate_limits', JSON.stringify(filtered));
}

// Authentication Logic
async function registerUser(formData) {
  const cleanCan = formData.can.replace(/\D/g, '');
  const custJson = await mockAsyncStorage.getItem('@customers');
  const customers = custJson ? JSON.parse(custJson) : DEFAULT_CUSTOMERS;

  // 1. Validate CAN against customer database
  const customer = customers.find((c) => c.can === cleanCan);
  if (!customer) {
    return { success: false, error: 'CAN was not found in utility customer records.' };
  }

  // 2. Check if CAN already registered
  const usersJson = await mockAsyncStorage.getItem('@users');
  const users = usersJson ? JSON.parse(usersJson) : [];

  if (customer.isRegistered || users.some((u) => u.user.can === cleanCan)) {
    return { success: false, error: 'This Customer Account Number is already registered.' };
  }

  // 3. Check unique username
  if (users.some((u) => u.user.username.toLowerCase() === formData.username.toLowerCase())) {
    return { success: false, error: 'Username is already taken. Please choose another.' };
  }

  // 4. Check unique email
  if (users.some((u) => u.user.email.toLowerCase() === formData.email.toLowerCase())) {
    return { success: false, error: 'Email address is already registered.' };
  }

  // Store user
  const salt = 'salt_' + Math.random().toString(36);
  const passwordHash = secureHash(formData.password, salt);
  const newUser = {
    id: 'user_' + Date.now(),
    fullName: formData.fullName,
    username: formData.username,
    email: formData.email,
    can: cleanCan,
    sin: customer.sin,
  };

  users.push({ user: newUser, passwordHash, salt });
  await mockAsyncStorage.setItem('@users', JSON.stringify(users));

  // Mark customer record registered
  const updatedCustomers = customers.map((c) =>
    c.can === cleanCan ? { ...c, isRegistered: true } : c
  );
  await mockAsyncStorage.setItem('@customers', JSON.stringify(updatedCustomers));

  return { success: true, data: newUser };
}

async function loginUser(rawIdentifier, password) {
  const identifier = rawIdentifier.trim();

  // 1. Rate limiter check
  const rateLimit = await checkRateLimit(identifier);
  if (!rateLimit.allowed) {
    return {
      success: false,
      rateLimited: true,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      error: rateLimit.message,
    };
  }

  const cleanDigits = identifier.replace(/\D/g, '');
  const lowerIdent = identifier.toLowerCase();

  const usersJson = await mockAsyncStorage.getItem('@users');
  const users = usersJson ? JSON.parse(usersJson) : [];

  // Find user by Email, Username, OR 10-digit CAN
  const userEntry = users.find((entry) => {
    if (entry.user.email.toLowerCase() === lowerIdent) return true;
    if (entry.user.username.toLowerCase() === lowerIdent) return true;
    if (cleanDigits.length === 10 && entry.user.can === cleanDigits) return true;
    return false;
  });

  // Generic Error Message on failure (prevents enumeration!)
  const GENERIC_ERROR = 'Invalid credentials. Please verify your identifier and password.';

  if (!userEntry) {
    await recordFailedAttempt(identifier);
    return { success: false, error: GENERIC_ERROR };
  }

  const computedHash = secureHash(password, userEntry.salt);
  if (computedHash !== userEntry.passwordHash) {
    await recordFailedAttempt(identifier);
    return { success: false, error: GENERIC_ERROR };
  }

  await clearRateLimit(identifier);
  return { success: true, data: userEntry.user };
}

// Tests
let passed = 0;
let total = 0;

async function test(title, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✓ ${title}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${title}`);
    console.error(`    ${e.message}`);
  }
}

async function runIntegrationSuite() {
  console.log('\n=================================================================');
  console.log('RUNNING KURYENTIPID SECURITY & INTEGRATION TEST SUITE');
  console.log('=================================================================\n');

  await mockAsyncStorage.setItem('@customers', JSON.stringify(DEFAULT_CUSTOMERS));

  // 1. CAN Validation & Registration
  console.log('--- 1. CAN Validation & Registration Uniqueness ---');
  await test('should register new user with valid Meralco CAN', async () => {
    const res = await registerUser({
      fullName: 'Nena Villanueva',
      username: 'nenav2026',
      email: 'nena.villanueva@email.com',
      can: '1234567890',
      password: 'P@ssword123',
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.username, 'nenav2026');
    assert.strictEqual(res.data.can, '1234567890');
    assert.strictEqual(res.data.sin, '1234-5678-90');
  });

  await test('should reject registration when CAN does not exist in utility records', async () => {
    const res = await registerUser({
      fullName: 'Fake User',
      username: 'fakeuser99',
      email: 'fake@email.com',
      can: '9999999999',
      password: 'P@ssword123',
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'CAN was not found in utility customer records.');
  });

  await test('should reject registration when CAN is already registered (UNIQUE constraint)', async () => {
    const res = await registerUser({
      fullName: 'Another Person',
      username: 'another2026',
      email: 'another@email.com',
      can: '1234567890', // already registered by Nena!
      password: 'P@ssword123',
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'This Customer Account Number is already registered.');
  });

  await test('should reject registration when Username is already taken (UNIQUE constraint)', async () => {
    const res = await registerUser({
      fullName: 'Duplicate Username User',
      username: 'nenav2026', // already taken!
      email: 'different@email.com',
      can: '1234567891',
      password: 'P@ssword123',
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Username is already taken. Please choose another.');
  });

  await test('should reject registration when Email is already registered (UNIQUE constraint)', async () => {
    const res = await registerUser({
      fullName: 'Duplicate Email User',
      username: 'uniqueuser99',
      email: 'nena.villanueva@email.com', // already registered!
      can: '1234567891',
      password: 'P@ssword123',
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, 'Email address is already registered.');
  });

  // 2. Multi-Identifier Login
  console.log('\n--- 2. Multi-Identifier Login (Email, Username, or CAN) ---');
  await test('should log in using registered Email', async () => {
    const res = await loginUser('nena.villanueva@email.com', 'P@ssword123');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.fullName, 'Nena Villanueva');
  });

  await test('should log in using registered Username', async () => {
    const res = await loginUser('nenav2026', 'P@ssword123');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.fullName, 'Nena Villanueva');
  });

  await test('should log in using registered CAN (raw digits)', async () => {
    const res = await loginUser('1234567890', 'P@ssword123');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.fullName, 'Nena Villanueva');
  });

  await test('should log in using registered CAN (formatted with hyphens: 1234-5678-90)', async () => {
    const res = await loginUser('1234-5678-90', 'P@ssword123');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.fullName, 'Nena Villanueva');
  });

  // 3. Security: Anti-Enumeration Generic Error Messages
  console.log('\n--- 3. Account Enumeration Defense (Generic Error Messages) ---');
  const GENERIC_MSG = 'Invalid credentials. Please verify your identifier and password.';

  await test('should return generic error message for invalid password', async () => {
    const res = await loginUser('nenav2026', 'WrongPassword123');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, GENERIC_MSG);
  });

  await test('should return EXACT SAME generic error message for non-existent username', async () => {
    const res = await loginUser('nonexistentuser', 'P@ssword123');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, GENERIC_MSG);
  });

  await test('should return EXACT SAME generic error message for non-existent email', async () => {
    const res = await loginUser('nobody@nowhere.com', 'P@ssword123');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error, GENERIC_MSG);
  });

  // 4. Rate Limiting & Brute-Force Attack Protection
  console.log('\n--- 4. Rate Limiting & Brute-Force Protection ---');
  await test('should enforce rate limit lockout after 5 failed attempts', async () => {
    const targetUser = 'attacker_target_user';

    // 5 failed attempts
    for (let i = 1; i <= 5; i++) {
      const res = await loginUser(targetUser, `BadPassword${i}`);
      assert.strictEqual(res.success, false);
    }

    // 6th attempt should be blocked by rate limit
    const blockedRes = await loginUser(targetUser, 'EvenCorrectPasswordNow');
    assert.strictEqual(blockedRes.success, false);
    assert.strictEqual(blockedRes.rateLimited, true);
    assert.strictEqual(typeof blockedRes.retryAfterSeconds, 'number');
    assert.strictEqual(blockedRes.retryAfterSeconds > 0, true);
    assert.strictEqual(blockedRes.error.includes('Too many failed login attempts'), true);
  });

  console.log('\n=================================================================');
  console.log(`SECURITY SUITE RESULT: ${passed} / ${total} TESTS PASSED!`);
  console.log('=================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runIntegrationSuite();
