# ScannerCafe Sync Server

Servidor Express.js con SQLite para sincronización multi-dispositivo de la app ScannerCafe.

## Instalación

```bash
cd server
npm install
npm start          # producción
npm run dev        # desarrollo con auto-reload (nodemon)
```

El servidor corre en `http://localhost:3000` por defecto.  
Para cambiar el puerto: `PORT=4000 npm start`

---

## Flujo de sincronización

1. **Usuario A** configura en la app:
   - URL del servidor (ej. `http://192.168.1.10:3000`)
   - Nombre del negocio (ej. `Mi Cafetería`)
   - Genera una clave (ej. `LM4X2K-ABC9Z`)
   - Guarda ajustes → presiona **Sincronizar**

2. **Usuario B** usa la misma URL, el mismo nombre y la misma clave → **Sincronizar**
   - Recibe el inventario y las ventas del servidor
   - Sus datos locales también se suben al servidor

3. **Auto-sync**: al guardar/editar un producto o registrar una venta, se envía automáticamente al servidor si `syncEnabled = true`.

---

## Endpoints

### Workspaces
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/workspaces/register` | Registrar/validar workspace |
| GET | `/api/workspaces/info` | Info del workspace (requiere `x-sync-key`) |

### Productos `(x-sync-key requerido)`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Listar todos |
| GET | `/api/products/:id` | Obtener uno |
| GET | `/api/products/barcode/:barcode` | Buscar por código |
| POST | `/api/products` | Crear (skips si id existe) |
| POST | `/api/products/bulk` | Crear múltiples (bulk sync) |
| PUT | `/api/products/:id` | Actualizar |
| DELETE | `/api/products/:id` | Eliminar |

### Ventas `(x-sync-key requerido)`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/sales` | Listar todas (filtro `?date=YYYY-MM-DD`) |
| GET | `/api/sales/:id` | Obtener una con sus items |
| POST | `/api/sales` | Crear (skips si id existe) |
| POST | `/api/sales/bulk` | Crear múltiples (bulk sync) |
| DELETE | `/api/sales/:id` | Eliminar |

### Reportes `(x-sync-key requerido)`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/reports/summary?date=YYYY-MM-DD` | Resumen del día |
| GET | `/api/reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD` | Resumen por rango |

### Ajustes `(x-sync-key requerido)`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/settings` | Obtener ajustes del workspace |
| PUT | `/api/settings` | Guardar ajustes del workspace |

---

## Autenticación

Todas las rutas (excepto `/api/workspaces/register` y `/health`) requieren el header:

```
x-sync-key: TU_CLAVE_AQUI
```

---

## Deduplicación

- **Productos**: si se intenta insertar un producto con un `id` que ya existe, el servidor responde `{ skipped: true, reason: "already_exists" }` sin error.
- **Ventas**: igual — tickets con el mismo `id` no se duplican.
- **Barcode conflict**: si el barcode ya existe en otro producto, devuelve `409` con `conflictId`.
