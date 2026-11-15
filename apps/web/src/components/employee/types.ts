export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  documentId?: string | null;
  photoUrl?: string | null;
  role: string;
  qrToken?: string | null;
  signedQrPayload?: string | null;
  qrGeneratedAt?: string | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  location?: {
    id: string;
    name: string;
    address: string;
  } | null;
  schedule?: {
    id: string;
    name: string;
    entryTime: string;
    exitTime: string;
    isSplit?: boolean;
    entryTime2?: string | null;
    exitTime2?: string | null;
    toleranceMinutes: number;
    toleranceMinutes2?: number | null;
  } | null;
}

export interface TodayAttendance {
  id: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  entryTime2?: string | null;
  exitTime2?: string | null;
  status: string;
  lateMinutes: number | null;
  lateMinutes2?: number | null;
  workedMinutes: number | null;
  notes?: string | null;
}

export interface HistoryItem {
  id: string;
  date: string;
  entryTime: string | null;
  exitTime: string | null;
  entryTime2?: string | null;
  exitTime2?: string | null;
  status: string;
  lateMinutes: number | null;
  lateMinutes2?: number | null;
  workedMinutes: number | null;
  locationName: string;
  notes?: string | null;
  statusChangedBy?: string | null;
  statusChangedAt?: string | null;
  attachmentUrl?: string | null;
}

export interface MyTimeOffItem {
  id: string;
  type: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  startDate: string;
  endDate: string;
  reason: string | null;
  documentUrl: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface HistoryMetrics {
  totalDays: number;
  presents: number;
  onTime: number;
  lates: number;
  absences: number;
  punctualityRate: number;
  totalHoursWorked: number;
}
