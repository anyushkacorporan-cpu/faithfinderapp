-- ============================================================================
-- FaithFinder — events and tickets
--
-- Both were kept on the phone. An event created by a church existed only on
-- the organiser's device, so nobody could attend one; a ticket existed only on
-- the buyer's, so a lost phone lost the ticket and the organiser had no list
-- to check anyone against at the door.
--
-- Capacity was also advisory: it was checked in the app, on a number the app
-- itself kept, so two people buying the last seat at the same moment both got
-- it. That is enforced here now.
-- ============================================================================

create table if not exists events (
  id            text primary key,
  organizer_id  uuid references auth.users (id) on delete set null,

  status        text not null default 'upcoming'
                  check (status in ('upcoming', 'active', 'past', 'draft')),
  title         text not null,
  description   text default '',
  summary       text default '',
  organizer     text default '',

  -- Kept as the strings the app already stores. Dates are typed by hand in
  -- several formats and a timestamptz here would have to guess a timezone the
  -- organiser never gave us; guessing wrong moves someone's event by a day.
  date          text,
  time          text,
  end_time      text,

  location      text,
  city          text,
  state         text,
  zip           text,
  type          text,

  price         text,
  is_paid       boolean not null default false,
  ticket_price  numeric(10,2) not null default 0,
  platform_fee  numeric(10,2) not null default 0,
  creator_payout numeric(10,2) not null default 0,
  currency      text not null default 'USD' check (currency in ('USD', 'CAD')),

  tickets_sold  integer not null default 0,
  -- 0 means uncapped, matching the app: events created before capacity existed
  -- are uncapped by definition rather than sold out.
  capacity      integer not null default 0,
  attending     integer not null default 0,

  banner_image  text,
  venue_layout_image text,
  banner_color  jsonb,
  speakers      jsonb not null default '[]'::jsonb,
  agenda        jsonb not null default '[]'::jsonb,
  experience    jsonb not null default '[]'::jsonb,

  audience      text,
  venue_type    text default 'in-person',
  venue_name    text,
  venue_address text,
  venue_instructions text,
  parking       text,
  live_stream_url text,
  meeting_url   text,
  platform      text,
  has_live_stream boolean not null default false,
  recurrence    text default 'once',
  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists events_created_idx   on events (created_at desc);
create index if not exists events_organizer_idx on events (organizer_id);

alter table events enable row level security;

-- An event people cannot find is not an event. Drafts stay with their author.
drop policy if exists events_select on events;
create policy events_select on events
  for select using (status <> 'draft' or auth.uid() = organizer_id);

drop policy if exists events_insert_own on events;
create policy events_insert_own on events
  for insert with check (auth.uid() = organizer_id);

drop policy if exists events_update_own on events;
create policy events_update_own on events
  for update using (auth.uid() = organizer_id);

drop policy if exists events_delete_own on events;
create policy events_delete_own on events
  for delete using (auth.uid() = organizer_id);

drop trigger if exists events_touch on events;
create trigger events_touch before update on events
  for each row execute function touch_updated_at();

-- ── Tickets ────────────────────────────────────────────────────────────────
create table if not exists tickets (
  id            text primary key,
  event_id      text not null references events (id) on delete cascade,
  buyer_id      uuid not null references auth.users (id) on delete cascade,

  -- Copied from the event at purchase. A ticket has to keep saying what was
  -- bought even if the organiser later renames the event or moves it, and it
  -- has to be readable at a door with no signal.
  event_title    text,
  event_date     text,
  event_location text,
  event_type     text,

  email         text,
  quantity      integer not null check (quantity > 0),
  price_per_ticket numeric(10,2) not null default 0,
  total_paid    numeric(10,2) not null default 0,
  platform_fee  numeric(10,2) not null default 0,

  -- One code per seat, so a party of four can be admitted separately.
  ticket_codes  text[] not null,

  purchased_at  timestamptz not null default now()
);

create index if not exists tickets_event_idx on tickets (event_id);
create index if not exists tickets_buyer_idx on tickets (buyer_id);

alter table tickets enable row level security;

-- Your tickets are yours; the organiser can see the tickets for their own
-- event, which is the whole point of having a door list.
drop policy if exists tickets_select on tickets;
create policy tickets_select on tickets
  for select using (
    auth.uid() = buyer_id
    or exists (select 1 from events e where e.id = tickets.event_id and e.organizer_id = auth.uid())
  );

drop policy if exists tickets_insert_own on tickets;
create policy tickets_insert_own on tickets
  for insert with check (auth.uid() = buyer_id);

-- ── Capacity, enforced ─────────────────────────────────────────────────────
-- The app checked capacity against a count it kept itself, so two people
-- buying the last seat at the same moment both succeeded. Counting here, in
-- the same transaction as the sale, is the only place the check can be true.
create or replace function claim_seats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap  integer;
  sold integer;
begin
  select capacity, tickets_sold into cap, sold
  from events where id = new.event_id
  for update;   -- serialises concurrent purchases for this event

  if cap > 0 and sold + new.quantity > cap then
    raise exception 'Only % ticket(s) left', greatest(0, cap - sold)
      using errcode = 'check_violation';
  end if;

  update events set tickets_sold = tickets_sold + new.quantity where id = new.event_id;
  return new;
end;
$$;

drop trigger if exists tickets_claim_seats on tickets;
create trigger tickets_claim_seats before insert on tickets
  for each row execute function claim_seats();
