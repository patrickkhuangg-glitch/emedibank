-- Deploy the ticket-aware application after 0035 and before activating this gate.
-- Includes staff invitations: those also receive a server-issued ticket in the app.
create trigger require_signup_authorization before insert on auth.users
for each row execute function public.require_signup_authorization();
