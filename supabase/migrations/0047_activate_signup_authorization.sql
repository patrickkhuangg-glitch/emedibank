-- 0047 — Activate the signup ticket check prepared in 0035.
--
-- RUN ONLY AFTER the app version that issues signup tickets is deployed
-- (signUpAction and the admin invite pass `signup_authorization` in user
-- metadata). Running it earlier blocks every email signup and invite.
--
-- Effect: an email/password account can only be created with a single-use
-- ticket the server mints after Turnstile and rate limits pass. Calling Supabase
-- Auth signUp directly with the public key — which skipped the CAPTCHA, the rate
-- limits and, with the account-level trial, handed out unlimited free trials —
-- now fails with 'signup_authorization_required'. Google sign-ins are exempt.
--
-- Roll back with: drop trigger require_signup_authorization on auth.users;

drop trigger if exists require_signup_authorization on auth.users;
create trigger require_signup_authorization
  before insert on auth.users
  for each row execute function public.require_signup_authorization();
