/* Release timing is halved again: 48 nominal degrees, approximately 0.239 s.
   The existing firmware estimates movement from time; it has no angle feedback. */
var CurtainMotion = (function () {
  'use strict';
  var definition = Object.freeze({ degrees: 48, direction: 'cw', speed: 50, neutral: 1500, msPerRev: 1200, factor: 1.4918 });
  var durationMs = definition.degrees / 360 * definition.msPerRev * definition.factor;
  // EEPROM stores turns in tenths, msrev as an integer. Encode duration using
  // one synthetic turn, avoiding loss from rounding the requested turn fraction.
  var scheduleMsRev = Math.round(durationMs / definition.factor);
  function command() {
    return { mode: 'timed', direction: definition.direction, speed: definition.speed, neutral: definition.neutral, seconds: durationMs / 1000 };
  }
  function schedule() { return { direction: definition.direction, speed: definition.speed, turns: 1, msrev: scheduleMsRev }; }
  function resetSchedule(speed) { return { direction: 'ccw', speed: speed, turns: 1, msrev: scheduleMsRev }; }
  function matches(it) { return it.direction === definition.direction && +it.speed === definition.speed && +it.turns === 1 && +it.msrev === scheduleMsRev; }
  function matchesReset(it) { return it.direction === 'ccw' && +it.turns === 1 && +it.msrev === scheduleMsRev; }
  return Object.freeze({ definition: definition, durationMs: durationMs, label: '順時針釋放', command: command, schedule: schedule, resetSchedule: resetSchedule, matches: matches, matchesReset: matchesReset });
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CurtainMotion;
