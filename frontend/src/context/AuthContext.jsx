import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/resources.js';
import { clearToken, getToken, setToken } from '../api/client.js';
import { connectSocket, disconnectSocket } from '../api/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' until the stored token has been checked — otherwise a refresh
  // flashes the login screen before the session is confirmed.
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!getToken()) {
      setStatus('anonymous');
      return;
    }

    authApi
      .me()
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
        connectSocket();
      })
      .catch(() => {
        clearToken();
        setStatus('anonymous');
      });
  }, []);

  const login = useCallback(async (credentials) => {
    const { user: me, token } = await authApi.login(credentials);
    setToken(token);
    setUser(me);
    setStatus('authenticated');
    connectSocket();
    return me;
  }, []);

  const logout = useCallback(() => {
    disconnectSocket();
    clearToken();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout, setUser }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
