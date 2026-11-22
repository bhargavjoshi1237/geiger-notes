import { CALENDAR_ACCENT } from "../sizing";
import MonthGrid from "./MonthGrid";

// 400 x 200 design canvas: today on the left, a Sunday-first mini month on the right.
const EventsStyle = ({ now, scale, colors }) => {
  const u = (n) => n * scale;

  return (
    <div className="flex h-full" style={{ padding: u(16) }}>
      <div className="flex min-w-0 flex-1 flex-col" style={{ paddingRight: u(16) }}>
        <p
          className="font-bold leading-none"
          style={{ fontSize: u(12), letterSpacing: "0.06em", color: CALENDAR_ACCENT }}
        >
          {now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()}
        </p>
        <p
          className="leading-none tabular-nums"
          style={{ marginTop: u(6), fontSize: u(64), letterSpacing: "-0.03em", color: colors.date }}
        >
          {now.getDate()}
        </p>
        <p className="mt-auto leading-none" style={{ fontSize: u(12), color: colors.muted }}>
          No events today
        </p>
      </div>

      <div className="shrink-0" style={{ width: Math.max(1, u(1)), backgroundColor: colors.divider }} />

      <div className="flex min-w-0 flex-1 flex-col" style={{ paddingLeft: u(14) }}>
        <p
          className="font-bold leading-none"
          style={{ paddingLeft: u(5), fontSize: u(10), letterSpacing: "0.06em", color: CALENDAR_ACCENT }}
        >
          {now.toLocaleDateString("en-US", { month: "long" }).toUpperCase()}
        </p>
        <MonthGrid
          now={now}
          scale={scale}
          colors={colors}
          weekStartsOnSunday
          labelSize={8}
          dateSize={10.5}
          pillSize={17}
          gap={8}
        />
      </div>
    </div>
  );
};

export default EventsStyle;
