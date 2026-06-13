const TEAMS = [
  { group: "A", team: "Mexico" },
  { group: "A", team: "South Africa" },
  { group: "A", team: "South Korea" },
  { group: "A", team: "Czechia" },
  { group: "B", team: "Canada" },
  { group: "B", team: "Bosnia and Herzegovina" },
  { group: "B", team: "Qatar" },
  { group: "B", team: "Switzerland" },
  { group: "C", team: "Brazil" },
  { group: "C", team: "Morocco" },
  { group: "C", team: "Haiti" },
  { group: "C", team: "Scotland" },
  { group: "D", team: "United States" },
  { group: "D", team: "Paraguay" },
  { group: "D", team: "Australia" },
  { group: "D", team: "Turkey" },
  { group: "E", team: "Germany" },
  { group: "E", team: "Curacao" },
  { group: "E", team: "Ivory Coast" },
  { group: "E", team: "Ecuador" },
  { group: "F", team: "Netherlands" },
  { group: "F", team: "Japan" },
  { group: "F", team: "Sweden" },
  { group: "F", team: "Tunisia" },
  { group: "G", team: "Belgium" },
  { group: "G", team: "Egypt" },
  { group: "G", team: "Iran" },
  { group: "G", team: "New Zealand" },
  { group: "H", team: "Spain" },
  { group: "H", team: "Cape Verde" },
  { group: "H", team: "Saudi Arabia" },
  { group: "H", team: "Uruguay" },
  { group: "I", team: "France" },
  { group: "I", team: "Senegal" },
  { group: "I", team: "Iraq" },
  { group: "I", team: "Norway" },
  { group: "J", team: "Argentina" },
  { group: "J", team: "Algeria" },
  { group: "J", team: "Austria" },
  { group: "J", team: "Jordan" },
  { group: "K", team: "Portugal" },
  { group: "K", team: "DR Congo" },
  { group: "K", team: "Uzbekistan" },
  { group: "K", team: "Colombia" },
  { group: "L", team: "England" },
  { group: "L", team: "Croatia" },
  { group: "L", team: "Ghana" },
  { group: "L", team: "Panama" }
];

const $ = (id) => document.getElementById(id);

const els = {
  officeName: $("officeName"),
  participants: $("participants"),
  allowDuplicates: $("allowDuplicates"),
  runDrawBtn: $("runDrawBtn"),
  clearBtn: $("clearBtn"),
  copyLinkBtn: $("copyLinkBtn"),
  downloadCsvBtn: $("downloadCsvBtn"),
  downloadJsonBtn: $("downloadJsonBtn"),
  printBtn: $("printBtn"),
  status: $("status"),
  results: $("results")
};

let currentDraw = null;

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

function parseParticipants(text) {
  return text
    .split(/\n|,/)
    .map(x => x.trim())
    .filter(Boolean);
}

function runDraw() {
  const names = parseParticipants(els.participants.value);
  const officeName = els.officeName.value.trim() || "World Cup 2026 Office Draw";

  if (names.length < 2) {
    alert("Please add at least 2 participants.");
    return;
  }

  if (!els.allowDuplicates.checked && names.length > TEAMS.length) {
    alert(`There are ${names.length} participants but only ${TEAMS.length} teams. Tick “Allow teams to repeat” or reduce the list.`);
    return;
  }

  const shuffledNames = shuffle(names);
  let teamPool = [];

  while (teamPool.length < shuffledNames.length) {
    teamPool = teamPool.concat(shuffle(TEAMS));
    if (!els.allowDuplicates.checked) break;
  }

  const assignments = shuffledNames.map((name, index) => ({
    number: index + 1,
    participant: name,
    team: teamPool[index].team,
    group: teamPool[index].group
  }));

  currentDraw = {
    officeName,
    generatedAt: new Date().toISOString(),
    assignments
  };

  localStorage.setItem("wc2026OfficeDraw", JSON.stringify(currentDraw));
  renderDraw(currentDraw, false);
}

function renderDraw(draw, readOnly = false) {
  currentDraw = draw;

  const date = new Date(draw.generatedAt);
  els.status.innerHTML = `
    <strong>${escapeHtml(draw.officeName)}</strong><br>
    ${draw.assignments.length} participant(s) drawn • Generated ${date.toLocaleString()}
    ${readOnly ? "<br><em>Read-only shared result</em>" : ""}
  `;

  els.results.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Participant</th>
          <th>Team</th>
          <th>Group</th>
        </tr>
      </thead>
      <tbody>
        ${draw.assignments.map(row => `
          <tr>
            <td>${row.number}</td>
            <td>${escapeHtml(row.participant)}</td>
            <td><strong>${escapeHtml(row.team)}</strong></td>
            <td><span class="badge">${escapeHtml(row.group)}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  setButtons(true);
}

function setButtons(enabled) {
  els.copyLinkBtn.disabled = !enabled;
  els.downloadCsvBtn.disabled = !enabled;
  els.downloadJsonBtn.disabled = !enabled;
  els.printBtn.disabled = !enabled;
}

function drawToCsv(draw) {
  const rows = [["Number", "Participant", "Team", "Group", "Generated At", "Office Name"]];
  for (const row of draw.assignments) {
    rows.push([row.number, row.participant, row.team, row.group, draw.generatedAt, draw.officeName]);
  }
  return rows.map(r => r.map(csvCell).join(",")).join("\n");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function makeShareUrl(draw) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(draw))));
  return `${location.origin}${location.pathname}#draw=${encoded}`;
}

function loadFromHash() {
  if (!location.hash.startsWith("#draw=")) return false;
  try {
    const encoded = location.hash.replace("#draw=", "");
    const json = decodeURIComponent(escape(atob(encoded)));
    const draw = JSON.parse(json);
    renderDraw(draw, true);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

function loadSaved() {
  try {
    const saved = localStorage.getItem("wc2026OfficeDraw");
    if (saved) renderDraw(JSON.parse(saved), false);
  } catch (e) {
    console.error(e);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.runDrawBtn.addEventListener("click", runDraw);

els.clearBtn.addEventListener("click", () => {
  if (!confirm("Clear the form and saved local result?")) return;
  els.officeName.value = "";
  els.participants.value = "";
  els.results.innerHTML = "";
  els.status.textContent = "No draw has been run yet.";
  currentDraw = null;
  setButtons(false);
  localStorage.removeItem("wc2026OfficeDraw");
  history.replaceState(null, "", location.pathname);
});

els.copyLinkBtn.addEventListener("click", async () => {
  if (!currentDraw) return;
  const url = makeShareUrl(currentDraw);
  await navigator.clipboard.writeText(url);
  alert("Share link copied to clipboard.");
});

els.downloadCsvBtn.addEventListener("click", () => {
  if (!currentDraw) return;
  download("world-cup-2026-office-draw.csv", drawToCsv(currentDraw), "text/csv");
});

els.downloadJsonBtn.addEventListener("click", () => {
  if (!currentDraw) return;
  download("world-cup-2026-office-draw.json", JSON.stringify(currentDraw, null, 2), "application/json");
});

els.printBtn.addEventListener("click", () => window.print());

if (!loadFromHash()) loadSaved();
