import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.record);
  const [isAuthed, setIsAuthed] = useState(pb.authStore.isValid);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsub = pb.authStore.onChange((_t, record) => {
      setUser(record);
      setIsAuthed(pb.authStore.isValid);
      setIsAuthReady(true);
    });
    pb.authStore.ready?.then(() => setIsAuthReady(true));
    return unsub;
  }, []);

  const loginWithProvider = useCallback((provider) =>
    pb.collection('users').authWithOAuth2({ provider }), []);

  const loginWithPassword = useCallback((email, password) =>
    pb.collection('users').authWithPassword(email, password), []);

  // Request an emailed OTP as the second factor during MFA.
  const requestOTP = useCallback((params) =>
    pb.collection('users').requestOTP(params), []);

  // Complete MFA login with the emailed code + the mfaId from step one.
  const loginWithOTP = useCallback((otpId, code) =>
    pb.collection('users').authWithOTP(otpId, code), []);

  // Passwordless login: authenticate with the emailed code alone.
  const loginWithCode = useCallback((otpId, code) =>
    pb.collection('users').authWithOTP(otpId, code), []);

  const requestReset = useCallback((email) =>
    pb.collection('users').requestPasswordReset(email), []);

  const completePasswordReset = useCallback((password) =>
    pb.collection('users').completePasswordReset(password), []);

  const updateProfile = useCallback(async (data) => {
    if (!pb.authStore.record) throw new Error('Not authenticated');
    const rec = await pb.collection('users').update(pb.authStore.record.id, data);
    setUser({ ...rec });
    return rec;
  }, []);

  const logout = useCallback(() => pb.authStore.clear(), []);

  return (
    <AuthContext.Provider value={{
      user, isAuthed, isAuthReady, loginWithProvider, loginWithPassword, requestOTP, loginWithOTP, loginWithCode, requestReset, completePasswordReset, updateProfile, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
