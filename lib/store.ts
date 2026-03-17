// ============================================
// GridGuard — Database Layer (Vercel Postgres)
// ============================================
// Provides a persistent data store for production use.
// Falls back to in-memory store if POSTGRES_URL is not set.

import { Outage, FeedItem, CitizenReport, Feedback, Subscription, StaffUser } from './types';

// ----- Ethiopian Areas Data (shared reference) -----
export const ETHIOPIAN_AREAS = [
  { area: 'Bole', district: 'Addis Ababa', subcity: 'Bole', coords: [8.9806, 38.7578] as [number, number] },
  { area: 'Piassa', district: 'Addis Ababa', subcity: 'Arada', coords: [9.0300, 38.7469] as [number, number] },
  { area: 'Merkato', district: 'Addis Ababa', subcity: 'Addis Ketema', coords: [9.0107, 38.7350] as [number, number] },
  { area: 'Kazanchis', district: 'Addis Ababa', subcity: 'Kirkos', coords: [9.0120, 38.7630] as [number, number] },
  { area: 'Sarbet', district: 'Addis Ababa', subcity: 'Nifas Silk-Lafto', coords: [9.0010, 38.7420] as [number, number] },
  { area: 'Megenagna', district: 'Addis Ababa', subcity: 'Yeka', coords: [9.0190, 38.7890] as [number, number] },
  { area: 'Ayat', district: 'Addis Ababa', subcity: 'Yeka', coords: [9.0400, 38.8200] as [number, number] },
  { area: 'CMC', district: 'Addis Ababa', subcity: 'Yeka', coords: [9.0280, 38.8030] as [number, number] },
  { area: 'Akaki Kaliti', district: 'Addis Ababa', subcity: 'Akaki Kaliti', coords: [8.8873, 38.7800] as [number, number] },
  { area: 'Kolfe Keranio', district: 'Addis Ababa', subcity: 'Kolfe Keranio', coords: [9.0050, 38.7100] as [number, number] },
  { area: 'Lideta', district: 'Addis Ababa', subcity: 'Lideta', coords: [9.0080, 38.7300] as [number, number] },
  { area: 'Kirkos', district: 'Addis Ababa', subcity: 'Kirkos', coords: [9.0050, 38.7480] as [number, number] },
  { area: 'Nifas Silk-Lafto', district: 'Addis Ababa', subcity: 'Nifas Silk-Lafto', coords: [8.9700, 38.7400] as [number, number] },
  { area: 'Yeka', district: 'Addis Ababa', subcity: 'Yeka', coords: [9.0350, 38.8000] as [number, number] },
  { area: 'Gulele', district: 'Addis Ababa', subcity: 'Gulele', coords: [9.0520, 38.7350] as [number, number] },
  { area: 'Arada', district: 'Addis Ababa', subcity: 'Arada', coords: [9.0350, 38.7450] as [number, number] },
  { area: 'Addis Ketema', district: 'Addis Ababa', subcity: 'Addis Ketema', coords: [9.0150, 38.7350] as [number, number] },
  { area: 'Bahir Dar', district: 'Amhara', subcity: 'Bahir Dar', coords: [11.5742, 37.3614] as [number, number] },
  { area: 'Hawassa', district: 'Sidama', subcity: 'Hawassa', coords: [7.0504, 38.4955] as [number, number] },
  { area: 'Dire Dawa', district: 'Dire Dawa', subcity: 'Dire Dawa', coords: [9.6009, 41.8501] as [number, number] },
  { area: 'Adama', district: 'Oromia', subcity: 'Adama', coords: [8.5400, 39.2700] as [number, number] },
  { area: 'Jimma', district: 'Oromia', subcity: 'Jimma', coords: [7.6667, 36.8333] as [number, number] },
  { area: 'Mekelle', district: 'Tigray', subcity: 'Mekelle', coords: [13.4967, 39.4753] as [number, number] },
  { area: 'Gondar', district: 'Amhara', subcity: 'Gondar', coords: [12.6030, 37.4521] as [number, number] },
  { area: 'Dessie', district: 'Amhara', subcity: 'Dessie', coords: [11.1333, 39.6333] as [number, number] },
  { area: 'Debre Birhan', district: 'Amhara', subcity: 'Debre Birhan', coords: [9.6794, 39.5326] as [number, number] },
  { area: 'Bishoftu', district: 'Oromia', subcity: 'Bishoftu', coords: [8.7500, 38.9833] as [number, number] },
  { area: 'Shashamane', district: 'Oromia', subcity: 'Shashamane', coords: [7.2000, 38.5833] as [number, number] },
  { area: 'Arba Minch', district: 'South Ethiopia', subcity: 'Arba Minch', coords: [6.0333, 37.5500] as [number, number] },
  { area: 'Woldia', district: 'Amhara', subcity: 'Woldia', coords: [11.8333, 39.6000] as [number, number] },
  { area: 'Debre Markos', district: 'Amhara', subcity: 'Debre Markos', coords: [10.3333, 37.7167] as [number, number] },
  { area: 'Sululta', district: 'Oromia', subcity: 'Sululta', coords: [9.1833, 38.7500] as [number, number] },
  { area: 'Sebeta', district: 'Oromia', subcity: 'Sebeta', coords: [8.9167, 38.6167] as [number, number] },
  { area: 'Burayu', district: 'Oromia', subcity: 'Burayu', coords: [9.0667, 38.6667] as [number, number] },
];

