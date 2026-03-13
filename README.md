# Voa Health - API de Prontuários com Geração de Documentos Clinicos

Aplicacao fullstack para gerenciamento de prontuarios eletronicos (EHRs), com transcricao de audio e geracao de documentos clinicos estruturados.

## Visao geral

O fluxo principal e:

1. O medico cria um prontuario digitando a transcricao ou usando o endpoint de transcricao de audio.
2. O backend persiste o `EHR` com metadados flexiveis em `extra`.
3. A partir da transcricao, o backend gera documentos clinicos (`soap_note`, `prescription`, `referral`).
4. Os documentos podem ser listados, editados e salvos.

Por padrao de desenvolvimento local, o backend pode operar com `USE_STUBS=true`, sem depender de chave real da Gemini API.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.11+ · Django 5.1 · Django REST Framework 3.15 |
| Frontend | Next.js 14 · React 18 · TypeScript |
| Banco de dados |  PostgreSQL no Docker Compose |
| Integracao LLM | Google GenAI (`google-genai`) ou stubs locais |
| Estilizacao | Tailwind CSS 3 |
| Estado e formularios | TanStack Query 5 · react-hook-form 7 · Zod |

## Arquitetura

### Estrutura do backend

```text
backend/
├── apps/ehr/
│   ├── api/              # views, serializers, paginacao, tratamento de erros
│   ├── services/         # providers Gemini, stubs e contratos Pydantic
│   ├── migrations/
│   ├── models.py
│   └── tests.py
├── config/
│   ├── settings.py
│   └── urls.py
└── manage.py
```

## Setup

### Pre-requisitos

- Python 3.11+
- Node.js 18+
- npm

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

API em `http://localhost:8000/api/`.

Observacao: o backend local usa PostgreSQL via `DATABASE_URL`. Um valor compativel com o banco exposto pelo `docker compose` do projeto e `postgres://voahealth:voahealth@127.0.0.1:5432/voahealth`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend em `http://localhost:3000`.

### Docker Compose

```bash
cp .env.compose.example .env
./scripts/start.sh
```

## Variaveis de ambiente

### Backend local (`backend/.env`)

| Variavel | Descricao | Padrao |
|----------|-----------|--------|
| `DEBUG` | Ativa modo debug | `true` |
| `SECRET_KEY` | Chave secreta Django | vazio em `.env.example` |
| `ALLOWED_HOSTS` | Hosts permitidos | `127.0.0.1,localhost` |
| `CORS_ALLOWED_ORIGINS` | Origens permitidas | `http://localhost:3000` |
| `DATABASE_URL` | Banco usado no desenvolvimento local | `postgres://voahealth:voahealth@127.0.0.1:5432/voahealth` |
| `GEMINI_API_KEY` | Chave da Gemini para integracao real | vazio |
| `GEMINI_TRANSCRIPTION_MODEL` | Modelo de transcricao | `gemini-2.5-flash` no codigo |
| `GEMINI_WRITER_MODEL` | Modelo de geracao de documentos | `gemini-2.5-flash` no `.env.example` |
| `USE_STUBS` | Usa servicos stub em vez de API real | `false` no `.env.example` |

### Docker Compose (`.env` na raiz)

Quando a stack sobe via `docker compose`, o arquivo considerado para as variaveis do container e o `.env` da raiz do projeto. Em especial, `USE_STUBS=false` precisa estar nesse arquivo para desabilitar os stubs no backend containerizado.

As variaveis relevantes nesse modo sao:

- `GEMINI_API_KEY`
- `GEMINI_TRANSCRIPTION_MODEL`
- `GEMINI_WRITER_MODEL`
- `USE_STUBS`

### Frontend (`frontend/.env.local`)

| Variavel | Descricao | Padrao |
|----------|-----------|--------|
| `NEXT_PUBLIC_API_BASE_URL` | URL pública da API consumida pelo browser | `http://localhost:8000/api` |

