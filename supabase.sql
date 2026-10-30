-- ตั้งค่าตารางอันดับ: วางใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้)
create table if not exists public.leaderboard (
  player_id  uuid primary key,
  name       text not null check (char_length(name) between 1 and 12),
  level      int  not null default 1,
  total_eggs int  not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;
drop policy if exists "ทุกคนอ่านตารางได้" on public.leaderboard;
create policy "ทุกคนอ่านตารางได้" on public.leaderboard for select using (true);
-- ไม่มี policy insert/update: เขียนได้ผ่าน submit_score เท่านั้น

create or replace function public.submit_score(p_id uuid, p_name text, p_level int, p_eggs int)
returns void language plpgsql security definer set search_path = public as $$
declare old record; mins numeric; lv int; eg int;
begin
  p_name := left(trim(p_name), 12);
  if p_name = '' or p_level < 1 or p_eggs < 0 then raise exception 'bad input'; end if;
  select * into old from leaderboard where player_id = p_id;
  if not found then
    insert into leaderboard(player_id,name,level,total_eggs)
    values (p_id, p_name, least(p_level,100), least(p_eggs,100000));
  else
    -- กันโกง: คะแนนโตได้ไม่เกินอัตราที่เล่นจริงเป็นไปได้ตั้งแต่ส่งครั้งก่อน
    mins := greatest(extract(epoch from now()-old.updated_at)/60, 0);
    lv := least(p_level, old.level + 1 + floor(mins/5));
    eg := least(p_eggs,  old.total_eggs + 30 + floor(mins*20));
    update leaderboard set name=p_name, level=greatest(lv,old.level),
      total_eggs=greatest(eg,old.total_eggs), updated_at=now() where player_id=p_id;
  end if;
end $$;

grant execute on function public.submit_score to anon;
