// content.ts — all copy + data for the linkedn't landing page.

export type Post = {
  name: string;
  title: string;
  variant?: "" | "b" | "c" | "d";
  time?: string;
  degree?: string;
  avatar?: string;
  /** Render the avatar with inverted colors (see: enigmatic pokemon). */
  avatarInvert?: boolean;
  slop: string;
  honest: string;
};

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=100&h=100&fit=crop&crop=faces&auto=format&q=60`;

// The three rewrite voices, exactly as they appear in the extension popup.
export type VoiceId = "roast" | "summarise" | "strip";

export type Voice = { id: VoiceId; label: string; blurb: string };

export const VOICES: Voice[] = [
  {
    id: "roast",
    label: "The Group Chat",
    blurb: "How this post reads when it's screenshotted into the group chat.",
  },
  {
    id: "summarise",
    label: "Touch Grass",
    blurb: "Plain English for people who go outside.",
  },
  {
    id: "strip",
    label: "TL;DR",
    blurb: "What happened, in one line. No lessons learned.",
  },
];

export type DemoPost = Omit<Post, "honest"> & {
  honest: Record<VoiceId, string>;
};

export const HERO_POST: Post = {
  name: "Chad Brightwater",
  title: "Visionary Thought Leader | Synergy Architect | We’re hiring!",
  variant: "",
  avatar: unsplash("1507003211169-0a1dd7228f2d"),
  slop: "I’m incredibly humbled and beyond honored to share that after 9 amazing years, I’ve made the difficult decision to embark on an exciting new chapter. 🙏 Grateful doesn’t even begin to cover it…",
  honest: "I got laid off.",
};

// Leads the hero deck. The first thing a visitor sees is a color-inverted
// Psyduck saying the same sentence twice.
export const POKEMON_POST: Post = {
  name: "enigmatic pokemon",
  title: "First-Principles Thinker | Angel Investor",
  variant: "d",
  time: "11h",
  avatar:
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/54.png",
  avatarInvert: true,
  slop: "People who don’t know what they want end up wanting an average of what everyone around them wants.\n\nA corollary of this is that people whose wants are the average of people around them don’t know what they want.",
  honest: "I said the same sentence twice and called it a corollary.",
};

// The single demo post for the How section. One honest version per voice,
// written in each voice's register: roast is first-person inner monologue,
// summarise is plain English, strip is one bare line.
export const DEMO_POST: DemoPost = {
  name: "Dale Pemberton",
  title: "Growth Hacker | Keynote Speaker | Dad",
  time: "3h",
  variant: "d",
  avatar: unsplash("1544723795-3fb6469f5b39"),
  slop: "Reflecting on an incredible quarter of learnings, pivots, and exponential growth. The future is so bright. 📈",
  honest: {
    roast:
      "The numbers were flat, the “pivots” were panic, and I typed 📈 over a chart that goes sideways. Nobody checks.",
    summarise: "Our quarter didn’t go to plan, and growth was flat.",
    strip: "The numbers were flat.",
  },
};

// The swipeable gallery deck. Placeholder satire for now; to be replaced
// with real-life examples.
export const POSTS: Post[] = [
  {
    name: "Brenda Sterling",
    title: "Chief Vibes Officer | Keynote Speaker",
    variant: "b",
    time: "4h",
    avatar: unsplash("1494790108377-be9c29b29330"),
    slop: "Woke up at 4am. Gym. Gratitude journal. Closed a 7-figure deal before most people hit snooze. Discipline beats motivation every single time. 💪",
    honest: "The deal was $1,100 and I cried in the gym parking lot.",
  },
  {
    name: "Todd Vanguard",
    title: "Serial Entrepreneur | Investor | Failing Forward",
    variant: "d",
    time: "1d",
    avatar: unsplash("1472099645785-5658abf4ff4e"),
    slop: "We didn’t lose the account. We unlocked a powerful lesson in resilience, grit, and the beauty of the journey. Forever grateful. 🙏",
    honest: "We lost the account because I forgot the client’s name on the call.",
  },
  {
    name: "Derek Falworth",
    title: "Sales Director | Girl Dad | Coffee Enthusiast",
    variant: "",
    time: "9h",
    avatar: unsplash("1500648767791-00dcc994a43e"),
    slop: "Yesterday my 4-year-old refused to eat her broccoli. What happened next was a masterclass in B2B negotiation. A thread on closing deals, from someone who closes bedtime. 🧵👇",
    honest: "I used my child for engagement. She gets nothing.",
  },
  {
    name: "Priya Anand",
    title: "Talent Partner | We’re Hiring! 🚀",
    variant: "c",
    time: "6h",
    avatar: unsplash("1573496359142-b8d87734a5a2"),
    slop: "Seeking a passionate, self-starting rockstar ninja to wear many hats in our fast-paced, family-like startup. Competitive exposure on offer for the right hustler!",
    honest: "Four jobs, one “salary”. The last hire lasted nine days.",
  },
  {
    name: "Marcus Cole",
    title: "Founder | Grindset | Comfort is the enemy",
    variant: "",
    time: "2d",
    avatar: unsplash("1560250097-0b93528c311a"),
    slop: "Had to let 30% of the team go today. Hardest decision of my career. But comfort is the enemy of greatness. We move different here. Onward. 🦅",
    honest: "I bought a boat in March.",
  },
  {
    name: "Julian Moss",
    title: "Mindset Architect | Author of “The Grind Within”",
    variant: "",
    time: "1d",
    avatar: unsplash("1633332755192-727a05c4013d"),
    slop: "Hard work beats talent when talent doesn’t work hard. But talent that works hard beats hard work without talent. Read that again. 🧠",
    honest: "Read that again. It still says nothing.",
  },
  {
    name: "Colleen Vance",
    title: "Head of Talent | Hiring Differently",
    variant: "b",
    time: "5h",
    avatar: unsplash("1438761681033-6461ffad8d80"),
    slop: "A candidate showed up 3 minutes late to our interview yesterday. I hired them on the spot. Here’s why that broke every rule in my hiring playbook 🧵",
    honest: "There was no candidate. There is no playbook.",
  },
  {
    name: "Grant Holloway",
    title: "Ex-Google | Ex-Meta | Top Voice",
    variant: "c",
    time: "7h",
    avatar: unsplash("1519085360753-af0119f7cbe7"),
    slop: "Humbled and speechless to be named a LinkedIn Top Voice. None of this happens without YOU — my incredible community. We did this together. 🙏✨",
    honest: "I post six times a day and my last real conversation was in 2019.",
  },
];

export const PHRASES: [string, string][] = [
  ["“I’m humbled and honored…”", "Look at me."],
  ["“Open to new opportunities”", "Unemployed since March."],
  ["“We’re like a family here”", "You will cry in the bathroom."],
  ["“Let’s circle back on this”", "I am begging you to forget this."],
  ["“Passionate about what I do”", "My job is my entire personality."],
  ["“Comfortable wearing many hats”", "Three jobs, one salary."],
  ["“Fast-paced environment”", "You’ll find out why the role is open."],
  ["“Thoughts? 👇”", "I am so alone."],
];

export const FAQS: [string, string][] = [
  [
    "Does the person who posted get notified?",
    "No. The translation happens only on your screen. They keep posting into the void, blissfully unaware that anyone can now read them clearly.",
  ],
  [
    "What does it cost?",
    "Your first 30 rewrites are free once you sign in. After that, credit packs start at $4, or you can bring your own API key and skip our servers entirely. No subscription either way.",
  ],
  [
    "Where does it work?",
    "On linkedin.com. A Deslop button appears under each post in your feed; one click translates it in place, and “Show original” puts the slop back.",
  ],
  [
    "Do you read or store my data?",
    "If you bring your own key, post text goes straight from your browser to your provider and we never see it. On credits, our server produces the rewrite and keeps only a hash for caching, never the plaintext. The privacy policy says all of this in even plainer English.",
  ],
  [
    "Could this get me in trouble at work?",
    "Only if you start replying with the translations out loud. We handle the honesty; restraint is on you.",
  ],
];

export const BUZZ: string[] = [
  "synergy",
  "thought leader",
  "humbled",
  "circle back",
  "low-hanging fruit",
  "move the needle",
  "blessed",
  "rockstar",
  "disrupt",
  "ninja",
  "growth mindset",
  "grateful",
  "hustle",
  "north star",
  "deep dive",
  "boil the ocean",
  "learnings",
  "thrilled to announce",
];
