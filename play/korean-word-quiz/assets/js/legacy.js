/*
 * Korean Word Quiz (web) - one-time migration from the old level-based web
 * version (June 2026).
 *
 * Most old keys already match the app's keys and need no change:
 *   attendance_last_date / attendance_streak / attendance_best /
 *   attendance_total, streak_current / streak_best / last_played_date,
 *   daily_completed_<date>, notice_seen_<id>_r<rev>,
 *   learned_expert / review_wrong_expert (same "<korean>__expert" IDs).
 *
 * Mapped here:
 *   learned_beginner / learned_intermediate / review_wrong_beginner /
 *   review_wrong_intermediate -> learned_<pos> / review_wrong_<pos> using
 *   data/legacy-map.json (old "<korean>__<english>" -> "<pos>:<new id>").
 *   event_count_quiz_completed -> stats_quizzes_played (if not set).
 *   Returning users skip onboarding.
 *
 * Not mapped: Advanced proverbs (not in the app), stage_cleared_* stage
 * unlocks and quizDir_* (no stages in the new design). Old keys are left in
 * place; nothing is deleted.
 */
(function (root, factory) {
  var api = factory(root.KWQCore || (typeof require === 'function' ? require('./core.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KWQLegacy = api;
})(typeof self !== 'undefined' ? self : this, function (Core) {
  'use strict';

  var Keys = Core.Keys;
  var OLD_WORD_LEVELS = ['beginner', 'intermediate'];

  function hasOldHistory(prefs) {
    if (prefs.getString(Keys.attendanceLastDate) !== null) return true;
    if (prefs.getString(Keys.lastPlayedDate) !== null) return true;
    if ((prefs.getInt('event_count_quiz_completed') || 0) > 0) return true;
    return prefs.keys().some(function (k) {
      return k.indexOf('stage_cleared_') === 0 && prefs.getString(k) === 'true';
    });
  }

  function oldLists(prefs) {
    var lists = [];
    OLD_WORD_LEVELS.forEach(function (level) {
      lists.push({ kind: 'learned', ids: prefs.getStringList('learned_' + level) || [] });
      lists.push({ kind: 'wrong', ids: prefs.getStringList('review_wrong_' + level) || [] });
    });
    return lists.filter(function (l) { return l.ids.length > 0; });
  }

  /**
   * services: from Core.createServices. fetchJson(path) -> Promise.
   * Resolves to a summary, or null when nothing needed migrating.
   */
  function migrate(services, fetchJson) {
    var prefs = services.prefs;
    if (prefs.getBool(Keys.migrationDone)) return Promise.resolve(null);

    var summary = { learned: 0, wrong: 0, quizzes: 0, skippedOnboarding: false };

    var oldQuizzes = prefs.getInt('event_count_quiz_completed') || 0;
    if (oldQuizzes > 0 && prefs.getInt(Keys.statsQuizzesPlayed) === null) {
      prefs.setInt(Keys.statsQuizzesPlayed, oldQuizzes);
      summary.quizzes = oldQuizzes;
    }
    if (!services.settings.hasCompletedOnboarding() && hasOldHistory(prefs)) {
      services.settings.setHasCompletedOnboarding(true);
      summary.skippedOnboarding = true;
    }

    var lists = oldLists(prefs);
    if (!lists.length) {
      prefs.setBool(Keys.migrationDone, true);
      return Promise.resolve(summary);
    }

    return fetchJson('data/legacy-map.json').then(function (map) {
      var progress = services.progress;
      var add = { learned: {}, wrong: {} };
      lists.forEach(function (list) {
        list.ids.forEach(function (oldId) {
          var ref = map[oldId];
          if (!ref) return;
          var sep = ref.indexOf(':');
          var level = ref.slice(0, sep);
          var id = ref.slice(sep + 1);
          if (!Core.isLevel(level)) return;
          (add[list.kind][level] = add[list.kind][level] || []).push(id);
        });
      });
      Core.LEVELS.forEach(function (level) {
        var wrongNew = add.wrong[level] || [];
        var learnedNew = (add.learned[level] || []).filter(function (id) { return wrongNew.indexOf(id) === -1; });
        var wrong = progress.wrongWordIds(level);
        var learned = progress.learnedWordIds(level);
        var addLearned = learnedNew.filter(function (id) { return wrong.indexOf(id) === -1 && learned.indexOf(id) === -1; });
        var addWrong = wrongNew.filter(function (id) { return wrong.indexOf(id) === -1 && learned.indexOf(id) === -1; });
        if (addLearned.length) progress._writeIds(Keys.learnedWords(level), learned.concat(addLearned));
        if (addWrong.length) progress._writeIds(Keys.wrongWords(level), wrong.concat(addWrong));
        summary.learned += addLearned.length;
        summary.wrong += addWrong.length;
      });
      prefs.setBool(Keys.migrationDone, true);
      return summary;
    });
  }

  return { migrate: migrate, hasOldHistory: hasOldHistory };
});
