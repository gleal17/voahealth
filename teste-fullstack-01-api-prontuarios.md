# Teste Fullstack 01 — API de Prontuários com Geração de Documentos via IA

**Área:** Fullstack  
**Duração estimada:** 3–4 horas  

---

## Contexto

A Voa Health é uma plataforma que permite a médicos gravar consultas, transcrever o áudio automaticamente e gerar documentos clínicos estruturados (notas SOAP, prescrições, encaminhamentos, etc.) a partir dessas transcrições usando IA. O médico pode revisar e editar os documentos gerados em um editor rich text.

Neste teste, você construirá uma versão simplificada desse fluxo: uma API REST + interface web para gerenciar prontuários eletrônicos (EHRs) e gerar documentos clínicos a partir de transcrições usando uma LLM.

---

## Requisitos

### Backend

Crie uma API REST com os seguintes modelos e endpoints. Você pode usar o framework de sua preferência — na Voa, utilizamos **Django 5 + Django REST Framework**, mas fique à vontade para usar outra stack (FastAPI, Express, etc.).

1. **Modelos:**
   - `EHR` — representa uma consulta médica:
     - `id` (UUID)
     - `patient_name` (string)
     - `consultation_type` (choices: `presencial`, `telemedicina`)
     - `transcription` (text — a transcrição da consulta)
     - `extra` (JSONField — metadados adicionais flexíveis)
     - `created_at`, `updated_at`
   - `Document` — documento gerado vinculado a um EHR:
     - `id` (UUID)
     - `ehr` (FK para EHR)
     - `template_identifier` (string — ex: `soap_note`, `prescription`, `referral`)
     - `content` (text — conteúdo gerado)
     - `created_at`

2. **Endpoints (REST):**
   - `GET /api/ehrs/` — listar EHRs (com paginação)
   - `POST /api/ehrs/` — criar EHR
   - `GET /api/ehrs/{id}/` — detalhe do EHR (incluindo documentos vinculados)
   - `POST /api/ehrs/{id}/generate/` — gerar documento:
     - Recebe `{ "template_identifier": "soap_note" }`
   - Usa a transcrição do EHR + o tipo de template para gerar um documento clínico via chamada a uma LLM (Gemini / Google GenAI ou similar)
     - Salva e retorna o `Document` criado
   - `GET /api/ehrs/{id}/documents/` — listar documentos de um EHR
   - `PATCH /api/ehrs/{id}/documents/{doc_id}/` — editar conteúdo de um documento

3. **Geração de documento com LLM:**
   - Criar um prompt adequado que receba a transcrição e o tipo de template
   - Usar a API com outra LLM para gerar o conteúdo
   - O prompt deve instruir a LLM a gerar um documento clínico estruturado em português
   - Se não quiser usar uma API paga, pode usar um mock que retorne um texto fixo — mas a arquitetura deve estar preparada para trocar por uma chamada real

### Frontend

Crie uma interface web para interagir com a API. Você pode usar o framework de sua preferência — na Voa, utilizamos **Next.js 14 (App Router) com React 18 e TypeScript**, mas fique à vontade para usar outra stack.

1. **Tela de listagem de EHRs:**
   - Lista de prontuários com nome do paciente, tipo de consulta e data
   - Botão para criar novo EHR
   - Clique em um EHR navega para o detalhe

2. **Tela de detalhe do EHR:**
   - Exibir dados do EHR e a transcrição
   - Seção de documentos gerados, com conteúdo exibido
   - Botão "Gerar documento" que abre um seletor de template (SOAP, Prescrição, Encaminhamento)
   - Ao gerar, exibir loading e depois o documento gerado
   - Permitir edição inline do conteúdo do documento (textarea ou editor simples)
   - Botão para salvar edições

3. **Formulário de criação de EHR:**
   - Campos: nome do paciente, tipo de consulta, transcrição (textarea), campo extra (JSON editor simples ou key-value pairs)

---

## Requisitos Técnicos

- Backend: linguagem e framework de sua escolha (na Voa usamos **Python 3.12+ com Django 5 + DRF**)
- Frontend: framework de sua escolha (na Voa usamos **React 18+ com TypeScript e Next.js 14**)
- Banco de dados: relacional (na Voa usamos **PostgreSQL via Supabase** — pode usar SQLite para desenvolvimento)
- README com instruções de setup e execução

---

## Diferenciais (não obrigatórios)

- Docker + docker-compose para rodar o projeto completo
- Streaming da resposta da LLM (Server-Sent Events ou WebSocket)
- Testes automatizados (backend e/ou frontend)
- Notebook Jupyter (`.ipynb`) para demonstrar e testar a API
- CI pipeline (GitHub Actions)
- Uso de Pydantic para validação de schemas
- UI com biblioteca de componentes (Ant Design, Shadcn, etc.)

---

## Entrega

- Repositório público no GitHub com o código-fonte
- README com instruções de setup e execução
- Se utilizou IA, declarar qual e de que forma foi utilizada
