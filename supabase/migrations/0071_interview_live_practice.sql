begin;

-- Invite-only, two-person interview rooms. All mutations are made by the
-- application after authenticating and authorising the caller. Browser clients
-- never receive direct table write access.
create table public.interview_live_rooms (
  id uuid primary key default gen_random_uuid(),
  invite_code_hash text not null unique check (char_length(invite_code_hash)=64),
  host_id uuid not null references auth.users(id) on delete cascade,
  candidate_id uuid not null references auth.users(id) on delete cascade,
  station_id text not null check (char_length(station_id) between 1 and 160),
  format text not null check (format in ('mmi','panel')),
  question_index integer not null default 0 check (question_index between 0 and 100),
  phase text not null default 'lobby' check (phase in ('lobby','briefing','preparation','live_station','marking','debrief','complete')),
  phase_revision integer not null default 0 check (phase_revision>=0),
  phase_started_at timestamptz,
  phase_ends_at timestamptz,
  recording_enabled boolean not null default false,
  recording_attempt_id uuid references public.interview_attempts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '24 hours'),
  completed_at timestamptz,
  check (expires_at>created_at),
  check (completed_at is null or phase='complete')
);

create table public.interview_live_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.interview_live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('candidate','examiner')),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  ready boolean not null default false,
  media_ready boolean not null default false,
  recording_consent boolean,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  unique(room_id,user_id),
  unique(room_id,role)
);

create table public.interview_live_feedback (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.interview_live_rooms(id) on delete cascade,
  participant_id uuid not null references public.interview_live_participants(id) on delete cascade,
  role text not null check (role in ('candidate','examiner')),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers)='object' and pg_column_size(answers)<=16384),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(room_id,participant_id)
);

create table public.interview_live_signals (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.interview_live_rooms(id) on delete cascade,
  sender_id uuid not null references public.interview_live_participants(id) on delete cascade,
  recipient_id uuid not null references public.interview_live_participants(id) on delete cascade,
  kind text not null check (kind in ('offer','answer','ice','renegotiate')),
  payload jsonb not null check (jsonb_typeof(payload)='object' and pg_column_size(payload)<=32768),
  created_at timestamptz not null default now(),
  check (sender_id<>recipient_id)
);

create table public.interview_live_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.interview_live_rooms(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 1 and 80),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object' and pg_column_size(metadata)<=16384),
  created_at timestamptz not null default now()
);

create table public.interview_live_join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index interview_live_rooms_candidate_idx on public.interview_live_rooms(candidate_id,created_at desc);
create index interview_live_rooms_expiry_idx on public.interview_live_rooms(expires_at) where phase<>'complete';
create index interview_live_participants_room_idx on public.interview_live_participants(room_id,last_seen_at desc);
create index interview_live_signals_recipient_idx on public.interview_live_signals(room_id,recipient_id,id);
create index interview_live_signals_cleanup_idx on public.interview_live_signals(created_at);
create index interview_live_events_room_idx on public.interview_live_events(room_id,created_at);
create index interview_live_join_attempts_guard_idx on public.interview_live_join_attempts(user_id,attempted_at desc);

alter table public.interview_live_rooms enable row level security;
alter table public.interview_live_participants enable row level security;
alter table public.interview_live_feedback enable row level security;
alter table public.interview_live_signals enable row level security;
alter table public.interview_live_events enable row level security;
alter table public.interview_live_join_attempts enable row level security;

revoke all on public.interview_live_rooms,public.interview_live_participants,public.interview_live_feedback,public.interview_live_signals,public.interview_live_events,public.interview_live_join_attempts from public,anon,authenticated;
grant all on public.interview_live_rooms,public.interview_live_participants,public.interview_live_feedback,public.interview_live_signals,public.interview_live_events,public.interview_live_join_attempts to service_role;
revoke all on sequence public.interview_live_signals_id_seq,public.interview_live_events_id_seq,public.interview_live_join_attempts_id_seq from public,anon,authenticated;
grant all on sequence public.interview_live_signals_id_seq,public.interview_live_events_id_seq,public.interview_live_join_attempts_id_seq to service_role;

comment on table public.interview_live_rooms is 'Private, invite-only interview-practice rooms with a server-authoritative phase clock.';
comment on table public.interview_live_participants is 'Room membership, role, readiness and per-person recording consent.';
comment on table public.interview_live_feedback is 'Independent candidate reflection and examiner feedback, revealed together during debrief.';
comment on table public.interview_live_signals is 'Short-lived WebRTC signalling messages; media does not pass through the database.';
comment on table public.interview_live_events is 'Append-only room audit trail for safety, consent and phase transitions.';

commit;
