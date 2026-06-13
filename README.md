# World Cup 2026 Office Draw & Tracker

A static GitHub Pages website for running and managing an office World Cup draw.

## Features

- Random office sweepstake draw
- 48-team team pool
- Group-stage fixture list
- Score entry
- Automatic group standings
- Third-place tracker
- Office leaderboard
- CSV downloads
- JSON backup/import
- Shareable browser-state link
- Works without a database

## Files

Upload these files to the root of your GitHub repository:

- `index.html`
- `style.css`
- `data.js`
- `app.js`
- `.nojekyll`

## GitHub Pages

In GitHub, go to:

`Settings -> Pages`

Set:

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/root`

Then open the GitHub Pages URL shown by GitHub.

## Important note

This is a static website. It stores information in the browser using localStorage. Use the JSON export as your backup and the CSV exports for office records.
