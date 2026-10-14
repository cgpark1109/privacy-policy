/*
 * Korean Word Quiz (web) - pronunciation with the Web Speech API.
 * Mirrors services/tts_service.dart: speak only when a Korean voice exists
 * and pronunciation is enabled; otherwise speaker buttons stay hidden.
 */
(function (root) {
  'use strict';

  var synth = typeof root.speechSynthesis !== 'undefined' ? root.speechSynthesis : null;
  var listeners = [];
  var state = { supported: !!synth && typeof root.SpeechSynthesisUtterance !== 'undefined', ready: false, voice: null };

  function pickVoice() {
    if (!state.supported) return null;
    var voices = [];
    try {
      voices = synth.getVoices() || [];
    } catch (e) {
      voices = [];
    }
    var korean = voices.filter(function (v) { return /^ko([-_]|$)/i.test(v.lang || ''); });
    if (!korean.length) return null;
    korean.sort(function (a, b) { return score(b) - score(a); });
    return korean[0];
  }

  function score(v) {
    var s = 0;
    if (/^ko[-_]KR$/i.test(v.lang)) s += 4;
    if (v.localService) s += 2;
    if (v.default) s += 1;
    return s;
  }

  function refresh() {
    var voice = pickVoice();
    var changed = (voice && voice.voiceURI) !== (state.voice && state.voice.voiceURI);
    state.voice = voice;
    if (changed || !state.ready) {
      state.ready = true;
      listeners.forEach(function (fn) {
        try { fn(); } catch (e) { /* ignore */ }
      });
    }
  }

  var TTS = {
    /** True when Korean speech can be played on this device. */
    available: function () { return !!state.voice; },
    supported: function () { return state.supported; },
    ready: function () { return state.ready; },
    onChange: function (fn) { listeners.push(fn); },
    init: function () {
      if (!state.supported) {
        state.ready = true;
        return;
      }
      refresh();
      if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', refresh);
      else synth.onvoiceschanged = refresh;
      // Some browsers fill the voice list late without firing voiceschanged.
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (state.voice || tries > 10) clearInterval(timer);
        refresh();
      }, 300);
    },
    /** rate: Web Speech rate (1 = normal). */
    speak: function (text, rate) {
      var value = String(text || '').trim();
      if (!state.voice || !value) return false;
      try {
        synth.cancel();
        var u = new root.SpeechSynthesisUtterance(value);
        u.voice = state.voice;
        u.lang = state.voice.lang || 'ko-KR';
        u.rate = rate || 0.9;
        u.pitch = 1;
        u.volume = 1;
        synth.speak(u);
        return true;
      } catch (e) {
        return false;
      }
    },
    stop: function () {
      if (!state.supported) return;
      try { synth.cancel(); } catch (e) { /* ignore */ }
    },
  };

  root.KWQTTS = TTS;
})(typeof self !== 'undefined' ? self : this);
