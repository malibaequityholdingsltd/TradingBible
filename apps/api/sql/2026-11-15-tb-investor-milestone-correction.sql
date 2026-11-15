-- Correct the public IPO milestone that described a Delaware LLC conversion.
-- TradingBible Holdings. Inc. was formed as a Delaware stock corporation on
-- 28 October 2026; the company was not converted from an LLC. The filed name
-- has a period after Holdings, while the comma form is the intended commercial
-- name and remains subject to a certificate of correction.
--
-- Safe to re-run: the UPDATEs are limited to public milestones and only write
-- when the stored wording differs.

update public.tb_ipo_milestones
set
  title = 'Document the Delaware corporate structure',
  description = 'Maintain the certificate of incorporation, bylaws, board records and stock ledger for TradingBible Holdings. Inc. (the Delaware filed name; intended commercial form: TradingBible Holdings, Inc.); confirm the formation and officer appointment records before publishing completion evidence.'
where slug = 'corporate-conversion'
  and (
    title is distinct from 'Document the Delaware corporate structure'
    or description is distinct from 'Maintain the certificate of incorporation, bylaws, board records and stock ledger for TradingBible Holdings. Inc. (the Delaware filed name; intended commercial form: TradingBible Holdings, Inc.); confirm the formation and officer appointment records before publishing completion evidence.'
  );

-- Keep the roadmap verb neutral: no registration statement has been filed, and
-- no public document should be described as a draft. "Prepare" avoids implying
-- that a draft filing or offering document exists.
update public.tb_ipo_milestones
set
  description = 'Complete securities counsel review, prepare the registration statement and prospectus, and establish disclosure controls.'
where slug = 'sec-registration'
  and description is distinct from 'Complete securities counsel review, prepare the registration statement and prospectus, and establish disclosure controls.';
