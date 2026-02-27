import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { AlertTriangle, Truck, Building2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/UI/ToastProvider'
import { Sidebar } from '../../components/Sidebar'
import { Emergency, Ambulance, Hospital } from '../../lib/supabase'
import { getPriorityStyle, detectSurge } from '../../utils/priorityEngine'
import { format } from 'date-fns'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' })

export default function DispatcherDashboard() {
    const { profile } = useAuth()
    const { showToast } = useToast()
    const [emergencies, setEmergencies] = useState<Emergency[]>([])
    const [ambulances, setAmbulances] = useState<Ambulance[]>([])
    const [hospitals, setHospitals] = useState<Hospital[]>([])
    const [selected, setSelected] = useState<Emergency | null>(null)
    const [assigning, setAssigning] = useState<string | null>(null)
    const [surgeBanner, setSurgeBanner] = useState<{ count: number; zone: { lat: number; lng: number } } | null>(null)

    const loadAll = async () => {
        const [eRes, aRes, hRes] = await Promise.all([
            supabase.from('emergencies').select('*').in('status', ['pending', 'assigned', 'in_progress']).order('priority_score', { ascending: false }),
            supabase.from('ambulances').select('*'),
            supabase.from('hospitals').select('*'),
        ])
        if (eRes.data) {
            setEmergencies(eRes.data as Emergency[])
            const surge = detectSurge(eRes.data)
            setSurgeBanner(surge.isSurge && surge.zone ? { count: surge.count, zone: surge.zone } : null)
        }
        if (aRes.data) setAmbulances(aRes.data as Ambulance[])
        if (hRes.data) setHospitals(hRes.data as Hospital[])
    }

    useEffect(() => {
        loadAll()
        const sub = supabase.channel('dispatcher-live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'emergencies' }, loadAll)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulances' }, loadAll)
            .subscribe()
        return () => { sub.unsubscribe() }
    }, [])

    const assign = async (emergency: Emergency, ambulanceId: string, hospitalId: string) => {
        setAssigning(emergency.id)
        const { error } = await supabase.from('emergencies').update({
            assigned_ambulance: ambulanceId,
            assigned_hospital: hospitalId,
            status: 'assigned',
        }).eq('id', emergency.id)
        if (!error) {
            await supabase.from('ambulances').update({ status: 'busy' }).eq('id', ambulanceId)
            await supabase.from('logs').insert({ user_id: profile?.id, action: 'dispatch_assigned', details: { emergency_id: emergency.id, ambulance_id: ambulanceId } })
            showToast('Ambulance assigned!', 'success')
        } else showToast(error.message, 'error')
        setAssigning(null)
        setSelected(null)
    }

    const availableAmbulances = ambulances.filter(a => a.status === 'available')
    const stats = [
        { label: 'Active Cases', value: emergencies.length, icon: <AlertTriangle size={20} />, color: 'var(--red)' },
        { label: 'Available Ambulances', value: availableAmbulances.length, icon: <Truck size={20} />, color: '#ff9500' },
        { label: 'Hospitals Online', value: hospitals.filter(h => h.emergency_capacity).length, icon: <Building2 size={20} />, color: 'var(--green)' },
        { label: 'Pending', value: emergencies.filter(e => e.status === 'pending').length, icon: <Clock size={20} />, color: '#64b5f6' },
    ]

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <div className="topbar">
                    <div>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700 }}>Dispatcher Dashboard</h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{profile?.name} · Live View</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={loadAll}><RefreshCw size={14} /> Refresh</button>
                </div>

                <div className="page-content">
                    {/* Surge Banner */}
                    {surgeBanner && (
                        <div className="surge-banner" style={{ marginBottom: 20 }}>
                            <AlertTriangle className="surge-banner-icon" size={22} />
                            <div>
                                <div style={{ fontWeight: 700, color: 'var(--red)' }}>⚡ SURGE MODE ACTIVE</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {surgeBanner.count} emergencies detected in zone ({surgeBanner.zone.lat.toFixed(3)}, {surgeBanner.zone.lng.toFixed(3)})
                                </div>
                            </div>
                        </div>
                    )}

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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        {/* Live Cases */}
                        <div>
                            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: '1rem' }}>Live Cases</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 500, overflowY: 'auto' }}>
                                {emergencies.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No active cases</div>}
                                {emergencies.map(e => {
                                    const style = getPriorityStyle(e.priority_label as 'Critical' | 'High' | 'Medium' | 'Low')
                                    return (
                                        <div key={e.id} className={`emergency-card ${e.priority_label.toLowerCase()}`}
                                            style={{ cursor: 'pointer', outline: selected?.id === e.id ? `2px solid ${style.color}` : 'none' }}
                                            onClick={() => setSelected(e)}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ fontWeight: 600 }}>{e.type.replace('_', ' ').toUpperCase()}</span>
                                                <span className={`badge badge-${e.priority_label.toLowerCase()}`}>{e.priority_label} · {e.priority_score}pts</span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {e.description || '—'} · {format(new Date(e.created_at), 'HH:mm')}
                                            </div>
                                            <div style={{ marginTop: 8 }}>
                                                <span className={`badge badge-status-${e.status}`}>{e.status}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Assign Panel */}
                        <div>
                            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: '1rem' }}>
                                {selected ? `Assign: ${selected.type.replace('_', ' ')}` : 'Hospital Capacity'}
                            </h3>
                            {selected ? (
                                <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span className={`badge badge-${selected.priority_label.toLowerCase()}`}>{selected.priority_label}</span>
                                        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}>✕ Close</button>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selected.description}</div>
                                    <hr className="divider" />
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Available Ambulances</div>
                                    {availableAmbulances.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No ambulances available</div>}
                                    {availableAmbulances.map(a => (
                                        <button key={a.id} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', gap: 8 }}
                                            onClick={() => assign(selected, a.id, hospitals[0]?.id ?? '')}
                                            disabled={assigning === selected.id}>
                                            <Truck size={14} color="var(--green)" /> {a.vehicle_number} · Available
                                        </button>
                                    ))}
                                    <hr className="divider" />
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>Hospitals</div>
                                    {hospitals.map(h => (
                                        <div key={h.id} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                                            <span>{h.name}</span>
                                            <span style={{ color: h.available_beds > 0 ? 'var(--green)' : 'var(--red)' }}>{h.available_beds} beds</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {hospitals.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No hospitals registered</div>}
                                    {hospitals.map(h => (
                                        <div key={h.id} className="glass-card" style={{ padding: 16 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 8 }}>{h.name}</div>
                                            <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Beds: <span style={{ color: h.available_beds > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{h.available_beds}/{h.total_beds}</span></span>
                                                <span style={{ color: 'var(--text-muted)' }}>ICU: <span style={{ color: h.icu_available > 0 ? '#ab47bc' : 'var(--red)', fontWeight: 700 }}>{h.icu_available}/{h.icu_total}</span></span>
                                                {h.emergency_capacity ? <span style={{ color: 'var(--green)' }}><CheckCircle size={12} style={{ display: 'inline' }} /> Open</span> : <span style={{ color: 'var(--red)' }}><XCircle size={12} style={{ display: 'inline' }} /> Full</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Map */}
                    <div className="map-container" style={{ marginTop: 24 }}>
                        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: 300 }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {emergencies.map(e => (
                                <Marker key={e.id} position={[e.lat, e.lng]}>
                                    <Popup><b>{e.type}</b> – {e.priority_label}</Popup>
                                </Marker>
                            ))}
                            {ambulances.filter(a => a.status === 'available').map(a => (
                                <Marker key={a.id} position={[a.lat, a.lng]}>
                                    <Popup>🚑 {a.vehicle_number} – Available</Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
