# VoteCode

Pagina para votar por juegos con amigos, iniciar sesion, guardar papeletas y ver ranking/podio.

## Uso local

Instala dependencias:

```bash
npm install
```

Configura variables:

```bash
copy .env.example .env
```

Levanta el backend:

```bash
npm start
```

Abre `http://127.0.0.1:5177`.

Los votos se guardan en `data/votecode.json`.

## Google OAuth

Para usar Google, crea credenciales OAuth en Google Cloud Console y agrega este redirect URI:

```text
http://127.0.0.1:5177/auth/google/callback
```

Luego completa `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env`.
