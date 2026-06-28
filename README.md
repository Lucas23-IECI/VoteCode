# VoteCode

Aplicacion para votar por juegos con amigos. Incluye login, papeletas por cuenta,
ranking, podio, porcentajes y persistencia de votos.

## Estructura

```text
backend/
  auth.js            Login con Google y login local de desarrollo
  config.js          Variables de entorno y rutas
  gameCatalog.js     Juegos disponibles y regla de minimo
  jsonDatabase.js    Persistencia de usuarios y votos
  server.js          API, sesiones y servidor estatico
frontend/
  assets/            Imagenes de juegos
  app.js             UI y llamadas a la API
  index.html
  styles.css
data/                Base local ignorada por Git
```

## Uso Local

```bash
npm install
copy .env.example .env
npm start
```

Abre `http://127.0.0.1:5177`.

En desarrollo puedes usar el login local. En produccion, configura Google OAuth
y deja `ENABLE_DEV_LOGIN=false`.

## Base De Datos

En desarrollo, si no configuras Supabase, los votos se guardan en
`data/votecode.json`. Puedes cambiar esa ruta con `DATA_DIR`.

En produccion se recomienda Supabase. Crea un proyecto, abre el SQL Editor y
ejecuta `supabase/schema.sql`. Luego configura:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Cada cuenta guarda una sola papeleta editable. La papeleta debe tener al menos
3 juegos y puede incluir todos los juegos disponibles. Los porcentajes se
calculan sobre el total de cuentas que ya guardaron papeleta.

Si despliegas en Render, Railway u otro host con filesystem efimero, configura
un disco persistente y apunta `DATA_DIR` a ese disco. Si no, los votos podrian
perderse al reiniciar el servicio.

## Google OAuth

Crea credenciales OAuth en Google Cloud Console y agrega este redirect URI:

```text
http://127.0.0.1:5177/auth/google/callback
```

Luego completa `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.

Para deployment, cambia tambien `BASE_URL` al dominio real y agrega el callback
del dominio, por ejemplo:

```text
https://tu-dominio.com/auth/google/callback
```

## Scripts

```bash
npm start
npm run dev
npm run check
```

## Deployment

### Opcion Recomendada Sin Pagar: Supabase + Render Free

Usa Render para correr el backend y Supabase para guardar votos. No necesitas
disco persistente si configuras `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.

1. En Supabase, crea un proyecto y ejecuta `supabase/schema.sql`.
2. En Render, crea un Web Service desde el repo `Lucas23-IECI/VoteCode`.
2. Define `BASE_URL` con la URL final de Render, por ejemplo:
   `https://votecode.onrender.com`.
3. Completa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
4. Completa `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
5. En Google Cloud, agrega:

```text
https://tu-url-de-render.onrender.com/auth/google/callback
```

Si prefieres no usar Supabase, Render necesita disco persistente y eso requiere
un plan pagado.

### Vercel

El repo incluye `vercel.json` para que Vercel no muestre `404` al servir la app
desde `frontend/`. Aun asi, Vercel no es buena opcion para guardar votos en un
archivo JSON: sus funciones tienen filesystem de solo lectura y solo `/tmp` es
escribible temporalmente.

Usa Vercel solo si cambias la persistencia a una base externa como Supabase,
Neon, Turso o Postgres. Si no, los votos pueden perderse.
