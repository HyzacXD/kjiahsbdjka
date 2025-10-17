iawgduijav
# Credits Backend (Tweaked)


## Local Dev
1. Create a Postgres DB and set `DATABASE_URL` in `.env`.
2. Optionally add `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` (PEM). If you omit them locally, the server generates ephemeral keys at boot.
3. `npm i`
4. `npm run init`
5. `npm run dev`


### Seed kiosk / merchant users (psql)
```sql
insert into users (username, password_hash, role, credits)
values
('kiosk1', '$2a$10$P0LN1CtCTkDct5nK4mA3E.uqgQokv0gDG4T8b6VBl1y9kZGlG2QGC', 'KIOSK', 0),
('merchant1', '$2a$10$P0LN1CtCTkDct5nK4mA3E.uqgQokv0gDG4T8b6VBl1y9kZGlG2QGC', 'MERCHANT', 0);
-- both use password: "password123"
