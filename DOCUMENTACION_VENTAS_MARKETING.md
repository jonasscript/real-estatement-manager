# Sistema de Gestión Inmobiliaria con Cuotas — Documentación de Funcionalidades
### Presentación para Equipo de Ventas y Marketing

---

## ¿Qué es este sistema?

Es una **plataforma web integral para inmobiliarias** que digitaliza y automatiza todo el ciclo de venta de inmuebles a plazos: desde la publicación del portafolio de propiedades hasta el seguimiento de pagos y cuotas de cada cliente. Está diseñado para que múltiples empresas inmobiliarias operen de forma **independiente y segura** dentro de la misma plataforma.

---

## Para quién es

| Perfil | ¿Qué hace en el sistema? |
|---|---|
| **Administrador de Plataforma** | Gestiona todas las inmobiliarias registradas en el sistema |
| **Administrador Inmobiliaria** | Administra su empresa: propiedades, clientes, vendedores, pagos |
| **Vendedor / Asesor** | Atiende a sus clientes asignados, aprueba comprobantes de pago | crea clientes
| **Cliente / Comprador** | Consulta sus cuotas, sube comprobantes de pago y recibe notificaciones |

---

## Módulos del Sistema

### 1. Gestión de Propiedades

El sistema permite estructurar el inventario inmobiliario de forma jerárquica y detallada:

- **Fases / Etapas de desarrollo** — Organice el proyecto en etapas (ciudadela, torre, sector, condominios, etc.)
- **Manzanas / Bloques / Piso** — Divida cada fase en manzanas o bloques con coordenadas GPS
- **Unidades** — Cada lote, departamento o villa como unidad individual, también con coordenadas GPS para mapas
- **Modelos Arquitectónicos** — Defina modelos (planta tipo) con:
  - Área en m²
  - Número de dormitorios y baños
  - Características y amenidades (lista personalizable)
  - URL de plano arquitectónico
- **Propiedades** — Vincule un modelo a una unidad con precio, porcentaje de entrada y número de cuotas personalizados

**Asistente de Creación (Wizard)** — Un flujo guiado en 4 pasos que permite crear toda la jerarquía (Fase → Manzana → Modelo → Unidad → Propiedad) sin salir de la pantalla.

**Estados de Propiedad con color** — Cada propiedad tiene un estado visual configurable:
- Disponible
- Reservado
- Vendido
- En Construcción
- En Planificación

---

### 2. Gestión de Clientes

- Registro completo del cliente: cédula/identificación, fecha de nacimiento, correo, teléfono
- Asignación automática a un vendedor al momento del registro
- Estado de contrato visible desde el perfil
- Historial completo de compras, cuotas y pagos por cliente
- Un cliente puede tener múltiples propiedades en compra

---

### 3. Gestión de Vendedores

- Perfil del vendedor con **tasa de comisión personalizada**
- Seguimiento automático de:
  - Número total de ventas
  - Total de comisiones generadas
- Cartera de clientes asignados
- Los vendedores pueden aprobar comprobantes de pago de sus propios clientes

---

### 4. Plan de Cuotas Automático

Cuando se registra una compra, el sistema **genera automáticamente** todo el calendario de pagos:

- Define el porcentaje de entrada (enganche)
- Define el número de cuotas
- Genera cada cuota con fecha de vencimiento y monto
- Estados de cuota en tiempo real:
  - **Pendiente** — Cuota próxima a vencer
  - **Pagada** — Cuota cancelada y aprobada
  - **Vencida** — Cuota no pagada después de su fecha límite
  - **En mora** — Cuota con retraso acumulado

**Panel de vencimientos** — Alerta en el dashboard sobre cuotas próximas a vencer y cuotas ya vencidas, por empresa y globalmente.

---

### 5. Flujo de Pagos con Comprobantes

El proceso de pago es completamente digital y trazable:

1. **El cliente** sube el comprobante de pago (imagen o PDF) desde su portal
2. Indica el método de pago y número de referencia
3. El comprobante queda en estado **"Pendiente de Aprobación"**
4. **El vendedor o administrador** revisa el comprobante en su panel
5. Aprueba o rechaza el pago con observaciones
6. La cuota correspondiente se actualiza automáticamente al estado "Pagada"
7. El cliente recibe una **notificación** con el resultado

Esto elimina pagos no registrados, transferencias perdidas y disputas por falta de evidencia.

---

### 6. Sistema de Notificaciones

Notificaciones automáticas en tiempo real para todos los actores:

| Evento | ¿Quién recibe la notificación? |
|---|---|
| Cliente sube comprobante | Administrador / Vendedor |
| Pago aprobado | Cliente |
| Pago rechazado | Cliente |
| Cuota próxima a vencer | Cliente |
| Cuota vencida | Cliente y Vendedor |

Las notificaciones tienen estado leído/no leído y se consultan desde cualquier pantalla.

---

### 7. Dashboards por Rol

