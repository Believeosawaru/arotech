import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Sparkles, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { Btn, ErrorText, Input, Logo, Sandbox } from '../components/UI';
import { useAuth } from '../lib/auth';
import { apiPost } from '../lib/api';
export function AuthPage({ mode }: {
    mode: 'login' | 'register' | 'admin';
}) {
    const { signin, signup } = useAuth();
    const nav = useNavigate();
    const register = mode === 'register', admin = mode === 'admin';
    const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [visible, setVisible] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null);
    async function submit(e: FormEvent) { e.preventDefault(); setError(null); setLoading(true); try {
        const user = register ? await signup(name, email, password) : await signin(email, password);
        if (admin && user.role !== 'admin') {
            setError('This account does not have admin access.');
            return;
        }
        nav(user.role === 'admin' ? '/admin' : '/app', { replace: true });
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setLoading(false);
    } }
    return <div className="min-h-screen bg-[#f7faf5] lg:grid lg:grid-cols-2"><div className="flex min-h-dvh min-w-0 flex-col px-5 py-6 sm:px-12 sm:py-7 lg:px-16"><Link to="/" className="w-fit"><Logo /></Link><div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-8 sm:py-12"><Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs font-extrabold text-sage hover:text-ink"><ArrowLeft size={15}/> BACK TO HOME</Link><div className="eyebrow"><span className="size-2 rounded-full bg-[#719a53]"/>{admin ? 'OPERATIONS ACCESS' : register ? 'YOUR NEXT CHAPTER STARTS HERE' : 'WELCOME BACK'}</div><h1 className="mt-5 font-display text-[clamp(2.3rem,8vw,4rem)] font-bold leading-[1] tracking-[-.08em]">{admin ? 'Inside the control room.' : register ? 'A smarter money story starts here.' : 'Great to see you again.'}</h1><p className="mt-5 text-sm leading-7 text-sage">{admin ? 'Sign in with your authorized operations account.' : register ? 'One place to pay, save, track, and feel more in control.' : 'Pick up right where you left off. Your financial space awaits.'}</p><div className="mt-8"><Sandbox compact/></div><form onSubmit={submit} className="mt-8 space-y-4">{register && <Input label="Full name" required placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" minLength={2}/>}<Input label="Email address" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/><div><label className="block text-sm font-bold">Password<div className="relative mt-2"><input className="input-field pr-14" placeholder={register ? 'At least 10 characters' : 'Your password'} minLength={register ? 10 : undefined} type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required value={password} onChange={e => setPassword(e.target.value)}/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-sage">{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label></div>{!register && <div className="text-right"><Link to="/forgot-password" className="text-xs font-extrabold text-[#558640] hover:underline">Forgot password?</Link></div>}<ErrorText error={error}/><Btn loading={loading} type="submit" variant="dark" className="mt-3 w-full py-4">{admin ? 'Enter operations' : register ? 'Create your account' : 'Sign in to Arotech'} <ArrowRight size={18}/></Btn></form><p className="mt-8 text-center text-sm text-sage">{register ? 'Already have an account?' : 'New to Arotech?'} <Link className="font-extrabold text-ink underline decoration-lime decoration-2 underline-offset-4" to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>{admin && <Link className="mt-4 text-center text-xs font-bold text-sage hover:text-ink" to="/login">Customer sign in</Link>}</div><div className="text-center text-[11px] text-sage lg:text-left">Arotech test environment · All balances and payments are sandbox-only.</div></div><div className="relative hidden min-h-screen overflow-hidden bg-ink px-10 py-14 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute right-[-200px] top-[-100px] size-[650px] rounded-full border border-white/10"/><div className="absolute right-[-70px] top-[40px] size-[400px] rounded-full border border-white/10"/><div className="absolute -bottom-32 -left-24 size-[350px] rounded-full bg-lime/10 blur-[70px]"/><div className="relative z-10 ml-auto rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-lime">MONEY, MOVING DIFFERENTLY.</div><div className="relative z-10 mx-auto w-full max-w-[460px]"><motion.div initial={{ opacity: 0, y: 35, rotate: -5 }} animate={{ opacity: 1, y: 0, rotate: -5 }} transition={{ duration: .7 }} className="mx-auto max-w-[390px] rounded-[30px] border border-white/20 bg-[#244333] p-7 shadow-premium"><div className="flex items-center justify-between"><span className="font-display font-bold">arotech.</span><Wallet className="text-lime" size={22}/></div><p className="mt-11 text-xs text-[#a9c2ae]">Beautiful finances begin here</p><p className="mt-2 font-display text-4xl font-bold tracking-[-.08em]">Your money.</p><p className="font-display text-4xl font-bold tracking-[-.08em] text-lime">Your future.</p><div className="mt-10 flex justify-between"><span className="rounded-full border border-white/20 px-3 py-2 text-xs font-bold">Clarity at every step</span><Sparkles size={22} className="text-lime"/></div></motion.div><div className="relative z-20 -mt-6 ml-auto mr-[-10px] flex w-[245px] items-center gap-3 rounded-[20px] bg-white p-4 text-ink shadow-premium"><div className="grid size-11 place-items-center rounded-2xl bg-[#e7f6dc]"><CheckCircle2 size={20} className="text-[#568c3d]"/></div><div><p className="text-xs font-bold">Made for you</p><p className="mt-1 text-[11px] text-sage">Simple. Smart. Seamless.</p></div></div></div><div className="relative z-10 max-w-[560px]"><p className="text-sm font-bold uppercase tracking-[.16em] text-lime">YOUR FINANCIAL SPACE</p><h2 className="mt-4 font-display text-4xl font-bold tracking-[-.07em]">Less friction.<br />A lot more freedom.</h2><p className="mt-4 max-w-[450px] text-sm leading-7 text-[#a4b9a8]">Designed to make the everyday feel effortless, so you can focus on what matters next.</p></div></div></div>;
}
export function RecoveryPage({ mode }: {
    mode: 'forgot' | 'reset' | 'verify';
}) {
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState<string | null>(null), [message, setMessage] = useState(''), [link, setLink] = useState(''), [loading, setLoading] = useState(false);
    async function submit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (mode === 'forgot') {
                const d = await apiPost<{
                    message: string;
                    developmentLink?: string;
                }>('/auth/forgot-password', { email });
                setMessage(d.message);
                if (d.developmentLink)
                    setLink(d.developmentLink);
            }
            if (mode === 'reset') {
                await apiPost('/auth/reset-password', { token, password });
                setMessage('Your password was updated. You can now sign in.');
            }
            if (mode === 'verify') {
                await apiPost('/auth/verify-email', { token });
                setMessage('Your email is verified! Please sign in again to refresh your account.');
            }
        }
        catch (e: any) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    }
    return <div className="grid min-h-dvh place-items-center bg-mist px-3 py-6 sm:px-4"><div className="w-full max-w-[470px] rounded-[26px] border border-line bg-white p-5 shadow-soft sm:rounded-[30px] sm:p-10"><Link to="/"><Logo /></Link><div className="mt-12 grid size-14 place-items-center rounded-2xl bg-[#e9f6dd]"><LockKeyhole size={24}/></div><h1 className="mt-6 font-display text-3xl font-bold tracking-[-.07em]">{mode === 'forgot' ? 'Recover your account' : mode === 'reset' ? 'Choose a new password' : 'Verify your email'}</h1><p className="mt-3 text-sm leading-7 text-sage">{mode === 'forgot' ? 'We’ll send you a link if your address is registered.' : mode === 'reset' ? 'Choose a strong new password to protect your account.' : 'Confirm ownership of your email address.'}</p><form onSubmit={submit} className="mt-8 space-y-4">{mode === 'forgot' && <Input label="Email address" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/>}{mode === 'reset' && <Input label="New password" type="password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 10 characters"/>}<ErrorText error={error}/>{message && <p className="rounded-xl bg-[#eaf6e3] p-4 text-sm font-semibold text-[#49743b]">{message}</p>}{link && <a className="block break-all text-xs font-bold text-[#487c3c] underline" href={link}>Development-only recovery link</a>}<Btn type="submit" variant="dark" className="w-full" loading={loading}>{mode === 'forgot' ? 'Send recovery link' : mode === 'reset' ? 'Reset password' : 'Verify email'} <ArrowRight size={17}/></Btn></form><Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-sage"><ArrowLeft size={16}/> Back to login</Link></div></div>;
}

