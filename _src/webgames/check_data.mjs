// Data checks for countries.json and the generated games. Run from the repository root:
//   node _src/webgames/check_data.mjs
// Exits with code 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const require = createRequire(import.meta.url);
const L = require('./shared/logic.js');

const UN193 = ('AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD ' +
  'CR CI HR CU CY CZ KP DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT ' +
  'JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK ' +
  'NO OM PK PW PA PG PY PE PH PL PT QA KR RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TJ TZ TH ' +
  'TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW').split(' ');
const OBSERVERS = ['VA', 'PS'];
const NO_CAPITAL = ['IL', 'PS']; // left out of the Capital Quiz (internationally disputed capitals)
// The Flutter apps' 75 countries (lib/data/flags_data.dart, country_capital_data.dart), level by level.
const APP_LEVELS = ['US JP GB FR DE', 'BR AU CA KR IT', 'CN IN MX ES RU', 'ZA AR TR SE NO', 'NL BE CH PT GR',
  'PL AT DK FI NZ', 'TH VN ID MY PH', 'EG NG KE GH ET', 'SA AE IL IQ IR', 'UA CZ HU RO SK', 'TD CI IE SL GN',
  'LU HR SI RS BA', 'IS EE LV LT BY', 'MN KZ UZ KG TJ', 'MC LI SM AD MT'].map((s) => s.split(' '));
const REGIONS = ['africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania'];

let failures = 0;
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { failures++; console.log('FAIL ' + msg); }
}
function info(msg) { console.log('  ' + msg); }

const doc = JSON.parse(fs.readFileSync(path.join(HERE, 'countries.json'), 'utf8'));
const C = doc.countries;
const byCode = Object.fromEntries(C.map((c) => [c.code, c]));

// --- membership
const codes = C.map((c) => c.code);
ok(C.length === 195, `195 countries (got ${C.length})`);
ok(new Set(codes).size === codes.length, 'country codes are unique');
ok(UN193.length === 193 && new Set(UN193).size === 193, 'reference list has 193 UN members');
const expected = new Set([...UN193, ...OBSERVERS]);
for (const c of codes) ok(expected.has(c), `${c} is a UN member or observer state`);
for (const c of expected) ok(byCode[c], `${c} is in the dataset`);
for (const c of C) ok(/^[A-Z]{2}$/.test(c.code), `${c.code}: ISO alpha-2 code`);

// --- names, regions, capitals
const hangul = /[가-힣]/;
for (const c of C) {
  ok(c.name && c.name.en && c.name.en.trim() === c.name.en, `${c.code}: English name`);
  ok(c.name && c.name.ko && hangul.test(c.name.ko) && !/[A-Za-z]/.test(c.name.ko), `${c.code}: Korean name in Hangul (${c.name && c.name.ko})`);
  ok(REGIONS.includes(c.region), `${c.code}: region ${c.region}`);
  ok(Array.isArray(c.aliases.en) && Array.isArray(c.aliases.ko), `${c.code}: aliases`);
  if (NO_CAPITAL.includes(c.code)) {
    ok(c.capital === null && c.capitalLevel === null, `${c.code}: no capital, not in the Capital Quiz`);
  } else {
    ok(c.capital && c.capital.en && c.capital.ko && hangul.test(c.capital.ko), `${c.code}: capital in English and Korean`);
    ok(Number.isInteger(c.capitalLevel), `${c.code}: capital level`);
  }
  if (c.capitalNote) ok(c.capitalNote.ko && (c.capitalNote.en || /[가-힣]/.test(c.capitalNote.ko)), `${c.code}: capital note (English may be empty for notes about Korean names)`);
  for (const l of c.lookalikes) {
    ok(byCode[l] && l !== c.code, `${c.code}: look-alike ${l} exists`);
    ok(byCode[l] && byCode[l].lookalikes.includes(c.code), `${c.code}: look-alike ${l} is mutual`);
  }
}

