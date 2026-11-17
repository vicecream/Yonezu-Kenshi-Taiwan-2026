import { EVENT, SHOWS, SHOW_TIMELINE } from "./data.js";
export function taipeiDateKey(value = Date.now()){
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVENT.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
// Stay on today's show until local midnight; a valid manual choice wins.
export function resolveShow(now = Date.now(), preferredShowId){
  const preferred = SHOWS.find(show => show.id === preferredShowId);
  if (preferred) return preferred;
  const date = taipeiDateKey(now);
  return SHOWS.find(show => show.date >= date) || SHOWS.at(-1);
}
export function showState(now = Date.now(), showId){
  const show = resolveShow(now, showId), date = taipeiDateKey(now), start = Date.parse(show.start);
  if (date > show.date) return { show, phase: "past", days: 0, remaining: 0 };
  if (now >= start) return { show, phase: "started", days: 0, remaining: 0 };
  const dayNumber = value => Date.parse(value + "T00:00:00Z");
  return { show, phase: "upcoming", days: Math.round((dayNumber(show.date) - dayNumber(date)) / 86400000), remaining: start - now };
}
export function todayTimeline(now = Date.now(), showId){
  const show = resolveShow(now, showId), date = taipeiDateKey(now);
  const steps = date === show.date ? SHOW_TIMELINE[date] || [] : [];
  const times = steps.map(step => Date.parse(date + "T" + step.t + ":00+08:00"));
  const nextIndex = times.findIndex(time => time > now);
  return { show, steps, times, nextIndex, currentIndex: nextIndex < 0 ? steps.length - 1 : nextIndex - 1 };
}
