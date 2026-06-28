# VoteCode

Aplicacion estatica para votar por juegos con amigos. Usa solo Supabase:
Supabase Auth para iniciar sesion con Google y Supabase Database para guardar
perfiles, votos, ranking y podio.

## Estructura

```text
frontend/
  assets/        Imagenes de juegos
  app.js         UI, auth y persistencia via Supabase
  config.js      URL y anon key publica de Supabase
  index.html
  styles.css
supabase/
  schema.sql     Tablas, constraints y politicas RLS
```

## Configurar Supabase

1. En Supabase, abre tu proyecto `VoteCode`.
2. Ve a **SQL Editor**.
3. Ejecuta `supabase/schema.sql`.
4. Ve a **Project Settings > API**.
5. Copia:
   - Project URL
   - `anon public` key
6. Pega esos valores en `frontend/config.js`.

La `anon public` key puede vivir en frontend porque la seguridad real queda en
RLS. Nunca pegues la `service_role` key en el navegador.

## Google Auth

En Supabase:

1. Ve a **Authentication > Providers**.
2. Activa Google.
3. Configura Client ID y Client Secret de Google.
4. En **Authentication > URL Configuration**, agrega tus redirect URLs.

Para local:

```text
http://127.0.0.1:5177
```

Para produccion, agrega el dominio donde publiques el frontend.

## Uso Local

Desde la carpeta `frontend/`, sirve archivos estaticos:

```bash
python -m http.server 5177 --bind 127.0.0.1
```

Abre:

```text
http://127.0.0.1:5177
```

## Reglas De Votacion

- Cada cuenta guarda una sola papeleta editable.
- Minimo 3 juegos seleccionados.
- Maximo todos los juegos disponibles.
- Los porcentajes se calculan sobre el total de cuentas que ya guardaron
  papeleta.

## Scripts

```bash
npm run check
```
