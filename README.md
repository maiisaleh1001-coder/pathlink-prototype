# Path Link · prototype

Static, clickable, installable (PWA) prototype of the Path Link app (Arabic, RTL), exported from the design canvas.

- `index.html` — opens V2 (`dark.html` / `lite.html`, the mode last used on the device)
- `dark-*.html` — V2 dark; `lite-*.html` — the same screens in light mode
- `dark.html`, `lite.html` — the splash of each mode; passes on its own to the onboarding

Install: open the site on a phone, then "Add to Home Screen". The installed app starts at `./?app=1`, opens full screen and works offline (network first, cache as fallback).

Everything except `fonts/`, `brand/`, `img/` and `scripts/` is generated. To change it, edit `scripts/build-prototype.ps1` or `scripts/proto-app.js` and rebuild:

    powershell -File scripts/build-prototype.ps1 -Src <canvas project folder>

No build step on the host: Vercel serves the folder as-is. Thmanyah Sans licence for client use still to be confirmed.

Photos in `img/` are Freepik free-licence stock (attribution: Freepik), placeholders for the prototype only.