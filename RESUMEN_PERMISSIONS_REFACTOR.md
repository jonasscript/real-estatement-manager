# Resumen de Cambios - Normalización de Permisos

## Fecha: 2024
## Objetivo: Reestructurar el sistema de permisos para usar tablas relacionales (components y actions) en lugar de campos de texto

---

## 1. CAMBIOS EN BASE DE DATOS

### Nuevas Tablas Creadas:

#### `components` (Catálogo de Componentes)
```sql
- id (serial PRIMARY KEY)
- name (varchar(100) UNIQUE NOT NULL)
- description (text)
```
**Datos iniciales**: properties, users, real_estates

#### `actions` (Catálogo de Acciones)
```sql
- id (serial PRIMARY KEY)
- name (varchar(50) UNIQUE NOT NULL)
- description (text)
```
**Datos iniciales**: view, create, edit, delete

### Tabla `permissions` Modificada:
- **Columnas eliminadas**: `component_name`, `action`
- **Columnas agregadas**: 
  - `component_id` (integer REFERENCES components(id))
  - `action_id` (integer REFERENCES actions(id))
- **Nueva constraint**: UNIQUE(component_id, action_id)
- **Nuevos índices**: idx_permissions_component, idx_permissions_action

### Scripts de Base de Datos:
- **`schema.sql`**: Schema completo para instalaciones nuevas
- **`alters.sql`**: Script de migración para bases de datos existentes
  - Crea tablas components y actions con IF NOT EXISTS
  - Migra datos existentes de component_name → component_id
  - Mapea 'update' → 'edit' durante la migración
  - Genera permisos faltantes automáticamente

---

## 2. CAMBIOS EN BACKEND

### Nuevos Servicios Creados:

#### `componentService.js`
- `getAllComponents()`: Obtiene todos los componentes
- `getComponentById(id)`: Obtiene componente por ID
- `getComponentByName(name)`: Obtiene componente por nombre

#### `actionService.js`
- `getAllActions()`: Obtiene todas las acciones
- `getActionById(id)`: Obtiene acción por ID
- `getActionByName(name)`: Obtiene acción por nombre

### Servicios Actualizados:

#### `permissionService.js` - 7 métodos refactorizados:
1. **getAllPermissions()**: Ahora hace JOIN con components y actions, retorna:
   ```javascript
   {
     id, name, description,
     component_id, component_name,
     action_id, action,
     created_at, assigned_roles: [...]
   }
   ```

2. **getPermissionsByRole(roleId)**: Incluye información completa de component y action

3. **getPermissionsByComponentAndRole(componentName, roleId)**: Busca por nombre de componente vía JOIN

4. **hasPermission(roleId, componentName, action)**: Verifica permisos usando nombres (con JOINs)

5. **getPermissionById(permissionId)**: Retorna estructura completa con component/action details

6. **createPermission(permissionData)**: 
   - Ahora recibe `componentId` y `actionId` en lugar de strings
   - Valida duplicados por combinación (component_id, action_id)
   - Retorna permiso completo con información relacionada

7. **updatePermission(permissionId, updateData)**:
   - Usa `componentId` y `actionId`
   - Valida unicidad de la nueva combinación
   - Retorna permiso actualizado con información completa

### Controladores Actualizados:

#### `permissionController.js`
- **createPermission**: Extrae `componentId` y `actionId` del body (antes: componentName, action)
- **updatePermission**: Maneja `componentId` y `actionId` (antes: componentName, action)

#### Nuevos Controladores:

**`componentController.js`**
- `getAllComponents()`: Lista todos los componentes
- `getComponentById()`: Obtiene componente específico

**`actionController.js`**
- `getAllActions()`: Lista todas las acciones
- `getActionById()`: Obtiene acción específica

### Rutas Actualizadas:

