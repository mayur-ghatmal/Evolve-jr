import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, Truck, Building2, AlertTriangle, Activity, FileText, Plus, Loader, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/UI/ToastProvider'
import { Sidebar } from '../../components/Sidebar'
import { Profile, Emergency, Ambulance, Hospital, Log, SurgeEvent } from '../../lib/supabase'
import { format } from 'date-fns'

const PRIORITY_COLORS = { Critical: '#ff3b30', High: '#ff9500', Medium: '#ffcc00', Low: '#34c759' }
const PALETTE = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#ab47bc']

export default function AdminDashboard() {
    const { profile: adminProfile } = useAuth()
    const { showToast } = useToast()
    const [tab, setTab] = useState<'overview' | 'manage' | 'surge' | 'logs'>('overview')
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [emergencies, setEmergencies] = useState<Emergency[]>([])
    const [ambulances, setAmbulances] = useState<Ambulance[]>([])
    const [hospitals, setHospitals] = useState<Hospital[]>([])
    const [logs, setLogs] = useState<Log[]>([])
    const [surgeEvents, setSurgeEvents] = useState<SurgeEvent[]>([])
    const [loading, setLoading] = useState(false)

    // New ambulance form
    const [ambForm, setAmbForm] = useState({ driver_id: '', vehicle_number: '', lat: '', lng: '' })
    // New hospital form
    const [hospForm, setHospForm] = useState({ name: '', address: '', lat: '', lng: '', total_beds: '', icu_total: '', managed_by: '' })

    const loadAll = async () => {
        const [pRes, eRes, aRes, hRes, lRes, sRes] = await Promise.all([
            supabase.from('profiles').select('*').order('created_at', { ascending: false }),
            supabase.from('emergencies').select('*').order('created_at', { ascending: false }),
            supabase.from('ambulances').select('*'),
            supabase.from('hospitals').select('*'),
            supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(50),
            supabase.from('surge_events').select('*').order('detected_at', { ascending: false }),
        ])
        if (pRes.data) setProfiles(pRes.data as Profile[])
        if (eRes.data) setEmergencies(eRes.data as Emergency[])
        if (aRes.data) setAmbulances(aRes.data as Ambulance[])
        if (hRes.data) setHospitals(hRes.data as Hospital[])
        if (lRes.data) setLogs(lRes.data as Log[])
        if (sRes.data) setSurgeEvents(sRes.data as SurgeEvent[])
    }

    useEffect(() => { loadAll() }, [])

    const stats = [
        { label: 'Total Users', value: profiles.length, icon: <Users size={20} />, color: '#64b5f6' },
        { label: 'Total Cases', value: emergencies.length, icon: <AlertTriangle size={20} />, color: 'var(--red)' },
        { label: 'Ambulances', value: ambulances.length, icon: <Truck size={20} />, color: '#ff9500' },
        { label: 'Hospitals', value: hospitals.length, icon: <Building2 size={20} />, color: 'var(--green)' },
    ]

    const priorityData = ['Critical', 'High', 'Medium', 'Low'].map(p => ({
        name: p, count: emergencies.filter(e => e.priority_label === p).length
    }))

    const typeData = ['cardiac_arrest', 'severe_trauma', 'accident', 'fire', 'other'].map((t, i) => ({
        name: t.replace('_', ' '), count: emergencies.filter(e => e.type === t).length, fill: PALETTE[i]
    }))

    const avgResponseMs = (() => {
        const completed = emergencies.filter(e => e.status === 'completed')
        if (!completed.length) return 0
        const total = completed.reduce((s, e) => s + (new Date(e.updated_at).getTime() - new Date(e.created_at).getTime()), 0)
        return Math.round(total / completed.length / 60000)
    })()

    const createAmbulance = async () => {
        if (!ambForm.vehicle_number) return showToast('Vehicle number required', 'warning')
        setLoading(true)
        const { error } = await supabase.from('ambulances').insert({
            driver_id: ambForm.driver_id || null,
            vehicle_number: ambForm.vehicle_number,
            lat: parseFloat(ambForm.lat) || 0,
            lng: parseFloat(ambForm.lng) || 0,
        })
        setLoading(false)
        if (error) showToast(error.message, 'error')
        else { showToast('Ambulance created!', 'success'); setAmbForm({ driver_id: '', vehicle_number: '', lat: '', lng: '' }); loadAll() }
    }

    const createHospital = async () => {
        if (!hospForm.name) return showToast('Hospital name required', 'warning')
        setLoading(true)
        const { error } = await supabase.from('hospitals').insert({
            name: hospForm.name, address: hospForm.address,
            lat: parseFloat(hospForm.lat) || 0, lng: parseFloat(hospForm.lng) || 0,
            total_beds: parseInt(hospForm.total_beds) || 0, available_beds: parseInt(hospForm.total_beds) || 0,
            icu_total: parseInt(hospForm.icu_total) || 0, icu_available: parseInt(hospForm.icu_total) || 0,
            managed_by: hospForm.managed_by || null,
        })
        setLoading(false)
        if (error) showToast(error.message, 'error')
        else { showToast('Hospital created!', 'success'); setHospForm({ name: '', address: '', lat: '', lng: '', total_beds: '', icu_total: '', managed_by: '' }); loadAll() }
    }

    const resolveSurge = async (id: string) => {
        await supabase.from('surge_events').update({ active: false, resolved_at: new Date().toISOString() }).eq('id', id)
        showToast('Surge event resolved', 'success'); loadAll()
    }

    const drivers = profiles.filter(p => p.role === 'driver')
    const hospitalStaff = profiles.filter(p => p.role === 'hospital')

    const tabs = [
        { id: 'overview', label: '📊 Overview' },
        { id: 'manage', label: '⚙️ Manage' },
        { id: 'surge', label: '⚡ Surge Events' },
        { id: 'logs', label: '📋 Logs' },
    ] as const

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <div className="topbar">
                    <div>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700 }}>Admin Dashboard</h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{adminProfile?.name}</p>
                    </div>
                </div>

                {/* Tab Bar */}
                <div style={{ padding: '0 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', gap: 4 }}>
                    {tabs.map(t => (
                        <button key={t.id} className="btn btn-ghost btn-sm" onClick={() => setTab(t.id)}
                            style={{ borderRadius: '8px 8px 0 0', paddingBottom: 12, borderBottom: tab === t.id ? '2px solid var(--red)' : '2px solid transparent', color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="page-content">
                    {tab === 'overview' && (
                        <>
                            {/* Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                                {stats.map(s => (
                                    <div key={s.label} className="stat-card">
                                        <div className="stat-card-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
                                        <div className="stat-card-value">{s.value}</div>
                                        <div className="stat-card-label">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Avg Response Time */}
                            <div className="glass-card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
                                <Activity size={24} color="var(--green)" />
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Average Response Time</div>
                                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 700, color: 'var(--green)' }}>{avgResponseMs} min</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                                {/* Priority Chart */}
                                <div className="glass-card" style={{ padding: 20 }}>
                                    <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>Cases by Priority</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={priorityData} barCategoryGap="35%">
                                            <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                            <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                                {priorityData.map((d, i) => <Cell key={i} fill={PRIORITY_COLORS[d.name as keyof typeof PRIORITY_COLORS]} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Type Chart */}
                                <div className="glass-card" style={{ padding: 20 }}>
                                    <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>Cases by Type</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={typeData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }: any) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}>
                                                {typeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: 8 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Recent Emergencies */}
                            <div className="glass-card" style={{ padding: 20 }}>
                                <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Recent Emergencies</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {emergencies.slice(0, 8).map(e => (
                                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem' }}>
                                            <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{e.type.replace('_', ' ')}</span>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <span className={`badge badge-${e.priority_label.toLowerCase()}`}>{e.priority_label}</span>
                                                <span className={`badge badge-status-${e.status}`}>{e.status}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>{format(new Date(e.created_at), 'MMM dd, HH:mm')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'manage' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            {/* Create Ambulance */}
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Truck size={18} /> Add Ambulance</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="input-group">
                                        <label>Vehicle Number *</label>
                                        <input className="input-field" placeholder="MH-01-AB-1234" value={ambForm.vehicle_number} onChange={e => setAmbForm(p => ({ ...p, vehicle_number: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Assign Driver</label>
                                        <select className="input-field" value={ambForm.driver_id} onChange={e => setAmbForm(p => ({ ...p, driver_id: e.target.value }))}>
                                            <option value="">— None —</option>
                                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.email})</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div className="input-group">
                                            <label>Start Lat</label>
                                            <input className="input-field" type="number" placeholder="20.5937" value={ambForm.lat} onChange={e => setAmbForm(p => ({ ...p, lat: e.target.value }))} />
                                        </div>
                                        <div className="input-group">
                                            <label>Start Lng</label>
                                            <input className="input-field" type="number" placeholder="78.9629" value={ambForm.lng} onChange={e => setAmbForm(p => ({ ...p, lng: e.target.value }))} />
                                        </div>
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={createAmbulance} disabled={loading}>
                                        {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><Plus size={14} /> Create Ambulance</>}
                                    </button>
                                </div>

                                <hr className="divider" style={{ margin: '20px 0' }} />
                                <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10 }}>Existing ({ambulances.length})</h4>
                                {ambulances.map(a => (
                                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.8rem' }}>
                                        <span>{a.vehicle_number}</span>
                                        <span className={`badge ${a.status === 'available' ? 'badge-low' : a.status === 'busy' ? 'badge-high' : 'badge-status-cancelled'}`}>{a.status}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Create Hospital */}
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={18} /> Add Hospital</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="input-group">
                                        <label>Hospital Name *</label>
                                        <input className="input-field" placeholder="City General Hospital" value={hospForm.name} onChange={e => setHospForm(p => ({ ...p, name: e.target.value }))} />
                                    </div>
                                    <div className="input-group">
                                        <label>Address</label>
                                        <input className="input-field" placeholder="123 Main St, City" value={hospForm.address} onChange={e => setHospForm(p => ({ ...p, address: e.target.value }))} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div className="input-group">
                                            <label>Lat</label>
                                            <input className="input-field" type="number" placeholder="20.5" value={hospForm.lat} onChange={e => setHospForm(p => ({ ...p, lat: e.target.value }))} />
                                        </div>
                                        <div className="input-group">
                                            <label>Lng</label>
                                            <input className="input-field" type="number" placeholder="78.9" value={hospForm.lng} onChange={e => setHospForm(p => ({ ...p, lng: e.target.value }))} />
                                        </div>
                                        <div className="input-group">
                                            <label>Total Beds</label>
                                            <input className="input-field" type="number" placeholder="100" value={hospForm.total_beds} onChange={e => setHospForm(p => ({ ...p, total_beds: e.target.value }))} />
                                        </div>
                                        <div className="input-group">
                                            <label>ICU Beds</label>
                                            <input className="input-field" type="number" placeholder="10" value={hospForm.icu_total} onChange={e => setHospForm(p => ({ ...p, icu_total: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label>Assign Hospital Staff</label>
                                        <select className="input-field" value={hospForm.managed_by} onChange={e => setHospForm(p => ({ ...p, managed_by: e.target.value }))}>
                                            <option value="">— None —</option>
                                            {hospitalStaff.map(h => <option key={h.id} value={h.id}>{h.name} ({h.email})</option>)}
                                        </select>
                                    </div>
                                    <button className="btn btn-primary btn-sm" onClick={createHospital} disabled={loading}>
                                        {loading ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><Plus size={14} /> Create Hospital</>}
                                    </button>
                                </div>

                                <hr className="divider" style={{ margin: '20px 0' }} />
                                <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 10 }}>Existing ({hospitals.length})</h4>
                                {hospitals.map(h => (
                                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)', fontSize: '0.8rem' }}>
                                        <span>{h.name}</span>
                                        <span style={{ color: h.available_beds > 0 ? 'var(--green)' : 'var(--red)' }}>{h.available_beds} beds</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'surge' && (
                        <div>
                            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Surge Events</h3>
                            {surgeEvents.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No surge events recorded</div>}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {surgeEvents.map(ev => (
                                    <div key={ev.id} className={ev.active ? 'surge-banner' : 'glass-card'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{ev.active ? '🔴 ACTIVE' : '✅ RESOLVED'} – {ev.case_count} cases</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                Zone: {ev.zone_lat.toFixed(3)}, {ev.zone_lng.toFixed(3)} · Radius {ev.radius_km}km
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(ev.detected_at), 'MMM dd yyyy, HH:mm')}</div>
                                        </div>
                                        {ev.active && (
                                            <button className="btn btn-green btn-sm" onClick={() => resolveSurge(ev.id)}>
                                                <CheckCircle size={14} /> Resolve
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'logs' && (
                        <div>
                            <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={18} /> System Logs (last 50)</h3>
                            <div className="glass-card" style={{ overflow: 'hidden' }}>
                                {logs.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No logs yet</div>}
                                {logs.map(log => (
                                    <div key={log.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.action}</span>
                                            <span style={{ color: 'var(--text-muted)', marginLeft: 12, fontSize: '0.8rem' }}>
                                                {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                                            </span>
                                        </div>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap', marginLeft: 16 }}>{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
