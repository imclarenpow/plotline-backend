// descriptions from open library sometimes contain newline or or tab characters. we want to clean this out.
// only pass the value as a string.
async function cleanString(rawStr) {
  if (typeof rawStr === 'string') {
    return rawStr.replace(/[\r\n\t]/g, ' ').trim();
  } else {
    return null; // if not a string return null.
  }
}

// parse date like "31 July 1965" to mysql date format "1965-07-31"
function parseToSqlDate(input) {
  if (!input) return null;
  input = String(input).trim();

  // already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  // 31 July 1965 or 1 Jul 1965
  const dmy = input.match(/^(\d{1,2})[ \-\/\.]+([A-Za-z]+)[ ,\-/]+(\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = monthIndex(dmy[2]);
    const year = Number(dmy[3]);
    if (Number.isInteger(day) && month !== null && Number.isInteger(year)) {
      return toIsoDate(year, month, day);
    }
  }

  // July 31, 1965
  const mdy = input.match(/^([A-Za-z]+)[ \-]+(\d{1,2}),?[ ,\-/]+(\d{4})$/);
  if (mdy) {
    const month = monthIndex(mdy[1]);
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    if (month !== null && Number.isInteger(day) && Number.isInteger(year)) {
      return toIsoDate(year, month, day);
    }
  }

  // fallback to Date parser
  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) {
    // ensure UTC-normalized YYYY-MM-DD
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
  }

  return null;

  function monthIndex(name) {
    const m = name.toLowerCase().slice(0, 3);
    const map = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    return map[m] ?? null;
  }
  function toIsoDate(y, mIndex, d) {
    return new Date(Date.UTC(y, mIndex, d)).toISOString().slice(0, 10); // "YYYY-MM-DD"
  }
}

module.exports = {
  cleanString, parseToSqlDate
}