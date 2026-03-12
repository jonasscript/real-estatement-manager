# Menu Management CRUD - Documentation

## Overview
This document describes the new menu management system that allows system administrators to manage menu options and assign them to different user roles.

## Features Implemented

### 1. Menu Options Management (CRUD)
- **Location**: `/admin/menu-options`
- **Access**: System Admin only
- **Functionality**:
  - Create new menu options
  - Edit existing menu options
  - Delete menu options
  - View all menu options with hierarchy
  - Configure menu properties: name, label, path, icon, parent menu, sort order, active status

### 2. Role-Menu Assignments Management
- **Location**: `/admin/role-menu-options`
- **Access**: System Admin only
- **Functionality**:
  - View all role-menu assignments
  - Assign multiple menus to a role
  - Remove menu assignments from roles
  - Bulk update role menus configuration
  - Visual display of menus per role

## Backend Implementation

### Services
- **File**: `backend/src/services/menuService.js`
- **New Methods**:
  - `getMenuOptionById(menuId)` - Get single menu by ID
  - `getAllRoleMenuOptions()` - Get all role-menu assignments
  - `getMenusByRole(roleId)` - Get menus for specific role
  - `updateRoleMenus(roleId, menuOptionIds)` - Bulk update role menus
  - `getMenuHierarchy()` - Get menu tree structure

### Controllers
- **File**: `backend/src/controllers/menuController.js`
- **New Endpoints**:
  - `GET /api/menu/:menuId` - Get menu by ID
  - `GET /api/menu/role-menu-options/all` - Get all role-menu assignments
  - `GET /api/menu/by-role/:roleId` - Get menus by role
  - `PUT /api/menu/role/:roleId/menus` - Bulk update role menus
  - `GET /api/menu/hierarchy/all` - Get menu hierarchy

### Routes
- **File**: `backend/src/routes/menu.js`
- All routes protected with authentication
- System admin authorization (commented out for development)

## Frontend Implementation

### Services
- **File**: `frontend/src/app/services/menu.service.ts`
- **Interfaces**:
  - `MenuOption` - Menu option data structure
  - `RoleMenuOption` - Role-menu assignment structure
  - `CreateMenuData` - Data for creating menus
  - `UpdateMenuData` - Data for updating menus

### Components

#### 1. Menu Options Component
- **Location**: `frontend/src/app/admin/menu-options/`
- **Files**:
  - `menu-options.component.ts` - Component logic
  - `menu-options.component.html` - Template
  - `menu-options.component.scss` - Styles
- **Features**:
  - Statistics cards showing total, active, and inactive menus
  - Data table with all menu options
  - Create dialog with form validation
  - Edit dialog for updating menus
  - Delete confirmation
  - Parent menu selection for hierarchy

#### 2. Role-Menu Options Component
- **Location**: `frontend/src/app/admin/role-menu-options/`
- **Files**:
  - `role-menu-options.component.ts` - Component logic
  - `role-menu-options.component.html` - Template
  - `role-menu-options.component.scss` - Styles
- **Features**:
  - Statistics showing total assignments and roles with menus
  - Role cards displaying assigned menus as chips
  - Configure menus dialog with checkbox selection
  - Visual menu selection with details
  - Remove individual menu assignments
  - Complete assignments table

## Database Changes

### Menu Options Table
Already exists in schema - no changes needed.

### New Menu Entries
Two new menu options added for system admin:
1. **Gestión de Menús** (`admin_menu_options`)
   - Path: `/admin/menu-options`
   - Icon: `list`
   - Sort Order: 4

2. **Menús por Rol** (`admin_role_menu_options`)
   - Path: `/admin/role-menu-options`
   - Icon: `user-cog`
   - Sort Order: 5

### Migration Script
- **File**: `backend/src/models/migration_add_menu_crud.sql`
- Safely adds new menu options without duplicates
- Assigns new menus to system_admin role
- Includes verification query

## Routes Configuration

