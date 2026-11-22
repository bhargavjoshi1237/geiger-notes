import {
  WEEKDAY_LABELS,
  WEEKDAY_LABELS_SUNDAY,
  getMonthCells,
  getMonthCellsSunday,
} from "../constants";
import { CALENDAR_ACCENT } from "../sizing";

// Trim each digit's line box to cap height + baseline so flex centring is optical, not font-metric.
const DIGIT_BOX = { textBox: "trim-both cap alphabetic" };

// Weekday header + day cells shared by the Month and Events styles; sizes are design px at scale 1.
const MonthGrid = ({ now, scale, colors, weekStartsOnSunday = false, labelSize, dateSize, pillSize, gap }) => {
  const u = (n) => n * scale;
  const cells = weekStartsOnSunday ? getMonthCellsSunday(now) : getMonthCells(now);
  const labels = weekStartsOnSunday ? WEEKDAY_LABELS_SUNDAY : WEEKDAY_LABELS;
  const isWeekend = (column) => (weekStartsOnSunday ? column === 0 || column === 6 : column >= 5);
  const today = now.getDate();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="grid grid-cols-7 text-center font-semibold leading-none"
        style={{ marginTop: u(gap), fontSize: u(labelSize), color: colors.muted }}
      >
        {labels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr text-center font-semibold leading-none tabular-nums"
        style={{ marginTop: u(gap / 2), fontSize: u(dateSize) }}
      >
        {cells.map((day, index) => (
          <div key={index} className="flex min-h-0 items-center justify-center">
            {day === today ? (
              <span
                className="flex shrink-0 items-center justify-center rounded-full"
                style={{ width: u(pillSize), height: u(pillSize), backgroundColor: CALENDAR_ACCENT, color: "#ffffff" }}
              >
                <span style={DIGIT_BOX}>{day}</span>
              </span>
            ) : (
              <span style={{ ...DIGIT_BOX, color: isWeekend(index % 7) ? colors.muted : colors.text }}>{day}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MonthGrid;
