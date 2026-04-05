export const daySizing = ({ refSize }) => ({
  dateFontSize: Math.max(24, Math.min(refSize * 0.5, 120)),
  dayFontSize: Math.max(10, Math.min(refSize * 0.22, 32)),
});

export const monthSizing = ({ nodeWidth, nodeHeight, refSize }) => ({
  monthTitleSize: Math.max(5, Math.min(nodeWidth * 0.11, nodeHeight * 0.14, 19)),
  monthWeekdaySize: Math.max(5, Math.min(refSize * 0.06, 13)),
  monthDateSize: Math.max(5, Math.min(refSize * 0.075, 18)),
  monthPillSize: Math.max(5, Math.min(refSize * 0.11, 24)),
  monthPaddingX: Math.max(3, Math.min(refSize * 0.05, 14)),
  monthPaddingTop: Math.max(4, Math.min(refSize * 0.05, 14)),
  monthPaddingBottom: Math.max(3, Math.min(refSize * 0.045, 12)),
  monthGapY: Math.max(0, Math.min(refSize * 0.015, 4)),
  showMonthWeekdays: nodeWidth >= 95 && nodeHeight >= 85,
});

export const eventsSizing = ({ nodeWidth, nodeHeight, refSize }) => ({
  eventPaddingX: Math.max(6, Math.min(nodeWidth * 0.055, 22)),
  eventPaddingY: Math.max(5, Math.min(nodeHeight * 0.085, 18)),
  eventColumnGap: Math.max(6, Math.min(nodeWidth * 0.05, 20)),
  eventSectionGap: Math.max(3, Math.min(nodeHeight * 0.04, 10)),
  eventWeekdaySize: Math.max(7, Math.min(refSize * 0.09, 22)),
  eventDateSize: Math.max(12, Math.min(Math.min(nodeWidth * 0.22, nodeHeight * 0.45), 72)),
  eventMessageSize: Math.max(7, Math.min(refSize * 0.085, 14)),
  eventMonthTitleSize: Math.max(6, Math.min(refSize * 0.075, 16)),
  eventCalendarWeekdaySize: Math.max(5, Math.min(refSize * 0.055, 11)),
  eventCalendarDateSize: Math.max(5, Math.min(refSize * 0.065, 14)),
  eventPillSize: Math.max(7, Math.min(refSize * 0.11, 24)),
  showEventMessage: nodeWidth >= 150 && nodeHeight >= 95,
});

export const themeColors = (theme) => ({
  textColor: theme === "light" ? "#111827" : "#d4d4d8",
  mutedTextColor: theme === "light" ? "#6b7280" : "#a1a1aa",
  eventDividerColor: theme === "light" ? "#e5e7eb" : "#3f3f46",
});
