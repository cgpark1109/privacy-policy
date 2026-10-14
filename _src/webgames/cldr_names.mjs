// Korean country names come from CLDR (Node's built-in Intl.DisplayNames(['ko'], {type: 'region'})),
// baked into countries.json so every browser shows the same names. A few CLDR names were reviewed and
// replaced (KO_OVERRIDES below); the CLDR form stays searchable as a Korean alias.
//
//   node _src/webgames/cldr_names.mjs           report differences between countries.json and CLDR
//   node _src/webgames/cldr_names.mjs --write   set name.ko from CLDR + overrides (keeps the old CLDR form as an alias)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, 'countries.json');

export const KO_OVERRIDES = {
  AU: '호주', // CLDR 오스트레일리아 (standard exonym); 호주 is the everyday name and the Foreign Ministry's
  CD: '콩고 민주 공화국', // CLDR 콩고-킨샤사
  CG: '콩고 공화국', // CLDR 콩고-브라자빌
  CF: '중앙아프리카 공화국', // CLDR 중앙 아프리카 공화국 (spacing)
  DM: '도미니카 연방', // CLDR 도미니카, easily confused with 도미니카 공화국
  FM: '미크로네시아 연방', // CLDR 미크로네시아 (also the region name)
  PS: '팔레스타인', // CLDR 팔레스타인 지구 ("Palestinian Territories"); the UN observer state is 팔레스타인
  ZA: '남아프리카 공화국', // CLDR 남아프리카 (also the region name)
};

const ko = new Intl.DisplayNames(['ko'], { type: 'region' });
const text = fs.readFileSync(FILE, 'utf8');
const lines = text.split('\n');
let diffs = 0;
let changed = 0;
const write = process.argv.includes('--write');
console.log(`ICU ${process.versions.icu}, CLDR ${process.versions.cldr}`);
const out = lines.map((line) => {
  const m = line.match(/^ {4}(\{.*\})(,?)$/);
  if (!m) return line;
  const c = JSON.parse(m[1]);
  const cldr = ko.of(c.code);
  const want = KO_OVERRIDES[c.code] || cldr;
  if (cldr !== c.name.ko) {
    diffs++;
    console.log(`${c.code}: dataset ${c.name.ko} | CLDR ${cldr}${KO_OVERRIDES[c.code] ? ' (reviewed override)' : ' (NOT an override: check)'}`);
  }
  if (write && c.name.ko !== want) {
    if (!c.aliases.ko.includes(c.name.ko)) c.aliases.ko.push(c.name.ko);
    c.name.ko = want;
    if (cldr !== want && !c.aliases.ko.includes(cldr)) c.aliases.ko.push(cldr);
    changed++;
    return '    ' + JSON.stringify(c) + m[2];
  }
  return line;
});
const unexpected = lines.filter((l) => /^ {4}\{/.test(l)).map((l) => JSON.parse(l.trim().replace(/,$/, '')))
  .filter((c) => c.name.ko !== (KO_OVERRIDES[c.code] || ko.of(c.code)));
if (write && changed) fs.writeFileSync(FILE, out.join('\n'));
console.log(`${diffs} names differ from CLDR; ${unexpected.length} differ from CLDR + overrides${write ? `; ${changed} updated` : ''}`);
process.exit(!write && unexpected.length ? 1 : 0);
