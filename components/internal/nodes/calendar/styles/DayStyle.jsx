import { CALENDAR_ACCENT } from "../sizing";

// 200 x 200 design canvas: weekday over a large date, centred.
const DayStyle = ({ now, scale, colors }) => {
  const u = (n) => n * scale;

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <p
        className="font-semibold leading-none"
        style={{ fontSize: u(26), letterSpacing: "0.04em", color: CALENDAR_ACCENT }}
      >
        {now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
      </p>
      <p
        className="leading-none tabular-nums"
        style={{ marginTop: u(4), fontSize: u(104), letterSpacing: "-0.03em", color: colors.date }}
      >
        {now.getDate()}
      </p>
    </div>
  );
};

export default DayStyle;
