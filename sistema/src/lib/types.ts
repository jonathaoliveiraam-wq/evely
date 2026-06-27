export type PatientStatus =
  | "awaiting_evaluation"
  | "awaiting_payment"
  | "active"
  | "suspended_travel"
  | "overdue"
  | "cancelled";

export type PaymentStatus = "pending" | "paid";

export type SessionStatus =
  | "scheduled"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "no_show"
  | "cancelled"
  | "rescheduled";

export type EvaluationPhotoAngle =
  | "front"
  | "back"
  | "left_side"
  | "right_side"
  | "full_body";

export type SuspensionStatus =
  | "approved"
  | "denied_insufficient_notice"
  | "active"
  | "ended";

export type UserRole = "admin" | "patient";

// ── Tabelas ──────────────────────────────────────────────

export interface Patient {
  id: string;
  full_name: string;
  phone: string;
  guardian_name: string | null;
  birth_date: string | null;
  diagnosis: string | null;
  notes: string | null;
  status: PatientStatus;
  portal_username: string;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  patient_id: string;
  evaluated_at: string;
  diagnosis: string;
  short_term_goal: string;
  medium_term_goal: string;
  long_term_goal: string;
  created_by: string;
}

export interface EvaluationPhoto {
  id: string;
  evaluation_id: string;
  angle: EvaluationPhotoAngle;
  storage_path: string;
}

export interface Package {
  id: string;
  patient_id: string;
  start_date: string;
  end_date: string;
  price_cents: number;
  payment_status: PaymentStatus;
  paid_at: string | null;
  pix_charge_id: string | null;
  free_reschedule_used: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  package_id: string;
  session_number: number;
  scheduled_date: string;
  scheduled_time: string;
  status: SessionStatus;
  checked_in_at: string | null;
  confirmed_start_at: string | null;
  completed_at: string | null;
  was_punctual: boolean | null;
  did_activities: boolean | null;
  location: string | null;
  evolution_notes: string | null;
  activities_notes: string | null;
  recommendation_notes: string | null;
  requires_certificate: boolean;
  certificate_storage_path: string | null;
}

export interface SessionPhoto {
  id: string;
  session_id: string;
  storage_path: string;
}

export interface TravelSuspension {
  id: string;
  patient_id: string;
  requested_at: string;
  start_date: string;
  expected_return_date: string;
  reason: string;
  advance_notice_days: number;
  status: SuspensionStatus;
}

export interface TreatmentCancellation {
  id: string;
  patient_id: string;
  requested_at: string;
  reason: string;
  penalty_percentage: number;
  amount_paid_cents: number;
  amount_refunded_cents: number;
  amount_retained_cents: number;
}

// ── Views / queries compostas ────────────────────────────

export interface PatientWithActivePackage extends Patient {
  active_package: Package | null;
}

export interface SessionWithPoints extends Session {
  points_earned: number;
}