#### `permissions.js`
**Validaciones actualizadas**:
- **POST /**: 
  ```javascript
  body('componentId').notEmpty().isInt({ min: 1 })
  body('actionId').notEmpty().isInt({ min: 1 })
  // Antes: componentName (string), action (string con valores específicos)
  ```

- **PUT /:permissionId**:
  ```javascript
  body('componentId').optional().isInt({ min: 1 })
  body('actionId').optional().isInt({ min: 1 })
  ```

#### Nuevas Rutas Creadas:

**`components.js`**
```
GET  /api/components          - Listar componentes
GET  /api/components/:id      - Obtener componente por ID
```

**`actions.js`**
```
GET  /api/actions             - Listar acciones
GET  /api/actions/:id         - Obtener acción por ID
```

### `index.js` Actualizado:
```javascript
const componentRoutes = require('./routes/components');
const actionRoutes = require('./routes/actions');
//...
app.use('/api/components', componentRoutes);
app.use('/api/actions', actionRoutes);
```

---

## 3. CAMBIOS EN FRONTEND

### Nuevos Servicios Creados:

#### `component.service.ts`
```typescript
interface Component {
  id: number;
  name: string;
  description: string;
}

getAllComponents(): Observable<{ data: Component[] }>
getComponentById(componentId): Observable<{ data: Component }>
```

#### `action.service.ts`
```typescript
interface Action {
  id: number;
  name: string;
  description: string;
}

getAllActions(): Observable<{ data: Action[] }>
getActionById(actionId): Observable<{ data: Action }>
```

### Servicios Actualizados:

#### `permission.service.ts`
**Interfaz actualizada**:
```typescript
interface Permission {
  id: number;
  name: string;
  description: string;
  component_id: number;        // Nueva
  component_name?: string;     // Opcional (viene del JOIN)
  action_id: number;           // Nueva
  action?: string;             // Opcional (viene del JOIN)
  created_at: string;
}
```

**Métodos actualizados**:
- `createPermission()`: Ahora envía `componentId` y `actionId`
- `updatePermission()`: Acepta `componentId` y `actionId` en updateData

### Componentes Actualizados:

#### `role-permissions.component.ts`

**Nuevas propiedades**:
```typescript
components: AppComponent[] = [];
actions: AppAction[] = [];
```

**Constructor actualizado**:
- Inyecta `ComponentService` y `ActionService`
- FormGroup ahora usa:
  ```typescript
  {
    name: ['', ...],
    description: ['', ...],
    componentId: [null, Validators.required],
    actionId: [null, Validators.required]
  }
  ```

**Nuevos métodos**:
- `loadComponents()`: Carga catálogo de componentes
- `loadActions()`: Carga catálogo de acciones

**Método actualizado**:
- `saveNewPermission()`: Envía `componentId` y `actionId` al backend

#### `role-permissions.component.html`

**Campos de formulario reemplazados**:
- **Antes**: 
  ```html
  <input formControlName="component_name" ...>
  <input formControlName="action" ...>
  ```
  
- **Ahora**:
  ```html
  <select formControlName="componentId">
    <option *ngFor="let component of components" [value]="component.id">
      {{ component.name }} - {{ component.description }}
    </option>
  </select>
  
  <select formControlName="actionId">
    <option *ngFor="let action of actions" [value]="action.id">
      {{ action.name }} - {{ action.description }}
    </option>
  </select>
  ```

---

## 4. VENTAJAS DE LA NUEVA ESTRUCTURA

### Integridad de Datos:
- ✅ Valores estandarizados (no más typos en nombres)
- ✅ Foreign keys garantizan referencias válidas
- ✅ UNIQUE constraint previene duplicados

### Mantenibilidad:
- ✅ Agregar nuevo componente: Un INSERT en tabla `components`
- ✅ Agregar nueva acción: Un INSERT en tabla `actions`
- ✅ Queries más eficientes con índices en foreign keys

### Escalabilidad:
- ✅ Fácil agregar metadata a components/actions (ej: iconos, colores)
- ✅ Posibilidad de deshabilitar components/actions sin borrar permisos
- ✅ Mejor reporting y analytics sobre uso de permisos

### UX Mejorada:
- ✅ Dropdowns con opciones predefinidas (no input libre)
- ✅ Descripciones visibles al seleccionar
- ✅ Menos errores de usuario

---

## 5. PASOS PARA DESPLEGAR

### En Base de Datos Existente:
```bash
# 1. Ejecutar script de migración
psql -U your_user -d your_database -f backend/src/models/alters.sql

# 2. Verificar migración
SELECT COUNT(*) FROM components;  -- Debe retornar al menos 3
SELECT COUNT(*) FROM actions;     -- Debe retornar al menos 4
SELECT COUNT(*) FROM permissions WHERE component_id IS NOT NULL;  -- Todos
```

### En Nueva Instalación:
```bash
# Usar el schema.sql actualizado
psql -U your_user -d your_database -f backend/src/models/schema.sql
```

### Backend:
```bash
cd backend
npm install  # Si hay nuevas dependencias (no aplica en este caso)
npm start
```

### Frontend:
```bash
cd frontend
npm install  # Si hay nuevas dependencias (no aplica en este caso)
ng serve
```

---

## 6. TESTING RECOMENDADO

### Backend:
- [ ] GET /api/components - Retorna lista de componentes
- [ ] GET /api/actions - Retorna lista de acciones
- [ ] GET /api/permissions - Retorna permisos con component_name y action
- [ ] POST /api/permissions - Crear permiso con componentId y actionId
- [ ] PUT /api/permissions/:id - Actualizar permiso
- [ ] Validación: Intentar crear permiso duplicado (debe fallar)

### Frontend:
- [ ] Dialog "Nuevo Permiso" muestra dropdowns de components y actions
- [ ] Los dropdowns cargan correctamente las opciones
- [ ] Crear permiso con selección de roles funciona
- [ ] Lista de permisos muestra component_name y action correctamente
- [ ] Toggle de permisos por rol funciona correctamente

---

## 7. ROLLBACK (SI ES NECESARIO)

Si algo falla después de ejecutar `alters.sql`:

```sql
-- 1. Agregar columnas antiguas
ALTER TABLE permissions 
  ADD COLUMN component_name VARCHAR(100),
  ADD COLUMN action VARCHAR(50);

-- 2. Restaurar datos
UPDATE permissions p
SET 
  component_name = c.name,
  action = CASE 
    WHEN a.name = 'edit' THEN 'update'
    ELSE a.name
  END
FROM components c, actions a
WHERE p.component_id = c.id AND p.action_id = a.id;

-- 3. Eliminar foreign keys
ALTER TABLE permissions 
  DROP COLUMN component_id,
  DROP COLUMN action_id;

-- 4. Restaurar constraint antigua
ALTER TABLE permissions
  ADD CONSTRAINT permissions_component_action_key 
  UNIQUE (component_name, action);
```

**Nota**: También restaurar código de backend y frontend a versión anterior.

---

## ARCHIVOS MODIFICADOS

### Backend:
- ✅ `models/schema.sql` - Schema completo actualizado
- ✅ `models/alters.sql` - Script de migración (NUEVO)
- ✅ `services/permissionService.js` - Refactorizado completamente
- ✅ `services/componentService.js` - NUEVO
- ✅ `services/actionService.js` - NUEVO
- ✅ `controllers/permissionController.js` - Actualizado
- ✅ `controllers/componentController.js` - NUEVO
- ✅ `controllers/actionController.js` - NUEVO
- ✅ `routes/permissions.js` - Validaciones actualizadas
- ✅ `routes/components.js` - NUEVO
- ✅ `routes/actions.js` - NUEVO
- ✅ `index.js` - Registra nuevas rutas

### Frontend:
- ✅ `services/permission.service.ts` - Interfaz actualizada
- ✅ `services/component.service.ts` - NUEVO
- ✅ `services/action.service.ts` - NUEVO
- ✅ `admin/role-permissions/role-permissions.component.ts` - Refactorizado
- ✅ `admin/role-permissions/role-permissions.component.html` - Dropdowns agregados

---

## PRÓXIMOS PASOS SUGERIDOS

1. **Agregar más componentes**: A medida que crezca la app, agregar entries en `components`
2. **Agregar acción "manage"**: Para permisos administrativos completos
3. **Caché de catálogos**: En frontend, cachear components/actions para reducir llamadas
4. **Admin de catálogos**: Crear interfaz para que system_admin pueda crear components/actions
5. **Auditoría**: Agregar logging de cambios en permissions
6. **Testing unitario**: Agregar tests para los nuevos servicios

---

**Fecha de creación**: 2024
**Autor**: Sistema de actualización de permisos
**Estado**: ✅ Completado
