import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './components/UI/ToastProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import CallerDashboard from './pages/caller/CallerDashboard'
import DispatcherDashboard from './pages/dispatcher/DispatcherDashboard'
import DriverPanel from './pages/driver/DriverPanel'
import HospitalDashboard from './pages/hospital/HospitalDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'

function RoleRouter() {
  const { profile, loading } = useAuth()
  if (loading) return null
  const roleDefaults: Record<string, string> = {
    caller: '/caller', dispatcher: '/dispatcher',
    driver: '/driver', hospital: '/hospital', admin: '/admin',
  }
  const target = roleDefaults[profile?.role ?? ''] ?? '/login'
  return <Navigate to={target} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Role redirect */}
            <Route path="/dashboard" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />

            {/* Caller */}
            <Route path="/caller" element={
              <ProtectedRoute allowedRoles={['caller', 'admin']}>
                <CallerDashboard />
              </ProtectedRoute>
            } />

            {/* Dispatcher */}
            <Route path="/dispatcher" element={
              <ProtectedRoute allowedRoles={['dispatcher', 'admin']}>
                <DispatcherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dispatcher/ambulances" element={
              <ProtectedRoute allowedRoles={['dispatcher', 'admin']}>
                <DispatcherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dispatcher/hospitals" element={
              <ProtectedRoute allowedRoles={['dispatcher', 'admin']}>
                <DispatcherDashboard />
              </ProtectedRoute>
            } />

            {/* Driver */}
            <Route path="/driver" element={
              <ProtectedRoute allowedRoles={['driver', 'admin']}>
                <DriverPanel />
              </ProtectedRoute>
            } />
            <Route path="/driver/nav" element={
              <ProtectedRoute allowedRoles={['driver', 'admin']}>
                <DriverPanel />
              </ProtectedRoute>
            } />

            {/* Hospital */}
            <Route path="/hospital" element={
              <ProtectedRoute allowedRoles={['hospital', 'admin']}>
                <HospitalDashboard />
              </ProtectedRoute>
            } />
            <Route path="/hospital/patients" element={
              <ProtectedRoute allowedRoles={['hospital', 'admin']}>
                <HospitalDashboard />
              </ProtectedRoute>
            } />

            {/* Admin */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
