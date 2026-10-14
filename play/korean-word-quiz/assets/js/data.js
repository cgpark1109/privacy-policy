/*
 * Korean Word Quiz (web) - lazy word data.
 *
 * The app's 30,242 words are split per part of speech into small JSON chunks
 * (data/words/<level>-NN.json). A word lives in chunk fnv1a32(korean) % N, so
 * a saved word ID ("<korean>__<english>") tells us which single chunk to load.
 * Chunks are a hash spread of the whole list, so one random chunk is a fair
 * random sample of its part of speech: a daily session loads about one chunk
 * per part of speech instead of the whole 3 MB word bank.
 */
(function (root, factory) {
  var api = factory(root.KWQCore || (typeof require === 'function' ? require('./core.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KWQData = api;
})(typeof self !== 'undefined' ? self : this, function (Core) {
  'use strict';

  var LEVELS = Core.LEVELS;

  /**
   * manifest: {dataVersion, counts, chunks}
   * fetchJson(path) -> Promise<json>; path is relative to the site root.
   * onChunk(level, index, ids:Set, inChunk(id)) is called after each chunk loads.
   */
  function WordStore(manifest, fetchJson, onChunk) {
    this.manifest = manifest;
    this.fetchJson = fetchJson;
    this.onChunk = onChunk || function () {};
    this.chunks = {}; // "level:index" -> Promise<words[]>
    this.loaded = {}; // "level:index" -> words[]
    this.byId = {};
    for (var i = 0; i < LEVELS.length; i++) this.byId[LEVELS[i]] = new Map();
    this.expert = null;
  }

  WordStore.prototype.chunkCount = function (level) {
    return this.manifest.chunks[level] || 1;
  };

  WordStore.prototype.bucketOf = function (level, korean) {
    return Core.fnv1a32(korean) % this.chunkCount(level);
  };

  WordStore.prototype.chunkPath = function (level, index) {
    var n = String(index);
    if (n.length < 2) n = '0' + n;
    return 'data/words/' + level + '-' + n + '.json?v=' + encodeURIComponent(this.manifest.dataVersion);
  };

  WordStore.prototype.loadChunk = function (level, index) {
    var key = level + ':' + index;
    if (this.chunks[key]) return this.chunks[key];
    var self = this;
    var promise = this.fetchJson(this.chunkPath(level, index)).then(function (rows) {
      if (!Array.isArray(rows)) throw new Error('Bad chunk ' + key);
      var words = [];
      var ids = new Set();
      var map = self.byId[level];
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var word = {
          level: level,
          korean: row[0],
          english: row[1],
          example: row.length > 2 ? row[2] : null,
          id: Core.wordId(row[0], row[1]),
        };
        words.push(word);
        ids.add(word.id);
        map.set(word.id, word);
      }
      self.loaded[key] = words;
      try {
        self.onChunk(level, index, ids, function (id) {
          return self.bucketOf(level, Core.koreanOfId(id)) === index;
        });
      } catch (e) {
        /* pruning is best effort */
      }
      return words;
    });
    promise.catch(function () {
      delete self.chunks[key];
    });
    this.chunks[key] = promise;
    return promise;
  };

  /** All words of a level loaded so far (the app's levelPool, sampled). */
  WordStore.prototype.pool = function (level) {
    var out = [];
    var n = this.chunkCount(level);
    for (var i = 0; i < n; i++) {
      var words = this.loaded[level + ':' + i];
      if (words) out = out.concat(words);
    }
    return out;
  };

  WordStore.prototype.allLoaded = function () {
    var self = this;
    return LEVELS.reduce(function (acc, l) { return acc.concat(self.pool(l)); }, []);
  };

  WordStore.prototype.find = function (level, id) {
    return this.byId[level] ? this.byId[level].get(id) || null : null;
  };

  WordStore.prototype.loadAllChunks = function (level, onProgress) {
    var n = this.chunkCount(level);
    var done = 0;
    var self = this;
    var jobs = [];
    for (var i = 0; i < n; i++) {
      jobs.push(this.loadChunk(level, i).then(function (w) {
        done += 1;
        if (onProgress) onProgress(done, n);
        return w;
      }));
    }
    return Promise.all(jobs).then(function () { return self.pool(level); });
  };

  /** Loads the chunks holding these refs ("level:id"); resolves to found words in ref order. */
  WordStore.prototype.wordsFromRefs = function (refs) {
    var self = this;
    var needed = {};
    var parsed = [];
    for (var i = 0; i < refs.length; i++) {
      var ref = String(refs[i]);
      var sep = ref.indexOf(':');
      if (sep === -1) continue;
      var level = ref.slice(0, sep);
      var id = ref.slice(sep + 1);
      if (!Core.isLevel(level) || !id) continue;
      parsed.push([level, id]);
      needed[level + ':' + this.bucketOf(level, Core.koreanOfId(id))] = true;
    }
    var jobs = Object.keys(needed).map(function (key) {
      var parts = key.split(':');
      return self.loadChunk(parts[0], Number(parts[1]));
    });
    return Promise.all(jobs).then(function () {
      return parsed.map(function (p) { return self.find(p[0], p[1]); }).filter(Boolean);
    });
  };

  WordStore.prototype.refsForWords = function (words) {
    return words.map(function (w) { return w.level + ':' + w.id; });
  };

  /** Loads the chunks holding the given IDs of one level. */
  WordStore.prototype.wordsForIds = function (level, ids) {
    return this.wordsFromRefs(ids.map(function (id) { return level + ':' + id; }));
  };

  /** Makes sure at least one chunk of each level is loaded (distractor pools). */
  WordStore.prototype.ensurePools = function (levels, rng) {
    var self = this;
    return Promise.all(levels.map(function (level) {
      if (self.pool(level).length) return null;
      return self.loadChunk(level, (rng || Core.createRng()).nextInt(self.chunkCount(level)));
    }));
  };

  /**
   * data/word_repository.dart randomQuizQuestions(preferUnlearned: true):
   * the app shuffles all unlearned words of the chosen levels and takes
   * `count`, then falls back to learned words. Here each slot picks a level
   * weighted by its remaining unlearned words (the same distribution), and
   * each level fills its slots from random chunks.
   * learned: {level: Set(ids)}
   */
  WordStore.prototype.randomWords = function (count, level, learned, rng) {
    var r = rng || Core.createRng();
    var self = this;
    var levels = level ? [level] : LEVELS.slice();
    var counts = this.manifest.counts;
    var fresh = {};
    var known = {};
    var poolSize = 0;
    levels.forEach(function (l) {
      var learnedCount = learned && learned[l] ? learned[l].size : 0;
      known[l] = Math.min(learnedCount, counts[l]);
      fresh[l] = Math.max(0, counts[l] - known[l]);
      poolSize += counts[l];
    });
    if (poolSize === 0) return Promise.resolve([]);
    var n = Core.clamp(count, 1, poolSize);
    var slots = {};
    levels.forEach(function (l) { slots[l] = 0; });
    for (var i = 0; i < n; i++) {
      var weights = levels.map(function (l) { return fresh[l]; });
      var useKnown = weights.every(function (w) { return w <= 0; });
      if (useKnown) weights = levels.map(function (l) { return known[l]; });
      var pick = weightedPick(levels, weights, r);
      if (pick === null) break;
      slots[pick] += 1;
      if (useKnown) known[pick] -= 1;
      else fresh[pick] -= 1;
    }
    var jobs = levels.filter(function (l) { return slots[l] > 0; }).map(function (l) {
      return self._takeFromLevel(l, slots[l], (learned && learned[l]) || new Set(), r);
    });
    return Promise.all(jobs).then(function (parts) {
      var freshWords = [];
      var knownWords = [];
      parts.forEach(function (p) {
        freshWords = freshWords.concat(p.fresh);
        knownWords = knownWords.concat(p.known);
      });
      return Core.shuffle(freshWords, r).concat(Core.shuffle(knownWords, r));
    });
  };

  WordStore.prototype._takeFromLevel = function (level, k, learnedSet, rng) {
    var self = this;
    var order = Core.shuffle(range(this.chunkCount(level)), rng);
    var fresh = [];
    var known = [];
    var i = 0;
    function step() {
      if (fresh.length >= k || i >= order.length) {
        var takeFresh = Core.shuffle(fresh, rng).slice(0, k);
        var takeKnown = Core.shuffle(known, rng).slice(0, k - takeFresh.length);
        return { fresh: takeFresh, known: takeKnown };
      }
      return self.loadChunk(level, order[i++]).then(function (words) {
        for (var j = 0; j < words.length; j++) {
          if (learnedSet.has(words[j].id)) known.push(words[j]);
          else fresh.push(words[j]);
        }
        return step();
      });
    }
    return Promise.resolve().then(step);
  };

  /**
   * Picks `count` random words from ID lists without loading every chunk:
   * IDs are shuffled and chunks are loaded until enough existing words are
   * found (same result as the app's random pick over found words).
   * refs: ["level:id", ...]
   */
  WordStore.prototype.randomFromRefs = function (refs, count, rng) {
    var self = this;
    var r = rng || Core.createRng();
    var order = Core.shuffle(refs.slice(), r);
    var out = [];
    var i = 0;
    var batch = 40;
    function step() {
      if (out.length >= count || i >= order.length) return out.slice(0, count);
      var slice = order.slice(i, i + batch);
      i += batch;
      return self.wordsFromRefs(slice).then(function (words) {
        out = out.concat(words);
        return step();
      });
    }
    return Promise.resolve().then(step);
  };

  /** Expert homophones (data/expert.json): [korean, [[english, emoji, example], ...]] */
  WordStore.prototype.loadExpert = function () {
    if (this.expert) return this.expert;
    var self = this;
    this.expert = this.fetchJson('data/expert.json?v=' + encodeURIComponent(this.manifest.dataVersion)).then(function (rows) {
      return rows.map(function (row) {
        return {
          korean: row[0],
          id: row[0] + '__expert',
          meanings: row[1].map(function (m) { return { english: m[0], emoji: m[1], example: m[2] }; }),
        };
      });
    });
    this.expert.catch(function () { self.expert = null; });
    return this.expert;
  };

  function weightedPick(items, weights, rng) {
    var total = 0;
    for (var i = 0; i < weights.length; i++) total += Math.max(0, weights[i]);
    if (total <= 0) return null;
    var x = rng.next() * total;
    for (var j = 0; j < items.length; j++) {
      x -= Math.max(0, weights[j]);
      if (x < 0) return items[j];
    }
    for (var k = items.length - 1; k >= 0; k--) if (weights[k] > 0) return items[k];
    return null;
  }

  function range(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(i);
    return out;
  }

  return { WordStore: WordStore, weightedPick: weightedPick };
});
