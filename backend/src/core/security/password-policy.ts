import { AppError } from '../http/errors.js';

export class PasswordPolicy {
  constructor(private readonly minimumLength: number) {}

  assertCompliant(password: string): void {
    if (password.length < this.minimumLength) {
      throw new AppError(
        400,
        'AUTH_PASSWORD_POLICY_FAILED',
        `Password must contain at least ${this.minimumLength} characters.`,
      );
    }
  }
}
