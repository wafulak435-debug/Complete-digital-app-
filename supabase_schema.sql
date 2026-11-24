-- ============================================================================
-- ZION DIGITAL APP — SUPABASE PRODUCTION DATABASE & STORAGE SCHEMA (HARDENED)
-- Paste this entire script into your Supabase Dashboard -> SQL Editor -> Run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (Linked 1-to-1 with auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  phone_number text,
  role text not null default 'member'
    check (role in ('main_admin', 'sub_admin', 'admin', 'manager', 'tutor', 'member')),
  subscription_status text not null default 'free'
    check (subscription_status in ('free', 'active', 'past_due', 'cancelled')),
  plan_name text not null default 'Free',
  credits integer not null default 20 check (credits >= 0),
  authorized_courses text[] not null default '{}',
  is_suspended boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists authorized_courses text[] not null default '{}';
alter table public.profiles add column if not exists is_suspended boolean not null default false;
alter table public.profiles add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('main_admin', 'sub_admin', 'admin', 'manager', 'tutor', 'member'));

alter table public.profiles enable row level security;

-- Helper functions (SECURITY DEFINER to avoid recursive RLS lookups)
create or replace function public.current_app_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'member');
$$;

create or replace function public.is_main_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_suspended = false
      and p.role in ('main_admin', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_suspended = false
      and p.role in ('main_admin', 'admin', 'sub_admin')
  );
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_suspended = false
      and p.role in ('main_admin', 'admin', 'manager')
  );
$$;

-- Forward-declared sub_admin_permissions table so helper can query it cleanly
create table if not exists public.sub_admin_permissions (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  permissions jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sub_admin_permissions enable row level security;

create or replace function public.has_subadmin_perm(perm text)
returns boolean
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_role text;
  v_email text;
  v_suspended boolean;
  v_perms jsonb;
begin
  select p.role, lower(p.email), p.is_suspended, p.permissions
    into v_role, v_email, v_suspended, v_perms
  from public.profiles p
  where p.id = auth.uid();

  if v_suspended is true then
    return false;
  end if;

  if v_role in ('main_admin', 'admin') then
    return true;
  end if;

  if v_role = 'sub_admin' then
    if coalesce((v_perms ->> perm)::boolean, false) then
      return true;
    end if;
    return exists (
      select 1 from public.sub_admin_permissions sap
      where lower(sap.email) = v_email
        and coalesce((sap.permissions ->> perm)::boolean, false) = true
    );
  end if;

  return false;
end;
$$;

create or replace function public.is_examiner(course_track text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_suspended = false
      and (
        p.role in ('main_admin', 'admin', 'manager')
        or (p.role = 'sub_admin' and public.has_subadmin_perm('allowManageExams'))
        or (p.role = 'tutor' and (course_track = any(p.authorized_courses) or '*' = any(p.authorized_courses)))
      )
  );
$$;

-- Trigger to keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Prevent ordinary authenticated users from escalating their own role/credits/subscription
create or replace function public.protect_profile_sensitive_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if current_setting('role', true) = 'service_role' or public.is_main_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.subscription_status is distinct from old.subscription_status
     or new.plan_name is distinct from old.plan_name
     or new.credits is distinct from old.credits
     or new.authorized_courses is distinct from old.authorized_courses
     or new.is_suspended is distinct from old.is_suspended
     or new.permissions is distinct from old.permissions then
    raise exception 'Permission denied: sensitive account fields require trusted server or main_admin authorization';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_sensitive on public.profiles;
create trigger profiles_protect_sensitive
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_columns();

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin() or public.is_manager());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and role = 'member'
    and subscription_status = 'free'
    and credits <= 20
    and is_suspended = false
  );

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id or public.is_main_admin())
  with check (auth.uid() = id or public.is_main_admin());

