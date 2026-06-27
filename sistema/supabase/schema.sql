-- ============================================================
-- Schema: Sistema de Gestão Dra. Evely — Espaço Passinho
-- Rodar no SQL Editor do Supabase (dashboard > SQL Editor)
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────
create type patient_status as enum (
  'awaiting_evaluation',
  'awaiting_payment',
  'active',
  'suspended_travel',
  'overdue',
  'cancelled'
);

create type payment_status as enum ('pending', 'paid');

create type session_status as enum (
  'scheduled',
  'checked_in',
  'in_progress',
  'completed',
  'no_show',
  'cancelled',
  'rescheduled'
);

create type photo_angle as enum (
  'front', 'back', 'left_side', 'right_side', 'full_body'
);

create type suspension_status as enum (
  'approved',
  'denied_insufficient_notice',
  'active',
  'ended'
);

-- ── patients ────────────────────────────────────────────────
create table patients (
  id                uuid primary key default uuid_generate_v4(),
  full_name         text not null,
  phone             text not null,
  guardian_name     text,
  birth_date        date,
  diagnosis         text,
  notes             text,
  status            patient_status not null default 'awaiting_evaluation',
  portal_username   text unique not null,
  auth_user_id      uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Atualiza updated_at automaticamente
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger patients_updated_at
  before update on patients
  for each row execute function update_updated_at();

-- ── evaluations (prontuário inicial) ────────────────────────
create table evaluations (
  id              uuid primary key default uuid_generate_v4(),
  patient_id      uuid not null references patients(id) on delete cascade,
  evaluated_at    timestamptz not null default now(),
  diagnosis       text not null,
  short_term_goal text not null,
  medium_term_goal text not null,
  long_term_goal  text not null,
  created_by      uuid not null references auth.users(id),
  unique (patient_id)
);

-- ── evaluation_photos ────────────────────────────────────────
create table evaluation_photos (
  id             uuid primary key default uuid_generate_v4(),
  evaluation_id  uuid not null references evaluations(id) on delete cascade,
  angle          photo_angle not null,
  storage_path   text not null,
  unique (evaluation_id, angle)
);

-- ── packages (pacotes mensais) ───────────────────────────────
create table packages (
  id                    uuid primary key default uuid_generate_v4(),
  patient_id            uuid not null references patients(id) on delete cascade,
  start_date            date not null,
  end_date              date not null generated always as (start_date + interval '30 days') stored,
  price_cents           integer not null check (price_cents > 0),
  payment_status        payment_status not null default 'pending',
  paid_at               timestamptz,
  pix_charge_id         text,
  free_reschedule_used  boolean not null default false,
  created_at            timestamptz not null default now()
);

-- ── sessions (sessões agendadas/realizadas) ──────────────────
create table sessions (
  id                      uuid primary key default uuid_generate_v4(),
  package_id              uuid not null references packages(id) on delete cascade,
  session_number          integer not null check (session_number between 1 and 10),
  scheduled_date          date not null,
  scheduled_time          time not null,
  status                  session_status not null default 'scheduled',
  checked_in_at           timestamptz,
  confirmed_start_at      timestamptz,
  completed_at            timestamptz,
  was_punctual            boolean,
  did_activities          boolean,
  location                text,
  evolution_notes         text,
  activities_notes        text,
  recommendation_notes    text,
  requires_certificate    boolean not null default false,
  certificate_storage_path text,
  unique (package_id, session_number)
);

-- ── session_photos ───────────────────────────────────────────
create table session_photos (
  id           uuid primary key default uuid_generate_v4(),
  session_id   uuid not null references sessions(id) on delete cascade,
  storage_path text not null
);

-- ── travel_suspensions ───────────────────────────────────────
create table travel_suspensions (
  id                   uuid primary key default uuid_generate_v4(),
  patient_id           uuid not null references patients(id) on delete cascade,
  requested_at         timestamptz not null default now(),
  start_date           date not null,
  expected_return_date date not null,
  reason               text not null,
  advance_notice_days  integer not null,
  status               suspension_status not null default 'approved'
);

-- ── treatment_cancellations ──────────────────────────────────
create table treatment_cancellations (
  id                    uuid primary key default uuid_generate_v4(),
  patient_id            uuid not null references patients(id) on delete cascade,
  requested_at          timestamptz not null default now(),
  reason                text not null,
  penalty_percentage    numeric(5,2) not null default 30,
  amount_paid_cents     integer not null,
  amount_refunded_cents integer not null,
  amount_retained_cents integer not null
);

-- ── View: pontos de gamificação ──────────────────────────────
-- Calculado dinamicamente — sem tabela separada para evitar inconsistência
create or replace view gamification_points as
select
  s.package_id,
  p.patient_id,
  count(*) filter (where s.status = 'completed')              as sessions_completed,
  sum(
    case when s.status = 'completed' then 20 else 0 end +
    case when s.was_punctual = true  then 10 else 0 end +
    case when s.did_activities = true then 10 else 0 end
  )                                                            as total_points,
  count(*) filter (where s.status = 'completed') >= 10        as prize_unlocked
from sessions s
join packages p on p.id = s.package_id
group by s.package_id, p.patient_id;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table patients             enable row level security;
alter table evaluations          enable row level security;
alter table evaluation_photos    enable row level security;
alter table packages             enable row level security;
alter table sessions             enable row level security;
alter table session_photos       enable row level security;
alter table travel_suspensions   enable row level security;
alter table treatment_cancellations enable row level security;

-- Helper: verifica se o usuário logado é admin (role='admin' em user_metadata)
create or replace function is_admin()
returns boolean language sql security definer as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Helper: retorna o patient_id vinculado ao usuário logado
create or replace function my_patient_id()
returns uuid language sql security definer as $$
  select id from patients where auth_user_id = auth.uid() limit 1;
$$;

-- ── patients ─────────────────────────────────────────────────
create policy "admin: full access on patients"
  on patients for all using (is_admin());

create policy "patient: select own row"
  on patients for select
  using (auth_user_id = auth.uid());

-- ── evaluations ──────────────────────────────────────────────
create policy "admin: full access on evaluations"
  on evaluations for all using (is_admin());

create policy "patient: select own evaluation"
  on evaluations for select
  using (patient_id = my_patient_id());

-- ── evaluation_photos ────────────────────────────────────────
create policy "admin: full access on evaluation_photos"
  on evaluation_photos for all using (is_admin());

create policy "patient: select own evaluation photos"
  on evaluation_photos for select
  using (
    evaluation_id in (
      select id from evaluations where patient_id = my_patient_id()
    )
  );

-- ── packages ─────────────────────────────────────────────────
create policy "admin: full access on packages"
  on packages for all using (is_admin());

create policy "patient: select own packages"
  on packages for select
  using (patient_id = my_patient_id());

-- ── sessions ─────────────────────────────────────────────────
create policy "admin: full access on sessions"
  on sessions for all using (is_admin());

create policy "patient: select own sessions"
  on sessions for select
  using (
    package_id in (
      select id from packages where patient_id = my_patient_id()
    )
  );

-- Paciente pode fazer check-in (atualizar checked_in_at) nas próprias sessões
create policy "patient: update check-in"
  on sessions for update
  using (
    package_id in (
      select id from packages where patient_id = my_patient_id()
    )
  )
  with check (
    package_id in (
      select id from packages where patient_id = my_patient_id()
    )
  );

-- ── session_photos ───────────────────────────────────────────
create policy "admin: full access on session_photos"
  on session_photos for all using (is_admin());

create policy "patient: select own session photos"
  on session_photos for select
  using (
    session_id in (
      select s.id from sessions s
      join packages p on p.id = s.package_id
      where p.patient_id = my_patient_id()
    )
  );

-- ── travel_suspensions ───────────────────────────────────────
create policy "admin: full access on travel_suspensions"
  on travel_suspensions for all using (is_admin());

create policy "patient: select and insert own suspensions"
  on travel_suspensions for select
  using (patient_id = my_patient_id());

create policy "patient: insert own suspension"
  on travel_suspensions for insert
  with check (patient_id = my_patient_id());

-- ── treatment_cancellations ──────────────────────────────────
create policy "admin: full access on treatment_cancellations"
  on treatment_cancellations for all using (is_admin());

create policy "patient: select own cancellation"
  on treatment_cancellations for select
  using (patient_id = my_patient_id());
