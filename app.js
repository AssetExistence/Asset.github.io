/* World Cup 2026 Office Draw & Tracker
   Static GitHub Pages app. No server. Data is saved in localStorage. */

const DATA = window.WC2026_DATA;
const STORAGE_KEY = "wc2026-office-tracker-v1";

const els = {};
const $ = (id) => document.getElementById(id);

let state = {
  settings: { officeName: "", allowRepeats: false },
  draw: [],
  results: {},
  savedAt: null
};

const teamByCode = Object.fromEntries(DATA.teams.map(t => [t.code, t]));
const groups = [...new Set(DATA.teams.map(t => t.group))];

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  setupTabs();
  setupFilters();
  bindEvents();
  loadState();
  renderAll();
});

function cacheElements() {
  [
    "officeName", "participants", "allowRepeats", "runDrawBtn", "downloadDrawCsvBtn",
    "printBtn", "drawSummary", "drawTable", "groupFilter", "teamFilter", "fixturesList",
    "standingsGrid", "thirdPlaceTable", "leaderboardTable", "downloadStandingsCsvBtn",
    "downloadLeaderboardCsvBtn", "copyShareLinkBtn", "exportJsonBtn", "importJsonInput",
    "resetScoresBtn", "resetAllBtn", "adminStatus"
  ].forEach(id => els[id] = $(id));
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      button.classList.add("active");
      $(button.dataset.tab).classList.add("active");
    });
  });
}

function setupFilters() {
  els.groupFilter.innerHTML = `<option value="">All groups</option>` + groups.map(g => `<option value="${g}">Group ${g}</option>`).join("");

  const teams = [...DATA.teams].sort((a, b) => a.name.localeCompare(b.name));
  els.teamFilter.innerHTML = `<option value="">All teams</option>` + teams.map(t => `<option value="${t.code}">${escapeHtml(t.name)}</option>`).join("");
}

function bindEvents() {
  els.runDrawBtn.addEventListener("click", runDraw);
  els.downloadDrawCsvBtn.addEventListener("click", () => downloadCsv("world-cup-office-draw.csv", drawRows()));
  els.downloadStandingsCsvBtn.addEventListener("click", () => downloadCsv("world-cup-standings.csv", standingsRows()));
  els.downloadLeaderboardCsvBtn.addEventListener("click", () => downloadCsv("world-cup-office-leaderboard.csv", leaderboardRows()));
  els.printBtn.addEventListener("click", () => window.print());

  els.groupFilter.addEventListener("change", renderFixtures);
  els.teamFilter.addEventListener("change", renderFixtures);

  els.fixturesList.addEventListener("click", event => {
    const save = event.target.closest(".save-score");
    const clear = event.target.closest(".clear-score");
    if (save) saveScore(save.dataset.matchId);
    if (clear) clearScore(clear.dataset.matchId);
  });

  els.copyShareLinkBtn.addEventListener("click", copyShareLink);
  els.exportJsonBtn.addEventListener("click", exportJson);
  els.importJsonInput.addEventListener("change", importJson);
  els.resetScoresBtn.addEventListener("click", resetScores);
  els.resetAllBtn.addEventListener("click", resetAll);

  els.officeName.addEventListener("input", () => {
    state.settings.officeName = els.officeName.value.trim();
    saveState();
    renderAdminStatus();
  });

  els.allowRepeats.addEventListener("change", () => {
    state.settings.allowRepeats = els.allowRepeats.checked;
    saveState();
  });
}

function loadState() {
  const shared = readSharedStateFromUrl();
  if (shared) {
    state = shared;
    saveState(false);
  } else {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) state = normalizeState(JSON.parse(saved));
    } catch (err) {
      console.warn("Could not read saved state", err);
    }
  }

  els.officeName.value = state.settings.officeName || "";
  els.allowRepeats.checked = Boolean(state.settings.allowRepeats);
}

function normalizeState(input) {
  return {
    settings: {
      officeName: input?.settings?.officeName || "",
      allowRepeats: Boolean(input?.settings?.allowRepeats)
    },
    draw: Array.isArray(input?.draw) ? input.draw : [],
    results: input?.results && typeof input.results === "object" ? input.results : {},
    savedAt: input?.savedAt || null
  };
}