drop policy if exists "Main admin can delete profiles" on public.profiles;
create policy "Main admin can delete profiles"
  on public.profiles for delete
  using (public.is_main_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone_number, role, subscription_status, plan_name, credits)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1)),
    new.raw_user_meta_data->>'phone_number',
    'member',
    'free',
    'Free',
    20
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2. SUBADMIN PERMISSIONS (Main Admin ONLY writes)
-- ============================================================================
drop policy if exists "SubAdmins read own perms or main admin reads all" on public.sub_admin_permissions;
create policy "SubAdmins read own perms or main admin reads all"
  on public.sub_admin_permissions for select
  using (
    public.is_main_admin()
    or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

drop policy if exists "Only main admin writes sub_admin_permissions" on public.sub_admin_permissions;
create policy "Only main admin writes sub_admin_permissions"
  on public.sub_admin_permissions for all
  using (public.is_main_admin())
  with check (public.is_main_admin());

-- ============================================================================
-- 3. PRODUCT (Books & Catalog)
-- ============================================================================
create table if not exists public.products (
  id text primary key,
  title text not null,
  author text not null,
  author_id uuid references auth.users(id) on delete set null,
  price numeric(12, 2) not null default 0 check (price >= 0),
  category text not null,
  description text not null default '',
  cover_image text,
  file_path text,
  status text not null default 'active' check (status in ('active', 'draft')),
  allow_preview boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Public reads published products or owner/admin reads all" on public.products;
create policy "Public reads published products or owner/admin reads all"
  on public.products for select
  using (
    status = 'active'
    or auth.uid() = author_id
    or public.has_subadmin_perm('allowManageBooks')
  );

drop policy if exists "Admin or authorized author manages products" on public.products;
create policy "Admin or authorized author manages products"
  on public.products for insert
  with check (
    public.has_subadmin_perm('allowManageBooks')
    or (auth.uid() = author_id and status = 'draft')
  );

drop policy if exists "Admin or author updates own product" on public.products;
create policy "Admin or author updates own product"
  on public.products for update
  using (public.has_subadmin_perm('allowManageBooks') or auth.uid() = author_id)
  with check (public.has_subadmin_perm('allowManageBooks') or auth.uid() = author_id);

drop policy if exists "Admin or author deletes own product" on public.products;
create policy "Admin or author deletes own product"
  on public.products for delete
  using (public.has_subadmin_perm('allowManageBooks') or auth.uid() = author_id);

-- ============================================================================
-- 4. ORDERS & FEE PAYMENTS (Only trusted backend / payment admins confirm)
-- ============================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  amount_kes numeric(12, 2) not null check (amount_kes >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'approved', 'rejected')),
  payment_reference text,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "Users read own orders or finance admin reads all" on public.orders;
create policy "Users read own orders or finance admin reads all"
  on public.orders for select
  using (auth.uid() = user_id or public.has_subadmin_perm('allowConfirmPayments') or public.is_manager());

drop policy if exists "Users create pending orders only" on public.orders;
create policy "Users create pending orders only"
  on public.orders for insert
  with check (auth.uid() = user_id and status = 'pending' and verified_by is null);

drop policy if exists "Only finance admin or manager updates orders" on public.orders;
create policy "Only finance admin or manager updates orders"
  on public.orders for update
  using (public.has_subadmin_perm('allowConfirmPayments') or public.is_manager())
  with check (public.has_subadmin_perm('allowConfirmPayments') or public.is_manager());

create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fee_type text not null check (fee_type in ('library', 'certificate', 'tuition', 'wifi')),
  amount_kes numeric(12, 2) not null check (amount_kes >= 0),
  phone_number text,
  reference text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fee_payments enable row level security;

drop policy if exists "Users read own fee payments" on public.fee_payments;
create policy "Users read own fee payments"
  on public.fee_payments for select
  using (auth.uid() = user_id or public.has_subadmin_perm('allowConfirmPayments') or public.is_manager());

drop policy if exists "Users create pending fee payments" on public.fee_payments;
create policy "Users create pending fee payments"
  on public.fee_payments for insert
  with check (auth.uid() = user_id and status = 'pending' and verified_by is null);

drop policy if exists "Finance admins confirm fee payments" on public.fee_payments;
create policy "Finance admins confirm fee payments"
  on public.fee_payments for update
  using (public.has_subadmin_perm('allowConfirmPayments') or public.is_manager())
  with check (public.has_subadmin_perm('allowConfirmPayments') or public.is_manager());

-- ============================================================================
-- 5. ENROLLMENTS (Students request; only admins/managers approve & issue certs)
-- ============================================================================
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  course_id text not null,
  course_topic text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  fee_status text not null default 'unpaid' check (fee_status in ('unpaid', 'paid')),
  certificate_issued boolean not null default false,
  certificate_id text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.enrollments enable row level security;

drop policy if exists "Students read own enrollments" on public.enrollments;
create policy "Students read own enrollments"
  on public.enrollments for select
  using (auth.uid() = user_id or public.has_subadmin_perm('allowManageEnrollments') or public.is_manager());

drop policy if exists "Students request pending enrollments" on public.enrollments;
create policy "Students request pending enrollments"
  on public.enrollments for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and fee_status = 'unpaid'
    and certificate_issued = false
  );

