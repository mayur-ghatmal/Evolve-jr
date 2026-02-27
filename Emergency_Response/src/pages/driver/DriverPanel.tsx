import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { CheckCircle, XCircle, Navigation, User, Building2, Loader } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/UI/ToastProvider'
import { Sidebar } from '../../components/Sidebar'
import { Emergency, Ambulance, Hospital } from '../../lib/supabase'
import { format } from 'date-fns'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' })

export default function DriverPanel() {
    const { user, profile } = useAuth()
    const { showToast } = useToast()
    const [myAmbulance, setMyAmbulance] = useState<Ambulance | null>(null)
    const [assignedCase, setAssignedCase] = useState<Emergency | null>(null)
    const [hospital, setHospital] = useState<Hospital | null>(null)
    const [updating, setUpdating] = useState(false)
    const [status, setStatus] = useState<'available' | 'busy' | 'offline'>('available')

    const loadData = async () => {
        if (!user) return
        const { data: amb } = await supabase.from('ambulances').select('*').eq('driver_id', user.id).single()
        if (amb) {
            setMyAmbulance(amb as Ambulance)
            setStatus((amb as Ambulance).status as 'available' | 'busy' | 'offline')
            const { data: em } = await supabase.from('emergencies').select('*').eq('assigned_ambulance', amb.id).in('status', ['assigned', 'in_progress']).single()
            if (em) {
                setAssignedCase(em as Emergency)
                if (em.assigned_hospital) {
                    const { data: h } = await supabase.from('hospitals').select('*').eq('id', em.assigned_hospital).single()
                    if (h) setHospital(h as Hospital)
                }
            } else {
                setAssignedCase(null)
                setHospital(null)
            }
        }
    }

    useEffect(() => {
        loadData()
        const sub = supabase.channel('driver-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulances' }, loadData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'emergencies' }, loadData)
            .subscribe()
        return () => { sub.unsubscribe() }
    }, [user])

    const updateCaseStatus = async (newStatus: Emergency['status']) => {
        if (!assignedCase) return
        setUpdating(true)
        const { error } = await supabase.from('emergencies').update({ status: newStatus }).eq('id', assignedCase.id)
        if (!error) {
            if (newStatus === 'completed' || newStatus === 'cancelled') {
                await supabase.from('ambulances').update({ status: 'available' }).eq('id', myAmbulance!.id)
            }
            await supabase.from('logs').insert({ user_id: user?.id, action: 'case_status_update', details: { case_id: assignedCase.id, new_status: newStatus } })
            showToast(`Case marked as ${newStatus}`, 'success')
            loadData()
        } else showToast(error.message, 'error')
        setUpdating(false)
    }

    const updateDriverStatus = async (s: 'available' | 'offline') => {
        if (!myAmbulance) return showToast('No ambulance assigned to your account', 'warning')
        await supabase.from('ambulances').update({ status: s }).eq('id', myAmbulance.id)
        setStatus(s)
        showToast(`Status set to ${s}`, 'success')
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <div className="topbar">
                    <div>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700 }}>Driver Panel</h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{profile?.name}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-green btn-sm" onClick={() => updateDriverStatus('available')}>✓ Go Available</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => updateDriverStatus('offline')}>✗ Go Offline</button>
                    </div>
                </div>

                <div className="page-content">
                    {/* Status Card */}
                    {myAmbulance && (
                        <div className="glass-card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 24, alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>VEHICLE</div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{myAmbulance.vehicle_number}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>STATUS</div>
                                <span className={`badge ${status === 'available' ? 'badge-low' : status === 'busy' ? 'badge-high' : 'badge-status-cancelled'}`}>
                                    {status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    )}

                    {!myAmbulance && (
                        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                            <Building2 size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
                            <p>No ambulance assigned to your account yet.</p>
                            <p style={{ fontSize: '0.85rem', marginTop: 8 }}>Contact your administrator to get assigned.</p>
                        </div>
                    )}

                    {assignedCase && (
                        <div>
                            {/* Assigned Case Details */}
                            <div className={`emergency-card ${assignedCase.priority_label.toLowerCase()}`} style={{ marginBottom: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>🚨 {assignedCase.type.replace('_', ' ').toUpperCase()}</span>
                                    <span className={`badge badge-${assignedCase.priority_label.toLowerCase()}`}>{assignedCase.priority_label}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <User size={14} /> {assignedCase.description || 'No description provided'}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <Navigation size={14} /> Location: {assignedCase.lat.toFixed(4)}, {assignedCase.lng.toFixed(4)}
                                    </div>
                                    {assignedCase.is_elderly && (
                                        <span style={{ fontSize: '0.8rem', color: '#ffcc00' }}>⚠️ Elderly patient – handle with care</span>
                                    )}
                                    {hospital && (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.85rem' }}>
                                            <Building2 size={14} color="var(--green)" /> Destination: <span style={{ color: 'var(--green)', fontWeight: 600 }}>{hospital.name}</span>
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Assigned at {format(new Date(assignedCase.updated_at), 'HH:mm')}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {assignedCase.status === 'assigned' && (
                                        <button className="btn btn-primary btn-sm" onClick={() => updateCaseStatus('in_progress')} disabled={updating}>
                                            {updating ? <Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : '▶ Start Journey'}
                                        </button>
                                    )}
                                    {assignedCase.status === 'in_progress' && (
                                        <button className="btn btn-green btn-sm" onClick={() => updateCaseStatus('completed')} disabled={updating}>
                                            <CheckCircle size={14} /> Mark Completed
                                        </button>
                                    )}
                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => updateCaseStatus('cancelled')} disabled={updating}>
                                        <XCircle size={14} /> Cancel
                                    </button>
                                </div>
                            </div>

                            {/* Navigation Map */}
                            <div className="map-container">
                                <MapContainer center={[assignedCase.lat, assignedCase.lng]} zoom={14} style={{ height: 340 }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={[assignedCase.lat, assignedCase.lng]}>
                                        <Popup>🚨 Emergency location</Popup>
                                    </Marker>
                                    {hospital && <Marker position={[hospital.lat, hospital.lng]}><Popup>🏥 {hospital.name}</Popup></Marker>}
                                </MapContainer>
                            </div>
                        </div>
                    )}

                    {myAmbulance && !assignedCase && (
                        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                            <CheckCircle size={40} style={{ color: 'var(--green)', opacity: 0.6, marginBottom: 12 }} />
                            <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 8 }}>No Active Assignment</p>
                            <p style={{ fontSize: '0.85rem' }}>Stay on standby. You'll receive a dispatch when needed.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
