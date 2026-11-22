import { calendarRadius, calendarScale, themeColors } from "./sizing";
import DayStyle from "./styles/DayStyle";
import MonthStyle from "./styles/MonthStyle";
import EventsStyle from "./styles/EventsStyle";

const STYLE_COMPONENTS = { default: DayStyle, simple: MonthStyle, blank: EventsStyle };

// Themed widget surface rendering the active style at a uniform scale of its design canvas; the caller positions it.
const CalendarFace = ({ calendarStyle, theme, backgroundColor, width, height, now, className = "relative", style }) => {
  const scale = calendarScale(calendarStyle, width, height);
  const colors = themeColors(theme);
  const Style = STYLE_COMPONENTS[calendarStyle] || DayStyle;

  return (
    <div
      className={`overflow-hidden select-none font-sf ${className}`}
      style={{ borderRadius: calendarRadius(scale), backgroundColor: backgroundColor || colors.surface, ...style }}
    >
      <Style now={now} scale={scale} colors={colors} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ borderRadius: "inherit", boxShadow: `inset 0 0 0 1px ${colors.hairline}` }}
      />
    </div>
  );
};

export default CalendarFace;
