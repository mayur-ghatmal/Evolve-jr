import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, AlertCircle, Upload, Clock, CheckCircle, Loader, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/UI/ToastProvider'
import { Sidebar } from '../../components/Sidebar'
import { calculatePriority } from '../../utils/priorityEngine'
import { Emergency } from '../../lib/supabase'
import { format } from 'date-fns'

// Fix leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' })

function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng) } })
    return null
}

const STATUS_COLORS: Record<string, string> = {
    pending: '#64b5f6', assigned: '#ff9800', in_progress: '#ab47bc', completed: 'var(--green)', cancelled: 'var(--text-muted)',
}

export default function CallerDashboard() {
    const { user, profile } = useAuth()
    const { showToast } = useToast()
    const [myEmergencies, setMyEmergencies] = useState<Emergency[]>([])
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [imgLoading, setImgLoading] = useState(false)
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [form, setForm] = useState({ type: 'accident' as Emergency['type'], description: '', is_elderly: false, image_url: '' })
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!user) return
        supabase.from('emergencies').select('*').eq('caller_id', user.id).order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setMyEmergencies(data as Emergency[]) })

        // Realtime subscription
        const sub = supabase.channel('caller-emergencies')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'emergencies', filter: `caller_id=eq.${user.id}` }, () => {
                supabase.from('emergencies').select('*').eq('caller_id', user.id).order('created_at', { ascending: false })
                    .then(({ data }) => { if (data) setMyEmergencies(data as Emergency[]) })
            }).subscribe()
        return () => { sub.unsubscribe() }
    }, [user])

    const detectLocation = () => {
        navigator.geolocation.getCurrentPosition(pos => {
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            showToast('Location detected!', 'success')
        }, () => showToast('Could not detect location, please click on map', 'warning'))
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setImgLoading(true)
        const path = `${user!.id}/${Date.now()}-${file.name}`
        const { error } = await supabase.storage.from('incident-images').upload(path, file)
        if (error) { showToast('Image upload failed', 'error'); setImgLoading(false); return }
        const { data: { publicUrl } } = supabase.storage.from('incident-images').getPublicUrl(path)
        setForm(p => ({ ...p, image_url: publicUrl }))
        setImgLoading(false)
        showToast('Image uploaded!', 'success')
    }

    const handleSOSSubmit = async () => {
        if (!location) return showToast('Please select your location on the map or use auto-detect', 'warning')
        setLoading(true)
        const priority = calculatePriority({ type: form.type, isElderly: form.is_elderly, distanceKm: 0 })
        const { error } = await supabase.from('emergencies').insert({
            caller_id: user!.id,
            lat: location.lat,
            lng: location.lng,
            type: form.type,
            description: form.description,
            is_elderly: form.is_elderly,
            priority_score: priority.score,
            priority_label: priority.label,
            image_url: form.image_url,
        })
        setLoading(false)
        if (error) { showToast(error.message, 'error'); return }
        showToast('🚨 Emergency reported! Help is on the way.', 'success')
        setShowForm(false)
        setForm({ type: 'accident', description: '', is_elderly: false, image_url: '' })
        setLocation(null)
    }

    const activeCase = myEmergencies.find(e => ['pending', 'assigned', 'in_progress'].includes(e.status))

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <div className="topbar">
                    <div>
                        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 700 }}>Emergency Caller</h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Welcome, {profile?.name}</p>
                    </div>
                    <button className="sos-btn" style={{ width: 80, height: 80, fontSize: '1rem' }} onClick={() => setShowForm(true)}>
                        SOS
                    </button>
                </div>

                <div className="page-content">
                    {/* Active Case Banner */}
                    {activeCase && (
                        <div style={{ marginBottom: 20, background: 'rgba(229,57,53,0.1)', border: '1.5px solid var(--red)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <AlertCircle color="var(--red)" size={20} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>Active Emergency – {activeCase.type.replace('_', ' ').toUpperCase()}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Status: <span style={{ color: STATUS_COLORS[activeCase.status] }}>{activeCase.status.replace('_', ' ')}</span> | Created {format(new Date(activeCase.created_at), 'HH:mm')}
                                    </div>
                                </div>
                            </div>
                            <span className={`badge badge-${activeCase.priority_label.toLowerCase()}`}>{activeCase.priority_label}</span>
                        </div>
                    )}

                    {/* Map */}
                    <div className="map-container" style={{ marginBottom: 24 }}>
                        <MapContainer center={location ?? [20.5937, 78.9629]} zoom={location ? 14 : 5} style={{ height: 340 }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            {location && <Marker position={[location.lat, location.lng]}><Popup>Your location</Popup></Marker>}
                            {myEmergencies.filter(e => e.status !== 'completed').map(e => (
                                <Marker key={e.id} position={[e.lat, e.lng]}>
                                    <Popup><b>{e.type}</b><br />{e.status}</Popup>
                                </Marker>
                            ))}
                            <LocationPicker onPick={(lat, lng) => setLocation({ lat, lng })} />
                        </MapContainer>
                    </div>

                    {/* SOS Form Modal */}
                    {showForm && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                            <div className="glass-card" style={{ width: '100%', maxWidth: 520, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                                    <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.3rem' }}>🚨 Report Emergency</h2>
                                    <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div className="input-group">
                                        <label>Emergency Type</label>
                                        <select className="input-field" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as Emergency['type'] }))}>
                                            <option value="cardiac_arrest">🫀 Cardiac Arrest</option>
                                            <option value="severe_trauma">🩹 Severe Trauma</option>
                                            <option value="accident">🚗 Road Accident</option>
                                            <option value="fire">🔥 Fire</option>
                                            <option value="other">🆘 Other</option>
                                        </select>
                                    </div>

                                    <div className="input-group">
                                        <label>Description</label>
                                        <textarea className="input-field" rows={3} placeholder="Describe the emergency..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                                    </div>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={form.is_elderly} onChange={e => setForm(p => ({ ...p, is_elderly: e.target.checked }))} />
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Patient is elderly (60+)</span>
                                    </label>

                                    <div>
                                        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={detectLocation} style={{ flex: 1 }}>
                                                <MapPin size={14} /> Auto-Detect Location
                                            </button>
                                        </div>
                                        {location && <div style={{ fontSize: '0.8rem', color: 'var(--green)' }}><CheckCircle size={12} style={{ display: 'inline' }} /> Location set: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</div>}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>Or click on the map to set location</div>
                                    </div>

                                    <div>
                                        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={imgLoading}>
                                            {imgLoading ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Uploading...</> : <><Upload size={14} /> Upload Incident Photo</>}
                                        </button>
                                        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                                        {form.image_url && <div style={{ marginTop: 8 }}><img src={form.image_url} alt="incident" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} /></div>}
                                    </div>

                                    <button className="btn btn-primary" onClick={handleSOSSubmit} disabled={loading || !location} style={{ marginTop: 8 }}>
                                        {loading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Submitting...</> : '🚨 SEND EMERGENCY ALERT'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History */}
                    <div>
                        <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={18} /> My Emergency History</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {myEmergencies.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No emergencies reported yet</div>}
                            {myEmergencies.map(e => (
                                <div key={e.id} className={`emergency-card ${e.priority_label.toLowerCase()}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{e.type.replace('_', ' ')}</span>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <span className={`badge badge-${e.priority_label.toLowerCase()}`}>{e.priority_label} ({e.priority_score})</span>
                                            <span className={`badge badge-status-${e.status}`}>{e.status.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {e.description || '—'} · {format(new Date(e.created_at), 'MMM dd, HH:mm')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