#### Dashboard del Administrador de Inmobiliaria
- Número total de propiedades (por estado)
- Total de clientes y vendedores activos
- Ingresos totales y revenue del mes
- Gráfico de barras de ventas mensuales
- Resumen de cuotas vencidas y próximas a vencer

#### Dashboard del Vendedor
- Total de clientes asignados (activos / inactivos)
- Total de pagos recibidos y pendientes de aprobación
- Cuotas vencidas de su cartera
- Feed de notificaciones recientes

#### Dashboard del Cliente
- Resumen de su plan de cuotas: pagadas, pendientes, vencidas
- Montos totales por estado
- Últimos pagos subidos y su estado de aprobación
- Notificaciones no leídas

---

### 8. Multiempresa / Multi-Tenant

La plataforma permite operar con **múltiples inmobiliarias** bajo una sola instancia del sistema:

- Cada empresa tiene su propio catálogo de propiedades, fases y modelos
- Los clientes, vendedores y administradores están aislados por empresa
- El administrador de plataforma tiene visibilidad global sobre todas las empresas
- Los datos de una empresa **nunca son visibles** para otra empresa

Ideal para grupos corporativos con varias marcas o líneas de negocio inmobiliario.

---

### 9. Catálogos Configurables

Todos los catálogos del sistema son editables por el administrador sin necesidad de desarrollo:

| Catálogo | Ejemplos |
|---|---|
| Tipos de propiedad | Casa, Departamento, Terreno, Local |
| Estados de propiedad | Disponible, Reservado, Vendido (con color personalizable) |
| Tipos de fase | Ciudadela, Torre, Condominios, Sector |
| Modelos arquitectónicos | Modelo A — 3 dorm., 2 baños, 120 m² |

---

### 10. Control de Acceso Basado en Roles (RBAC)

El sistema tiene un motor de permisos granular:

- Cada rol tiene definido qué **pantallas puede ver** (menú dinámico)
- Cada rol tiene permisos por **componente + acción** (ver, crear, editar, eliminar)
- El menú de navegación es completamente configurable desde el panel de administración
- Los administradores pueden crear roles personalizados con permisos específicos

---

## Portales de Acceso

| Portal | URL de acceso | Para quién |
|---|---|---|
| Portal de Administración | `/admin/` | Administrador de plataforma |
| Portal Inmobiliaria | `/real-estate-admin/` | Administrador de la empresa |
| Portal Vendedor | `/seller/` | Asesores / Vendedores |
| Portal Cliente | `/client/` | Compradores |

---

## Tecnología

| Componente | Tecnología |
|---|---|
| **Frontend** | Angular 18 — aplicación web moderna, responsiva |
| **Backend** | Node.js + Express — API REST segura |
| **Base de datos** | PostgreSQL — datos relacionales robustos |
| **Infraestructura** | Docker — despliegue fácil en cualquier servidor |
| **Seguridad** | JWT, bcrypt, HTTPS headers, validación de inputs |

---

## Propuesta de Valor — Puntos clave para Ventas

> **"Todo el ciclo de venta inmobiliaria en un solo sistema."**

| Problema del cliente | Solución del sistema |
|---|---|
| Seguimiento de pagos manual (Excel, WhatsApp) | Flujo digital completo con historial auditado |
| Clientes que "dicen haber pagado" sin evidencia | Comprobantes digitales con aprobación formal |
| Vendedores sin visibilidad de su cartera | Dashboard personalizado por vendedor |
| Pérdida de información de contratos | Toda la información centralizada y segura |
| Múltiples proyectos difíciles de organizar | Jerarquía Empresa → Fase → Manzana → Unidad |
| No saber qué clientes están en mora | Alertas automáticas de vencimiento y mora |
| Gestionar varias inmobiliarias del grupo | Arquitectura multiempresa nativa |

---

## Preguntas Frecuentes (FAQ para ventas)

**¿Cuántos usuarios puede tener el sistema?**
No hay límite de usuarios. Cada inmobiliaria puede tener tantos vendedores y clientes como necesite.

**¿Funciona en móvil?**
Sí. La interfaz web es responsiva y funciona en smartphones y tablets desde el navegador.

**¿Qué pasa si un pago es rechazado?**
El cliente recibe una notificación con las observaciones del rechazo y puede subir nuevamente el comprobante correcto.

**¿Puede el cliente ver solo su información?**
Sí. Cada cliente accede únicamente a sus propias cuotas, pagos y notificaciones. La información de otros clientes está completamente aislada.

**¿Se pueden personalizar los tipos de propiedad?**
Sí. Los catálogos (tipos, estados, tipos de fase) son configurables directamente desde el panel de administración.

**¿El sistema genera el calendario de cuotas automáticamente?**
Sí. Al registrar una compra con el porcentaje de entrada y el número de cuotas, el sistema genera automáticamente todo el plan de pagos con fechas y montos.

**¿Cómo se despliega el sistema?**
Está empaquetado con Docker. Se puede desplegar en cualquier servidor en la nube (AWS, DigitalOcean, Azure, Google Cloud) o en infraestructura propia.

---

*Documento generado el 25 de marzo de 2026 — Real Estate Installment SAS*
