# Community Edition Setup

## 1. Import the showcase data

Recommended database name:

- `family_tree_showcase`

Import the bundled SQL in this order:

1. [schema_showcase.sql](../backend/src/main/resources/sql/schema_showcase.sql)
2. [seed_showcase.sql](../backend/src/main/resources/sql/seed_showcase.sql)

If you want to use a different database name, update the datasource URL accordingly.

## 2. Configure backend environment

At minimum, check these variables:

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`

See [../.env.example](../.env.example) for a simple example override file.

By default:

- WeChat config stays on `YOUR_*` placeholders
- COS, mail, and subscription templates require your own values
- the existing codebase keeps its current fallback logic where applicable

## 3. Profile split for safe public release

The backend now uses a small profile split:

- `application.yml`: shared baseline config and placeholders
- `application-local.yml`: local showcase defaults, loaded by default
- `application-remote.yml.example`: copy this to `application-remote.yml` when you want to record against your own remote demo database

The real `application-remote.yml` is intentionally ignored by Git, so your remote host, username, and password stay local.

## 4. Start the backend

Run from `backend/`:

```powershell
mvn spring-boot:run
```

This command uses the `local` profile by default, so it is the recommended way to record screenshots and videos for the public repository.

If you want to record against a remote demo database instead:

```powershell
Copy-Item src\main\resources\application-remote.yml.example src\main\resources\application-remote.yml
```

Edit `application-remote.yml`, then start the backend with:

```powershell
mvn spring-boot:run -Dspring-boot.run.profiles=remote
```

If you prefer the packaged jar flow:

```powershell
mvn test
mvn package
java -jar target/family-tree-backend-1.0.0.jar
```

## 5. Open the mini program

1. Open `miniprogram/` in WeChat DevTools.
2. The default frontend environment is `dev`.
3. The default backend URL is `http://127.0.0.1:8080/api`.
4. `project.config.json` uses `touristappid` as a placeholder. Replace it with your own AppID if you want real-device debugging.

For remote recording, you can keep the mini program code unchanged and only point the backend process at your remote demo database with the `remote` profile.

## 6. Scope of the first run

Recommended first-pass verification:

- home page
- family tree
- member list
- member detail
- notification history
- migration timeline

These pages are already covered by the fictional showcase data in this repository.

## 7. What is intentionally not bundled

The community edition does not directly bundle:

- real WeChat login
- real subscription delivery
- COS upload wiring
- multi-tenant commercial capabilities
- private genealogy import or operations scripts