// ----- Find nearest area from coordinates -----
export function findNearestArea(lat: number, lng: number) {
  let nearest = ETHIOPIAN_AREAS[0];
  let minDist = Infinity;
  for (const area of ETHIOPIAN_AREAS) {
    const d = Math.sqrt(Math.pow(area.coords[0] - lat, 2) + Math.pow(area.coords[1] - lng, 2));
    if (d < minDist) { minDist = d; nearest = area; }
  }
  return nearest;
}

// ----- Match district name (fuzzy) to known area -----
export function matchDistrict(name: string) {
  const n = name.toLowerCase().trim();
  return ETHIOPIAN_AREAS.find(a =>
    a.area.toLowerCase().includes(n) ||
    n.includes(a.area.toLowerCase()) ||
    a.subcity.toLowerCase().includes(n) ||
    n.includes(a.subcity.toLowerCase()) ||
    a.district.toLowerCase().includes(n)
  );
}

// ----- EEU Interruption Record -----
export interface EEUInterruption {
  id: string;
  district: string;
  subcity: string;
  startTime: string;
  endTime: string | null;
  reason: string;
  sourceUrl: string;
  coordinates: [number, number] | null;
  translatedFrom: string;  // original Amharic text
  fetchedAt: string;
  active: boolean;
  severity: string;
}

// ----- Content Item (blogs, safety guides, alerts) -----
export interface ContentItem {
  id: string;
  type: 'blog' | 'safety_guide' | 'news' | 'alert';
  title: string;
  body: string;
  createdBy: string;
  createdAt: string;
  published: boolean;
}

// ----- In-Memory Production Store -----
// In serverless, each instance has its own memory. For Vercel, this resets on cold starts.
// Data persists within a single instance for the duration of requests.
// For true persistence, integrate Vercel Postgres / Supabase (future migration).

import fs from 'fs';
import path from 'path';

// ----- Local File-Based Store -----
const DB_FILE = path.join(process.cwd(), 'local_db.json');

class ProductionStore {
  outages: Outage[] = [];
  resolvedOutages: Outage[] = [];
  feed: FeedItem[] = [];
  reports: CitizenReport[] = [];
  feedbacks: Feedback[] = [];
  subscriptions: Subscription[] = [];
  staffUsers: StaffUser[] = [];
  eeuInterruptions: EEUInterruption[] = [];
  content: ContentItem[] = [];
  // For staff locations we can use a plain object since Maps don't JSON serialize easily natively
  staffLocationsMap: Record<string, { lat: number; lng: number; updatedAt: string }> = {};

  private initialized = false;

  constructor() {
    this.initialize();
  }

  // Helper to maintain compatibility
  get staffLocations() {
    const map = new Map();
    for (const [k, v] of Object.entries(this.staffLocationsMap)) {
      map.set(k, v);
    }
    return map;
  }

  set staffLocations(map: Map<string, { lat: number; lng: number; updatedAt: string }>) {
    this.staffLocationsMap = Object.fromEntries(map);
    this.save();
  }