// --- levels
function checkLevels(field, label, allowBigLast) {
  const list = C.filter((c) => c[field] != null);
  const max = Math.max(...list.map((c) => c[field]));
  const sizes = [];
  for (let lv = 1; lv <= max; lv++) sizes.push(list.filter((c) => c[field] === lv).length);
  ok(sizes.every((n) => n > 0), `${label}: levels 1..${max} are contiguous`);
  const notFive = sizes.map((n, i) => [i + 1, n]).filter(([lv, n]) => n !== 5);
  if (allowBigLast) {
    ok(notFive.length === 0 || (notFive.length === 1 && notFive[0][0] === max && notFive[0][1] > 5 && notFive[0][1] < 10),
      `${label}: 5 per level (last level may hold the remainder): ${JSON.stringify(notFive)}`);
  } else {
    ok(notFive.length === 0, `${label}: 5 per level: ${JSON.stringify(notFive)}`);
  }
  info(`${label}: ${list.length} countries, ${max} levels${notFive.length ? `, level ${notFive[0][0]} has ${notFive[0][1]}` : ''}`);
  return max;
}
const flagLevels = checkLevels('level', 'Flag Quiz', false);
const capLevels = checkLevels('capitalLevel', 'Capital Quiz', true);
ok(flagLevels === 39, 'Flag Quiz has 39 levels');
for (const c of C) ok(c.levelGroup === c.level, `${c.code}: levelGroup = level (as in the apps' data)`);