### Frontend Routes
Updated in `frontend/src/app/app.routes.ts`:
```typescript
{
  path: 'admin',
  children: [
    // ... existing routes
    { path: 'menu-options', loadComponent: ... },
    { path: 'role-menu-options', loadComponent: ... },
  ]
}
```

## Usage Instructions

### For System Administrators

#### Managing Menu Options
1. Navigate to **Admin** → **Gestión de Menús**
2. Click **"Nueva Opción de Menú"** to create a new menu
3. Fill in the form:
   - **Nombre**: Internal name (e.g., `admin_reports`)
   - **Etiqueta**: Display label (e.g., `Reportes`)
   - **Ruta**: Navigation path (e.g., `/admin/reports`)
   - **Icono**: FontAwesome icon name without `fa-` prefix
   - **Menú Padre**: Select parent for submenu (optional)
   - **Orden**: Sort order number
   - **Menú Activo**: Toggle menu visibility
4. Click **"Crear Menú"** to save

#### Assigning Menus to Roles
1. Navigate to **Admin** → **Menús por Rol**
2. Find the role you want to configure
3. Click **"Configurar Menús"** button
4. Check/uncheck menus in the selection dialog
5. See live count of selected menus
6. Click **"Guardar Configuración"** to apply changes

#### Managing Individual Assignments
- View all assignments in the bottom table
- Click the **trash icon** to remove specific menu-role assignments
- Remove menu chips directly from role cards

## API Endpoints Summary

### Menu Options
- `GET /api/menu/all` - Get all menus
- `GET /api/menu/:menuId` - Get menu by ID
- `POST /api/menu` - Create menu
- `PUT /api/menu/:menuId` - Update menu
- `DELETE /api/menu/:menuId` - Delete menu
- `GET /api/menu/hierarchy/all` - Get menu hierarchy

### Role-Menu Assignments
- `GET /api/menu/role-menu-options/all` - Get all assignments
- `GET /api/menu/by-role/:roleId` - Get menus for role
- `POST /api/menu/assign/:roleId/:menuOptionId` - Assign menu to role
- `DELETE /api/menu/assign/:roleId/:menuOptionId` - Remove menu from role
- `PUT /api/menu/role/:roleId/menus` - Bulk update role menus

## Styling
Both components follow the same design system as the Users component:
- Consistent color scheme
- Responsive grid layouts
- Card-based UI
- PrimeNG dialog components
- Font Awesome icons
- Smooth transitions and hover effects

## Security Considerations
- All endpoints require authentication
- System admin authorization required (currently commented for development)
- Form validation on both frontend and backend
- SQL injection prevention through parameterized queries
- Transaction support for bulk operations

## Future Enhancements
- Drag-and-drop menu ordering
- Menu icon picker component
- Batch operations (activate/deactivate multiple menus)
- Menu preview before saving
- Audit log for menu changes
- Import/export menu configurations
- Menu cloning functionality

## Testing Checklist
- [ ] Create menu option
- [ ] Edit menu option
- [ ] Delete menu option
- [ ] Create submenu (with parent)
- [ ] Assign menus to role
- [ ] Remove menus from role
- [ ] Bulk update role menus
- [ ] View menu hierarchy
- [ ] Verify menu appears in navbar after assignment
- [ ] Test form validation
- [ ] Test with different roles

## Troubleshooting

### Menu not appearing in navbar
1. Check if menu is marked as active
2. Verify menu is assigned to user's role
3. Check user session and role assignment
4. Clear browser cache and reload

### Cannot delete menu
- Check if menu is assigned to any roles
- Remove role assignments first, then delete menu

### Permission denied errors
- Verify user has system_admin role
- Check authentication token validity
- Review middleware configuration

## Migration Instructions

### For Existing Database
Run the migration script:
```bash
psql -U your_user -d your_database -f backend/src/models/migration_add_menu_crud.sql
```

### For New Installation
The menu options are included in the main schema.sql file.

## Support
For issues or questions, refer to the main project documentation or contact the development team.