  private initialize() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      if (fs.existsSync(DB_FILE)) {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        this.outages = data.outages || [];
        this.resolvedOutages = data.resolvedOutages || [];
        this.feed = data.feed || [];
        this.reports = data.reports || [];
        this.feedbacks = data.feedbacks || [];
        this.subscriptions = data.subscriptions || [];
        this.staffUsers = data.staffUsers || [];
        this.eeuInterruptions = data.eeuInterruptions || [];
        this.content = data.content || [];
        this.staffLocationsMap = data.staffLocationsMap || {};
      }
    } catch (e) {
      console.error('Failed to load local database, starting fresh.', e);
    }

    // Default staff users if db was empty
    if (this.staffUsers.length === 0) {
      this.staffUsers = [
        {
          id: 'staff-admin',
          username: 'admin',
          passwordHash: 'admin123',
          name: 'System Admin',
          role: 'admin',
          email: 'admin@eeu.gov.et',
          failedAttempts: 0,
        },
        {
          id: 'staff-maint',
          username: 'maintenance',
          passwordHash: 'maint123',
          name: 'Sara Kebede',
          role: 'maintenance',
          email: 'maintenance@eeu.gov.et',
          failedAttempts: 0,
        },
      ];
      this.save();
    }
  }

  public save() {
    try {
      const data = {
        outages: this.outages,
        resolvedOutages: this.resolvedOutages,
        feed: this.feed,
        reports: this.reports,
        feedbacks: this.feedbacks,
        subscriptions: this.subscriptions,
        staffUsers: this.staffUsers,
        eeuInterruptions: this.eeuInterruptions,
        content: this.content,
        staffLocationsMap: this.staffLocationsMap
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write to local database.', e);
    }
  }

  addFeedItem(item: Omit<FeedItem, 'id' | 'timestamp'>) {
    const id = 'EEU-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    this.feed.unshift({ id, timestamp: new Date().toISOString(), ...item });
    if (this.feed.length > 200) this.feed = this.feed.slice(0, 200);
    this.save();
  }

  getReportClusters() {
    const clusters: Record<string, { count: number; reports: CitizenReport[]; coordinates: [number, number]; priority: 'low' | 'medium' | 'high' | 'critical' }> = {};
    for (const r of this.reports) {
      const area = r.area || 'Unknown';
      if (!clusters[area]) {
        const loc = ETHIOPIAN_AREAS.find(a => a.area.toLowerCase() === area.toLowerCase());
        clusters[area] = { count: 0, reports: [], coordinates: loc?.coords || [9.02, 38.75], priority: 'low' };
      }
      clusters[area].count++;
      clusters[area].reports.push(r);
    }
    for (const area of Object.keys(clusters)) {
      const c = clusters[area].count;
      clusters[area].priority = c >= 20 ? 'critical' : c >= 10 ? 'high' : c >= 5 ? 'medium' : 'low';
    }
    return clusters;
  }

  searchOutages(query: string): Outage[] {
    const q = query.toLowerCase();
    return [...this.outages, ...this.resolvedOutages].filter(
      o => o.area.toLowerCase().includes(q) || o.district.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    );
  }

  getAnalytics() {
    const eeuAsOutages = this.eeuInterruptions.filter(e => e.active).map(e => ({
      area: e.district || e.subcity || 'Unknown',
      severity: 'moderate',
      startTime: e.startTime
    }));
    
    const allOutages = [...this.outages, ...this.resolvedOutages, ...eeuAsOutages] as any[];
    const outagesByArea: Record<string, number> = {};
    const outagesBySeverity: Record<string, number> = { low: 0, moderate: 0, critical: 0, grid_failure: 0 };

    for (const o of allOutages) {
      outagesByArea[o.area] = (outagesByArea[o.area] || 0) + 1;
      outagesBySeverity[o.severity] = (outagesBySeverity[o.severity] || 0) + 1;
    }

    const now = Date.now();
    const hourlyData: { hour: string; count: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - (i + 1) * 3600000;
      const hourEnd = now - i * 3600000;
      const count = allOutages.filter(o => {
        const t = new Date(o.startTime).getTime();
        return t >= hourStart && t < hourEnd;
      }).length;
      hourlyData.push({ hour: new Date(hourEnd).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }), count });
    }

    const resolvedTimes = this.resolvedOutages.filter(o => o.resolvedAt).map(o =>
      (new Date(o.resolvedAt!).getTime() - new Date(o.startTime).getTime()) / 60000
    );
    const avgRestore = resolvedTimes.length > 0
      ? Math.round(resolvedTimes.reduce((a, b) => a + b, 0) / resolvedTimes.length)
      : 0;

    return {
      totalOutages: allOutages.length,
      activeOutages: this.outages.length,
      resolvedToday: this.resolvedOutages.filter(o => o.resolvedAt && new Date(o.resolvedAt).toDateString() === new Date().toDateString()).length,
      averageRestorationMinutes: avgRestore,
      gridReliability: allOutages.length === 0 ? 100 : Math.max(70, 100 - this.outages.length * 2),
      outagesByArea,
      outagesBySeverity,
      hourlyData,
      dailyData: [],
      weeklyData: [],
      monthlyData: [],
      eeuInterruptionsActive: this.eeuInterruptions.filter(e => e.active).length,
    };
  }
}

// Singleton
let storeInstance: ProductionStore | null = null;
export function getStore(): ProductionStore {
  if (!storeInstance) {
    storeInstance = new ProductionStore();
  }
  return storeInstance;
}
