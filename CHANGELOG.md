# Changelog - alexa-mcp

Bitácora cronológica de cambios significativos en este proyecto.

## Convención

- Mensajes en español, formato corto
- Solo eventos significativos (no rutinarios)
- Orden cronológico inverso: lo más reciente arriba
- Al cerrar trabajo importante: actualizar entrada y hacer commit

---

## Sin publicar

### Nuevas herramientas de dispositivos domóticos: `alexa_list_smarthome_summary`, `alexa_set_device_enabled`, `alexa_delete_smarthome_device`

- `alexa_list_smarthome_summary` (solo lectura): nombre, `applianceId`, estado, categoría, fabricante y grupos de cada dispositivo. El listado completo pesa ~900k caracteres y no se puede leer en línea.
- `alexa_set_device_enabled`: activa o desactiva un dispositivo con `setEnablementForSmarthomeDevice` de `alexa-remote2` (`PUT /api/phoenix/v2/appliance/{id}/enablement`). **Verificado contra una cuenta real** (2026-10-19): al desactivar un enchufe, «turn off» sobre ese enchufe respondió «This device is disabled…» y la consulta de estado devolvió `TargetApplianceDisabledException`; al reactivarlo volvió a `ENABLED` con el mismo estado.
- `alexa_delete_smarthome_device`: borra la entrada con `DELETE /api/phoenix/appliance/{id}`. Se niega si algún grupo todavía lo lista. Los dispositivos de una skill vuelven a aparecer en el siguiente descubrimiento si no se quitan en la app del fabricante. **Verificado contra una cuenta real** (2026-10-19): se borraron dos entradas y la lista pasó de 42 a 40 sin que cambiara nada más.
- Seguro por diseño: exigen `applianceId` **y** el nombre exacto (hay nombres repetidos, p. ej. «Living Room», «Braava jet»); si no coinciden, no cambian nada.
- `devices.js` (nuevo, sin red): `findDeviceToChange()`, `groupsContaining()`, `assertNotInGroup()`, `summarizeDevices()`, con `test/devices.test.mjs`.
- Corregido antes de publicar: la comprobación de grupos no funcionaba con datos reales. `getSmarthomeGroups()` devuelve `{ applianceGroups: [...] }` y `groupsContaining()` solo aceptaba un array, así que `alexa_delete_smarthome_device` nunca se negaba a borrar un dispositivo que un grupo todavía listaba (solo lo cumplía el test). Ahora acepta el objeto y rechaza cualquier forma desconocida en vez de leerla como «sin grupos». Además reconoce los ID fusionados (`mergedApplianceIds`) y la forma `{"dsn":…,"deviceType":…}` con la que los grupos listan los Echo, de modo que `alexa_list_smarthome_summary` ya no muestra `groups: []` para un Echo que sí está en un grupo. **Verificado contra una cuenta real** (solo lectura): los 7 Echo/TV/AC de prueba salen con sus grupos y la comprobación se niega a borrar un Echo agrupado.

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
