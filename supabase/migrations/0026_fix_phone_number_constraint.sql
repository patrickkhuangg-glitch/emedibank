-- 0026 — Correct the E.164 phone-number check used by the new-user trigger.

alter table public.profiles
  drop constraint if exists profiles_phone_number_format;

alter table public.profiles
  add constraint profiles_phone_number_format
  check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$');
