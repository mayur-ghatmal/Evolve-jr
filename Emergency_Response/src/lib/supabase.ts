import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('🚨 Missing Supabase Environment Variables! Check your .env.local file.', {
        url: supabaseUrl,
        key: supabaseAnonKey ? 'Present' : 'Missing'
    })
}

export const supabase = createClient(supabaseUrl || 'http://localhost:54321', supabaseAnonKey || 'dummy', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
})

export type UserRole = 'admin' | 'dispatcher' | 'driver' | 'hospital' | 'caller'

export interface Profile {
    id: string
    name: string
    email: string
    role: UserRole
    phone: string
    created_at: string
}

export interface Emergency {
    id: string
    caller_id: string
    lat: number
    lng: number
    address: string
    type: 'cardiac_arrest' | 'severe_trauma' | 'accident' | 'fire' | 'other'
    description: string
    is_elderly: boolean
    priority_score: number
    priority_label: 'Critical' | 'High' | 'Medium' | 'Low'
    status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
    assigned_ambulance: string | null
    assigned_hospital: string | null
    image_url: string
    two_step_confirmed: boolean
    created_at: string
    updated_at: string
}

export interface Ambulance {
    id: string
    driver_id: string | null
    vehicle_number: string
    status: 'available' | 'busy' | 'offline'
    lat: number
    lng: number
    created_at: string
}

export interface Hospital {
    id: string
    name: string
    address: string
    lat: number
    lng: number
    total_beds: number
    available_beds: number
    icu_total: number
    icu_available: number
    emergency_capacity: boolean
    managed_by: string | null
    created_at: string
}

export interface Log {
    id: string
    user_id: string | null
    action: string
    details: Record<string, unknown>
    created_at: string
}

export interface SurgeEvent {
    id: string
    zone_lat: number
    zone_lng: number
    radius_km: number
    case_count: number
    active: boolean
    detected_at: string
    resolved_at: string | null
}
