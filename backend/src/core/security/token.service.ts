import { SignJWT, jwtVerify } from 'jose';

export interface AccessTokenClaims {
  readonly userId: string;
  readonly sessionId: string;
}

export class TokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly accessTtlSeconds: number,
    private readonly mfaChallengeTtlSeconds: number,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  async issueAccessToken(claims: AccessTokenClaims): Promise<string> {
    return new SignJWT({
      sid: claims.sessionId,
      typ: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.userId)
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtlSeconds}s`)
      .sign(this.key);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const { payload } = await jwtVerify(token, this.key, {
      algorithms: ['HS256'],
    });

    if (payload.typ !== 'access' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
      throw new Error('Invalid access-token claims');
    }

    return {
      userId: payload.sub,
      sessionId: payload.sid,
    };
  }

  async issueMfaChallenge(userId: string): Promise<string> {
    return new SignJWT({ typ: 'mfa' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime(`${this.mfaChallengeTtlSeconds}s`)
      .sign(this.key);
  }

  async verifyMfaChallenge(token: string): Promise<string> {
    const { payload } = await jwtVerify(token, this.key, {
      algorithms: ['HS256'],
    });

    if (payload.typ !== 'mfa' || typeof payload.sub !== 'string') {
      throw new Error('Invalid MFA challenge');
    }

    return payload.sub;
  }
}
