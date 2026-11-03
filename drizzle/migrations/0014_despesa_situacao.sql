-- Adiciona coluna situacao à tabela despesas.
-- Substitui a derivação implícita (data <= hoje → paga) por estado explícito.
alter table despesas
  add column situacao text not null default 'prevista';

-- Backfill: despesas com data até hoje tornam-se 'paga'
update despesas set situacao = 'paga' where data <= current_date;

alter table despesas
  add constraint despesas_situacao_check check (situacao in ('paga', 'prevista'));
