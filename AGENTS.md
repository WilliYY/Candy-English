# AGENTS.md — Candy English AVA

## Objetivo do projeto

Criar um AVA separado para Candy English, com área administrativa, área teacher e área do aluno.

O sistema deve permitir que a teacher crie aulas, materiais, vocabulários, homeworks e correções. O aluno deve conseguir acessar seus materiais, responder atividades online e visualizar feedback.

## Stack obrigatória

- Next.js 15 com App Router
- TypeScript
- PostgreSQL 17
- Prisma 7
- Auth.js / NextAuth v5
- Zod
- Tailwind CSS 4
- Shadcn/ui
- TanStack React Query
- React Hook Form + Zod
- Docker + Docker Compose

## Estrutura de rotas

- /admin
- /teacher
- /student

## Perfis de usuário

- ADMIN
- TEACHER
- STUDENT

## Regras principais

- O projeto não deve ser feito em WordPress.
- O projeto deve rodar em Docker.
- O banco PostgreSQL não deve ficar exposto publicamente.
- As credenciais devem ficar em .env.
- O arquivo .env nunca deve ser versionado no GitHub.
- O arquivo .env.example deve conter apenas exemplos.
- Toda mudança estrutural precisa ser documentada no README.md.
- Toda decisão importante precisa ser registrada em docs/arquitetura.md.

## MVP inicial

1. Login com email e senha
2. Controle de roles
3. Dashboard admin
4. Dashboard teacher
5. Dashboard student
6. Cadastro de alunos
7. Cadastro de aulas
8. Materiais da aula
9. Homework online
10. Correção com feedback
