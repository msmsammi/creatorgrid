export type Status = "idea" | "drafting" | "production" | "review" | "scheduled" | "published";
export type ContentItem = { id: number; title: string; brand: string; type: string; status: Status; owner: string; initials: string; date: string; color: string; tags: string[]; description: string; views?: number; likes?: number };

export const stages: { id: Status; label: string; tone: string }[] = [
  { id: "idea", label: "Ideas", tone: "stone" },
  { id: "drafting", label: "Drafting", tone: "blue" },
  { id: "production", label: "In production", tone: "violet" },
  { id: "review", label: "In review", tone: "amber" },
  { id: "scheduled", label: "Scheduled", tone: "teal" },
  { id: "published", label: "Published", tone: "green" },
];

export const demoItems: ContentItem[] = [
  { id: 1, title: "The 5-minute Sunday reset that changed my week", brand: "Good Things Studio", type: "YouTube video", status: "production", owner: "Maya Chen", initials: "MC", date: "2026-10-19", color: "peach", tags: ["evergreen", "series 02"], description: "A warm, practical walkthrough of the five-minute ritual that makes Monday feel lighter.", views: 18400, likes: 1260 },
  { id: 2, title: "Small rituals, big creative energy", brand: "The Open Tab", type: "Podcast episode", status: "review", owner: "Alex Rivera", initials: "AR", date: "2026-10-20", color: "lilac", tags: ["episode 48", "interview"], description: "A conversation about sustainable creative habits and making room for the work that matters." },
  { id: 3, title: "A desk that makes you want to begin", brand: "Good Things Studio", type: "Instagram carousel", status: "scheduled", owner: "Jo Park", initials: "JP", date: "2026-10-21", color: "sage", tags: ["studio notes"], description: "Six small details that turn a desk into an invitation to make something." },
  { id: 4, title: "What I learned from a year of slow growth", brand: "The Open Tab", type: "Newsletter", status: "drafting", owner: "Maya Chen", initials: "MC", date: "2026-10-22", color: "butter", tags: ["reflection"], description: "An honest look at an unhurried year, what compounded, and what was worth letting go." },
  { id: 5, title: "Three camera angles for a calmer vlog", brand: "Good Things Studio", type: "YouTube Short", status: "idea", owner: "Jo Park", initials: "JP", date: "2026-10-23", color: "blue", tags: ["quick tip"], description: "A simple visual recipe for filming a day without turning it into a production." },
  { id: 6, title: "The Sunday table: autumn edition", brand: "Good Things Studio", type: "TikTok video", status: "production", owner: "Sam Okafor", initials: "SO", date: "2026-10-24", color: "rose", tags: ["seasonal", "series 02"], description: "A quiet, cinematic meal prep ritual with ambient kitchen sound." },
  { id: 7, title: "Making space for unfinished ideas", brand: "The Open Tab", type: "Podcast episode", status: "published", owner: "Alex Rivera", initials: "AR", date: "2026-10-15", color: "lavender", tags: ["episode 47"], description: "Why the notes app full of half-thoughts might be your best creative tool.", views: 32500, likes: 2840 },
  { id: 8, title: "Five things I stopped buying for my studio", brand: "Good Things Studio", type: "Instagram reel", status: "published", owner: "Jo Park", initials: "JP", date: "2026-10-12", color: "mint", tags: ["studio notes"], description: "A practical, low-waste refresh for a creative workspace.", views: 27800, likes: 1930 },
  { id: 9, title: "A gentle guide to starting over", brand: "The Open Tab", type: "Newsletter", status: "idea", owner: "Maya Chen", initials: "MC", date: "2026-10-28", color: "butter", tags: ["personal"], description: "A note to readers about returning to a practice after a long pause." },
  { id: 10, title: "Make a tiny trailer for a big idea", brand: "Good Things Studio", type: "YouTube video", status: "drafting", owner: "Sam Okafor", initials: "SO", date: "2026-10-26", color: "peach", tags: ["tutorial"], description: "A fast guide to making a small, compelling teaser that makes people curious." },
  { id: 11, title: "Creator check-in: October", brand: "The Open Tab", type: "Instagram story", status: "scheduled", owner: "Alex Rivera", initials: "AR", date: "2026-10-25", color: "sage", tags: ["community"], description: "A question-led story inviting listeners to share what they are making this month." },
  { id: 12, title: "A playlist for getting unstuck", brand: "Good Things Studio", type: "Newsletter", status: "review", owner: "Maya Chen", initials: "MC", date: "2026-10-27", color: "lilac", tags: ["community", "resource"], description: "A collection of sounds and tiny prompts for the days when the blank page feels loud." },
];

export const team = [
  { name: "Maya Chen", initials: "MC", role: "Owner", color: "avatar-peach" },
  { name: "Alex Rivera", initials: "AR", role: "Editor", color: "avatar-lilac" },
  { name: "Jo Park", initials: "JP", role: "Contributor", color: "avatar-sage" },
  { name: "Sam Okafor", initials: "SO", role: "Contributor", color: "avatar-blue" },
];

export const demoComments = [
  { author: "Alex Rivera", initials: "AR", date: "Today, 10:42 AM", text: "The opening feels really natural. Could we bring the example about the Sunday list into the first minute?" },
  { author: "Jo Park", initials: "JP", date: "Yesterday, 4:18 PM", text: "Thumbnail selects are in the asset shelf. I left three options and marked my favorite." },
];

export const demoAssets = [
  { name: "sunday-reset-cover.jpg", kind: "Image", size: "2.4 MB", date: "Oct 16", color: "asset-peach" },
  { name: "episode-48-final.wav", kind: "Audio", size: "48.2 MB", date: "Oct 15", color: "asset-lilac" },
  { name: "studio-broll-selects", kind: "Folder", size: "12 files", date: "Oct 14", color: "asset-sage" },
  { name: "autumn-colour-notes.pdf", kind: "Document", size: "840 KB", date: "Oct 12", color: "asset-butter" },
];
