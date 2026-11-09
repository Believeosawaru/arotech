export const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
let csrf = '';
export function setCsrf(value: string) { csrf = value; }
export async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {};
    if (options.body)
        headers['Content-Type'] = 'application/json';
    if (csrf && options.method && !['GET', 'HEAD'].includes(options.method))
        headers['x-csrf-token'] = csrf;
    const res = await fetch(`${API}/api${path}`, { ...options, credentials: 'include', headers: { ...headers, ...(options.headers as Record<string, string> || {}) } });
    let data: any;
    try {
        data = await res.json();
    }
    catch {
        throw new Error(`The server returned an unreadable response (${res.status}). Check VITE_API_URL and API server configuration.`);
    }
    if (!res.ok)
        throw new Error(data.error || `Request failed (${res.status})`);
    return data as T;
}
export function apiGet<T = any>(path: string) { return request<T>(path); }
export function apiPost<T = any>(path: string, data: unknown) { return request<T>(path, { method: 'POST', body: JSON.stringify(data) }); }
export function apiPatch<T = any>(path: string, data: unknown) { return request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }); }
export function apiDelete<T = any>(path: string) { return request<T>(path, { method: 'DELETE' }); }
export const ngn = (minor: number = 0) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(minor / 100);
export const compact = (minor: number = 0) => new Intl.NumberFormat('en-NG', { notation: 'compact', maximumFractionDigits: 1 }).format(minor / 100);
export const date = (value: string) => new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
export const kobo = (input: string | number) => Math.round(Number(input) * 100);
export const fmtInput = (minor: number) => String((minor / 100).toFixed(2));
export const initials = (name?: string) => name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'AR';
export const newKey = () => crypto.randomUUID();
export type User = {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'customer';
    status: string;
    verified: boolean;
    kycStatus: string;
    avatar: string;
};
export type Tx = {
    _id: string;
    reference: string;
    kind: string;
    senderId?: string | {
        _id: string;
        name: string;
        email: string;
    };
    recipientId?: string | {
        _id: string;
        name: string;
        email: string;
    };
    amountMinor: number;
    description: string;
    category: string;
    status: string;
    createdAt: string;
};
export type Goal = {
    _id: string;
    name: string;
    targetMinor: number;
    savedMinor: number;
    status: string;
    deadline?: string;
};
export type Beneficiary = {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    nickname: string;
};
export type CardData = {
    _id: string;
    label: string;
    last4: string;
    status: 'active' | 'frozen';
};
export type Overview = {
    balanceMinor: number;
    goals: Goal[];
    transactions: Tx[];
    beneficiaries: Beneficiary[];
    unread: number;
    sandbox: boolean;
};

