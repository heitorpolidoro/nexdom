# Design: Flag de Visibilidade de Tarefas para MANAGER

**Data:** 2026-05-27
**Status:** Aprovado

---

## Escopo

Adicionar uma flag booleana `manager_visible` ao modelo `Task` que controla se uma tarefa é visível para usuários com role `MANAGER`.

---

## Regras de negócio

| Situação | `manager_visible` |
|---|---|
| Tarefa criada por MANAGER | `True` (automático, pelo servidor) |
| Tarefa criada por ADMIN ou DIRECTOR | `False` (padrão) |
| ADMIN/DIRECTOR alteram a flag | Permitido via `PATCH /tasks/{id}` |
| MANAGER tenta alterar a flag | Campo ignorado silenciosamente |
| MANAGER tenta ver tarefa com `manager_visible=False` | 404 |
| MANAGER lista tarefas | Filtro automático: só `manager_visible=True` |

A flag não é exposta no `TaskCreate` — é sempre determinada pelo servidor com base no role do criador.

---

## Backend

### 1. Model (`app/models/task.py`)

```python
manager_visible: bool = Field(default=False, index=True)
```

### 2. Migração Alembic

```python
# 0005_add_manager_visible_to_task.py
def upgrade():
    op.add_column("task", sa.Column("manager_visible", sa.Boolean(), nullable=False, server_default="false"))

def downgrade():
    op.drop_column("task", "manager_visible")
```

### 3. Schema (`app/schemas/task.py`)

- `TaskCreate`: **sem** `manager_visible` (servidor define)
- `TaskUpdate`: `manager_visible: bool | None = None`
- `TaskRead`: `manager_visible: bool`

### 4. Endpoint `POST /tasks/`

Após construir o objeto `Task` a partir do `task_in`, setar:

```python
db_task.manager_visible = (current_user.role == UserRole.MANAGER)
```

### 5. Endpoint `GET /tasks/`

Filtro condicional na query:

```python
if current_user.role == UserRole.MANAGER:
    statement = statement.where(Task.manager_visible.is_(True))
```

### 6. Endpoint `GET /tasks/{task_id}` (e history/comments)

Após buscar a task, verificar:

```python
if current_user.role == UserRole.MANAGER and not db_task.manager_visible:
    raise HTTPException(status_code=404, detail="Task not found")
```

### 7. Endpoint `PATCH /tasks/{task_id}`

Se `current_user.role == UserRole.MANAGER`, remover `manager_visible` do update antes de aplicar:

```python
if current_user.role == UserRole.MANAGER:
    task_in.manager_visible = None
```

---

## Frontend

### Tipos (`src/features/task-management/types/index.ts`)

```typescript
export interface TaskRead {
  // ... campos existentes ...
  manager_visible: boolean;
}
```

### i18n

```json
// pt.json
"tasks": {
  "managerVisible": "Visível para gerentes"
}

// en.json
"tasks": {
  "managerVisible": "Visible to managers"
}
```

### `TaskForm.tsx`

Toggle condicional — apenas para ADMIN e DIRECTOR:

```tsx
{user?.role !== UserRole.MANAGER && (
  <label>
    <input
      type="checkbox"
      checked={formData.manager_visible ?? false}
      onChange={(e) => setFormData({ ...formData, manager_visible: e.target.checked })}
    />
    {t("tasks.managerVisible")}
  </label>
)}
```

Para MANAGER, o campo não está no DOM.

---

## Testes

### Backend (`test_tasks_rbac.py`)

| Teste | Resultado esperado |
|---|---|
| MANAGER cria tarefa | `manager_visible=True` |
| ADMIN cria tarefa | `manager_visible=False` |
| MANAGER lista tarefas | Só tasks com `manager_visible=True` |
| MANAGER GET task com `manager_visible=False` | 404 |
| ADMIN faz PATCH `manager_visible=True` | MANAGER passa a ver |
| MANAGER faz PATCH `manager_visible=False` | Campo ignorado |

### Frontend (`TaskForm.test.tsx`)

- ADMIN/DIRECTOR: toggle "Visível para gerentes" no DOM
- MANAGER: toggle ausente do DOM

---

## Matriz de permissões atualizada

| Ação | ADMINISTRATOR | DIRECTOR | MANAGER |
|---|---|---|---|
| Listar usuários | ✓ | ✓ | ✓ |
| Gerenciar usuários (ativar/role) | ✓ | ✗ | ✗ |
| Listar tarefas | ✓ (todas) | ✓ (todas) | ✓ (só `manager_visible=True`) |
| Criar tarefa | ✓ | ✓ | ✓ (auto `manager_visible=True`) |
| Editar qualquer tarefa (todos os campos) | ✓ | ✓ | ✗ |
| Editar tarefa não-atribuída ou própria | ✓ | ✓ | ✓ |
| Alterar `manager_visible` | ✓ | ✓ | ✗ |
| Deletar tarefa (soft delete) | ✓ | ✗ | ✗ |
| Comentar em qualquer tarefa | ✓ | ✓ | ✓ |
| Editar próprio comentário | ✓ | ✓ | ✓ |
| Criar / editar categorias | ✓ | ✓ | ✗ |
