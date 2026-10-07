import { LAPS, MAX_CARS, PLAYER_TEAM, RIVALS, TRACKS, UPGRADES } from './config.js';
import { formatMoney } from './format.js';
import { upgradeCost, carCost } from './economy.js';

const UPGRADE_LABELS = { engine: 'Moteur', tires: 'Pneus', brakes: 'Freins', nitro: 'Nitro' };
const MAX_ROWS = MAX_CARS + RIVALS.length;
const NO_MONEY = "Pas assez d'argent";

const RIVAL_BY_ID = new Map(RIVALS.map(r => [r.id, r]));

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

export function createUI(root, handlers) {
  root.textContent = '';

  // Header.
  const header = el('section', 'box');
  header.append(el('h1', 'title', 'Pit Wall'));
  const moneyEl = el('div', 'money');
  const repEl = el('div', 'rep');
  header.append(moneyEl, repEl);

  // Race box.
  const raceBox = el('section', 'box');
  raceBox.append(el('h2', null, 'Course'));
  const circuitNameEl = el('div', 'circuit-name');
  const lapEl = el('div', 'lap');
  const list = el('ol', 'standings');
  const rows = [];
  for (let i = 0; i < MAX_ROWS; i++) {
    const li = el('li');
    const pos = el('span', 'pos');
    const chip = el('span', 'chip');
    const name = el('span', 'name');
    li.append(pos, chip, name);
    li.hidden = true;
    list.append(li);
    rows.push({ li, pos, chip, name, color: '' });
  }
  raceBox.append(circuitNameEl, lapEl, list);

  // Upgrades.
  const upBox = el('section', 'box');
  upBox.append(el('h2', null, 'Améliorations'));
  const upRows = {};
  for (const key of Object.keys(UPGRADES)) {
    const row = el('div', 'row');
    const label = el('span', 'label', UPGRADE_LABELS[key]);
    const level = el('small');
    label.append(level);
    const btn = el('button', 'buy');
    btn.type = 'button';
    btn.addEventListener('click', () => handlers.onUpgrade(key));
    row.append(label, btn);
    upBox.append(row);
    upRows[key] = { level, btn };
  }
  const carRow = el('div', 'row');
  const carLabel = el('span', 'label');
  const carBtn = el('button', 'buy');
  carBtn.type = 'button';
  carBtn.addEventListener('click', () => handlers.onBuyCar());
  carRow.append(carLabel, carBtn);
  upBox.append(carRow);

  // Circuits.
  const trackBox = el('section', 'box');
  trackBox.append(el('h2', null, 'Circuits'));
  const trackList = el('div', 'circuits');
  const trackRows = TRACKS.map((track, index) => {
    const btn = el('button', 'circuit');
    btn.type = 'button';
    const name = el('span', 'cname', track.name);
    const req = el('span', 'req');
    btn.append(name, req);
    btn.addEventListener('click', () => handlers.onSelectTrack(index));
    trackList.append(btn);
    return { btn, req };
  });
  trackBox.append(trackList);

  const hint = el('p', 'hint', 'Clique sur tes voitures pour déclencher le nitro.');

  root.append(header, raceBox, upBox, trackBox, hint);

  function standingName(car) {
    if (car.own) return car.label;
    const rival = RIVAL_BY_ID.get(car.teamId);
    return rival ? rival.name : car.label || car.id;
  }

  function standingColor(car) {
    if (car.own) return PLAYER_TEAM.color;
    const rival = RIVAL_BY_ID.get(car.teamId);
    return rival ? rival.color : '#cccccc';
  }

  function lapText(race, standings) {
    if (race.phase === 'countdown') return 'Départ…';
    if (race.phase === 'finished') return 'Arrivée';
    const best = standings.find(c => c.own);
    if (!best) return '';
    return 'Tour ' + (best.finished ? LAPS : Math.min(LAPS, best.laps + 1)) + ' / ' + LAPS;
  }

  function update(state) {
    const { profile, race, standings, trackIndex } = state;

    setText(moneyEl, formatMoney(profile.money) + ' $');
    setText(repEl, 'Réputation : ' + profile.reputation);

    setText(circuitNameEl, TRACKS[trackIndex].name);
    setText(lapEl, lapText(race, standings));
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const car = standings[i];
      if (!car) {
        if (!row.li.hidden) row.li.hidden = true;
        continue;
      }
      if (row.li.hidden) row.li.hidden = false;
      setText(row.pos, String(i + 1));
      setText(row.name, standingName(car));
      const color = standingColor(car);
      if (row.color !== color) {
        row.color = color;
        row.chip.style.background = color;
      }
      row.li.classList.toggle('own', !!car.own);
    }

    for (const key of Object.keys(UPGRADES)) {
      const { level, btn } = upRows[key];
      setText(level, 'Niv. ' + profile.levels[key]);
      const cost = upgradeCost(profile, key);
      const ok = profile.money >= cost;
      setText(btn, ok ? formatMoney(cost) + ' $' : NO_MONEY);
      btn.disabled = !ok;
      btn.classList.toggle('ok', ok);
    }

    setText(carLabel, 'Nouvelle voiture (' + profile.cars + '/' + MAX_CARS + ')');
    const full = profile.cars >= MAX_CARS;
    const cCost = carCost(profile);
    const carOk = !full && profile.money >= cCost;
    setText(carBtn, full ? 'Écurie complète' : carOk ? formatMoney(cCost) + ' $' : NO_MONEY);
    carBtn.disabled = !carOk;
    carBtn.classList.toggle('ok', carOk);

    TRACKS.forEach((track, i) => {
      const { btn, req } = trackRows[i];
      const unlocked = profile.reputation >= track.repRequired;
      btn.disabled = !unlocked;
      btn.classList.toggle('selected', i === profile.trackIndex);
      setText(req, unlocked ? '' : 'Réputation ' + track.repRequired + ' requise');
    });
  }

  return { update };
}
