-- Drop existing objects if they exist
drop policy if exists "Enable read access for authenticated users" on call_logs;
drop policy if exists "Enable insert access for authenticated users" on call_logs;
drop policy if exists "Enable update access for authenticated users" on call_logs;

drop policy if exists "Allow authenticated users to read settings" on settings;
drop policy if exists "Allow authenticated users to update settings" on settings;
drop policy if exists "Allow authenticated users to insert settings" on settings;

drop policy if exists "Enable read access for authenticated users" on leads;
drop policy if exists "Enable insert access for authenticated users" on leads;
drop policy if exists "Enable update access for authenticated users" on leads;
drop policy if exists "Enable delete access for authenticated users" on leads;

drop trigger if exists update_call_logs_updated_at on call_logs;
drop trigger if exists update_leads_updated_at on leads;
drop trigger if exists update_settings_updated_at on settings;

drop index if exists idx_call_logs_lead_id;
drop index if exists idx_call_logs_vapi_call_id;
drop index if exists idx_leads_status;
drop index if exists idx_leads_last_called_at;
drop index if exists idx_leads_cal_booking_uid;

drop table if exists call_logs;
drop table if exists leads;
drop table if exists settings;

drop function if exists update_updated_at_column();
drop type if exists lead_status;

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Create enum for lead status
create type lead_status as enum (
  'pending',
  'calling',
  'no_answer',
  'scheduled',
  'not_interested',
  'error'
);

-- Create updated_at trigger function (used by multiple tables)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create leads table
create table leads (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  contact_name text not null,
  phone text not null,
  email text not null,
  status lead_status default 'pending',
  call_attempts integer default 0,
  timezone text default 'America/Chicago',
  last_called_at timestamp with time zone,
  cal_booking_uid text unique,
  follow_up_email_sent boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create trigger for leads updated_at
create trigger update_leads_updated_at 
  before update on leads 
  for each row 
  execute function update_updated_at_column();

-- Create call_logs table
create table call_logs (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id) on delete cascade,
  vapi_call_id text not null unique,
  initiated_at timestamp with time zone,
  ended_at timestamp with time zone,
  ended_reason text,
  recording_url text,
  stereo_recording_url text,
  duration_seconds numeric,
  cost numeric,
  initial_response jsonb,
  report jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create trigger for call_logs updated_at
create trigger update_call_logs_updated_at 
  before update on call_logs 
  for each row 
  execute function update_updated_at_column();

-- Create indexes for call_logs
create index idx_call_logs_lead_id on call_logs(lead_id);
create index idx_call_logs_vapi_call_id on call_logs(vapi_call_id);

-- Enable RLS for call_logs
alter table call_logs enable row level security;

-- Create RLS policies for call_logs
create policy "Enable read access for authenticated users" on call_logs
  for select
  to authenticated
  using (true);

create policy "Enable insert access for authenticated users" on call_logs
  for insert
  to authenticated
  with check (true);

create policy "Enable update access for authenticated users" on call_logs
  for update
  to authenticated
  using (true)
  with check (true);

-- Create settings table
create table settings (
  id uuid primary key default gen_random_uuid(),
  automation_enabled boolean default false,
  max_calls_batch integer default 10,
  retry_interval integer default 15,
  max_attempts integer default 3,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create trigger for settings updated_at
create trigger update_settings_updated_at 
  before update on settings 
  for each row 
  execute function update_updated_at_column();

-- Insert default settings record
insert into settings (automation_enabled, max_calls_batch, retry_interval, max_attempts)
values (false, 10, 15, 3)
on conflict (id) do nothing;

-- Enable RLS for settings table
alter table settings enable row level security;

-- Create RLS policy for settings table
create policy "Allow authenticated users to read settings"
  on settings for select
  to authenticated
  using (true);

create policy "Allow authenticated users to update settings"
  on settings for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated users to insert settings"
  on settings for insert
  to authenticated
  with check (true);

-- Drop appointments table if it exists
drop table if exists appointments;

-- Enable RLS on leads table
alter table leads enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Allow all operations for authenticated users" on leads;
drop policy if exists "Allow all operations for authenticated users" on settings;

-- RLS Policies for leads
create policy "Enable read access for authenticated users" on leads
  for select
  to authenticated
  using (true);

create policy "Enable insert access for authenticated users" on leads
  for insert
  to authenticated
  with check (true);

create policy "Enable update access for authenticated users" on leads
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Enable delete access for authenticated users" on leads
  for delete
  to authenticated
  using (true);

-- Create indexes
create index idx_leads_status on leads(status);
create index idx_leads_last_called_at on leads(last_called_at);
create index idx_leads_cal_booking_uid on leads(cal_booking_uid);

-- Enable realtime subscriptions for leads table
drop publication if exists supabase_realtime;
create publication supabase_realtime;
alter publication supabase_realtime add table leads;
