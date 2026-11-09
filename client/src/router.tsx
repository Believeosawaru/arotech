import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Landing } from './pages/Landing';
import { AuthPage, RecoveryPage } from './pages/AuthPage';
import { AppLayout } from './pages/AppLayout';
import { AdminLayout } from './pages/AdminLayout';
import { AppPage } from './pages/AppPage';
import { AdminPage } from './pages/AdminPage';
function Protected({ admin = false, children }: {
    admin?: boolean;
    children: ReactNode;
}) { const { user, ready } = useAuth(), loc = useLocation(); if (!ready)
    return <div className="grid min-h-screen place-items-center bg-ink text-lime font-display text-2xl font-bold">arotech<span className="animate-pulse">.</span></div>; if (!user)
    return <Navigate to={admin ? '/admin/login' : '/login'} state={{ from: loc.pathname }} replace/>; if (admin && user.role !== 'admin')
    return <Navigate to="/app" replace/>; if (!admin && user.role === 'admin')
    return <Navigate to="/admin" replace/>; return <>{children}</>; }
export function Router() {
    return <Routes>
 <Route path="/" element={<Landing />}/><Route path="/login" element={<AuthPage mode="login"/>}/><Route path="/register" element={<AuthPage mode="register"/>}/><Route path="/admin/login" element={<AuthPage mode="admin"/>}/><Route path="/forgot-password" element={<RecoveryPage mode="forgot"/>}/><Route path="/reset-password" element={<RecoveryPage mode="reset"/>}/><Route path="/verify-email" element={<RecoveryPage mode="verify"/>}/>
 <Route path="/app" element={<Protected><AppLayout /></Protected>}><Route index element={<AppPage page="overview"/>}/><Route path=":page" element={<AppPage />}/></Route>
 <Route path="/admin" element={<Protected admin><AdminLayout /></Protected>}><Route index element={<AdminPage page="overview"/>}/><Route path=":page" element={<AdminPage />}/></Route>
 <Route path="*" element={<Navigate to="/" replace/>}/>
 </Routes>;
}

