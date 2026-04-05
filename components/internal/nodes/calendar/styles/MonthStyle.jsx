import { WEEKDAY_LABELS } from "../constants";
import { monthSizing, themeColors } from "../sizing";

const MonthStyle = ({ width, height, theme }) => {
  const nodeWidth = Math.max(width || 200, 50);
  const nodeHeight = Math.max(height || 200, 50);
  const refSize = Math.min(nodeWidth, nodeHeight);
  const now = new Date();

  const {
    monthTitleSize,
    monthWeekdaySize,
    monthDateSize,
    monthPillSize,
    monthPaddingX,
    monthPaddingTop,
    monthPaddingBottom,
    monthGapY,
    showMonthWeekdays,
  } = monthSizing({ nodeWidth, nodeHeight, refSize });

  const { textColor, mutedTextColor } = themeColors(theme);

  const monthLabel = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const monthCells = (() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (monthStart.getDay() + 6) % 7;
    const cells = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  return (
    <div
      className="h-full w-full min-h-0 flex flex-col"
      style={{
        paddingTop: `${monthPaddingTop}px`,
        paddingLeft: `${monthPaddingX}px`,
        paddingRight: `${monthPaddingX}px`,
        paddingBottom: `${monthPaddingBottom}px`,
      }}
    >
      <p
        className="font-sf text-red-500 font-bold leading-none"
        style={{ fontSize: `${monthTitleSize}px`, letterSpacing: "0.04em" }}
      >
        {monthLabel}
      </p>

      {showMonthWeekdays && (
        <div
          className="grid grid-cols-7 text-center font-sf font-semibold"
          style={{
            marginTop: `${Math.max(2, monthPaddingTop * 0.45)}px`,
            fontSize: `${monthWeekdaySize}px`,
            color: mutedTextColor,
            lineHeight: 1,
          }}
        >
          {WEEKDAY_LABELS.map((label, index) => (
            <p key={`${label}-${index}`}>{label}</p>
          ))}
        </div>
      )}

      <div
        className="mt-1 grid flex-1 auto-rows-fr grid-cols-7 text-center font-sf font-semibold min-h-0"
        style={{
          rowGap: `${monthGapY}px`,
          fontSize: `${monthDateSize}px`,
          color: textColor,
          lineHeight: 1,
        }}
      >
        {monthCells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} className="min-h-0" />;
          const isToday = day === now.getDate();
          return (
            <div key={`day-${day}`} className="flex items-center justify-center min-h-0">
              {isToday ? (
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: `${monthPillSize}px`,
                    height: `${monthPillSize}px`,
                    backgroundColor: "#ef4444",
                    color: "#ffffff",
                  }}
                >
                  {day}
                </span>
              ) : (
                <span>{day}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthStyle;
