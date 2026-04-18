/** Tabliss-like time-of-day greetings (English, short). */
export function getTablissStyleGreeting(date: Date): string {
  const h = date.getHours()
  if (h >= 5 && h < 12) return "Rise and shine"
  if (h >= 12 && h < 17) return "Good afternoon"
  if (h >= 17 && h < 22) return "Good evening"
  return "Sweet dreams"
}
