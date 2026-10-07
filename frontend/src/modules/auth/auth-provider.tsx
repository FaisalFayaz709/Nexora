'use client';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  apiRequest,
  restoreOrganizationId,
  setAccessToken,
  setOrganizationId,
} from '@/lib/api-client';

type Membership = {
  id: string;
  organizationId: string;
  branchId?: string | null;
  status: string;
};

type AuthState = {
  ready: boolean;
  authenticated: boolean;
  email: string | null;
  permissions: string[];
  memberships: Membership[];
  organizationId: string | null;
};

type LoginResult = {
  requiresMfa: boolean;
  mfaChallengeToken?: string;
  memberships: Membership[];
};

type AuthContextValue = AuthState & {
  login(email: string, password: string): Promise<LoginResult>;
  verifyMfa(challengeToken: string, code: string): Promise<void>;
  selectOrganization(id: string): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function selectOnlyActiveMembership(memberships: Membership[]) {
  const active = memberships.filter((item) => item.status === 'ACTIVE');
  if (active.length === 1) {
    setOrganizationId(active[0]!.organizationId);
    return active[0]!.organizationId;
  }
  setOrganizationId(null);
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ready: false,
    authenticated: false,
    email: null,
    permissions: [],
    memberships: [],
    organizationId: null,
  });

  async function loadMe() {
    const response = await apiRequest<{
      data: {
        email: string;
        permissions: string[];
        memberships: Membership[];
      };
    }>('/auth/me');

    const stored = restoreOrganizationId();
    const validStored = response.data.memberships.some(
      (item) => item.status === 'ACTIVE' && item.organizationId === stored,
    )
      ? stored
      : null;

    const organizationId =
      validStored ?? selectOnlyActiveMembership(response.data.memberships);

    setState({
      ready: true,
      authenticated: true,
      email: response.data.email,
      permissions: response.data.permissions,
      memberships: response.data.memberships,
      organizationId,
    });
  }

  useEffect(() => {
    restoreOrganizationId();
    apiRequest<{ data: { accessToken: string } }>('/auth/refresh', {
      method: 'POST',
    })
      .then(async (response) => {
        setAccessToken(response.data.accessToken);
        await loadMe();
      })
      .catch(() => setState((previous) => ({ ...previous, ready: true })));
  }, []);

  async function login(email: string, password: string): Promise<LoginResult> {
    const response = await apiRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = response.data;
    const memberships = (data.user?.memberships ?? []) as Membership[];
    selectOnlyActiveMembership(memberships);

    if (data.requiresMfa) {
      return {
        requiresMfa: true,
        mfaChallengeToken: data.mfaChallengeToken,
        memberships,
      };
    }

    setAccessToken(data.accessToken);
    await loadMe();
    return { requiresMfa: false, memberships };
  }

  async function verifyMfa(challengeToken: string, code: string) {
    const response = await apiRequest<any>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeToken, code }),
    });
    const memberships = (response.data.user?.memberships ?? []) as Membership[];
    selectOnlyActiveMembership(memberships);
    setAccessToken(response.data.accessToken);
    await loadMe();
  }

  async function selectOrganization(id: string) {
    if (
      !state.memberships.some(
        (item) => item.status === 'ACTIVE' && item.organizationId === id,
      )
    ) {
      throw new Error('Organization is not an active membership.');
    }
    setOrganizationId(id);
    setState((previous) => ({ ...previous, organizationId: id }));
    await loadMe();
  }

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
      setOrganizationId(null);
      setState({
        ready: true,
        authenticated: false,
        email: null,
        permissions: [],
        memberships: [],
        organizationId: null,
      });
    }
  }

  const value = useMemo(
    () => ({ ...state, login, verifyMfa, selectOrganization, logout }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider missing');
  return value;
}
