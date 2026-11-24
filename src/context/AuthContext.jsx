import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getData, getUsers, isAccountActive, removeData, setData } from '../utils/storage';

const AuthContext = createContext(null);
const USERS_KEY = 'artGalleryUsers';
const CURRENT_USER_KEY = 'artGalleryCurrentUser';
const TOKEN_KEY = 'artGalleryJwtToken';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const DEFAULT_PROFILE_IMAGE = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';

async function requestAuthApi(path, { method = 'GET', token, body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('Unable to connect to the authentication server. Please try again.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Authentication request failed (${response.status}).`);
  return payload;
}

function sanitizeUser(user) {
  const safeUser = { ...user };
  delete safeUser.password;
  delete safeUser.passwordHash;
  delete safeUser.token;
  return safeUser;
}

function findCachedUser(apiUser) {
  const id = apiUser.id ?? apiUser._id;
  const email = String(apiUser.email ?? '').toLowerCase();
  return getUsers().find((user) =>
    (id != null && String(user.id) === String(id))
    || (email && String(user.email ?? '').toLowerCase() === email)
  ) ?? null;
}

function normalizeApiUser(apiUser) {
  const cachedUser = findCachedUser(apiUser);
  const safeApiUser = sanitizeUser(apiUser);
  const id = apiUser.id ?? apiUser._id ?? cachedUser?.id;

  return {
    ...cachedUser,
    ...safeApiUser,
    id: String(id ?? ''),
    name: apiUser.name ?? cachedUser?.name ?? '',
    email: String(apiUser.email ?? cachedUser?.email ?? '').toLowerCase(),
    role: apiUser.role ?? cachedUser?.role ?? 'visitor',
    createdAt: apiUser.createdAt ?? cachedUser?.createdAt ?? new Date().toISOString(),
    profileImage: apiUser.profileImage ?? cachedUser?.profileImage ?? DEFAULT_PROFILE_IMAGE,
    bio: apiUser.bio ?? cachedUser?.bio ?? '',
    followersCount: apiUser.followersCount ?? cachedUser?.followersCount ?? 0,
  };
}

function cacheUser(user) {
  const users = getUsers();
  const existingIndex = users.findIndex((entry) =>
    String(entry.id) === String(user.id)
    || String(entry.email ?? '').toLowerCase() === String(user.email).toLowerCase()
  );
  const nextUsers = [...users];
  if (existingIndex < 0) nextUsers.push(sanitizeUser(user));
  else nextUsers[existingIndex] = { ...nextUsers[existingIndex], ...sanitizeUser(user) };
  setData(USERS_KEY, nextUsers);
}

function removeLegacyPasswords() {
  const storedUsers = getData(USERS_KEY, []);
  if (!Array.isArray(storedUsers)) return;
  const safeUsers = getUsers();
  if (JSON.stringify(storedUsers) !== JSON.stringify(safeUsers)) setData(USERS_KEY, safeUsers);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(() => {
    const token = getData(TOKEN_KEY);
    return typeof token === 'string' && token.length > 0;
  });

  const clearSession = useCallback(() => {
    removeData(TOKEN_KEY);
    removeData(CURRENT_USER_KEY);
    setCurrentUser(null);
  }, []);

  const restoreSession = useCallback(async () => {
    const token = getData(TOKEN_KEY);
    if (typeof token !== 'string' || !token) {
      removeData(CURRENT_USER_KEY);
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const payload = await requestAuthApi('/api/auth/me', { token });
      if (!payload.user || typeof payload.user !== 'object') throw new Error('The server returned an invalid user session.');
      const cachedUser = findCachedUser(payload.user);
      if (cachedUser && !isAccountActive(cachedUser)) throw new Error('This account is inactive.');
      const user = normalizeApiUser(payload.user);
      cacheUser(user);
      setData(CURRENT_USER_KEY, user);
      setCurrentUser(user);
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    removeLegacyPasswords();
    const token = getData(TOKEN_KEY);
    if (typeof token === 'string' && token) {
      Promise.resolve().then(() => restoreSession());
    } else {
      removeData(CURRENT_USER_KEY);
    }

    const handleStorage = (event) => {
      if (!event.key || [TOKEN_KEY, CURRENT_USER_KEY, USERS_KEY].includes(event.key)) {
        void restoreSession();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [restoreSession]);

  const login = useCallback(async (email, password) => {
    const cachedUser = getUsers().find((user) => String(user.email ?? '').toLowerCase() === email.trim().toLowerCase());
    if (cachedUser && !isAccountActive(cachedUser)) {
      return { success: false, error: 'This account is inactive. Contact an administrator.' };
    }

    setIsLoading(true);
    try {
      const payload = await requestAuthApi('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      if (typeof payload.token !== 'string' || !payload.token || !payload.user) {
        return { success: false, error: 'The server returned an incomplete login response.' };
      }

      const user = normalizeApiUser(payload.user);
      setData(TOKEN_KEY, payload.token);
      cacheUser(user);
      setData(CURRENT_USER_KEY, user);
      setCurrentUser(user);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message || 'Login failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userDetails) => {
    if (!['visitor', 'artist'].includes(userDetails.role)) {
      return { success: false, error: 'Choose Visitor or Artist as your account role.' };
    }

    try {
      await requestAuthApi('/api/auth/register', {
        method: 'POST',
        body: {
          name: userDetails.name.trim(),
          email: userDetails.email.trim(),
          password: userDetails.password,
          role: userDetails.role,
        },
      });
      const loginResult = await login(userDetails.email, userDetails.password);
      if (!loginResult.success) return { ...loginResult, registered: true };
      return loginResult;
    } catch (error) {
      return { success: false, error: error.message || 'Registration failed. Please try again.' };
    }
  }, [login]);

  const logout = useCallback(() => {
    clearSession();
    setIsLoading(false);
  }, [clearSession]);

  const value = useMemo(() => ({
    currentUser,
    isAuthenticated: Boolean(currentUser),
    isLoading,
    login,
    register,
    logout,
  }), [currentUser, isLoading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;