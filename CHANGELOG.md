# Changelog - alexa-mcp

Bitácora cronológica de cambios significativos en este proyecto.

## Convención

- Mensajes en español, formato corto
- Solo eventos significativos (no rutinarios)
- Orden cronológico inverso: lo más reciente arriba
- Al cerrar trabajo importante: actualizar entrada y hacer commit

---

## Sin publicar

### Nueva herramienta `alexa_delete_routine`

- Borra una rutina con `DELETE /api/behaviors/automations/{automationId}`. `alexa-remote2` solo trae listar y ejecutar rutinas. Ojo: la ruta `/api/behaviors/v2/automations/{id}` (la de listar) **no** sirve para borrar: responde 404 sin cuerpo incluso con GET.
- Seguro por diseño: exige `automationId` **y** el nombre exacto; si no coinciden, o la rutina no existe, no borra nada. Devuelve la definición borrada para poder recrearla en la app.
- `routines.js` (nuevo, sin red): `findRoutineToDelete()` y `describeRoutine()`, con `test/routines.test.mjs`. `alexa-client.js`: `deleteRoutine()` vuelve a leer la lista antes de borrar.
- Verificado contra una cuenta real: se borró una rutina existente (73 → 72 rutinas, solo desapareció esa).

## 2026-09-22 — v1.1.1

### La sesión de Amazon ya no se cae a cada rato

- Causa: `init()` pasaba la cookie como texto; sin el objeto de registro, `alexa-remote2` no recupera `macDms` y **refrescaba el token contra Amazon en cada arranque**. El token nuevo nunca se guardaba, así que el siguiente arranque partía de uno ya rotado y pedía login.
- `alexa-client.js`: se entrega el registro completo (con `macDms`), así que mientras el token tenga menos de 24 h no hay llamada a Amazon. Los refrescos reales (nuevo `tokenDate`) sí se persisten.
- `_saveAuth()`: valida que el registro esté completo, escribe de forma atómica (`.tmp` + rename) y deja `auth.json.prev` como respaldo.
- `auth.js`: guarda el `amazonPage` real de la cuenta (antes fijo `amazon.com`, lo que rompía cuentas de otros dominios como `amazon.com.mx`).
- Verificado en la instancia `personal`: 5 arranques seguidos sin refresco y `auth.json` intacto.

## 2026-05-15 — v1.1.0

### Soporte multi-instancia

- Nueva env var `ALEXA_MCP_AUTH_DIR` permite que un solo clone del repo sirva varias cuentas de Alexa, cada una con su propio `auth.json`. Default sigue siendo `.auth-data/` del proyecto (compat hacia atrás).
- `auth.js`: añadido fallback que persiste la cookie aunque el registro post-auth de Amazon falle (cuentas con device-registration con quirks).

### Setup interno

- Migración a arquitectura "una codebase, múltiples instancias":
  - `homeassistant` → `~/.alexa-mcp/personal/auth.json`
  - `homeassistant-pa` → `~/.alexa-mcp/pa/auth.json`
- `alexa-mcp-pa/` archivado como `alexa-mcp-pa.bak/` (a borrar cuando ya no se necesite).

## 2026-05-15 — v1.0.0

### Initial public release

- Repo publicado en <https://github.com/RenatoAscencio/alexa-mcp>
- Bump @modelcontextprotocol/sdk → 1.29.0, zod → 4.4.3 (deps actualizadas, vulnerabilidades altas/moderadas resueltas)
- README en inglés, LICENSE MIT

## 2026-05-11

### Bitácora iniciada

- Inicializado git + CHANGELOG.md en este proyecto
- Convención de versionado documentada
