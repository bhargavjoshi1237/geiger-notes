import { CALENDAR_ACCENT } from "../sizing";
import MonthGrid from "./MonthGrid";

// 200 x 200 design canvas: month title over a Monday-first grid with weekends muted.
const MonthStyle = ({ now, scale, colors }) => {
  const u = (n) => n * scale;

  return (
    <div
      className="flex h-full flex-col"
      style={{ padding: `${u(16)}px ${u(14)}px ${u(14)}px` }}
    >
      <p
        className="font-bold leading-none"
        style={{ paddingLeft: u(6), fontSize: u(13), letterSpacing: "0.06em", color: CALENDAR_ACCENT }}
      >
        {now.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
      </p>
      <MonthGrid
        now={now}
        scale={scale}
        colors={colors}
        labelSize={9}
        dateSize={11.5}
        pillSize={20}
        gap={10}
      />
    </div>
  );
};

export default MonthStyle;