### Frontend no Docker Compose

| Variavel | Descricao | Valor esperado |
|----------|-----------|----------------|
| `NEXT_PUBLIC_API_BASE_URL` | URL pública da API para o browser | `http://localhost:8000/api` |
| `API_INTERNAL_BASE_URL` | URL interna da API para SSR dentro do container | `http://backend:8000/api` |

## Endpoints

| Metodo | Rota | Descricao |
|--------|------|-----------|
| `GET` | `/api/` | Health check |
| `GET` | `/api/ehrs/` | Listar EHRs com paginacao |
| `POST` | `/api/ehrs/` | Criar EHR |
| `GET` | `/api/ehrs/{id}/` | Detalhar EHR com documentos |
| `POST` | `/api/ehrs/{id}/generate/` | Gerar documento clinico |
| `GET` | `/api/ehrs/{id}/documents/` | Listar documentos do EHR |
| `PATCH` | `/api/ehrs/{id}/documents/{doc_id}/` | Editar conteudo do documento |
| `POST` | `/api/transcriptions/` | Transcrever audio |
| `POST` | `/api/ehrs/{id}/generate/stream/` | Streaming SSE opcional |

## Qualidade

Comandos disponiveis no projeto:

```bash
cd backend
python manage.py check
python manage.py test apps.ehr --verbosity=2
```

```bash
cd frontend
npm run lint
npm run build
```

Observacao: a suite `backend/apps/ehr/tests.py` contem 46 testes atualmente.

## Aderencia ao desafio

### Atende

- Modelos `EHR` e `Document` com UUID, timestamps, `JSONField` e relacionamento correto.
- Todos os endpoints REST obrigatorios do desafio.
- Geracao de documento preparada para provider real e tambem para stub.
- Interface web com listagem, criacao e detalhe.
- Edicao inline de documentos.
- README com setup, execucao e declaracao de uso de IA.
- Diferenciais implementados: Docker Compose, testes automatizados, notebook, CI e streaming SSE opcional.

### Diferencas em relacao ao enunciado

- O editor rich text nao foi implementado; a edicao e feita em textarea.
- A transcricao de audio foi modelada como endpoint separado (`POST /api/transcriptions/`), o que simplifica o fluxo de criacao do EHR.
- O projeto usa stubs por padrao em ambiente local (`USE_STUBS=true`) e depende de configuracao para usar Gemini real.

## Revisao do backend

Pontos fortes observados:

- Separacao clara entre camada HTTP (`api/`) e integracoes externas (`services/`).
- Cobertura de testes ampla para rotas, erros, SSE e contratos internos.
- Uso correto de `prefetch_related("documents")` no detalhe do EHR.
- A rota de detalhe do frontend usa carregamento inicial server-side e reaproveita React Query no cliente para refetch apos geracao e edicao de documentos.
- Tratamento consistente de erros de integracao com codigos HTTP adequados.
- Arquitetura preparada para trocar o provider de IA sem alterar as views.

Pontos de atencao:

- `EHRListSerializer` retorna `transcription` e `extra` na listagem; isso pode aumentar payload e expor mais dados do que o necessario.
- `DocumentListView` e `DocumentPartialUpdateView` fazem uma consulta extra para verificar se o EHR existe antes de buscar o documento.
- O endpoint SSE opcional nao aparece como persistencia parcial ou cancelamento; em caso de desconexao do cliente, o processamento continua.
- Nao foi possivel executar `manage.py check` e `manage.py test` neste ambiente porque Django nao esta instalado localmente no shell atual.

## Documentacao relacionada

- [Enunciado do desafio](./teste-fullstack-01-api-prontuarios.md)

## Uso de IA

Este projeto declara uso de IA generativa como assistente de desenvolvimento. No produto, a IA e usada em duas frentes:

- Transcricao de audio.
- Geracao de documentos clinicos estruturados.
