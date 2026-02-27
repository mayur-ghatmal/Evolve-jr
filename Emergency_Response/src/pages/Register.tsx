import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/UI/ToastProvider'

const ROLE_LABELS = {
    caller: '📞 Emergency Caller',
    dispatcher: '🧭 Dispatcher',
    driver: '🚑 Ambulance Driver',
    hospital: '🏥 Hospital Staff',
    admin: '⚙️ Admin',
}

export default function Register() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'caller' })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name || !form.email || !form.password) return showToast('Please fill all required fields', 'warning')
        if (form.password.length < 8) return showToast('Password must be at least 8 characters', 'warning')
        setLoading(true)
        const { error } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: { data: { name: form.name, role: form.role, phone: form.phone } },
        })
        setLoading(false)
        if (error) { showToast(error.message, 'error'); return }
        showToast('Account created! Please check your email to verify, then sign in.', 'success')
        navigate('/login')
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            {/* Background glow */}
            <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(229,57,53,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

            <div className="glass-card" style={{ width: '100%', maxWidth: 480, padding: 40 }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                    <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--red), var(--red-dark))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px var(--red-glow)' }}>
                        <Activity size={22} color="white" />
                    </div>
                    <div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 700 }}>Rapid<span style={{ color: 'var(--red)' }}>Aid</span></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Create your account</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="input-group">
                        <label>Full Name *</label>
                        <input name="name" className="input-field" placeholder="John Smith" value={form.name} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <label>Email *</label>
                        <input name="email" type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                    </div>
                    <div className="input-group">
                        <label>Phone</label>
                        <input name="phone" className="input-field" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label>Role *</label>
                        <select name="role" className="input-field" value={form.role} onChange={handleChange}>
                            {Object.entries(ROLE_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Password *</label>
                        <div style={{ position: 'relative' }}>
                            <input name="password" type={showPass ? 'text' : 'password'} className="input-field" placeholder="Min 8 characters" value={form.password} onChange={handleChange} required style={{ paddingRight: 44 }} />
                            <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
                        {loading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating Account...</> : 'Create Account'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 20 }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--red)', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
                </p>
            </div>
        </div>
    )
}
