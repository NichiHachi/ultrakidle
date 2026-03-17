export function getMsUntilNicaraguaMidnight(): number {
  const now = new Date();

  // Create a formatter for Nicaragua time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Managua",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0");

  // Construct current date in Nicaragua
  const year = getPart("year");
  const month = getPart("month") - 1;
  const day = getPart("day");

  // Create a date object for midnight the next day in Nicaragua
  // Note: We use the local computer's context to find the offset difference
  const nicToday = new Date(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Managua",
    }).format(now),
  );

  const nicMidnight = new Date(year, month, day + 1, 0, 0, 0, 0);

  // Calculate the difference by shifting the current time to the target TZ context
  const targetTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Managua" }),
  ).getTime();
  const midnightTime = nicMidnight.getTime();

  return midnightTime - targetTime;
}
