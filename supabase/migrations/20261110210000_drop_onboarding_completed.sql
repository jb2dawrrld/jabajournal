-- Onboarding screen removed; profile readiness is enough to enter the app.

alter table public.profiles
  drop column if exists onboarding_completed;
