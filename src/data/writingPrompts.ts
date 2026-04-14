/** FNV-1a 32-bit, returns unsigned integer */
function fnv1a32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const WRITING_PROMPTS: readonly string[] = [
  "What felt unexpectedly good today?",
  "One small win you want to remember.",
  "Something you’re putting off—what’s the tiniest first step?",
  "A conversation that stuck with you (good or hard).",
  "What would you tell your past self from one month ago?",
  "A place (real or imagined) where you felt calm.",
  "One boundary you respected today—or wish you had.",
  "Something you’re grateful for that usually goes unmentioned.",
  "A fear that showed up—what did it want you to know?",
  "The best use of 20 minutes you had recently.",
  "Someone you appreciate—what specifically do they do?",
  "A mistake you’re ready to forgive yourself for.",
  "What energized you? What drained you?",
  "A song, book, or show on your mind—why?",
  "If today were a weather report, what would it be?",
  "One thing you learned this week, even if tiny.",
  "What do you need more of right now: rest, play, focus, or connection?",
  "A decision you’re sitting with—what are the tradeoffs?",
  "Describe today in three concrete images.",
  "What are you proud of that nobody saw?",
  "A habit you’re building—what’s working?",
  "Something you want to say “no” to more often.",
  "A moment you felt out of sync—what would repair look like?",
  "Who made you laugh or smile recently?",
  "What would make tomorrow 5% easier?",
  "A worry you can park until next week—write it a short note.",
  "Something beautiful you noticed (light, texture, sound).",
  "A goal that’s quietly changing shape—how?",
  "What did your body tell you today?",
  "One compliment you’d give yourself if you were your own friend.",
] as const;

export function getPromptForDay(todayIso: string, userId: string): string {
  const n = WRITING_PROMPTS.length;
  if (n === 0) return "";
  const seed = `${todayIso}\0${userId}`;
  const idx = fnv1a32(seed) % n;
  return WRITING_PROMPTS[idx] ?? "";
}
