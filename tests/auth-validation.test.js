// ==============================================================================
// KuryenTipid - Automated Authentication & Validation Test Suite
// Verifies all frontend & server-side validation rules, security requirements,
// and anti-enumeration protections
// ==============================================================================

const assert = require('assert');
const {
  validateFullName,
  validateUsername,
  validateEmail,
  cleanCAN,
  formatCANDisplay,
  validateCAN,
  evaluatePassword,
  validatePassword,
  validateConfirmPassword,
  detectIdentifierType,
  validateLoginIdentifier,
} = require('./compiled/utils/validation');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
  }
}

function describe(suiteName, fn) {
  console.log(`\n--- ${suiteName} ---`);
  fn();
}

console.log('=================================================================');
console.log('RUNNING KURYENTIPID AUTHENTICATION VALIDATION TEST SUITE');
console.log('=================================================================');

// 1. Full Name Validation
describe('1. Full Name Validation Rules', () => {
  it('should accept valid alphabetic full names with spaces', () => {
    assert.strictEqual(validateFullName('Nena Villanueva').isValid, true);
    assert.strictEqual(validateFullName('Jaeda Marthena Iral').isValid, true);
    assert.strictEqual(validateFullName('Carl Benedict Enriquez').isValid, true);
    assert.strictEqual(validateFullName('Al').isValid, true); // min 2 chars
  });

  it('should reject names shorter than 2 characters', () => {
    assert.strictEqual(validateFullName('N').isValid, false);
    assert.strictEqual(validateFullName('').isValid, false);
    assert.strictEqual(validateFullName('   ').isValid, false);
  });

  it('should reject names containing numbers or special symbols', () => {
    assert.strictEqual(validateFullName('Nena123').isValid, false);
    assert.strictEqual(validateFullName('Nena Villanueva!').isValid, false);
    assert.strictEqual(validateFullName('user_name').isValid, false);
  });
});

// 2. Username Validation
describe('2. Username Validation Rules', () => {
  it('should accept alphanumeric usernames between 4 and 20 chars', () => {
    assert.strictEqual(validateUsername('nenav2026').isValid, true);
    assert.strictEqual(validateUsername('carl12').isValid, true);
    assert.strictEqual(validateUsername('admin99').isValid, true);
    assert.strictEqual(validateUsername('user1234567890123456').isValid, true); // 20 chars
  });

  it('should reject usernames shorter than 4 characters', () => {
    assert.strictEqual(validateUsername('abc').isValid, false);
    assert.strictEqual(validateUsername('a').isValid, false);
  });

  it('should reject usernames longer than 20 characters', () => {
    assert.strictEqual(validateUsername('thisusernamehasmorethan20characters').isValid, false);
  });

  it('should reject usernames containing spaces', () => {
    assert.strictEqual(validateUsername('nena v').isValid, false);
    assert.strictEqual(validateUsername('user name').isValid, false);
  });

  it('should reject usernames containing special characters', () => {
    assert.strictEqual(validateUsername('nena_v').isValid, false);
    assert.strictEqual(validateUsername('user@2026').isValid, false);
    assert.strictEqual(validateUsername('nena-v').isValid, false);
  });
});

// 3. Email Address Validation
describe('3. Email Address Validation Rules', () => {
  it('should accept standard valid email addresses', () => {
    assert.strictEqual(validateEmail('nena.villanueva@gmail.com').isValid, true);
    assert.strictEqual(validateEmail('user@domain.com').isValid, true);
    assert.strictEqual(validateEmail('jaeda.iral@teamohmygrid.ph').isValid, true);
  });

  it('should reject invalid email formats', () => {
    assert.strictEqual(validateEmail('').isValid, false);
    assert.strictEqual(validateEmail('plainaddress').isValid, false);
    assert.strictEqual(validateEmail('missingatdomain.com').isValid, false);
    assert.strictEqual(validateEmail('user@domain').isValid, false); // missing TLD
    assert.strictEqual(validateEmail('user@.com').isValid, false);
  });
});

