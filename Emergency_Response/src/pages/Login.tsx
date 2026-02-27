import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/UI/ToastProvider'

export default function Login() {
    const navigate = useNavigate()
    const { refreshProfile } = useAuth()
    const { showToast } = useToast()
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    const ROLE_ROUTES: Record<string, string> = {
        caller: '/caller',
        dispatcher: '/dispatcher',
        driver: '/driver',
        hospital: '/hospital',
        admin: '/admin',
    }

    const getDashboardRoute = async (userId: string) => {
        const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
        return ROLE_ROUTES[data?.role ?? 'caller'] ?? '/caller'
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.email || !form.password) return showToast('Please enter email and password', 'warning')
        setLoading(true)
        const { data, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (error) { showToast(error.message, 'error'); setLoading(false); return }
        await refreshProfile()
        const route = await getDashboardRoute(data.user.id)
        showToast('Welcome back!', 'success')
        navigate(route)
        setLoading(false)
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(229,57,53,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

            <div className="glass-card" style={{ width: '100%', maxWidth: 420, padding: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                    <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--red), var(--red-dark))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px var(--red-glow)' }}>
                        <Activity size={22} color="white" />
                    </div>
                    <div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 700 }}>Rapid<span style={{ color: 'var(--red)' }}>Aid</span></div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sign in to your account</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="input-group">
                        <label>Email</label>
                        <input type="email" className="input-field" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showPass ? 'text' : 'password'} className="input-field" placeholder="Your password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required style={{ paddingRight: 44 }} />
                            <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
                        {loading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Signing in...</> : 'Sign In'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 20 }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--red)', fontWeight: 600, textDecoration: 'none' }}>Register</Link>
                </p>
                <p style={{ textAlign: 'center', marginTop: 8 }}>
                    <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>← Back to Home</Link>
                </p>
            </div>
        </div>
    )
}
