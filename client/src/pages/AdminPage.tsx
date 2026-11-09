import { useState, type ReactNode } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Activity, ArrowUpRight, ChevronRight, CircleAlert, Clock3, Search, ShieldCheck, Users, Wallet, Shield, FileClock, ArrowLeftRight, TrendingUp } from 'lucide-react';
import { apiGet, apiPatch, ngn, date, type User } from '../lib/api';
import { Btn, ErrorText, Modal, Sandbox, Surface, Avatar, Empty } from '../components/UI';
function useAdmin<T>(page: string) { return useQuery<T>({ queryKey: ['admin', page], queryFn: () => apiGet<T>(`/admin/${page}`) }); }
function Heading({ title, subtitle }: {
    title: string;
    subtitle: string;
}) { return <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><span className="eyebrow">AROTECH / OPERATIONS CENTER</span><h1 className="mt-2 break-words font-display text-[clamp(1.75rem,7vw,2.8rem)] font-bold tracking-[-.075em]">{title}</h1><p className="mt-2 text-sm text-sage">{subtitle}</p></div><Sandbox /></div>; }
function Loading({ query }: {
    query: any;
}) { if (query.isLoading)
    return <div className="grid animate-pulse grid-cols-1 gap-5 md:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-40 rounded-3xl bg-[#e3ebe0]"/>)}</div>; if (query.error)
    return <div className="rounded-2xl bg-red-50 p-6 text-red-700">{String(query.error.message)} <button onClick={() => query.refetch()} className="ml-2 underline">Retry</button></div>; return null; }
