import bcrypt from 'bcryptjs';

export class PasswordHasher {
  constructor(private readonly cost: number) {}

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.cost);
  }
}
