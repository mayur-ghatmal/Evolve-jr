import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
    Activity, LayoutDashboard, MapPin, Truck, Building2,
    Users, LogOut, Shield, AlertTriangle, BarChart3, FileText
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './UI/ToastProvider'

interface NavItem {
    icon: React.ReactNode
    label: string
    to: string
}

const ROLE_NAV: Record<string, NavItem[]> = {
    caller: [
        { icon: <LayoutDashboard size={18} />, label: 'Dashboard', to: '/caller' },
        { icon: <MapPin size={18} />, label: 'My Emergencies', to: '/caller/history' },
    ],
    dispatcher: [
        { icon: <LayoutDashboard size={18} />, label: 'Live Cases', to: '/dispatcher' },
        { icon: <Truck size={18} />, label: 'Ambulances', to: '/dispatcher/ambulances' },
        { icon: <Building2 size={18} />, label: 'Hospitals', to: '/dispatcher/hospitals' },
    ],
    driver: [
        { icon: <LayoutDashboard size={18} />, label: 'My Cases', to: '/driver' },
        { icon: <MapPin size={18} />, label: 'Navigation', to: '/driver/nav' },
    ],
    hospital: [
        { icon: <LayoutDashboard size={18} />, label: 'Dashboard', to: '/hospital' },
        { icon: <Activity size={18} />, label: 'Incoming Patients', to: '/hospital/patients' },
    ],
    admin: [
        { icon: <LayoutDashboard size={18} />, label: 'Overview', to: '/admin' },
        { icon: <BarChart3 size={18} />, label: 'Analytics', to: '/admin/analytics' },
        { icon: <AlertTriangle size={18} />, label: 'Surge Events', to: '/admin/surge' },
        { icon: <Users size={18} />, label: 'Users', to: '/admin/users' },
        { icon: <FileText size={18} />, label: 'System Logs', to: '/admin/logs' },
    ],
}

export function Sidebar() {
    const { profile, role, signOut } = useAuth()
    const navigate = useNavigate()
    const { showToast } = useToast()
    const navItems = ROLE_NAV[role ?? 'caller'] ?? []

    const handleSignOut = async () => {
        await signOut()
        showToast('Signed out successfully', 'success')
        navigate('/')
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Activity size={20} color="white" />
                </div>
                <h2>Rapid<span>Aid</span></h2>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Navigation</div>
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div style={{ padding: '10px 12px', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {profile?.name || 'User'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Shield size={12} />
                        {profile?.role?.toUpperCase()}
                    </div>
                </div>
                <button className="sidebar-nav-item" onClick={handleSignOut} style={{ color: 'var(--red)' }}>
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </aside>
    )
}