// 4. Customer and Account Number (CAN) Validation
describe('4. Customer and Account Number (CAN) Rules', () => {
  it('should accept exactly 10 numeric digits', () => {
    assert.strictEqual(validateCAN('1234567890').isValid, true);
    assert.strictEqual(validateCAN('9876543210').isValid, true);
    assert.strictEqual(validateCAN('1029384756').isValid, true);
  });

  it('should clean and validate formatted CAN (1234-5678-90)', () => {
    const formatted = '1234-5678-90';
    assert.strictEqual(cleanCAN(formatted), '1234567890');
    assert.strictEqual(validateCAN(cleanCAN(formatted)).isValid, true);
  });

  it('should reject CAN with length !== 10', () => {
    assert.strictEqual(validateCAN('12345').isValid, false); // too short
    assert.strictEqual(validateCAN('12345678901').isValid, false); // 11 digits
    assert.strictEqual(validateCAN('').isValid, false);
  });

  it('should correctly format 10 digits as SIN display (XXXX-XXXX-XX)', () => {
    assert.strictEqual(formatCANDisplay('1234567890'), '1234-5678-90');
    assert.strictEqual(formatCANDisplay('9876543210'), '9876-5432-10');
  });
});

// 5. Password & Confirm Password Validation
describe('5. Password & Confirm Password Rules', () => {
  it('should accept passwords with min 8 chars containing letter and number', () => {
    assert.strictEqual(validatePassword('P@ssword123').isValid, true);
    assert.strictEqual(validatePassword('kuryente2026').isValid, true);
    assert.strictEqual(validatePassword('Secret12').isValid, true);
  });

  it('should reject passwords shorter than 8 characters', () => {
    assert.strictEqual(validatePassword('Pass1').isValid, false);
  });

  it('should reject passwords without letters', () => {
    assert.strictEqual(validatePassword('123456789').isValid, false);
  });

  it('should reject passwords without numbers', () => {
    assert.strictEqual(validatePassword('PasswordOnly').isValid, false);
  });

  it('should accurately calculate password strength score', () => {
    const weak = evaluatePassword('pass1234');
    assert.strictEqual(weak.score <= 3, true);

    const strong = evaluatePassword('Str0ng!P@ss2026');
    assert.strictEqual(strong.hasMinLength, true);
    assert.strictEqual(strong.hasLetter, true);
    assert.strictEqual(strong.hasNumber, true);
    assert.strictEqual(strong.hasUppercase, true);
    assert.strictEqual(strong.hasSpecialChar, true);
    assert.strictEqual(strong.score, 5);
    assert.strictEqual(strong.strengthLabel, 'Strong');
  });

  it('should validate matching confirm password', () => {
    assert.strictEqual(validateConfirmPassword('MyPass123', 'MyPass123').isValid, true);
    assert.strictEqual(validateConfirmPassword('MyPass123', 'OtherPass123').isValid, false);
  });
});

// 6. Multi-Identifier Login Detection
describe('6. Multi-Identifier Login Detection', () => {
  it('should detect email as identifier', () => {
    assert.strictEqual(detectIdentifierType('nena@meralco.com.ph'), 'email');
    assert.strictEqual(detectIdentifierType('user@domain.com'), 'email');
  });

  it('should detect 10-digit CAN as identifier', () => {
    assert.strictEqual(detectIdentifierType('1234567890'), 'can');
    assert.strictEqual(detectIdentifierType('1234-5678-90'), 'can');
  });

  it('should detect alphanumeric username as identifier', () => {
    assert.strictEqual(detectIdentifierType('nenav2026'), 'username');
    assert.strictEqual(detectIdentifierType('jaeda12'), 'username');
  });

  it('should flag invalid identifiers', () => {
    assert.strictEqual(detectIdentifierType('bad email @ com'), 'invalid');
    assert.strictEqual(detectIdentifierType('123'), 'invalid'); // too short for username or CAN
    assert.strictEqual(detectIdentifierType('abc'), 'invalid'); // too short for username
  });
});

console.log('\n=================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED!`);
console.log('=================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