// the apps' 75 keep their level (Flag Quiz: all 75; Capital Quiz: all but Israel)
APP_LEVELS.forEach((row, i) => row.forEach((code) => {
  ok(byCode[code] && byCode[code].level === i + 1 && byCode[code].app === true, `${code}: Flag Quiz level ${i + 1} as in the app`);
  if (!NO_CAPITAL.includes(code)) ok(byCode[code].capitalLevel === i + 1, `${code}: Capital Quiz level ${i + 1} as in the app`);
}));
ok(C.filter((c) => c.app).length === 75, '75 countries marked as the apps\' original set');
// cross-check against the Flutter sources when they are around
const dart = path.resolve(ROOT, '..', 'flag_challenge', 'lib', 'data', 'flags_data.dart');
if (fs.existsSync(dart)) {
  const rows = [...fs.readFileSync(dart, 'utf8').matchAll(/countryCode: '(\w\w)'.*?level: (\d+)/g)];
  ok(rows.length === 75, `flags_data.dart has 75 rows (${rows.length})`);
  for (const [, code, lv] of rows) ok(byCode[code] && byCode[code].level === +lv, `${code}: level ${lv} matches flags_data.dart`);
  info('cross-checked with flag_challenge/lib/data/flags_data.dart');
}
const dartCap = path.resolve(ROOT, '..', 'capitalcity_challenge', 'lib', 'data', 'country_capital_data.dart');
if (fs.existsSync(dartCap)) {
  const rows = [...fs.readFileSync(dartCap, 'utf8').matchAll(/countryCode: '(\w\w)'.*?capitalName: (['"])(.*?)\2, level: (\d+)/g)];
  ok(rows.length === 75, `country_capital_data.dart has 75 rows (${rows.length})`);
  const diffs = [];
  for (const [, code, , cap, lv] of rows) {
    if (NO_CAPITAL.includes(code)) continue;
    ok(byCode[code].capitalLevel === +lv, `${code}: capital level ${lv} matches country_capital_data.dart`);
    if (byCode[code].capital.en !== cap) diffs.push(`${code}: app "${cap}" -> "${byCode[code].capital.en}"`);
  }
  info('capital names changed from the app: ' + (diffs.join('; ') || 'none'));
}

// --- every question can get 3 distinct wrong choices under the rules
function questionCheck(label, pool, opts) {
  const levels = L.levelCountOf(pool, opts.levelOf);
  let n = 0;
  for (let seed = 1; seed <= 25; seed++) {
    const rng = L.mulberry32(seed);
    for (let lv = 1; lv <= levels; lv++) {
      let qs;
      try { qs = L.buildLevel(pool, lv, opts, rng); } catch (e) { ok(false, `${label} level ${lv}: ${e.message}`); continue; }
      for (const q of qs) {
        n++;
        const keys = q.choices.map(opts.keyOf || ((c) => c.code));
        const sameGroup = q.choices.filter((c) => c !== q.answer && opts.groupOf(c) === opts.groupOf(q.answer)).length;
        const look = q.choices.filter((c) => c !== q.answer && opts.groupOf(c) !== opts.groupOf(q.answer));
        if (q.choices.length !== 4 || new Set(keys).size !== 4 || !q.choices.includes(q.answer)) {
          ok(false, `${label} level ${lv} ${q.answer.code}: 4 distinct choices`);
        }
        // anything outside the level group must be a look-alike, within the slots for this level
        if (look.some((c) => !opts.lookalikes || !q.answer.lookalikes.includes(c.code)) || look.length > L.lookalikeSlots(lv)) {
          ok(false, `${label} level ${lv} ${q.answer.code}: wrong choices outside the group must be look-alikes (${look.map((c) => c.code)})`);
        }
        if (sameGroup + look.length !== 3) ok(false, `${label} ${q.answer.code}: 3 wrong choices`);
      }
    }
  }
  // static check: every country has at least 3 others in its group with distinct keys
  for (const c of pool) {
    const keyOf = opts.keyOf || ((x) => x.code);
    const others = new Set(pool.filter((x) => x !== c && opts.groupOf(x) === opts.groupOf(c)).map(keyOf));
    others.delete(keyOf(c));
    ok(others.size >= 3, `${label} ${c.code}: at least 3 distinct wrong choices in its group`);
  }
  ok(true, `${label}`);
  info(`${label}: ${n} generated questions checked`);
}
const flagPool = C;
const capPool = C.filter((c) => c.capital);
questionCheck('Flag → Country / Country → Flag', flagPool, { levelOf: (c) => c.level, groupOf: (c) => c.levelGroup, lookalikes: true });
questionCheck('Country → Capital', capPool, { levelOf: (c) => c.capitalLevel, groupOf: (c) => c.capitalLevel, keyOf: (c) => c.capital.en });
questionCheck('Capital → Country', capPool, { levelOf: (c) => c.capitalLevel, groupOf: (c) => c.capitalLevel });
// Korean capital names distinct within a level group too
for (let lv = 1; lv <= capLevels; lv++) {
  const ko = capPool.filter((c) => c.capitalLevel === lv).map((c) => c.capital.ko);
  ok(new Set(ko).size === ko.length, `Capital Quiz level ${lv}: Korean capital names are distinct`);
}

// --- generated games
function loadGame(slug) {
  const dir = path.join(ROOT, 'play', slug);
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'data.js'), 'utf8'), ctx);
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'game.js'), 'utf8'), ctx);
  return { dir, data: ctx.window.COUNTRIES, game: ctx.window.GAME };
}
let maxFile = ['', 0];
for (const [slug, pool, field] of [['flag-quiz', flagPool, 'level'], ['capital-quiz', capPool, 'capitalLevel']]) {
  const { dir, data } = loadGame(slug);
  ok(data.length === pool.length, `${slug}: data.js has ${pool.length} countries (${data.length})`);
  for (const d of data) {
    const c = byCode[d.c];
    ok(c && d.lv === c[field] && d.n[0] === c.name.en && d.n[1] === c.name.ko, `${slug}: data.js entry ${d.c} is up to date (run build.mjs)`);
  }
  if (slug === 'capital-quiz') ok(!data.some((d) => NO_CAPITAL.includes(d.c)), 'capital-quiz: Israel and Palestine are not in the data');
  for (const c of pool) {
    const f = path.join(dir, 'flags', c.code.toLowerCase() + '.svg');
    const exists = fs.existsSync(f);
    ok(exists, `${slug}: flags/${c.code.toLowerCase()}.svg exists`);
    if (exists) {
      const svg = fs.readFileSync(f, 'utf8');
      ok(/viewBox="0 0 640 480"/.test(svg) && /^<svg[\s>]/.test(svg), `${slug}: ${c.code} flag is a 4:3 SVG`);
    }
  }
  const flagsInDir = fs.readdirSync(path.join(dir, 'flags'));
  ok(flagsInDir.length === pool.length, `${slug}: no extra flag files (${flagsInDir.length})`);
  ok(fs.existsSync(path.join(dir, 'LICENSE-flags.txt')) && /MIT License/.test(fs.readFileSync(path.join(dir, 'LICENSE-flags.txt'), 'utf8')), `${slug}: flag licence file`);
  // file sizes and names (Jekyll drops names starting with _ or .)
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(dir)) {
    const size = fs.statSync(f).size;
    if (size > maxFile[1]) maxFile = [path.relative(ROOT, f), size];
    ok(size < 1000000, `${path.relative(ROOT, f)} is under 1 MB (${size})`);
    for (const part of path.relative(dir, f).split(path.sep)) ok(!/^[_.]/.test(part), `${path.relative(ROOT, f)}: no name starting with _ or .`);
  }
}
info(`largest file: ${maxFile[0]} (${(maxFile[1] / 1024).toFixed(0)} kB)`);

console.log(`${failures ? 'FAILED' : 'OK'}: ${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
