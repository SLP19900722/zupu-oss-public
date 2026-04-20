# Demo Showcase Guide

This document is for repository screenshots, short demo videos, and social sharing assets. The goal is not to explain every feature. The goal is to let people understand in about 10 seconds that the project already works.

## 1. Screenshot Checklist

Prepare these 5 screenshots in this order:

1. `docs/showcase/01-login-timeline.png`
2. `docs/showcase/02-home-gallery.png`
3. `docs/showcase/03-family-tree.png`
4. `docs/showcase/04-member-detail.png`
5. `docs/showcase/05-notification-history.png`

Recommended framing:

- use the WeChat DevTools phone emulator in portrait mode
- keep each screen data-rich and free of debug panels
- keep the same visual theme across all screenshots

Suggested captions:

- login timeline: introduce the family migration story before entering the tree
- home gallery: the product carries family imagery and memory, not only member records
- family tree: generation structure and spouse relations are clear at a glance
- member detail: profiles can hold occupation, address, biography, and other long-lived data
- notification history: the mini program can retain family reminder and event records

## 2. Short Video Script

Recommended length: 60 to 90 seconds.

Suggested order:

1. `0s - 8s`: open the login page and slowly scroll the migration timeline
2. `8s - 18s`: enter the home page and pause on the gallery carousel
3. `18s - 35s`: open the family tree and do one slow drag or zoom
4. `35s - 50s`: open a rich member detail page and pause on the bio area
5. `50s - 65s`: open notification history
6. `65s - 80s`: end on the home page or family tree cover frame

Recording tips:

- make sure the first 3 seconds already show a visual highlight
- keep pointer or gestures slow and deliberate
- pause briefly after each page transition

If you want to record against your own remote demo database without changing the public defaults, copy `backend/src/main/resources/application-remote.yml.example` to `application-remote.yml`, fill in your remote values locally, and run:

```powershell
mvn spring-boot:run -Dspring-boot.run.profiles=remote
```

## 3. Upload Video To GitHub Releases

If you want the video to live on GitHub, the recommended place is a Release asset.

Suggested filename:

- `family-tree-community-demo.mp4`

Suggested flow:

1. Create a Release such as `v0.1.0`.
2. Upload the video file as a Release asset.
3. Copy the asset URL. It will usually look like:

```text
https://github.com/<your-user>/<your-repo>/releases/download/v0.1.0/family-tree-community-demo.mp4
```

4. Replace the placeholder video URL in `README.md`.

Benefits:

- the video does not bloat source history
- the README can link directly to the video through the cover image
- later video updates only require a new Release asset or link update

## 4. README Snippet

Use this block inside the `Demo Showcase` section of `README.md`:

```md
[![Watch the demo video](docs/showcase/demo-cover.png)](https://github.com/<your-user>/<your-repo>/releases/download/v0.1.0/family-tree-community-demo.mp4)

Demo video: [Watch the 90-second walkthrough](https://github.com/<your-user>/<your-repo>/releases/download/v0.1.0/family-tree-community-demo.mp4)

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
```

## 5. Where To Use These Assets

You can reuse the same materials across channels:

- GitHub README: all 5 screenshots
- Bilibili or short-video platforms: the 60 to 90 second demo video
- WeChat posts or Moments: the cover image plus 3 core screenshots
- direct customer conversations: the video plus `03-family-tree.png`
