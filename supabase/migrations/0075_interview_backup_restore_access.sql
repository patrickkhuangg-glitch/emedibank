-- The private restore utility authenticates as service_role and only needs the
-- storage pointer and MIME type. Keep all student-facing grants unchanged.
grant select(id,recording_path,recording_mime_type) on public.interview_attempts to service_role;
