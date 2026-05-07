# Specification: User Administration (Administração de Usuários)

## Problem

Atualmente, o sistema não possui uma interface para gestão de usuários. A criação de usuários é feita via scripts ou diretamente no banco de dados. Além disso, não há um fluxo de autorização: qualquer usuário criado (ou que venha a se cadastrar) tem acesso imediato se estiver ativo. É necessário que o sistema permita o cadastro de novos usuários, mas que estes fiquem pendentes de aprovação por um Diretor antes de acessarem as funcionalidades do sistema.

## Audience

- **Diretores:** Precisam autorizar novos usuários, desativar contas e gerenciar cargos (Diretor vs. Funcionário).
- **Novos Usuários:** Precisam se cadastrar no sistema e aguardar a aprovação para começar a trabalhar.

## Success Criteria

- [ ] Implementação de telas de Login e Cadastro (Signup) no frontend.
- [ ] Novos usuários cadastrados via Signup devem ser criados com status `is_active = False` por padrão.
- [ ] Implementação de uma tela de Administração de Usuários, restrita a usuários com o cargo `DIRETOR`.
- [ ] Capacidade do Diretor listar todos os usuários e filtrar por status (ex: Pendentes de Aprovação).
- [ ] Capacidade do Diretor ativar/desativar usuários e alterar seus cargos.
- [ ] Garantia de que usuários inativos não consigam realizar login ou acessar recursos da API.

## Success Metrics

- Tempo médio para autorização de um novo funcionário < 24h (estimado por processo manual anterior).
- 100% dos usuários logados possuem cargos e status validados pelo backend em cada requisição.
- Zero usuários não autorizados com acesso a dados sensíveis de tarefas.

## Constraints

- **Segurança:** O backend deve validar se o usuário realizando as operações administrativas possui de fato o cargo `DIRETOR`.
- **UI:** Seguir o padrão de Vanilla CSS e abordagem mobile-first definido no Tech Stack.
- **Cargos:** Limitar aos cargos já existentes no backend (`DIRETOR`, `FUNCIONARIO`).

## User Stories

1. **Como Novo Usuário**, quero me cadastrar no sistema para que eu possa solicitar acesso às ferramentas de gestão.
2. **Como Diretor**, quero ver uma lista de usuários pendentes de aprovação para que eu possa autorizar quem realmente faz parte da equipe.
3. **Como Diretor**, quero poder alterar o cargo de um funcionário para diretor, permitindo que ele também ajude na administração.
4. **Como Diretor**, quero poder desativar um usuário que não faz mais parte da organização para garantir a segurança dos dados.

## Functional Requirements

### 1. Fluxo de Autenticação (Frontend & Backend)

- **Signup:** Endpoint e tela para criação de conta (username, email, password, full_name). O campo `is_active` deve ser `False`.
- **Login:** Tela para autenticação. Deve informar claramente se o usuário estiver inativo ("Aguardando aprovação do administrador").

### 2. Gestão de Usuários (Admin Side)

- **Endpoint de Listagem:** `GET /users` (Restrito a `DIRETOR`).
- **Endpoint de Atualização:** `PATCH /users/{user_id}` para alterar `role` e `is_active` (Restrito a `DIRETOR`).
- **Interface de Admin:**
  - Lista/Tabela com dados do usuário.
  - Botão de ação para "Aprovar" (Ativar).
  - Dropdown/Toggle para mudar cargo entre `FUNCIONARIO` e `DIRETOR`.

### 3. Regras de Negócio

- O primeiro usuário do sistema (ex: criado via seed) deve ser um `DIRETOR` ativo para poder gerenciar os demais.
- Um `DIRETOR` não deve poder desativar a si mesmo (para evitar lock-out do sistema), ou pelo menos deve haver um aviso/validação.

## Acceptance Criteria

- Tentar acessar a tela de administração como `FUNCIONARIO` deve resultar em erro de permissão (403).
- Um usuário recém-cadastrado não deve conseguir obter um token JWT válido (o login deve falhar até que ele seja ativado).
- As alterações de cargo e status devem refletir imediatamente no comportamento do sistema para o usuário afetado.
