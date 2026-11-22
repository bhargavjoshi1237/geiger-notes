// Reactions are stored on nodes and sent over live sessions as Lucide icon names ("ThumbsUp").
// Older boards and clients used native emoji (and the reaction plug used word labels); they map here.

export const LEGACY_REACTIONS = {
  "👍": "ThumbsUp",
  "👎": "ThumbsDown",
  "❤️": "Heart",
  "😂": "Laugh",
  "😮": "Sparkles",
  "🎉": "PartyPopper",
  "🔥": "Flame",
  "👀": "Eye",
  "✅": "CircleCheck",
  "❓": "CircleQuestionMark",
  "💡": "Lightbulb",
  "🙌": "HandHeart",
  "👏": "Hand",
  "🤔": "Brain",
  "🚀": "Rocket",
  Like: "ThumbsUp",
  Love: "Heart",
  Laugh: "Laugh",
  Wow: "Sparkles",
  Sad: "Frown",
  Angry: "Angry",
  Celebrate: "PartyPopper",
  Fire: "Flame",
};

const ICON_NAME = /^[A-Z][A-Za-z0-9]{1,48}$/;

// The Lucide icon name a stored reaction key stands for.
export function reactionName(key) {
  return LEGACY_REACTIONS[key] || key;
}

// Accepts icon names and the legacy emoji, so live payloads from older clients still land.
export function isReactionKey(key) {
  return typeof key === "string" && (ICON_NAME.test(key) || key in LEGACY_REACTIONS);
}
