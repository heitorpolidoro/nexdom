# Design: Roles, Permissões e Audit Timeline

**Data:** 2026-05-26
**Status:** Aprovado

---

## Escopo

Quatro mudanças independentes entregues juntas:

1. Audit timeline colapsável
2. Histórico resolve `assigned_to_id` → nome + role
3. Nova role `MANAGER`
4. Reorganização de permissões

---

## 1. Audit Timeline Colapsável

**Comportamento:** O bloco de histórico (`AuditTimeline`) começa **colapsado por padrão**. O usuário clica no cabeçalho para expandir/colapsar. O estado não é persistido — volta colapsado ao reabrir a tarefa.

**Implementação:** Estado local `useState<boolean>(false)` em `AuditTimeline.tsx`. O cabeçalho é um botão com ícone `▶` / `▼` e exibe a contagem de entradas quando colapsado: `"Histórico de alterações (3)"`.

---

## 2. Histórico resolve `assigned_to_id`

### Backend

O `TaskHistoryRead` schema ganha dois campos opcionais:

```python
resolved_old_value: dict | None = None  # { "name": str, "role": str }
resolved_new_value: dict | None = None
```

No `TaskService.get_history()`, para cada entrada onde `field_name == "assigned_to_id"`:
- Resolve o UUID de `old_value` e `new_value` para o usuário correspondente na tabela `User`
- Preenche `resolved_old_value = {"name": user.full_name, "role": user.role}` (ou `None` se o valor era `null`)

Os campos `old_value` / `new_value` continuam existindo com o UUID — `resolved_*` são adicionais.

### Frontend

O `AuditTimeline` ao renderizar um entry com `field_name == "assigned_to_id"`:
- Se `resolved_new_value` existir, exibe `"{name} ({role_traduzido})"` 
- O role é traduzido via i18n: `t("roles.DIRECTOR")`, `t("roles.MANAGER")`, etc.
- Fallback: exibe `old_value` / `new_value` cru se `resolved_*` não estiver presente

Adicionar chaves i18n em `pt.json` e `en.json`:

```json
"roles": {
  "ADMINISTRATOR": "Administrador",
  "DIRECTOR": "Diretor",
  "MANAGER": "Gerente"
}
```

---

## 3. Nova Role `MANAGER`

### Backend

`app/models/enums.py`:
```python
class UserRole(StrEnum):
    ADMINISTRATOR = "ADMINISTRATOR"
    DIRECTOR = "DIRECTOR"
    MANAGER = "MANAGER"       # novo
```

Migração Alembic: alterar o tipo enum no PostgreSQL para adicionar `MANAGER`.

### Frontend

`src/types/auth.ts`:
```typescript
export const UserRole = {
  ADMINISTRATOR: "ADMINISTRATOR",
  DIRECTOR: "DIRECTOR",
  MANAGER: "MANAGER",
} as const;
```

`AdminUserDashboard`: o toggle de role atualmente alterna entre ADMINISTRATOR e DIRECTOR. Com 3 roles, o padrão vira um `<select>` com as três opções.

Signup: novos usuários continuam recebendo `DIRECTOR` por padrão (sem mudança).

---

## 4. Reorganização de Permissões

### Matriz

| Ação | ADMINISTRATOR | DIRECTOR | MANAGER |
|---|---|---|---|
| Listar usuários | ✓ | ✓ | ✓ |
| Gerenciar usuários (ativar/role) | ✓ | ✗ | ✗ |
| Listar tarefas | ✓ | ✓ | ✓ |
| Criar tarefa | ✓ | ✓ | ✓ |
| Editar qualquer tarefa (todos os campos) | ✓ | ✓ | ✗ |
| Editar tarefa não-atribuída ou atribuída a si | ✓ | ✓ | ✓ |
| Deletar tarefa (soft delete) | ✓ | ✗ | ✗ |
| Comentar em qualquer tarefa | ✓ | ✓ | ✓ |
| Editar próprio comentário | ✓ | ✓ | ✓ |
| Criar / editar categorias | ✓ | ✓ | ✗ |

### Backend — mudanças nos endpoints

**`POST /tasks/`** — `create_task`
- Antes: somente `DIRECTOR`
- Depois: qualquer usuário autenticado (`get_current_user`)

**`PATCH /tasks/{id}`** — `update_task`
- Remover a restrição de campos do `DIRECTOR` (hoje limitado a `status, description, assigned_to_id, category_id`)
- Adicionar restrição para `MANAGER`: só pode atualizar se `task.assigned_to_id is None OR task.assigned_to_id == current_user.id`; caso contrário, `403`

**`DELETE /tasks/{id}`** — `delete_task`
- Sem mudança: continua exigindo `ADMINISTRATOR`

**`POST/PATCH /categories/`** — categorias
- Antes: somente `ADMINISTRATOR`  
- Depois: `ADMINISTRATOR` ou `DIRECTOR`

### Backend — `deps.py`

Remover `get_current_active_director` (não é mais necessário como guard de endpoint — a lógica de criação de tarefas passa a ser aberta a autenticados).

Adicionar helper para verificar permissão de edição de tarefa:

```python
def assert_can_edit_task(current_user: User, task: Task) -> None:
    """Raise 403 if MANAGER tries to edit a task not assigned to them."""
    if current_user.role == UserRole.MANAGER:
        if task.assigned_to_id is not None and task.assigned_to_id != current_user.id:
            raise ForbiddenError("Managers can only edit unassigned or self-assigned tasks")
```

### Frontend

- `TaskForm`: remover guard de role no botão de criar (hoje escondido para não-diretores)
- Botão de delete de tarefa: exibir apenas para `ADMINISTRATOR`
- Botão de criar/editar categoria: exibir para `ADMINISTRATOR` e `DIRECTOR`
- `AdminUserDashboard`: substituir toggle binário de role por `<select>` com 3 opções

---

## Testes

### Backend
- `test_tasks_rbac.py`: adicionar casos para MANAGER (criar ✓, editar própria ✓, editar alheia ✗, deletar ✗)
- `test_categories.py`: DIRECTOR pode criar/editar, MANAGER não pode
- `test_task_comments.py`: sem mudança (todos podem comentar)

### Frontend
- `AuditTimeline.test.tsx`: toggle colapsa/expande, colapsado por padrão, exibe contagem
- `AuditTimeline.test.tsx`: `assigned_to_id` exibe nome traduzido quando `resolved_*` presente
- `AdminUserDashboard.test.tsx`: select de role com 3 opções

---

## Ordem de implementação sugerida

1. Backend: adicionar `MANAGER` ao enum + migração
2. Backend: reorganizar permissões nos endpoints
3. Backend: enriquecer histórico com `resolved_*`
4. Frontend: atualizar `UserRole` e `AdminUserDashboard`
5. Frontend: audit timeline colapsável + resolução de `assigned_to_id`
6. Testes
