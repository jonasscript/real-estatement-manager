# HTTP Interceptor - Autenticación

## Descripción

Se ha implementado un **HTTP Interceptor** para manejar automáticamente la autenticación mediante tokens Bearer en todas las peticiones HTTP de la aplicación.

## Ubicación

- **Interceptor**: `frontend/src/app/interceptors/auth.interceptor.ts`
- **Configuración**: `frontend/src/app/app.config.ts`

## Funcionalidad

El interceptor automáticamente:

1. ✅ Intercepta **todas** las peticiones HTTP salientes
2. ✅ Excluye las rutas de autenticación (login, register)
3. ✅ Agrega el header `Authorization: Bearer <token>` automáticamente
4. ✅ Obtiene el token desde el `AuthService`
5. ✅ Permite peticiones sin token si no hay usuario autenticado

## Rutas Excluidas

El interceptor **NO** agrega el token a las siguientes rutas:

- `/api/auth/login` - Login de usuarios
- `/api/auth/register` - Registro de nuevos usuarios  
- `/api/users/register_new` - Registro alternativo

## Implementación

### Interceptor (Functional)

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Skip adding token for auth endpoints
  const isAuthEndpoint = req.url.includes('/api/auth/login') || 
                         req.url.includes('/api/auth/register') ||
                         req.url.includes('/api/users/register_new');

  if (isAuthEndpoint) {
    return next(req);
  }

  const token = authService.getToken();

  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  return next(req);
};
```

### Configuración en app.config.ts

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync()
  ]
};
```

## Beneficios

### Antes (Manual)
```typescript
// Cada servicio tenía que manejar headers manualmente
private getAuthHeaders(): HttpHeaders {
  const token = this.authService.getToken();
  return new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });
}

getClients(): Observable<Client[]> {
  const headers = this.getAuthHeaders();
  return this.http.get<Client[]>(`${this.API_URL}/clients`, { headers });
}
```

### Después (Automático)
```typescript
// El servicio solo hace la petición, el interceptor agrega el token
getClients(): Observable<Client[]> {
  return this.http.get<Client[]>(`${this.API_URL}/clients`);
}
```

## Ventajas

1. **✅ Código más limpio**: No es necesario manejar headers en cada servicio
2. **✅ Menos duplicación**: Lógica centralizada en un solo lugar
3. **✅ Mantenibilidad**: Cambios en la autenticación se hacen en un solo lugar
4. **✅ Consistencia**: Todas las peticiones usan el mismo formato de token
5. **✅ Seguridad**: Menor posibilidad de olvidar agregar el token

## Servicios Actualizados

Los siguientes servicios fueron simplificados para usar el interceptor:

### ✅ client.service.ts
- Removido `getAuthHeaders()` method
- Removido parámetro `{ headers }` de todos los métodos HTTP
- Removida importación de `HttpHeaders` y `AuthService`

### ✅ auth.service.ts
- Mantenido `getAuthHeaders()` para compatibilidad
- Simplificados métodos: `getProfile()`, `updateProfile()`, `verifyToken()`
- Simplificados: `getMenuOptions()`, `refreshMenuOptions()`

### ✅ menu.service.ts
- Ya no necesita manejar headers (creado con interceptor en mente)

## Otros Servicios

Los siguientes servicios también se benefician automáticamente del interceptor:

- `user.service.ts`
- `real-estate.service.ts`
- `property.service.ts`
- `payment.service.ts`
- Y todos los demás servicios que usen `HttpClient`

## Testing

Para probar el interceptor:

1. Inicia sesión en la aplicación
2. Abre las DevTools del navegador (F12)
3. Ve a la pestaña **Network**
4. Realiza cualquier acción que haga peticiones al backend
5. Verifica que las peticiones tengan el header `Authorization: Bearer <token>`
6. Las rutas de `/auth/login` y `/auth/register` **NO** deben tener este header

## Troubleshooting

### El token no se envía
- Verifica que el usuario esté autenticado
- Revisa que el token exista en sessionStorage
- Confirma que la ruta no esté en la lista de exclusión

### Error 401 Unauthorized
- El token puede haber expirado
- Verifica que el token sea válido en el backend
- Intenta hacer logout y login nuevamente

### Peticiones de login fallan
- Verifica que la ruta esté en `isAuthEndpoint`
- Confirma que no se esté enviando el header Authorization

## Agregar Nuevas Rutas Excluidas

Si necesitas excluir más rutas de autenticación:

```typescript
const isAuthEndpoint = req.url.includes('/api/auth/login') || 
                       req.url.includes('/api/auth/register') ||
                       req.url.includes('/api/users/register_new') ||
                       req.url.includes('/api/public/nueva-ruta'); // Nueva ruta
```

## Notas Técnicas

- El interceptor usa la API funcional de Angular 17+ (`HttpInterceptorFn`)
- No requiere class-based interceptors
- Compatible con standalone components
- Usa `inject()` para obtener dependencias
- El método `clone()` asegura que la petición original no se modifique

## Referencias

- [Angular HTTP Interceptors](https://angular.io/guide/http-intercept-requests-and-responses)
- [Standalone Components](https://angular.io/guide/standalone-components)
- [HttpClient API](https://angular.io/api/common/http/HttpClient)
