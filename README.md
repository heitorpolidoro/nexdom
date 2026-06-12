# NEXDOM - Sistema de Gestão de Controle de Tarefas

<div>
<!-- GitHub CI & Sponsors -->
<a href="https://github.com/heitorpolidoro/nexdom/actions/workflows/ci.yml"><img src="https://github.com/heitorpolidoro/nexdom/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
<a href="https://github.com/sponsors/heitorpolidoro"><img src="https://img.shields.io/github/sponsors/heitorpolidoro?color=ea4aaa" alt="GitHub Sponsors"></a>
<br>

<!-- GitHub Stats -->

<a href="https://github.com/heitorpolidoro/nexdom/releases/latest"><img src="https://img.shields.io/github/v/release/heitorpolidoro/nexdom?label=Latest%20Version" alt="Latest Version"></a>
<img src="https://img.shields.io/github/release-date/heitorpolidoro/nexdom" alt="GitHub Release Date">
<img src="https://img.shields.io/github/commits-since/heitorpolidoro/nexdom/latest" alt="GitHub commits since latest release">
<img src="https://img.shields.io/github/last-commit/heitorpolidoro/nexdom" alt="GitHub last commit">
<br>

<!-- GitHub Activity -->

<a href="https://github.com/heitorpolidoro/nexdom/issues"><img src="https://img.shields.io/github/issues/heitorpolidoro/nexdom" alt="GitHub issues"></a>
<a href="https://github.com/heitorpolidoro/nexdom/pulls"><img src="https://img.shields.io/github/issues-pr/heitorpolidoro/nexdom" alt="GitHub pull requests"></a>
<br>

<!-- DeepSource -->

<a href="https://app.deepsource.com/gh/heitorpolidoro/nexdom/" target="_blank"><img alt="DeepSource" title="DeepSource" src="https://app.deepsource.com/gh/heitorpolidoro/nexdom.svg/?label=active+issues&show_trend=true"/></a>
<a href="https://app.deepsource.io/gh/heitorpolidoro/nexdom/"><img src="https://app.deepsource.com/gh/heitorpolidoro/nexdom.svg/?label=coverage" alt="DeepSource Coverage"></a>
<br>

<!-- SonarCloud -->

<a href="https://sonarcloud.io/summary/new_code?id=heitorpolidoro_nexdom"><img src="https://sonarcloud.io/api/project_badges/measure?project=heitorpolidoro_nexdom&metric=alert_status" alt="SonarCloud Quality Gate"></a>
<a href="https://sonarcloud.io/summary/new_code?id=heitorpolidoro_nexdom"><img src="https://sonarcloud.io/api/project_badges/measure?project=heitorpolidoro_nexdom&metric=coverage" alt="SonarCloud Coverage"></a>
<a href="https://sonarcloud.io/summary/new_code?id=heitorpolidoro_nexdom"><img src="https://sonarcloud.io/api/project_badges/measure?project=heitorpolidoro_nexdom&metric=security_rating" alt="SonarCloud Security Rating"></a>
<br>
<a href="https://sonarcloud.io/summary/new_code?id=heitorpolidoro_nexdom"><img src="https://sonarcloud.io/api/project_badges/measure?project=heitorpolidoro_nexdom&metric=bugs" alt="SonarCloud Bugs"></a>
<a href="https://sonarcloud.io/summary/new_code?id=heitorpolidoro_nexdom"><img src="https://sonarcloud.io/api/project_badges/measure?project=heitorpolidoro_nexdom&metric=vulnerabilities" alt="SonarCloud Vulnerabilities"></a>
<a href="https://sonarcloud.io/summary/new_code?id=heitorpolidoro_nexdom"><img src="https://sonarcloud.io/api/project_badges/measure?project=heitorpolidoro_nexdom&metric=code_smells" alt="SonarCloud Code Smells"></a>
<a href="https://sonarcloud.io/summary/new_code?id=heitorpolidoro_nexdom"><img src="https://sonarcloud.io/api/project_badges/measure?project=heitorpolidoro_nexdom&metric=sqale_rating" alt="SonarCloud Maintainability"></a>

</div>

Este projeto é uma aplicação web desenvolvida para gerenciar tarefas, permitindo a criação, atribuição, acompanhamento de status e auditoria de alterações.

## Tecnologias Utilizadas

### Backend

- **Linguagem:** Python 3.14
- **Framework:** FastAPI
- **ORM:** SQLModel (com SQLAlchemy)
- **Banco de Dados:** PostgreSQL
- **Gerenciador de Pacotes:** uv
- **Containerização:** Docker

### Frontend

- **Framework:** React (TypeScript)
- **Build Tool:** Vite
- **Estilização:** CSS Modules

## Estrutura do Projeto

O projeto segue uma estrutura modular com separação clara entre frontend e backend, utilizando Docker Compose para orquestração.

## Configurações do Ambiente

As configurações do ambiente (banco de dados, chaves secretas, etc.) devem ser definidas no arquivo `.env`.

## Execução

### Backend

Para rodar o backend, utilize o Docker Compose:

```bash
docker-compose up --build backend
```

### Frontend

Para rodar o frontend:

```bash
docker-compose up frontend
```

## Contribuição e Fluxo de Trabalho

Este projeto segue um fluxo de trabalho com Git, branch de features (`feat/`), commits descritivos e Pull Requests para revisão e merge na branch principal (`master`).

## Segurança

O projeto implementa autenticação via JWT e controle de acesso baseado em roles (RBAC) para Diretores e Funcionários. Credenciais sensíveis devem ser gerenciadas via variáveis de ambiente e arquivo `.env`.

## Quality Assurance

O projeto conta com testes unitários e de integração para o backend, e está configurado para suportar testes frontend e E2E. Workflows de CI/GitHub Actions estão preparados para validação automática.
