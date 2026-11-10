-- feature/#IMF-007: aba Documentos (um item por processo)
-- Rodar no SQL Editor do Supabase ANTES de testar a aba. Pode ser rodado mais de uma vez.
-- Assume o mesmo padrão multi-tenant do app: public.organization_members (user_id, organization_id).
-- Se as suas políticas de RLS seguem outro padrão, ajuste as duas policies de arquivos abaixo.

-- 1) Status e prazo de envio de documentos, direto na tabela de processos
alter table public.cases add column if not exists doc_status text not null default 'pendente';
alter table public.cases add column if not exists doc_prazo date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cases_doc_status_check') then
    alter table public.cases add constraint cases_doc_status_check check (doc_status in ('pendente', 'enviado'));
  end if;
end $$;

-- Processos que já existem: prazo = data de criação + 7 dias (só preenche onde ainda está vazio)
update public.cases
   set doc_prazo = (created_at at time zone 'America/Sao_Paulo')::date + 7
 where doc_prazo is null;

-- Processos novos: prazo padrão de 7 dias a partir da criação (data no fuso de Brasília)
alter table public.cases
  alter column doc_prazo set default ((now() at time zone 'America/Sao_Paulo')::date + 7);

-- 2) Arquivos enviados por processo (o arquivo em si fica no Storage; aqui só o registro).
--    Excluir o processo apaga estes registros em cascata.
create table if not exists public.case_document_files (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  organization_id uuid not null,
  nome text not null,
  path text not null,
  tamanho bigint,
  tipo text,
  created_at timestamptz not null default now()
);
create index if not exists case_document_files_case_idx on public.case_document_files (case_id);
create index if not exists case_document_files_org_idx on public.case_document_files (organization_id);

alter table public.case_document_files enable row level security;

drop policy if exists "case_document_files: membros da organização" on public.case_document_files;
create policy "case_document_files: membros da organização" on public.case_document_files
  for all to authenticated
  using (organization_id in (select organization_id from public.organization_members where user_id = auth.uid()))
  with check (organization_id in (select organization_id from public.organization_members where user_id = auth.uid()));

-- 3) Bucket privado para os arquivos. Caminho: {organization_id}/{case_id}/{arquivo}
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

drop policy if exists "client-documents: membros da organização" on storage.objects;
create policy "client-documents: membros da organização" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] in (select organization_id::text from public.organization_members where user_id = auth.uid())
  )
  with check (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] in (select organization_id::text from public.organization_members where user_id = auth.uid())
  );

-- 4) OPCIONAL: se você rodou a primeira versão desta migração (clientes avulsos), estas tabelas ficaram
--    sem uso. Descomente para removê-las (apaga os dados de teste daquela versão; arquivos já enviados
--    ao bucket continuam lá e podem ser apagados pelo painel Storage do Supabase).
-- drop table if exists public.client_document_files;
-- drop table if exists public.client_documents;
