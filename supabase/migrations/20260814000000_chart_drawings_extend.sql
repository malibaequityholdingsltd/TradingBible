-- Extend chart_drawings with template/visibility columns used by useDrawings
alter table public.chart_drawings
  add column if not exists is_template boolean not null default false,
  add column if not exists shared boolean not null default false,
  add column if not exists name text;