function Metric({ title, value, icon: Icon }: {
    title: string;
    value: string;
    icon: any;
}) { return <Surface><div className="flex items-center justify-between"><p className="text-xs font-semibold text-sage">{title}</p><span className="grid size-10 place-items-center rounded-2xl bg-[#eaf4e1]"><Icon size={19}/></span></div><p className="mt-9 break-words font-display text-[clamp(1.6rem,6vw,1.875rem)] font-bold tracking-[-.075em]">{value}</p></Surface>; }
function Overview() { const q = useAdmin<any>('overview'); const d = q.data; return <><Heading title="Command center." subtitle="Everything happening across Arotech, at a glance."/><Loading query={q}/>{d && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Registered customers" value={d.users.toLocaleString()} icon={Users}/><Metric title="Active customers" value={d.activeUsers.toLocaleString()} icon={ShieldCheck}/><Metric title="Wallet liabilities (test)" value={ngn(d.totalLiabilitiesMinor)} icon={Wallet}/><Metric title="Recorded transactions" value={d.transactions.toLocaleString()} icon={ArrowLeftRight}/><Metric title="Payment volume (test)" value={ngn(d.transactionVolumeMinor)} icon={TrendingUp}/><Metric title="Pending Paystack payments" value={String(d.pendingPayments)} icon={Clock3}/><Metric title="Failed Paystack payments" value={String(d.failedPayments)} icon={CircleAlert}/><Metric title="Environment" value="TEST ONLY" icon={Shield}/></div><div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Surface><div className="flex items-center justify-between"><h3 className="font-display text-xl font-bold">Latest transactions</h3><Link to="/admin/transactions" className="text-xs font-bold text-[#67964d]">View all</Link></div>{d.latest.length ? d.latest.map((t: any) => <div key={t._id} className="flex items-center gap-3 border-b border-line py-4 last:border-0"><span className="grid size-9 place-items-center rounded-xl bg-[#edf3e9]"><ArrowUpRight size={18}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{t.reference}</p><p className="mt-1 text-xs capitalize text-sage">{t.kind.replaceAll('_', ' ')} · {date(t.createdAt)}</p></div><p className="font-display text-sm font-bold">{ngn(t.amountMinor)}</p></div>) : <Empty title="No transactions" description="Activity will appear as users make sandbox payments."/>}</Surface><Surface><h3 className="font-display text-xl font-bold">Recently registered</h3>{d.growth.length ? d.growth.map((u: any) => <div key={u._id} className="flex items-center gap-3 border-b border-line py-4 last:border-0"><Avatar name={u.name} size="sm"/><p className="flex-1 text-sm font-bold">{u.name}</p><p className="text-xs text-sage">{date(u.createdAt)}</p></div>) : <Empty title="No customers yet" description="New accounts will appear here."/>}</Surface></div></>}</>; }
function DataTable({ head, rows }: {
    head: string[];
    rows: ReactNode[][];
}) { return <>
    {/* Mobile: readable labeled records with no sideways scrolling. */}
    <div className="space-y-3 p-3 sm:hidden">{rows.map((row, i) =>
        <div key={i} className="min-w-0 rounded-2xl border border-line bg-white p-4">
            {row.map((cell, j) => <div key={j} className="flex min-w-0 items-start justify-between gap-3 border-b border-line/70 py-2.5 last:border-b-0 last:pb-0 first:pt-0">
                <span className="max-w-[42%] shrink-0 text-[10px] font-bold uppercase tracking-wide text-sage">{head[j]}</span>
                <div className="min-w-0 max-w-[58%] break-words text-right text-xs font-semibold [overflow-wrap:anywhere]">{cell}</div>
            </div>)}
        </div>
    )}</div>
    {/* Wider screens: preserve full, scannable tabular data. */}
    <div className="hidden w-full overflow-x-auto sm:block"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-line bg-[#f6f9f3] text-[11px] font-extrabold uppercase tracking-wider text-sage"><tr>{head.map(x => <th key={x} className="px-5 py-4">{x}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1eb]">{rows.map((row, i) => <tr key={i} className="hover:bg-[#fbfdf9]">{row.map((c, j) => <td key={j} className="px-5 py-4 text-xs font-semibold">{c}</td>)}</tr>)}</tbody></table></div>
</>; }
function UsersPage({ kyc = false }: {
    kyc?: boolean;
}) { const q = useAdmin<User[]>('users'), qc = useQueryClient(), [search, setSearch] = useState(''), [selected, setSelected] = useState<User | null>(null), [reason, setReason] = useState(''), [nextKyc, setNextKyc] = useState('pending'), [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false); const users = (q.data || []).filter(u => `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())); async function changeStatus(u: User) { setBusy(true); try {
    await apiPatch(`/admin/users/${u.id}/status`, { status: u.status === 'active' ? 'suspended' : 'active' });
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    setSelected(null);
}
catch (e: any) {
    setError(e.message);
}
finally {
    setBusy(false);
} } async function updateKyc() { if (!selected)
    return; setBusy(true); try {
    await apiPatch(`/admin/users/${selected.id}/kyc`, { kycStatus: nextKyc, reason });
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    setSelected(null);
    setReason('');
}
catch (e: any) {
    setError(e.message);
}
finally {
    setBusy(false);
} } return <><Heading title={kyc ? 'KYC review workflow.' : 'Customer management.'} subtitle={kyc ? 'Track verification states. This version does not approve identities automatically.' : 'Review customer accounts, status, and access.'}/><Loading query={q}/><Surface className="!p-0"><div className="flex flex-col items-stretch gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><p className="font-display font-bold">Customers <span className="font-body text-xs text-sage">({users.length})</span></p><div className="relative w-full sm:w-[260px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage"/><input className="input-field mt-0 pl-9" placeholder="Search customers" value={search} onChange={e => setSearch(e.target.value)}/></div></div>{users.length ? <DataTable head={['Customer', 'Email', kyc ? 'KYC status' : 'Account status', 'Verified', 'Action']} rows={users.map(u => [<div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3"><Avatar name={u.name} size="sm"/><span className="min-w-0 break-words">{u.name}</span></div>, u.email, <span className="capitalize">{kyc ? u.kycStatus.replaceAll('_', ' ') : u.status}</span>, u.verified ? 'Yes' : 'No', <button onClick={() => { setSelected(u); setNextKyc(u.kycStatus); setError(null); }} className="font-extrabold text-[#598a43]">Review <ChevronRight size={14} className="inline"/></button>])}/> : <Empty title="No customers found" description="Try another name or email."/>}</Surface>{selected && <Modal title={kyc ? 'Review customer KYC' : 'Review customer'} onClose={() => setSelected(null)}><div className="space-y-4"><div className="flex items-center gap-3"><Avatar name={selected.name} size="lg"/><div><p className="font-display text-xl font-bold">{selected.name}</p><p className="text-xs text-sage">{selected.email}</p></div></div><div className="rounded-xl bg-mist p-4 text-xs leading-6"><p>Account status: <b>{selected.status}</b></p><p>KYC: <b>{selected.kycStatus}</b></p><p>Email verified: <b>{selected.verified ? 'Yes' : 'No'}</b></p></div>{kyc ? <><label className="block text-sm font-bold">Review state<select className="input-field" value={nextKyc} onChange={e => setNextKyc(e.target.value)}>{[['not_started', 'Not started'], ['pending', 'Pending review'], ['more_info', 'Additional information needed'], ['rejected', 'Rejected']].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="block text-sm font-bold">Decision reason<textarea className="input-field" rows={3} minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)}/></label><p className="text-xs leading-6 text-sage">Approved verification is intentionally disabled pending identity verification integration and authorized evidence review.</p><ErrorText error={error}/><Btn variant="dark" className="w-full" disabled={reason.length < 5} loading={busy} onClick={updateKyc}>Save review state</Btn></> : <><p className="text-xs leading-6 text-sage">Suspending a customer revokes all active sessions immediately. Financial balances remain unchanged.</p><ErrorText error={error}/><Btn variant="dark" className="w-full" loading={busy} onClick={() => changeStatus(selected)}>{selected.status === 'active' ? 'Suspend customer' : 'Reactivate customer'}</Btn></>}</div></Modal>}</>; }
function Wallets() { const q = useAdmin<any[]>('wallets'); return <><Heading title="Wallet operations." subtitle="Read-only view of all test wallet liabilities. Direct balance editing is disabled."/><Loading query={q}/><Surface className="!p-0">{q.data?.length ? <DataTable head={['Customer', 'Email', 'Balance (sandbox)', 'Currency', 'Updated']} rows={q.data.map(a => [a.ownerId?.name || 'Unknown', a.ownerId?.email || '—', ngn(a.balanceMinor), a.currency, date(a.updatedAt)])}/> : !q.isLoading && <Empty title="No wallet records" description="New account wallets will appear here."/>}</Surface></>; }
function AdminTransactions() { const q = useAdmin<any[]>('transactions'); return <><Heading title="All transactions." subtitle="Inspect posted sandbox movements, amounts, and references."/><Loading query={q}/><Surface className="!p-0">{q.data?.length ? <DataTable head={['Reference', 'Type', 'From', 'To', 'Amount', 'Status', 'Date']} rows={q.data.map(t => [t.reference, <span className="capitalize">{t.kind.replaceAll('_', ' ')}</span>, t.senderId?.name || '—', t.recipientId?.name || '—', ngn(t.amountMinor), t.status, date(t.createdAt)])}/> : !q.isLoading && <Empty title="No transactions" description="Once customers make sandbox moves they'll appear here."/>}</Surface></>; }
function Payments() { const q = useAdmin<any[]>('payments'); return <><Heading title="Payment operations." subtitle="View Paystack test payment intents and their verification states."/><Loading query={q}/><Surface className="!p-0">{q.data?.length ? <DataTable head={['Reference', 'Customer', 'Amount', 'Provider', 'Status', 'Created']} rows={q.data.map(t => [t.reference, t.userId?.name || 'Unknown', ngn(t.amountMinor), t.provider, t.status, date(t.createdAt)])}/> : !q.isLoading && <Empty title="No provider payments" description="Paystack test-mode payments will be tracked here."/>}</Surface></>; }
function AdminGoals() { const q = useAdmin<any[]>('goals'); return <><Heading title="Customer savings." subtitle="Monitor goals and the amounts allocated to them."/><Loading query={q}/><Surface className="!p-0">{q.data?.length ? <DataTable head={['Customer', 'Goal', 'Target', 'Saved', 'Progress', 'Status']} rows={q.data.map(g => [g.ownerId?.name || '—', g.name, ngn(g.targetMinor), ngn(g.savedMinor), `${Math.round(g.savedMinor / g.targetMinor * 100)}%`, g.status])}/> : !q.isLoading && <Empty title="No savings goals yet" description="Customer savings goals will appear here."/>}</Surface></>; }
function AdminSupport() { const q = useAdmin<any[]>('tickets'), qc = useQueryClient(), [selected, setSelected] = useState<any>(null), [status, setStatus] = useState('open'), [reply, setReply] = useState(''), [error, setError] = useState<string | null>(null); async function save() { if (!selected)
    return; try {
    await apiPatch(`/admin/tickets/${selected._id}`, { status, reply });
    qc.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    setSelected(null);
}
catch (e: any) {
    setError(e.message);
} } return <><Heading title="Support requests." subtitle="Review and respond to customer conversations."/><Loading query={q}/><Surface className="!p-0">{q.data?.length ? <DataTable head={['Customer', 'Subject', 'Status', 'Received', 'Action']} rows={q.data.map(t => [t.userId?.name || '—', t.subject, <span className="capitalize">{t.status.replaceAll('_', ' ')}</span>, date(t.createdAt), <button className="font-bold text-[#608e48]" onClick={() => { setSelected(t); setStatus(t.status); setReply(t.reply || ''); }}>Respond</button>])}/> : !q.isLoading && <Empty title="No support requests" description="Customer questions will show up here."/>}</Surface>{selected && <Modal title="Respond to request" onClose={() => setSelected(null)}><p className="font-bold">{selected.subject}</p><p className="mt-2 text-sm leading-7 text-sage">{selected.message}</p><div className="mt-5 space-y-4"><label className="block text-sm font-bold">Status<select className="input-field" value={status} onChange={e => setStatus(e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label><label className="block text-sm font-bold">Response<textarea rows={4} className="input-field" value={reply} onChange={e => setReply(e.target.value)} maxLength={1000}/></label><ErrorText error={error}/><Btn variant="dark" className="w-full" onClick={save}>Save response</Btn></div></Modal>}</>; }
function AdminAudit() { const q = useAdmin<any[]>('audit'); return <><Heading title="Audit trail." subtitle="Sensitive admin actions are tracked with actor, event, and timestamp."/><Loading query={q}/><Surface className="!p-0">{q.data?.length ? <DataTable head={['Actor', 'Action', 'Target', 'Details', 'When']} rows={q.data.map(a => [a.actorId?.email || 'System', a.action, a.targetId || '—', JSON.stringify(a.details || {}).slice(0, 150), date(a.createdAt)])}/> : !q.isLoading && <Empty title="No audit events" description="Admin actions will be recorded here."/>}</Surface></>; }
function Reconciliation() { const q = useAdmin<any>('reconciliation'); return <><Heading title="Reconciliation." subtitle="Integrity visibility for sandbox journal records, not external settlement certification."/><Loading query={q}/>{q.data && <><div className="grid gap-5 sm:grid-cols-2"><Metric title="Posted journals" value={String(q.data.postedJournals)} icon={FileClock}/><Metric title="Transactions linked to journals" value={String(q.data.linkedTransactions)} icon={Activity}/></div><div className="mt-6"><Surface><h3 className="font-display text-xl font-bold">Settlement reconciliation status</h3><p className="mt-3 text-sm leading-7 text-sage">{q.data.note}</p><p className="mt-4 text-xs text-sage">A proper production settlement reconciliation feature must import and compare Paystack payout statements with recorded deposits and bank settlement data.</p></Surface></div></>}</>; }
function AdminSettings() { const q = useAdmin<any>('settings'); return <><Heading title="System settings." subtitle="Operational capabilities and safety boundaries currently in force."/><Loading query={q}/>{q.data && <Surface><div className="max-w-2xl space-y-5">{[['Environment', q.data.mode.toUpperCase()], ['Currency', q.data.currency], ['Real-money services', q.data.realMoneyEnabled ? 'Enabled' : 'Disabled'], ['External bank transfers', q.data.externalTransfersEnabled ? 'Enabled' : 'Disabled'], ['Live card issuance', q.data.cardIssuanceEnabled ? 'Enabled' : 'Disabled']].map(([k, v]) => <div key={k} className="flex items-center justify-between border-b border-line pb-4"><span className="text-sm text-sage">{k}</span><b className="text-sm">{v}</b></div>)}<p className="text-sm leading-7 text-sage">Financial feature flags are server enforced. Modify validated environment configuration and redeploy the backend to change supported capabilities. Real-money operations are intentionally not implemented.</p></div></Surface>}</>; }
function AdminAnalytics() { const q = useAdmin<any>('overview'); return <><Heading title="Platform analytics." subtitle="Operational metrics derived from live sandbox database records."/><Loading query={q}/>{q.data && <><div className="grid gap-5 md:grid-cols-3"><Metric title="Customers" value={String(q.data.users)} icon={Users}/><Metric title="Active customer ratio" value={q.data.users ? `${Math.round(q.data.activeUsers / q.data.users * 100)}%` : '0%'} icon={TrendingUp}/><Metric title="Successful transaction count" value={String(q.data.transactions)} icon={Activity}/></div><Surface className="mt-6"><h3 className="font-display text-xl font-bold">Recent user additions</h3><p className="mt-2 text-sm text-sage">Latest customer registrations on this environment.</p><div className="mt-6 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={[...q.data.growth].reverse().map((u: any, i: number) => ({ day: date(u.createdAt), accounts: i + 1 }))}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9eee6"/><XAxis dataKey="day" tick={{ fontSize: 10 }}/><YAxis allowDecimals={false} tick={{ fontSize: 10 }}/><Tooltip /><Area type="monotone" dataKey="accounts" stroke="#7cab50" strokeWidth={3} fill="#d8efc0"/></AreaChart></ResponsiveContainer></div></Surface></>}</>; }
export function AdminPage({ page: forced }: {
    page?: string;
}) { const params = useParams(); const page = forced || params.page || 'overview'; switch (page) {
    case 'overview': return <Overview />;
    case 'users': return <UsersPage />;
    case 'kyc': return <UsersPage kyc/>;
    case 'wallets': return <Wallets />;
    case 'transactions': return <AdminTransactions />;
    case 'payments': return <Payments />;
    case 'goals': return <AdminGoals />;
    case 'support': return <AdminSupport />;
    case 'audit': return <AdminAudit />;
    case 'reconciliation': return <Reconciliation />;
    case 'settings': return <AdminSettings />;
    case 'analytics': return <AdminAnalytics />;
    default: return <div><Heading title="Not found" subtitle="The requested operations page does not exist."/><Link to="/admin" className="font-bold text-[#568542]">Go to overview</Link></div>;
} }

