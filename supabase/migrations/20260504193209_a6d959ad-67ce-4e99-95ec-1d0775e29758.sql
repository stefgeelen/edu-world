
create table public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  child_grade text,
  source text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.beta_signups enable row level security;

create policy "Anyone can sign up for beta"
  on public.beta_signups for insert
  to anon, authenticated
  with check (true);

create policy "Admins can view beta signups"
  on public.beta_signups for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create index beta_signups_created_at_idx on public.beta_signups(created_at desc);
