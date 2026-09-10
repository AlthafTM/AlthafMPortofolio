# AlthafMPortofolio

My Game Dev Portfolio.

## Adding or editing a game

Everything is driven by [`data/games.js`](data/games.js). To add a game, append an entry to the `games` array:

```json
{
  "id": "my-game",
  "title": "My Game",
  "order": "04",
  "tagline": "One short hook line.",
  "icon": "public/my-icon.png",
  "description": "Short paragraph about the game.",
  "availability": ["itch.io", "playstore"],
  "links": {
    "itch": "https://althafm.itch.io/my-game",
    "playstore": "https://play.google.com/store/apps/details?id=..."
  },
  "badges": {
    "itch": "public/badge11455-kq3j.svg",
    "playstore": "public/enbadgewebgeneric22050-uwxn.png"
  },
  "images": ["public/shot1.png", "public/shot2.png", "public/shot3.png"],
  "details": {
    "devTime": "3 months",
    "budget": "Self-funded",
    "tools": "Unity, C#",
    "role": "Solo developer"
  },
  "difficulties": ["Hardest part one.", "Hardest part two."],
  "learnings": ["First lesson.", "Second lesson."]
}
```

- `availability` and `links` are optional per store - leave a link empty (`""`) to hide that badge.
- `images` can hold any number; more than fit the screen become horizontally scrollable. Wide (16:9) and tall (9:19) images are detected automatically.
- `difficulties` and `learnings` are separate lists on the detail page (both optional).
- `icon` and all `images` are paths inside the `public/` folder.
- The home page, the detail page (`game.html?id=<id>`), and the prev/next navigation all update automatically.

## Run locally

Just open `index.html` in a browser — no server needed. (Optionally `python -m http.server` also works.)
