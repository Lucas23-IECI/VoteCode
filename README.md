# VoteCode

Aplicacion para votar por juegos con amigos. Incluye login, papeletas por
cuenta, ranking, podio, porcentajes y persistencia en Supabase.

## Estructura

```text
backend/
  auth.js              Login con Google y login local de desarrollo
  config.js            Variables de entorno y validacion
  database.js          Crea la conexion de Supabase
  gameCatalog.js       Juegos disponibles y regla de minimo
  server.js            API, sesiones y servidor estatico
  supabaseDatabase.js  Persistencia de usuarios y votos
frontend/
  assets/              Imagenes de juegos
  app.js               UI y llamadas a la API
  index.html
  styles.css
supabase/
  schema.sql           Tablas requeridas
```

## Supabase

VoteCode requiere Supabase. No existe fallback local.

1. Crea un proyecto en Supabase.
2. Abre SQL Editor.
3. Ejecuta `supabase/schema.sql`.
4. Copia Project URL y `service_role` key desde Project Settings > API.

Variables requeridas:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Cada cuenta guarda una sola papeleta editable. La papeleta debe tener al menos
3 juegos y puede incluir todos los juegos disponibles. Los porcentajes se
calculan sobre el total de cuentas que ya guardaron papeleta.

## Uso Local

```bash
npm install
copy .env.example .env
npm start
```

Completa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en `.env` antes de
iniciar.

Abre `http://127.0.0.1:5177`.

En desarrollo puedes usar el login local. En produccion, configura Google OAuth
y deja `ENABLE_DEV_LOGIN=false`.

## Google OAuth

Crea credenciales OAuth en Google Cloud Console y agrega este redirect URI para
local:

```text
http://127.0.0.1:5177/auth/google/callback
```

Luego completa `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.

Para deployment, cambia `BASE_URL` al dominio real y agrega el callback del
dominio, por ejemplo:

```text
https://tu-dominio.com/auth/google/callback
```

## Render

Render Free funciona bien porque los datos viven en Supabase.

Config:

```text
Build Command: npm ci
Start Command: npm start
Instance Type: Free
```

Variables:

```text
NODE_ENV=production
BASE_URL=https://tu-url-de-render.onrender.com
SESSION_SECRET=un-texto-largo-random
ENABLE_DEV_LOGIN=false
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## Scripts

```bash
npm start
npm run dev
npm run check
```