drop policy if exists "Only enrollment admins approve enrollments" on public.enrollments;
create policy "Only enrollment admins approve enrollments"
  on public.enrollments for update
  using (public.has_subadmin_perm('allowManageEnrollments') or public.is_manager())
  with check (public.has_subadmin_perm('allowManageEnrollments') or public.is_manager());

-- ============================================================================
-- 6. EXAMS, EXAM_ANSWER_KEYS (Strictly Separated), AND EXAM_ATTEMPTS
-- ============================================================================
create table if not exists public.exams (
  id text primary key,
  course_track text not null,
  title text not null,
  questions jsonb not null default '[]'::jsonb, -- strictly question + options only, NO answer keys
  duration_minutes integer not null default 30,
  max_attempts integer not null default 3,
  is_published boolean not null default true,
  results_released boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.exams enable row level security;

drop policy if exists "Authenticated users view published exam questions" on public.exams;
create policy "Authenticated users view published exam questions"
  on public.exams for select
  using (is_published = true or public.is_examiner(course_track));

drop policy if exists "Examiners manage exams" on public.exams;
create policy "Examiners manage exams"
  on public.exams for all
  using (public.is_examiner(course_track))
  with check (public.is_examiner(course_track));

-- CONFIDENTIAL ANSWER KEYS TABLE: Zero student SELECT access!
create table if not exists public.exam_answer_keys (
  exam_id text primary key references public.exams(id) on delete cascade,
  course_track text not null,
  answer_key jsonb not null, -- [{"correctIndex": 0, "explanation": "..."}]
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.exam_answer_keys enable row level security;

drop policy if exists "Only authorized examiners access answer keys" on public.exam_answer_keys;
create policy "Only authorized examiners access answer keys"
  on public.exam_answer_keys for all
  using (public.is_examiner(course_track))
  with check (public.is_examiner(course_track));

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id text not null references public.exams(id) on delete cascade,
  course_track text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number integer not null default 1,
  answers jsonb not null default '{}'::jsonb,
  score numeric(5, 2),
  passed boolean,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  submitted_at timestamptz,
  graded_by uuid references auth.users(id) on delete set null
);

alter table public.exam_attempts enable row level security;

-- Trigger preventing students from tampering with backend-computed exam scores
create or replace function public.protect_exam_attempt_scores()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if current_setting('role', true) = 'service_role' or public.is_examiner(old.course_track) then
    return new;
  end if;

  if new.score is distinct from old.score
     or new.passed is distinct from old.passed
     or new.graded_by is distinct from old.graded_by
     or old.status <> 'in_progress' then
    raise exception 'Permission denied: exam scores and submitted attempts are backend-controlled';
  end if;

  return new;
end;
$$;

drop trigger if exists exam_attempts_protect_scores on public.exam_attempts;
create trigger exam_attempts_protect_scores
  before update on public.exam_attempts
  for each row execute function public.protect_exam_attempt_scores();

drop policy if exists "Students read own attempts or examiner reads track" on public.exam_attempts;
create policy "Students read own attempts or examiner reads track"
  on public.exam_attempts for select
  using (auth.uid() = user_id or public.is_examiner(course_track));

drop policy if exists "Students start own in_progress attempt" on public.exam_attempts;
create policy "Students start own in_progress attempt"
  on public.exam_attempts for insert
  with check (
    auth.uid() = user_id
    and status = 'in_progress'
    and score is null
    and passed is null
    and graded_by is null
  );

drop policy if exists "Students update own answers while in progress or examiner grades" on public.exam_attempts;
create policy "Students update own answers while in progress or examiner grades"
  on public.exam_attempts for update
  using ((auth.uid() = user_id and status = 'in_progress') or public.is_examiner(course_track))
  with check ((auth.uid() = user_id and score is null and passed is null) or public.is_examiner(course_track));

-- ============================================================================
-- 7. GROUP CHANNELS, MEMBERSHIPS, CHAT MESSAGES, SOCIAL POSTS
-- ============================================================================
create table if not exists public.group_channels (
  name text primary key,
  is_restricted boolean not null default false
);

insert into public.group_channels (name, is_restricted)
values ('#General', false), ('#Book Talks', false), ('#Leadership', false), ('#Publishing', false), ('#workers', true), ('#faculty', true)
on conflict (name) do nothing;

create table if not exists public.group_memberships (
  channel text not null references public.group_channels(name) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (channel, user_id)
);

alter table public.group_memberships enable row level security;

drop policy if exists "Members view own memberships or moderators view all" on public.group_memberships;
create policy "Members view own memberships or moderators view all"
  on public.group_memberships for select
  using (auth.uid() = user_id or public.has_subadmin_perm('allowModeration'));

drop policy if exists "Moderators manage group memberships" on public.group_memberships;
create policy "Moderators manage group memberships"
  on public.group_memberships for all
  using (public.has_subadmin_perm('allowModeration'))
  with check (public.has_subadmin_perm('allowModeration'));

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null references public.group_channels(name) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  text text not null check (char_length(text) > 0 and char_length(text) <= 4000),
  parent_id uuid references public.chat_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

drop policy if exists "Users read allowed channel messages" on public.chat_messages;
create policy "Users read allowed channel messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.group_channels gc
      where gc.name = chat_messages.channel
        and (
          gc.is_restricted = false
          or public.has_subadmin_perm('allowModeration')
          or exists (
            select 1 from public.group_memberships gm
            where gm.channel = gc.name and gm.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Channel members post chat messages" on public.chat_messages;
create policy "Channel members post chat messages"
  on public.chat_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_channels gc
      where gc.name = chat_messages.channel
        and (
          gc.is_restricted = false
          or public.has_subadmin_perm('allowModeration')
          or exists (
            select 1 from public.group_memberships gm
            where gm.channel = gc.name and gm.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Only owner or moderator updates/deletes messages" on public.chat_messages;
create policy "Only owner or moderator updates/deletes messages"
  on public.chat_messages for update
  using (auth.uid() = user_id or public.has_subadmin_perm('allowModeration'))
  with check (auth.uid() = user_id or public.has_subadmin_perm('allowModeration'));

drop policy if exists "Only owner or moderator deletes messages" on public.chat_messages;
create policy "Only owner or moderator deletes messages"
  on public.chat_messages for delete
  using (auth.uid() = user_id or public.has_subadmin_perm('allowModeration'));

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  target_id text not null,
  kind text not null default 'post' check (kind in ('review', 'comment', 'post')),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  rating integer check (rating is null or (rating >= 1 and rating <= 5)),
  text text not null check (char_length(text) > 0 and char_length(text) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.social_posts enable row level security;

drop policy if exists "Anyone reads social posts" on public.social_posts;
create policy "Anyone reads social posts"
  on public.social_posts for select
  using (true);

drop policy if exists "Authenticated user creates own post" on public.social_posts;
create policy "Authenticated user creates own post"
  on public.social_posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Only post owner or moderator updates post" on public.social_posts;
create policy "Only post owner or moderator updates post"
  on public.social_posts for update
  using (auth.uid() = user_id or public.has_subadmin_perm('allowModeration'))
  with check (auth.uid() = user_id or public.has_subadmin_perm('allowModeration'));

drop policy if exists "Only post owner or moderator deletes post" on public.social_posts;
create policy "Only post owner or moderator deletes post"
  on public.social_posts for delete
  using (auth.uid() = user_id or public.has_subadmin_perm('allowModeration'));

-- ============================================================================
-- 8. IMMUTABLE AUDIT LOG & AI USAGE LEDGER
-- ============================================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null,
  actor_role text not null,
  category text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'AuditLog records are immutable and cannot be updated or deleted';
end;
$$;

drop trigger if exists audit_logs_immutable on public.audit_logs;
create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_log_mutation();

drop policy if exists "Only vault admins read audit logs" on public.audit_logs;
create policy "Only vault admins read audit logs"
  on public.audit_logs for select
  using (public.has_subadmin_perm('allowVault'));

drop policy if exists "Only admins or service role append audit logs" on public.audit_logs;
create policy "Only admins or service role append audit logs"
  on public.audit_logs for insert
  with check (public.is_admin() or public.is_manager());

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_user_time
  on public.ai_usage_logs (user_id, created_at desc);

alter table public.ai_usage_logs enable row level security;

drop policy if exists "Users read own ai usage logs" on public.ai_usage_logs;
create policy "Users read own ai usage logs"
  on public.ai_usage_logs for select
  using (auth.uid() = user_id or public.is_main_admin());

-- ============================================================================
-- 9. USER_HISTORY TABLE (Stores AI generations & user project history)
-- ============================================================================
create table if not exists public.user_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'AI Generation',
  category text not null default 'Assistant',
  prompt text not null,
  response text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_history_user_created
  on public.user_history (user_id, created_at desc);

alter table public.user_history enable row level security;

drop policy if exists "Users can view own history" on public.user_history;
create policy "Users can view own history"
  on public.user_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own history" on public.user_history;
create policy "Users can insert own history"
  on public.user_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own history" on public.user_history;
create policy "Users can update own history"
  on public.user_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own history" on public.user_history;
create policy "Users can delete own history"
  on public.user_history for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 10. PAYMENT_TRANSACTIONS TABLE (Audit trail for Paystack M-Pesa / Card payments)
-- ============================================================================
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  reference text unique not null,
  amount_kes numeric(12, 2) not null,
  plan_id text not null,
  credits_added integer not null default 0,
  channel text,
  status text not null default 'pending',
  raw_payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.payment_transactions enable row level security;

drop policy if exists "Users can view own transactions" on public.payment_transactions;
create policy "Users can view own transactions"
  on public.payment_transactions for select
  using (auth.uid() = user_id or public.has_subadmin_perm('allowConfirmPayments') or public.is_manager());

-- ============================================================================
-- 11. PRIVATE STORAGE BUCKET: user-uploads
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-uploads',
  'user-uploads',
  false,
  52428800,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

drop policy if exists "Users can upload own files" on storage.objects;
create policy "Users can upload own files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can view own files" on storage.objects;
create policy "Users can view own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'user-uploads'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_subadmin_perm('allowManageBooks')
    )
  );

drop policy if exists "Users can update own files" on storage.objects;
create policy "Users can update own files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-uploads'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_subadmin_perm('allowManageBooks')
    )
  );
