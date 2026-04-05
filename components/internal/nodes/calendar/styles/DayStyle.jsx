import { daySizing } from "../sizing";

const DayStyle = ({ width, height, theme }) => {
  const nodeWidth = Math.max(width || 100, 50);
  const nodeHeight = Math.max(height || 200, 50);
  const refSize = Math.min(nodeWidth, nodeHeight);

  const { dateFontSize, dayFontSize } = daySizing({ refSize });

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <p
        className="font-sf text-red-500 font-bold"
        style={{ fontSize: `${dayFontSize}px`, lineHeight: 1.2 }}
      >
        {new Date().toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
      </p>
      <p
        className="font-sf leading-none"
        style={{
          fontSize: `${dateFontSize}px`,
          lineHeight: 1,
          color: theme === "light" ? "#000000" : "#ffffff",
        }}
      >
        {new Date().getDate()}
      </p>
    </div>
  );
};

export default DayStyle;
