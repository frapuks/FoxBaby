export type AvatarOption = { id: string; emoji: string; label: string };

export const AVATARS: AvatarOption[] = [
  { id: "fox", emoji: "🦊", label: "Renard" },
  { id: "lion", emoji: "🦁", label: "Lion" },
  { id: "bear", emoji: "🐻", label: "Ours" },
  { id: "panda", emoji: "🐼", label: "Panda" },
  { id: "tiger", emoji: "🐯", label: "Tigre" },
  { id: "koala", emoji: "🐨", label: "Koala" },
  { id: "cat", emoji: "🐱", label: "Chat" },
  { id: "dog", emoji: "🐶", label: "Chien" },
  { id: "penguin", emoji: "🐧", label: "Pingouin" },
  { id: "owl", emoji: "🦉", label: "Hibou" },
];

export const DEFAULT_AVATAR = "🦊";
