export const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
export const WEEKDAY_LABELS_SUNDAY = ["S", "M", "T", "W", "T", "F", "S"];

export const getMonthCells = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (monthStart.getDay() + 6) % 7;
  const cells = Array(startOffset).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

export const getMonthCellsSunday = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = monthStart.getDay();
  const cells = Array(startOffset).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};
