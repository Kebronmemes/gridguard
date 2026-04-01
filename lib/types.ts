// ============================================
// GridGuard — Core TypeScript Interfaces
// ============================================

export type OutageSeverity = 'low' | 'moderate' | 'critical' | 'grid_failure';
export type OutageType = 'emergency' | 'planned' | 'maintenance' | 'load_shedding' | 'technical_fault';
export type OutageStatus = 'active' | 'investigating' | 'repair_in_progress' | 'resolved';
export type StaffRole = 'admin' | 'maintenance' | 'support' | 'field_staff';

export interface Outage {
  id: string;
  area: string;
  district: string;
  coordinates: [number, number]; // [lat, lng]
  polygon: [number, number][]; // polygon boundary
  type: OutageType;
  severity: OutageSeverity;
  status: OutageStatus;
  reason: string;
  reportCount: number;
  startTime: string; // ISO
  estimatedRestoreTime: string; // ISO
  resolvedAt?: string;
  createdBy: 'system' | 'staff' | 'citizen' | 'eeu_crawler';
  verifiedByStaff: boolean;
  weather?: { condition: string; rain: number; wind: number; severity: number; };
}

export interface FeedItem {
  id: string;
  timestamp: string;
  type: 'outage_reported' | 'outage_resolved' | 'maintenance_scheduled' | 'grid_update' | 'citizen_report';
  message: string;
  area: string;
  severity?: OutageSeverity;
}

export interface StaffUser {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: StaffRole;
  email: string;
  failedAttempts: number;
  lockedUntil?: string;
}

export interface CitizenReport {
  id: string;
  area: string;
  district?: string;
  subcity?: string;
  description: string;
  severity: OutageSeverity;
  coordinates?: [number, number];
  polygon?: [number, number][];  // drawn area
  timestamp: string;
  attachedOutageId?: string;
}

export interface Feedback {
  id: string;
  name: string;
  email: string;
  message: string;
  category: 'outage_reporting' | 'incorrect_data' | 'general' | 'feature_request';
  timestamp: string;
}

export interface Subscription {
  id: string;
  email: string;
  phone?: string;
  area: string;
  coordinates?: [number, number];
  subcity?: string;
  district?: string;
  preferences: {
    outageDetected: boolean;
    outageResolved: boolean;
    maintenance: boolean;
  };
  createdAt: string;
}

export interface AnalyticsData {
  totalOutages: number;
  activeOutages: number;
  resolvedToday: number;
  averageRestorationMinutes: number;
  gridReliability: number;
  financialImpact?: number;
  outagesByArea: Record<string, number>;
  outagesBySeverity: Record<OutageSeverity, number>;
  hourlyData: { hour: string; count: number }[];
  dailyData: { day: string; count: number }[];
  weeklyData: { week: string; count: number }[];
  monthlyData: { month: string; count: number }[];
}
