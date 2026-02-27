import React, { useState, useEffect } from 'react'
import { BedDouble, Loader, CheckCircle, XCircle, Users, Activity } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/UI/ToastProvider'
import { Sidebar } from '../../components/Sidebar'
import { Hospital, Emergency } from '../../lib/supabase'
import { format } from 'date-fns'

export default function HospitalDashboard() {
    const { user, profile } = useAuth()
    const { showToast } = useToast()
    const [myHospital, setMyHospital] = useState<Hospital | null>(null)
    const [incomingPatients, setIncomingPatients] = useState<Emergency[]>([])
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [beds, setBeds] = useState({ available_beds: 0, total_beds: 0, icu_available: 0, icu_total: 0 })

    const loadData = async () => {
        if (!user) return
        const { data: h } = await supabase.from('hospitals').select('*').eq('managed_by', user.id).single()
        if (h) {
            setMyHospital(h as Hospital)
            setBeds({ available_beds: h.available_beds, total_beds: h.total_beds, icu_available: h.icu_available, icu_total: h.icu_total })
            const { data: em } = await supabase.from('emergencies').select('*').eq('assigned_hospital', h.id).in('status', ['assigned', 'in_progress']).order('created_at', { ascending: false })
            if (em) setIncomingPatients(em as Emergency[])
        }
    }

    useEffect(() => {
        loadData()
        const sub = supabase.channel('hospital-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'emergencies' }, loadData)
            .subscribe()
        return () => { sub.unsubscribe() }
    }, [user])

    const saveBeds = async () => {
        if (!myHospital) return
        setSaving(true)
        const { error } = await supabase.from('hospitals').update(beds).eq('id', myHospital.id)
        setSaving(false)
        if (error) showToast(error.message, 'error')
        else { showToast('Bed availability updated!', 'success'); setEditing(false); loadData() }
    }

    const acceptPatient = async (emergency: Emergency) => {
        const { error } = await supabase.from('emergencies').update({ status: 'in_progress' }).eq('id', emergency.id)
        if (!error) {
            await supabase.from('hospitals').update({ available_beds: Math.max(0, (myHospital?.available_beds ?? 1) - 1) }).eq('id', myHospital!.id)
            await supabase.from('logs').insert({ user_id: user?.id, action: 'patient_accepted', details: { emergency_id: emergency.id } })
            showToast('Patient accepted, bed allocated', 'success')
        } else showToast(error.message, 'error')
    }

    const rejectPatient = async (emergency: Emergency) => {
        const { error } = await supabase.from('emergencies').update({ assigned_hospital: null, status: 'assigned' }).eq('id', emergency.id)
        if (!error) {
            await supabase.from('logs').insert({ user_id: user?.id, action: 'patient_rejected', details: { emergency_id: emergency.id } })
            showToast('Patient redirected to dispatcher', 'warning')
        }
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <div className="topbar">
                    <div>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700 }}>Hospital Dashboard</h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{profile?.name}</p>
                    </div>
                </div>

                <div className="page-content">
                    {!myHospital ? (
                        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                            <BedDouble size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
                            <p>No hospital is linked to your account.</p>
                            <p style={{ fontSize: '0.85rem', marginTop: 8 }}>An admin needs to create a hospital record and assign it to you.</p>
                        </div>
                    ) : (
                        <>
                            {/* Hospital Info Card */}
                            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                    <div>
                                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>{myHospital.name}</h2>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{myHospital.address}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(e => !e)}>{editing ? 'Cancel' : 'Update Capacity'}</button>
                                        {editing && (
                                            <button className="btn btn-primary btn-sm" onClick={saveBeds} disabled={saving}>
                                                {saving ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Save'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Bed Stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                                    {[
                                        { label: 'Available Beds', key: 'available_beds', max: 'total_beds', icon: <BedDouble size={18} />, color: 'var(--green)' },
                                        { label: 'Total Beds', key: 'total_beds', icon: <BedDouble size={18} />, color: 'var(--text-muted)' },
                                        { label: 'ICU Available', key: 'icu_available', max: 'icu_total', icon: <Activity size={18} />, color: '#ab47bc' },
                                        { label: 'ICU Total', key: 'icu_total', icon: <Activity size={18} />, color: 'var(--text-muted)' },
                                    ].map(field => (
                                        <div key={field.key} className="stat-card">
                                            <div className="stat-card-icon" style={{ background: `${field.color}20`, color: field.color }}>{field.icon}</div>
                                            {editing ? (
                                                <input
                                                    type="number"
                                                    className="input-field"
                                                    value={beds[field.key as keyof typeof beds]}
                                                    onChange={e => setBeds(p => ({ ...p, [field.key]: parseInt(e.target.value) || 0 }))}
                                                    min={0}
                                                    style={{ marginTop: 4 }}
                                                />
                                            ) : (
                                                <div className="stat-card-value" style={{ color: field.color }}>{myHospital[field.key as keyof Hospital] as number}</div>
                                            )}
                                            <div className="stat-card-label">{field.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Emergency Capacity:</span>
                                    {myHospital.emergency_capacity
                                        ? <span style={{ color: 'var(--green)', fontSize: '0.9rem', fontWeight: 600 }}><CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> OPEN</span>
                                        : <span style={{ color: 'var(--red)', fontSize: '0.9rem', fontWeight: 600 }}><XCircle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> CLOSED</span>}
                                </div>
                            </div>

                            {/* Incoming Patients */}
                            <div>
                                <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Users size={18} /> Incoming Patients ({incomingPatients.length})
                                </h3>
                                {incomingPatients.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No incoming patients</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {incomingPatients.map(p => (
                                            <div key={p.id} className={`emergency-card ${p.priority_label.toLowerCase()}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                                                        {p.type.replace('_', ' ').toUpperCase()}
                                                        {p.is_elderly && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#ffcc00' }}>👴 Elderly</span>}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.description || '—'} · {format(new Date(p.created_at), 'HH:mm')}</div>
                                                    <span className={`badge badge-${p.priority_label.toLowerCase()}`} style={{ marginTop: 6 }}>{p.priority_label}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="btn btn-green btn-sm" onClick={() => acceptPatient(p)}>
                                                        <CheckCircle size={14} /> Accept
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => rejectPatient(p)}>
                                                        <XCircle size={14} /> Reject
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