function saveState(updateTimestamp = true) {
  if (updateTimestamp) state.savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderAll() {
  renderDraw();
  renderFixtures();
  renderStandings();
  renderLeaderboard();
  renderAdminStatus();
}

function runDraw() {
  const participants = parseParticipants(els.participants.value);
  if (participants.length < 2) {
    alert("Please add at least two participants.");
    return;
  }

  state.settings.officeName = els.officeName.value.trim();
  state.settings.allowRepeats = els.allowRepeats.checked;

  if (!state.settings.allowRepeats && participants.length > DATA.teams.length) {
    alert(`There are ${participants.length} participants but only ${DATA.teams.length} teams. Tick “Allow team repeats” or reduce the list.`);
    return;
  }

  const pool = buildTeamPool(participants.length, state.settings.allowRepeats);
  const shuffledNames = shuffle(participants);
  const shuffledTeams = shuffle(pool);

  state.draw = shuffledNames.map((name, index) => {
    const team = shuffledTeams[index];
    return {
      number: index + 1,
      participant: name,
      teamCode: team.code,
      teamName: team.name,
      group: team.group,
      drawnAt: new Date().toISOString()
    };
  });

  saveState();
  renderAll();
  alert("The office draw has been completed.");
}

function parseParticipants(text) {
  return text
    .split(/\n|,/)
    .map(x => x.trim())
    .filter(Boolean);
}

function buildTeamPool(count, allowRepeats) {
  let pool = [];
  while (pool.length < count) {
    pool = pool.concat(DATA.teams);
    if (!allowRepeats) break;
  }
  return pool;
}

function randomInt(max) {
  const array = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let value;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= limit);
  return value % max;
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function renderDraw() {
  els.downloadDrawCsvBtn.disabled = state.draw.length === 0;
  els.downloadLeaderboardCsvBtn.disabled = state.draw.length === 0;

  if (!state.draw.length) {
    els.drawSummary.textContent = "No draw has been run yet.";
    els.drawTable.innerHTML = "";
    return;
  }

  const office = state.settings.officeName || "World Cup 2026 Office Draw";
  els.drawSummary.innerHTML = `<strong>${escapeHtml(office)}</strong><br>${state.draw.length} participant(s) assigned to teams.`;

  els.drawTable.innerHTML = tableWrap(`
    <table>
      <thead>
        <tr><th>#</th><th>Participant</th><th>Team</th><th>Group</th></tr>
      </thead>
      <tbody>
        ${state.draw.map(row => `
          <tr>
            <td>${row.number}</td>
            <td>${escapeHtml(row.participant)}</td>
            <td><strong>${escapeHtml(row.teamName)}</strong> <span class="badge">${row.teamCode}</span></td>
            <td><span class="badge">Group ${row.group}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `);
}

function renderFixtures() {
  const group = els.groupFilter.value;
  const team = els.teamFilter.value;

  let fixtures = DATA.fixtures;
  if (group) fixtures = fixtures.filter(f => f.group === group);
  if (team) fixtures = fixtures.filter(f => f.home === team || f.away === team);

  els.fixturesList.innerHTML = fixtures.map(f => {
    const r = state.results[f.id] || {};
    const home = teamByCode[f.home];
    const away = teamByCode[f.away];

    return `
      <div class="fixture">
        <div class="time">${formatDate(f.kickoffUtc)}<br><span class="badge">Group ${f.group}</span></div>
        <div class="team home"><strong>${escapeHtml(home.name)}</strong><br><span class="badge">${home.code}</span></div>
        <input type="number" min="0" inputmode="numeric" id="home-${f.id}" value="${r.homeGoals ?? ""}" aria-label="${home.name} goals" />
        <div class="dash">-</div>
        <input type="number" min="0" inputmode="numeric" id="away-${f.id}" value="${r.awayGoals ?? ""}" aria-label="${away.name} goals" />
        <div class="team away"><strong>${escapeHtml(away.name)}</strong><br><span class="badge">${away.code}</span></div>
        <button class="save-score" data-match-id="${f.id}">Save</button>
        <button class="clear-score" data-match-id="${f.id}" title="Clear score">Clear</button>
      </div>
    `;
  }).join("");

  if (!fixtures.length) {
    els.fixturesList.innerHTML = `<div class="summary-box">No fixtures match that filter.</div>`;
  }
}

function saveScore(matchId) {
  const homeValue = $(`home-${matchId}`).value;
  const awayValue = $(`away-${matchId}`).value;

  if (homeValue === "" || awayValue === "") {
    alert("Please enter both scores before saving.");
    return;
  }

  const homeGoals = Number(homeValue);
  const awayGoals = Number(awayValue);

  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
    alert("Scores must be whole numbers of zero or more.");
    return;
  }

  state.results[matchId] = {
    homeGoals,
    awayGoals,
    updatedAt: new Date().toISOString()
  };

  saveState();
  renderStandings();
  renderLeaderboard();
  renderAdminStatus();
}

function clearScore(matchId) {
  delete state.results[matchId];
  saveState();
  renderFixtures();
  renderStandings();
  renderLeaderboard();
  renderAdminStatus();
}

function computeStandings() {
  const table = {};
  for (const team of DATA.teams) {
    table[team.code] = {
      ...team,
      played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, pts: 0, rank: null
    };
  }

  for (const fixture of DATA.fixtures) {
    const result = state.results[fixture.id];
    if (!isCompleteResult(result)) continue;

    const home = table[fixture.home];
    const away = table[fixture.away];
    home.played += 1; away.played += 1;
    home.gf += result.homeGoals; home.ga += result.awayGoals;
    away.gf += result.awayGoals; away.ga += result.homeGoals;

    if (result.homeGoals > result.awayGoals) {
      home.won += 1; home.pts += 3; away.lost += 1;
    } else if (result.homeGoals < result.awayGoals) {
      away.won += 1; away.pts += 3; home.lost += 1;
    } else {
      home.drawn += 1; away.drawn += 1; home.pts += 1; away.pts += 1;
    }
  }

  for (const row of Object.values(table)) row.gd = row.gf - row.ga;

  const byGroup = {};
  for (const group of groups) {
    const rows = Object.values(table).filter(t => t.group === group).sort(sortStandings);
    rows.forEach((r, i) => r.rank = i + 1);
    byGroup[group] = rows;
  }
  return byGroup;
}

function sortStandings(a, b) {
  return (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.name.localeCompare(b.name);
}

function renderStandings() {
  const byGroup = computeStandings();

  els.standingsGrid.innerHTML = groups.map(group => {
    const rows = byGroup[group];
    return `
      <div class="group-card">
        <h3>Group ${group}</h3>
        ${tableWrap(`
          <table>
            <thead>
              <tr><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  <td><span class="rank ${row.rank <= 2 ? "good" : row.rank === 3 ? "warn" : ""}">${row.rank}</span></td>
                  <td><strong>${escapeHtml(row.name)}</strong> <span class="badge">${row.code}</span></td>
                  <td>${row.played}</td><td>${row.won}</td><td>${row.drawn}</td><td>${row.lost}</td>
                  <td>${row.gf}</td><td>${row.ga}</td><td>${formatGd(row.gd)}</td><td><strong>${row.pts}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        `)}
      </div>
    `;
  }).join("");

  const thirds = groups.map(g => byGroup[g][2]).sort(sortStandings).map((row, index) => ({ ...row, thirdRank: index + 1 }));

  els.thirdPlaceTable.innerHTML = tableWrap(`
    <table>
      <thead>
        <tr><th>Third-place rank</th><th>Team</th><th>Group</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
      </thead>
      <tbody>
        ${thirds.map(row => `
          <tr>
            <td><span class="rank ${row.thirdRank <= 8 ? "good" : ""}">${row.thirdRank}</span></td>
            <td><strong>${escapeHtml(row.name)}</strong> <span class="badge">${row.code}</span></td>
            <td>Group ${row.group}</td>
            <td>${row.played}</td><td>${row.won}</td><td>${row.drawn}</td><td>${row.lost}</td>
            <td>${row.gf}</td><td>${row.ga}</td><td>${formatGd(row.gd)}</td><td><strong>${row.pts}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `);
}

function renderLeaderboard() {
  if (!state.draw.length) {
    els.leaderboardTable.innerHTML = `<div class="summary-box">Run the office draw first. Once scores are entered, this leaderboard will update automatically.</div>`;
    return;
  }

  const byGroup = computeStandings();
  const statsByCode = {};
  for (const rows of Object.values(byGroup)) rows.forEach(r => statsByCode[r.code] = r);

  const rows = state.draw.map(draw => {
    const stats = statsByCode[draw.teamCode] || {};
    return {
      participant: draw.participant, teamName: draw.teamName, teamCode: draw.teamCode, group: draw.group,
      rank: stats.rank || "", played: stats.played || 0, pts: stats.pts || 0, gd: stats.gd || 0, gf: stats.gf || 0, won: stats.won || 0
    };
  }).sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || (b.won - a.won) || a.participant.localeCompare(b.participant));

  els.leaderboardTable.innerHTML = tableWrap(`
    <table>
      <thead>
        <tr><th>#</th><th>Participant</th><th>Assigned team</th><th>Group rank</th><th>P</th><th>Pts</th><th>GD</th><th>GF</th></tr>
      </thead>
      <tbody>
        ${rows.map((row, index) => `
          <tr>
            <td><span class="rank ${index === 0 ? "good" : ""}">${index + 1}</span></td>
            <td><strong>${escapeHtml(row.participant)}</strong></td>
            <td>${escapeHtml(row.teamName)} <span class="badge">${row.teamCode}</span> <span class="badge">Group ${row.group}</span></td>
            <td>${row.rank ? `<span class="rank ${row.rank <= 2 ? "good" : row.rank === 3 ? "warn" : ""}">${row.rank}</span>` : ""}</td>
            <td>${row.played}</td><td><strong>${row.pts}</strong></td><td>${formatGd(row.gd)}</td><td>${row.gf}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `);
}

function drawRows() {
  return [["Number", "Participant", "Team", "Code", "Group"], ...state.draw.map(r => [r.number, r.participant, r.teamName, r.teamCode, r.group])];
}

function standingsRows() {
  const byGroup = computeStandings();
  const rows = [["Group", "Position", "Team", "Code", "Played", "Won", "Drawn", "Lost", "Goals For", "Goals Against", "Goal Difference", "Points"]];
  for (const group of groups) byGroup[group].forEach(row => rows.push([group, row.rank, row.name, row.code, row.played, row.won, row.drawn, row.lost, row.gf, row.ga, row.gd, row.pts]));
  return rows;
}

function leaderboardRows() {
  const byGroup = computeStandings();
  const statsByCode = {};
  for (const rows of Object.values(byGroup)) rows.forEach(r => statsByCode[r.code] = r);
  const rows = [["Participant", "Team", "Code", "Group", "Group Rank", "Played", "Points", "Goal Difference", "Goals For"]];
  state.draw.forEach(draw => {
    const stats = statsByCode[draw.teamCode] || {};
    rows.push([draw.participant, draw.teamName, draw.teamCode, draw.group, stats.rank || "", stats.played || 0, stats.pts || 0, stats.gd || 0, stats.gf || 0]);
  });
  return rows;
}

function downloadCsv(filename, rows) {
  const csv = rows.map(row => row.map(csvCell).join(",")).join("\n");
  download(filename, csv, "text/csv;charset=utf-8");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportJson() {
  download("world-cup-office-tracker-backup.json", JSON.stringify(state, null, 2), "application/json;charset=utf-8");
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalizeState(JSON.parse(reader.result));
      saveState();
      els.officeName.value = state.settings.officeName || "";
      els.allowRepeats.checked = Boolean(state.settings.allowRepeats);
      renderAll();
      alert("JSON backup imported.");
    } catch (err) {
      alert("Could not import that JSON file.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function copyShareLink() {
  const encoded = encodeState(state);
  const url = `${location.origin}${location.pathname}#state=${encoded}`;
  navigator.clipboard.writeText(url).then(() => alert("Share link copied to clipboard.")).catch(() => prompt("Copy this share link:", url));
}

function readSharedStateFromUrl() {
  if (!location.hash.startsWith("#state=")) return null;
  try {
    const encoded = location.hash.slice("#state=".length);
    return normalizeState(JSON.parse(decodeURIComponent(escape(atob(encoded)))));
  } catch (err) {
    console.warn("Could not parse shared state", err);
    return null;
  }
}

function encodeState(value) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
}

function resetScores() {
  if (!confirm("Reset all entered match scores? The office draw will remain.")) return;
  state.results = {};
  saveState();
  renderAll();
}

function resetAll() {
  if (!confirm("Reset everything, including the office draw and all scores?")) return;
  state = { settings: { officeName: "", allowRepeats: false }, draw: [], results: {}, savedAt: null };
  localStorage.removeItem(STORAGE_KEY);
  history.replaceState(null, "", location.pathname);
  els.officeName.value = "";
  els.participants.value = "";
  els.allowRepeats.checked = false;
  renderAll();
}

function renderAdminStatus() {
  const enteredScores = Object.keys(state.results).length;
  const office = state.settings.officeName || "Not set";
  const saved = state.savedAt ? formatDate(state.savedAt) : "Not yet saved";
  els.adminStatus.innerHTML = `
    <strong>Office name:</strong> ${escapeHtml(office)}<br>
    <strong>Draw entries:</strong> ${state.draw.length}<br>
    <strong>Scores entered:</strong> ${enteredScores} of ${DATA.fixtures.length}<br>
    <strong>Data version:</strong> ${DATA.version} / reviewed ${DATA.lastDataReview}<br>
    <strong>Last saved:</strong> ${saved}
  `;
}

function isCompleteResult(result) {
  return result && Number.isInteger(result.homeGoals) && Number.isInteger(result.awayGoals);
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatGd(value) {
  return value > 0 ? `+${value}` : String(value);
}

function tableWrap(html) {
  return `<div class="table-wrap">${html}</div>`;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
