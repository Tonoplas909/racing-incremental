// Side panel: builds the DOM once, then update() only touches text, disabled and title.
import { segmentCost, upgradeCost } from './economy.js';
import { canAddSegment } from './track.js';
import { formatMoney } from './format.js';

const SEGMENT_BUTTONS = [
  { kind: 'straight', label: 'Ligne droite' },
  { kind: 'curve_left', label: 'Virage gauche' },
  { kind: 'curve_right', label: 'Virage droite' },
  { kind: 'checkpoint', label: 'Checkpoint' },
];

const UPGRADE_BUTTONS = [
  { kind: 'car', label: 'Nouvelle voiture' },
  { kind: 'speed', label: 'Vitesse +10 %' },
  { kind: 'payout', label: 'Gain +10 %' },
];

const REASONS = {
  need_track: 'Il faut un segment de piste par checkpoint',
  max_segments: 'Circuit complet (48 segments max)',
  money: "Pas assez d'argent",
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildStat(parent, label) {
  const row = el('div', 'stat');
  row.append(el('span', 'stat-label', label));
  const value = el('span', 'stat-value', '');
  row.append(value);
  parent.append(row);
  return value;
}

function buildButton(parent, label, onClick) {
  const button = el('button', 'buy');
  button.type = 'button';
  const name = el('span', 'buy-label', label);
  const cost = el('span', 'buy-cost', '');
  button.append(name, cost);
  button.addEventListener('click', onClick);
  parent.append(button);
  return { button, cost };
}

function setButton(entry, cost, reason) {
  entry.cost.textContent = `${formatMoney(cost)} $`;
  entry.button.disabled = reason !== null;
  entry.button.title = reason === null ? '' : REASONS[reason];
}

export function createUI(panel, { onBuySegment, onBuyUpgrade }) {
  const stats = el('section', 'stats');
  const money = buildStat(stats, 'Argent');
  const cars = buildStat(stats, 'Voitures');
  const rate = buildStat(stats, 'Revenu');

  const circuit = el('section', 'group');
  circuit.append(el('h2', null, 'Circuit'));
  const segmentEntries = SEGMENT_BUTTONS.map(({ kind, label }) => ({
    kind,
    ...buildButton(circuit, label, () => onBuySegment(kind)),
  }));

  const upgrades = el('section', 'group');
  upgrades.append(el('h2', null, 'Améliorations'));
  const upgradeEntries = UPGRADE_BUTTONS.map(({ kind, label }) => ({
    kind,
    ...buildButton(upgrades, label, () => onBuyUpgrade(kind)),
  }));

  panel.append(stats, circuit, upgrades);

  function update(state, moneyPerSecond) {
    money.textContent = `${formatMoney(state.money)} $`;
    cars.textContent = String(state.cars.length);
    rate.textContent = `${formatMoney(moneyPerSecond)} $/s`;

    for (const entry of segmentEntries) {
      const cost = segmentCost(state, entry.kind);
      const check = canAddSegment(state.segments, entry.kind);
      let reason = null;
      if (!check.ok) reason = check.reason;
      else if (state.money < cost) reason = 'money';
      setButton(entry, cost, reason);
    }

    for (const entry of upgradeEntries) {
      const cost = upgradeCost(state, entry.kind);
      setButton(entry, cost, state.money < cost ? 'money' : null);
    }
  }

  return { update };
}
