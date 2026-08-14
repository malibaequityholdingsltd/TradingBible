-- Forum content metadata used by the Community page (CommunityPage.jsx).
-- Without these the forum could not display authors, categories or reply
-- counts, and posting new threads failed with "column does not exist".
alter table public.forum_threads
  add column if not exists category text,
  add column if not exists "authorName" text,
  add column if not exists "authorAvatar" text,
  add column if not exists "replyCount" integer default 0;

alter table public.forum_replies
  add column if not exists "authorName" text,
  add column if not exists "authorAvatar" text;
