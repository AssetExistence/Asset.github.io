# World Cup 2026 Office Draw

A simple static GitHub Pages site for an office sweepstake / draw.

## What it does

- Paste participant names
- Randomly assign World Cup teams
- Export CSV
- Export JSON
- Print results
- Copy a read-only share link
- Works on GitHub Pages without a database

## How to publish on GitHub Pages

1. Create a GitHub account if you do not already have one.
2. Create a new repository called:

   `YOUR-GITHUB-USERNAME.github.io`

3. Upload these files to the repository root:
   - `index.html`
   - `style.css`
   - `app.js`

4. Go to **Settings → Pages**.
5. Set **Source** to **Deploy from a branch**.
6. Select the `main` branch and `/root`.
7. Open:

   `https://YOUR-GITHUB-USERNAME.github.io`

## Notes

GitHub Pages is static hosting. This means there is no database unless you connect one separately.

For an office draw, the simplest process is:

1. Run the draw once.
2. Export CSV/PDF/print.
3. Share the read-only link or publish the final results.
