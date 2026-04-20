# Family Tree Community Edition

A single-tenant family genealogy mini program community edition.

This repository is meant for:

- local showcase playback with fully fictional demo data
- GitHub screenshots and short demo videos
- technical evaluation before commercial authorization or private deployment

This repository is not meant to ship production credentials, multi-tenant features, or private import tooling.

## Important Notes

- All members, places, migration records, notifications, and gallery items in this repository are fictional showcase data.
- The first public release focuses on front-end showcase pages. Real WeChat login, real COS upload, and admin operations require your own configuration.
- Commercial use, private deployment, customization, and multi-tenant editions are outside the community edition boundary.

## Demo Showcase

Recommended assets for the repository homepage:

1. login page with migration timeline
2. home gallery carousel
3. family tree main view
4. member detail page
5. notification history page

Place your assets in `docs/showcase/` with these filenames:

- `docs/showcase/demo-cover.png`
- `docs/showcase/01-login-timeline.png`
- `docs/showcase/02-home-gallery.png`
- `docs/showcase/03-family-tree.png`
- `docs/showcase/04-member-detail.png`
- `docs/showcase/05-notification-history.png`

If you upload the demo video to GitHub Releases, use a stable filename such as:

- `family-tree-community-demo.mp4`

Replace the placeholder URL below with your real Release asset URL:

```md
[![Watch the demo video](docs/showcase/demo-cover.png)](https://github.com/<your-user>/<your-repo>/releases/download/v0.1.0/family-tree-community-demo.mp4)

Demo video: [Watch the 90-second walkthrough](https://github.com/<your-user>/<your-repo>/releases/download/v0.1.0/family-tree-community-demo.mp4)
```

[![Watch the demo video](docs/showcase/demo-cover.png)](https://github.com/<your-user>/<your-repo>/releases/download/v0.1.0/family-tree-community-demo.mp4)

Demo video: [Watch the 90-second walkthrough](https://github.com/<your-user>/<your-repo>/releases/download/v0.1.0/family-tree-community-demo.mp4)

![Community Edition Cover](docs/showcase/demo-cover.png)

![Login And Migration Timeline](docs/showcase/01-login-timeline.png)
The login flow can introduce the family migration story before the user enters the tree.

![Home Gallery Carousel](docs/showcase/02-home-gallery.png)
The home page can carry family imagery and event memory, not just a member list entry point.

![Family Tree Main View](docs/showcase/03-family-tree.png)
The tree view is the fastest way to show generation structure and spouse relationships.

![Member Detail Page](docs/showcase/04-member-detail.png)
The member detail page supports richer profile data such as occupation, address, and biography.

![Notification History Page](docs/showcase/05-notification-history.png)
The notification history page shows family reminders and activity records.

For the full screenshot checklist and a short recording script, see [docs/SHOWCASE.md](docs/SHOWCASE.md).

## Project Layout

- `backend/`: Spring Boot backend
- `miniprogram/`: WeChat mini program frontend
- `backend/src/main/resources/sql/schema_showcase.sql`: showcase database schema
- `backend/src/main/resources/sql/seed_showcase.sql`: fictional showcase seed data
- `docs/SETUP.md`: local startup instructions
- `docs/SHOWCASE.md`: screenshot and demo video guide
- `docs/RECORDING_SCRIPT.md`: compact recording checklist

## Quick Start

1. Prepare a MySQL 8.x database.
2. Import [schema_showcase.sql](backend/src/main/resources/sql/schema_showcase.sql).
3. Import [seed_showcase.sql](backend/src/main/resources/sql/seed_showcase.sql).
4. Start the backend from `backend/`.
5. Open `miniprogram/` in WeChat DevTools.

More detail is available in [docs/SETUP.md](docs/SETUP.md).

## Run Profiles

The repository now separates safe public defaults from your private remote recording setup:

- `backend/src/main/resources/application.yml`: shared baseline and placeholders
- `backend/src/main/resources/application-local.yml`: local showcase defaults, loaded by default
- `backend/src/main/resources/application-remote.yml.example`: template for your own remote recording setup

### Local showcase run

Use this for GitHub screenshots and most demo videos:

```powershell
cd backend
mvn spring-boot:run
```

### Remote recording run

If you want to keep the public code unchanged but point the backend at your own remote demo database:

```powershell
cd backend
Copy-Item src\main\resources\application-remote.yml.example src\main\resources\application-remote.yml
```

Then edit `application-remote.yml` locally and start with:

```powershell
mvn spring-boot:run -Dspring-boot.run.profiles=remote
```

`application-remote.yml` is ignored by Git, so your remote host and credentials will not be committed into the public repository.

## Community Edition Boundary

Included:

- family tree browsing
- member list and member detail pages
- home gallery showcase
- migration timeline
- notification history
- complete fictional showcase SQL

Not included:

- multi-tenant capabilities
- real production credentials
- operations scripts
- private import scripts
- real family records

Placeholder-only by default:

- WeChat mini program config
- COS config
- mail config
- subscription template config
- JWT secret

## License

This repository uses a custom community-edition license. See [LICENSE](LICENSE).
