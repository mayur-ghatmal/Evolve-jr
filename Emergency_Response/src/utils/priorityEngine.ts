export type EmergencyType = 'cardiac_arrest' | 'severe_trauma' | 'accident' | 'fire' | 'other'
export type PriorityLabel = 'Critical' | 'High' | 'Medium' | 'Low'

export interface PriorityInput {
    type: EmergencyType
    isElderly: boolean
    distanceKm: number
}

export interface PriorityResult {
    score: number
    label: PriorityLabel
    color: string
    bgColor: string
    borderColor: string
}

const TYPE_SCORES: Record<EmergencyType, number> = {
    cardiac_arrest: 50,
    severe_trauma: 40,
    accident: 30,
    fire: 25,
    other: 10,
}

export function calculatePriority(input: PriorityInput): PriorityResult {
    let score = 0

    score += TYPE_SCORES[input.type] ?? 10
    if (input.isElderly) score += 10
    if (input.distanceKm > 5) score += 10

    let label: PriorityLabel
    let color: string
    let bgColor: string
    let borderColor: string

    if (score >= 80) {
        label = 'Critical'
        color = '#ff3b30'
        bgColor = 'rgba(255,59,48,0.15)'
        borderColor = '#ff3b30'
    } else if (score >= 60) {
        label = 'High'
        color = '#ff9500'
        bgColor = 'rgba(255,149,0,0.15)'
        borderColor = '#ff9500'
    } else if (score >= 40) {
        label = 'Medium'
        color = '#ffcc00'
        bgColor = 'rgba(255,204,0,0.15)'
        borderColor = '#ffcc00'
    } else {
        label = 'Low'
        color = '#34c759'
        bgColor = 'rgba(52,199,89,0.15)'
        borderColor = '#34c759'
    }

    return { score, label, color, bgColor, borderColor }
}

export function getPriorityStyle(label: PriorityLabel): { color: string; bgColor: string; borderColor: string } {
    switch (label) {
        case 'Critical': return { color: '#ff3b30', bgColor: 'rgba(255,59,48,0.15)', borderColor: '#ff3b30' }
        case 'High': return { color: '#ff9500', bgColor: 'rgba(255,149,0,0.15)', borderColor: '#ff9500' }
        case 'Medium': return { color: '#ffcc00', bgColor: 'rgba(255,204,0,0.15)', borderColor: '#ffcc00' }
        case 'Low': return { color: '#34c759', bgColor: 'rgba(52,199,89,0.15)', borderColor: '#34c759' }
    }
}

export function detectSurge(
    emergencies: { lat: number; lng: number; created_at: string }[],
    radiusKm = 2,
    timeWindowMinutes = 30,
    threshold = 3
): { isSurge: boolean; zone: { lat: number; lng: number } | null; count: number } {
    const now = Date.now()
    const windowMs = timeWindowMinutes * 60 * 1000

    const recent = emergencies.filter(e => {
        return now - new Date(e.created_at).getTime() < windowMs
    })

    if (recent.length < threshold) return { isSurge: false, zone: null, count: recent.length }

    for (const center of recent) {
        const nearby = recent.filter(e => {
            const dLat = (e.lat - center.lat) * 111
            const dLng = (e.lng - center.lng) * 111 * Math.cos((center.lat * Math.PI) / 180)
            return Math.sqrt(dLat * dLat + dLng * dLng) <= radiusKm
        })
        if (nearby.length >= threshold) {
            return { isSurge: true, zone: { lat: center.lat, lng: center.lng }, count: nearby.length }
        }
    }

    return { isSurge: false, zone: null, count: recent.length }
}
