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

Los votos se guardan en `data/votecode.json` por defecto. Puedes cambiar esa
ruta con `DATA_DIR`.

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
