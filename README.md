# Path Link · prototype

Static, clickable, installable (PWA) prototype of the Path Link app (Arabic, RTL), exported from the design canvas.

- `index.html` — home (services, current activity)
- `jobs.html`, `job.html`, `job-apply.html` — the jobs flow: list, details, apply sheet with success
- `add.html` — the (+) sheet
- `splash.html` — shown on the first open of a session and on every launch of the installed app; passes on its own

Install: open the site on a phone, then "Add to Home Screen". The installed app starts at `./?app=1`, opens full screen and works offline (network first, cache as fallback).

Everything except `fonts/` and `scripts/` is generated. To change it, edit `scripts/build-prototype.ps1` or `scripts/proto-app.js` and rebuild:

    powershell -File scripts/build-prototype.ps1 -Src <canvas project folder>

No build step on the host: Vercel serves the folder as-is. Thmanyah Sans licence for client use still to be confirmed.