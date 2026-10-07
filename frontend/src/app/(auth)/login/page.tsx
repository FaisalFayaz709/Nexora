'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/modules/auth/auth-provider';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitLogin() {
    setBusy(true);
    setError(null);
    try {
      const result = await auth.login(email, password);
      if (result.requiresMfa) {
        setChallenge(result.mfaChallengeToken ?? null);
      } else {
        router.replace('/');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa() {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      await auth.verifyMfa(challenge, code);
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'MFA verification failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="text-sm font-semibold tracking-[0.2em] text-blue-700">NEXORA</div>
        <h1 className="mt-2 text-2xl font-bold">Enterprise sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          Access is resolved through your authenticated organization membership and RBAC scope.
        </p>

        {challenge ? (
          <div className="mt-7 space-y-4">
            <label className="block text-sm font-medium">
              MFA or recovery code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                autoComplete="one-time-code"
              />
            </label>
            <button
              className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white disabled:opacity-50"
              disabled={busy || !code}
              onClick={() => void submitMfa()}
            >
              Verify MFA
            </button>
          </div>
        ) : (
          <div className="mt-7 space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                autoComplete="username"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                autoComplete="current-password"
              />
            </label>
            <button
              className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-medium text-white disabled:opacity-50"
              disabled={busy || !email || !password}
              onClick={() => void submitLogin()}
            >
              Sign in
            </button>
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}
