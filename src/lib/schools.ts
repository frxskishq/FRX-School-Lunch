/** Schools we deliver to, each with a single fixed lunch day (0=Sun..6=Sat). */
export const SCHOOLS = [
  { id: "hemingway", name: "Hemingway School", day: 3, dayName: "Wednesday" },
  { id: "community", name: "Community School", day: 5, dayName: "Friday" },
] as const;
export type School = (typeof SCHOOLS)[number];
export const schoolById = (id?: string | null): School | undefined => SCHOOLS.find(s => s.id === id);
/** The school whose lunch day this date falls on (each date maps to one school). */
export const schoolForDate = (date: string) => SCHOOLS.find(s => s.day === new Date(date + "T12:00:00Z").getUTCDay());
