/**
 * PasswordService
 * Centralizes password hashing, comparison, and strength validation.
 * bcryptjs is used (pure JS — no native bindings required).
 */

import bcrypt from 'bcryptjs';
import { ValidationError } from '../utils/errors.js';

const SALT_ROUNDS = 12;

/**
 * Rules enforced on every password before hashing.
 * Adjust the list here and nowhere else.
 */
const RULES = [
  {
    test: (p) => p.length >= 8,
    message: 'Password must be at least 8 characters long.',
  },
  {
    test: (p) => p.length <= 128,
    message: 'Password cannot exceed 128 characters.',
  },
  {
    test: (p) => /[A-Z]/.test(p),
    message: 'Password must contain at least one uppercase letter.',
  },
  {
    test: (p) => /[a-z]/.test(p),
    message: 'Password must contain at least one lowercase letter.',
  },
  {
    test: (p) => /[0-9]/.test(p),
    message: 'Password must contain at least one number.',
  },
  {
    test: (p) => /[^A-Za-z0-9]/.test(p),
    message: 'Password must contain at least one special character.',
  },
];

const PasswordService = {
  /**
   * Validate password strength.
   * Throws ValidationError listing all failing rules.
   */
  validate(password) {
    const failures = RULES.filter((r) => !r.test(password)).map((r) => r.message);
    if (failures.length > 0) {
      throw new ValidationError('Password does not meet requirements', failures);
    }
  },

  /**
   * Hash a plaintext password.
   * Always validate strength before hashing.
   */
  async hash(plaintext) {
    this.validate(plaintext);
    return bcrypt.hash(plaintext, SALT_ROUNDS);
  },

  /**
   * Compare a plaintext password against a stored hash.
   * Returns true/false — never throws on mismatch.
   */
  async compare(plaintext, hash) {
    if (!plaintext || !hash) return false;
    return bcrypt.compare(plaintext, hash);
  },
};

export default PasswordService;
