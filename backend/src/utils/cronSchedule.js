// Computes the next occurrence for a cron_configurations row based on its
// frequency/day/time fields, starting strictly after `from`.

function parseTimeOfDay(timeOfDay) {
  const [h, m, s] = String(timeOfDay).split(':').map(Number);
  return { hours: h || 0, minutes: m || 0, seconds: s || 0 };
}

function withTime(date, { hours, minutes, seconds }) {
  const result = new Date(date);
  result.setHours(hours, minutes, seconds || 0, 0);
  return result;
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function computeNextExecutionAt({ frequency, dayOfWeek, dayOfMonth, timeOfDay, from }) {
  const base = from ? new Date(from) : new Date();
  const time = parseTimeOfDay(timeOfDay);

  if (frequency === 'daily') {
    const next = withTime(base, time);
    if (next <= base) next.setDate(next.getDate() + 1);
    return next;
  }

  if (frequency === 'weekly') {
    const targetDay = Number(dayOfWeek);
    const next = withTime(base, time);
    while (next.getDay() !== targetDay || next <= base) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  if (frequency === 'monthly') {
    const targetDay = Number(dayOfMonth);
    let year = base.getFullYear();
    let month = base.getMonth();
    let candidateDay = Math.min(targetDay, lastDayOfMonth(year, month));
    let next = withTime(new Date(year, month, candidateDay), time);

    if (next <= base) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      candidateDay = Math.min(targetDay, lastDayOfMonth(year, month));
      next = withTime(new Date(year, month, candidateDay), time);
    }
    return next;
  }

  throw new Error(`Frecuencia no soportada: ${frequency}`);
}

module.exports = { computeNextExecutionAt };
