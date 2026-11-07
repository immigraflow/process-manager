-- feature/#IMF-001: tipo de visto por processo
-- Rodar no SQL Editor do Supabase ANTES de publicar o front desta branch.
-- Processos já existentes são EB-3 (único fluxo que existia), por isso o default.
alter table public.cases
  add column if not exists tipo_visto text not null default 'eb3';
