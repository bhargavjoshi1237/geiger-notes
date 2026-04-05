import { WEEKDAY_LABELS_SUNDAY } from "../constants";
import { eventsSizing, themeColors } from "../sizing";

const EventsStyle = ({ width, height, theme }) => {
  const nodeWidth = Math.max(width || 200, 50);
  const nodeHeight = Math.max(height || 200, 50);
  const refSize = Math.min(nodeWidth, nodeHeight);
  const now = new Date();

  const {
    eventPaddingX,
    eventPaddingY,
    eventColumnGap,
    eventSectionGap,
    eventWeekdaySize,
    eventDateSize,
    eventMessageSize,
    eventMonthTitleSize,
    eventCalendarWeekdaySize,
    eventCalendarDateSize,
    eventPillSize,
    showEventMessage,
  } = eventsSizing({ nodeWidth, nodeHeight, refSize });

  const { textColor, mutedTextColor, eventDividerColor } = themeColors(theme);
  const eventMonthLabel = now.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const eventWeekdayLabel = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

  const eventMonthCells = (() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = monthStart.getDay();
    const cells = Array(startOffset).fill(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  return (
    <div
      className="h-full w-full min-h-0 grid grid-cols-[1.1fr_0.9fr]"
      style={{
        paddingLeft: `${eventPaddingX}px`,
        paddingRight: `${eventPaddingX}px`,
        paddingTop: `${eventPaddingY}px`,
        paddingBottom: `${eventPaddingY}px`,
        columnGap: `${eventColumnGap}px`,
      }}
    >
      <div className="flex min-h-0 flex-col">
        <p
          className="font-sf text-red-500 font-bold leading-none"
          style={{ fontSize: `${eventWeekdaySize}px`, letterSpacing: "0.04em" }}
        >
          {eventWeekdayLabel}
        </p>
        <p
          className="font-sf leading-none"
          style={{
            marginTop: `${Math.max(2, eventSectionGap)}px`,
            fontSize: `${eventDateSize}px`,
            color: theme === "light" ? "#000000" : "#ffffff",
          }}
        >
          {now.getDate()}
        </p>

        {showEventMessage && (
          <p
            className="font-sf mt-auto leading-none"
            style={{
              fontSize: `${eventMessageSize}px`,
              color: mutedTextColor,
            }}
          >
            No events today
          </p>
        )}
      </div>
      
      <div
        className="min-h-0 flex flex-col"
        style={{
          borderLeft: `1px solid ${eventDividerColor}`,
          paddingLeft: `${Math.max(5, eventPaddingX - 2)}px`,
        }}
      >
        <p
          className="font-sf text-red-500 font-bold leading-none"
          style={{ fontSize: `${eventMonthTitleSize}px`, letterSpacing: "0.04em" }}
        >
          {eventMonthLabel}
        </p>

        <div
          className="mt-1 grid grid-cols-7 text-center font-sf font-semibold"
          style={{
            fontSize: `${eventCalendarWeekdaySize}px`,
            color: mutedTextColor,
            lineHeight: 1,
          }}
        >
          {WEEKDAY_LABELS_SUNDAY.map((label, index) => (
            <p key={`${label}-${index}`}>{label}</p>
          ))}
        </div>

        <div
          className="mt-1 grid flex-1 auto-rows-fr grid-cols-7 text-center font-sf font-semibold min-h-0"
          style={{
            fontSize: `${eventCalendarDateSize}px`,
            color: textColor,
            lineHeight: 1,
          }}
        >
          {eventMonthCells.map((day, index) => {
            if (!day) return <div key={`event-empty-${index}`} className="min-h-0" />;
            const isToday = day === now.getDate();
            return (
              <div key={`event-day-${day}`} className="flex min-h-0 items-center justify-center">
                {isToday ? (
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: `${eventPillSize}px`,
                      height: `${eventPillSize}px`,
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
    </div>
  );
};

export default EventsStyle;
