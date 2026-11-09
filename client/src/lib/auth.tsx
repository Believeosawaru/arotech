import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiGet, apiPost, request, setCsrf, type User } from './api';
type AuthContextValue = {
    user: User | null;
    ready: boolean;
    signin: (email: string, password: string) => Promise<User>;
    signup: (name: string, email: string, password: string) => Promise<User>;
    signout: () => Promise<void>;
    refresh: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: {
    children: ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null), [ready, setReady] = useState(false);
    async function refresh() { try {
        const data = await apiGet<{
            user: User;
            csrf: string;
        }>('/auth/me');
        setUser(data.user);
        setCsrf(data.csrf);
    }
    catch {
        setUser(null);
        setCsrf('');
    } }
    useEffect(() => { refresh().finally(() => setReady(true)); }, []);
    async function signin(email: string, password: string) { const data = await apiPost<{
        user: User;
        csrf: string;
    }>('/auth/login', { email, password }); setCsrf(data.csrf); setUser(data.user); return data.user; }
    async function signup(name: string, email: string, password: string) { const data = await apiPost<{
        user: User;
        csrf: string;
    }>('/auth/register', { name, email, password }); setCsrf(data.csrf); setUser(data.user); return data.user; }
    async function signout() { try {
        await request('/auth/logout', { method: 'POST', body: '{}' });
    }
    finally {
        setUser(null);
        setCsrf('');
    } }
    return <AuthContext.Provider value={{ user, ready, signin, signup, signout, refresh }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value)
    throw Error('AuthProvider missing'); return value; }

