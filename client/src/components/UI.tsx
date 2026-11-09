import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check, LoaderCircle, X, ShieldCheck } from 'lucide-react';
import { ngn, type Tx, type User, initials, date } from '../lib/api';
export function Logo({ light = false }: {
    light?: boolean;
}) { return <span className="inline-flex items-center gap-2.5 font-display text-[25px] font-bold tracking-[-.085em]"><span className={`grid size-9 place-items-center rounded-[12px] ${light ? 'bg-lime text-ink' : 'bg-ink text-lime'}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19L10.6 4.5H13.4L20 19M6.5 14H17.5" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="18.5" cy="5.5" r="2" fill="currentColor"/></svg></span>aro<span className="-ml-2 text-sage">tech</span></span>; }
export function Btn({ children, variant = 'primary', className = '', loading, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'dark' | 'outline' | 'ghost' | 'white';
    loading?: boolean;
}) { const styles = { primary: 'bg-lime text-ink hover:bg-[#b2eb4c]', dark: 'bg-ink text-white hover:bg-forest', outline: 'border border-line text-ink hover:border-ink hover:bg-white', ghost: 'text-ink hover:bg-[#eaf0e7]', white: 'bg-white text-ink hover:bg-mist' }; return <button {...rest} disabled={loading || rest.disabled} className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold transition-all duration-200 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${styles[variant]} ${className}`}>{loading ? <LoaderCircle size={17} className="animate-spin"/> : null}{children}</button>; }
export function Input({ label, help, ...p }: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    help?: string;
}) { return <label className="block space-y-2 text-sm font-bold text-ink">{label}<input {...p} className={`input-field ${p.className || ''}`}/>{help ? <span className="block text-xs font-medium text-sage">{help}</span> : null}</label>; }
export function Surface({ children, className = '' }: {
    children: ReactNode;
    className?: string;
}) { return <section className={`min-w-0 rounded-[24px] border border-[#e6ece6] bg-white p-4 sm:p-6 ${className}`}>{children}</section>; }
export function SectionTitle({ eyebrow, title, desc }: {
    eyebrow: string;
    title: string;
    desc?: string;
}) { return <div className="max-w-[680px]"><span className="eyebrow">{eyebrow}</span><h2 className="mt-4 font-display text-[clamp(2.1rem,8vw,4.75rem)] font-bold leading-[.98] tracking-[-.075em] text-ink">{title}</h2>{desc && <p className="mt-5 max-w-[550px] text-base leading-8 text-sage">{desc}</p>}</div>; }
export function Reveal({ children, className = '', delay = 0 }: {
    children: ReactNode;
    className?: string;
    delay?: number;
}) { return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay, ease: [.22, 1, .36, 1] }} viewport={{ once: true, amount: .15 }} className={className}>{children}</motion.div>; }
export function Sandbox({ compact = false }: {
    compact?: boolean;
}) { return <span className={`inline-flex items-center gap-1.5 rounded-full border border-[#d5e8cc] bg-[#eef9e8] px-3 py-1.5 font-bold text-[#497b31] ${compact ? 'text-[10px]' : 'text-[11px]'}`}><ShieldCheck size={13}/> SANDBOX · TEST FUNDS</span>; }
export function Avatar({ name, size = 'md' }: {
    name?: string;
    size?: 'sm' | 'md' | 'lg';
}) { return <div className={`grid shrink-0 place-items-center rounded-full bg-[#e8f1e3] font-display font-bold text-[#477740] ${size === 'sm' ? 'size-9 text-xs' : size === 'lg' ? 'size-14 text-lg' : 'size-11 text-sm'}`}>{initials(name)}</div>; }
export function TxRow({ t, user }: {
    t: Tx;
    user?: User;
}) { const incoming = ['funding', 'sandbox_credit'].includes(t.kind) || t.kind === 'transfer' && String(t.recipientId) === user?.id; const transfer = t.kind === 'transfer'; const title = t.description || (transfer ? (incoming ? 'Money received' : 'Money sent') : t.kind.replaceAll('_', ' ')); return <div className="flex min-w-0 items-center gap-2 border-b border-[#f0f2ef] py-3.5 last:border-b-0 sm:gap-3"><div className={`grid size-10 shrink-0 place-items-center rounded-2xl ${incoming ? 'bg-[#eaf5d9] text-[#457c30]' : 'bg-[#f1f2ee] text-ink'}`}>{incoming ? <ArrowUpRight size={19} className="rotate-90"/> : <ArrowUpRight size={19}/>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold capitalize">{title}</p><p className="mt-1 text-xs text-sage">{date(t.createdAt)} · {t.kind.replaceAll('_', ' ')}</p></div><div className="max-w-[44%] min-w-0 shrink-0 text-right"><p className={`break-words font-display text-[12px] font-bold tabular-nums sm:text-sm ${incoming ? 'text-[#377b31]' : 'text-ink'}`}>{incoming ? '+' : '−'}{ngn(t.amountMinor)}</p><p className="mt-1 text-[10px] font-semibold text-sage">{t.status}</p></div></div>; }
export function Modal({ title, onClose, children }: {
    title: string;
    onClose: () => void;
    children: ReactNode;
}) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07130bb9] p-3 backdrop-blur-sm sm:p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget)
    onClose(); }}><motion.div initial={{ opacity: 0, y: 15, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} role="dialog" aria-modal="true" aria-label={title} className="arotech-modal max-h-[calc(100dvh-1.5rem)] w-full max-w-[490px] overflow-y-auto overscroll-contain rounded-[24px] bg-white p-4 shadow-premium sm:rounded-[28px] sm:p-6"><div className="mb-6 flex items-start justify-between gap-3"><h3 className="font-display text-xl sm:text-2xl font-bold tracking-[-.05em]">{title}</h3><button aria-label="Close" onClick={onClose} className="shrink-0 rounded-full p-2 hover:bg-mist"><X size={20}/></button></div>{children}</motion.div></div>; }
export function ErrorText({ error }: {
    error: string | null;
}) { return error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null; }
export function Empty({ title, description }: {
    title: string;
    description: string;
}) { return <div className="flex flex-col items-center justify-center px-5 py-12 text-center"><div className="mb-4 grid size-14 place-items-center rounded-2xl bg-mist text-forest"><Check size={24}/></div><p className="font-display text-lg font-bold">{title}</p><p className="mt-2 max-w-xs text-sm text-sage">{description}</p></div>; }
export function FieldForm({ onSubmit, children }: {
    onSubmit: (e: FormEvent) => void;
    children: ReactNode;
}) { return <form onSubmit={onSubmit} className="space-y-4">{children}</form>; }

