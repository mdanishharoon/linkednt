// content.ts — all copy + data for the linkedn't landing page.

export type Post = {
  name: string;
  title: string;
  variant?: "" | "b" | "c" | "d";
  time?: string;
  degree?: string;
  slop: string;
  honest: string;
};

export const HERO_POST: Post = {
  name: "Chad Brightwater",
  title: "Visionary Thought Leader | Synergy Architect | We’re hiring!",
  variant: "",
  slop: "I’m incredibly humbled and beyond honored to share that after 9 amazing years, I’ve made the difficult decision to embark on an exciting new chapter. 🙏 Grateful doesn’t even begin to cover it…",
  honest: "I got laid off.",
};

export const POSTS: Post[] = [
  {
    name: "Brenda Sterling",
    title: "Chief Vibes Officer | Keynote Speaker",
    variant: "b",
    time: "4h",
    slop: "Woke up at 4am. Gym. Gratitude journal. Closed a 7-figure deal before most people hit snooze. Discipline beats motivation every single time. 💪",
    honest: "I have no hobbies and I need you to know it.",
  },
  {
    name: "Todd Vanguard",
    title: "Serial Entrepreneur | Investor | Failing Forward",
    variant: "d",
    time: "1d",
    slop: "We didn’t lose the account. We unlocked a powerful lesson in resilience, grit, and the beauty of the journey. Forever grateful. 🙏",
    honest: "We lost the account.",
  },
  {
    name: "Priya Anand",
    title: "Talent Partner | We’re Hiring! 🚀",
    variant: "c",
    time: "6h",
    slop: "Seeking a passionate, self-starting rockstar ninja to wear many hats in our fast-paced, family-like startup. Competitive exposure on offer for the right hustler!",
    honest: "We want one person to do four jobs for free.",
  },
  {
    name: "Marcus Cole",
    title: "Founder | Grindset | Comfort is the enemy",
    variant: "",
    time: "2d",
    slop: "Had to let 30% of the team go today. Hardest decision of my career. But comfort is the enemy of greatness. We move different here. Onward. 🦅",
    honest: "I over-hired and they’re paying for my mistake.",
  },
  {
    name: "Grant Holloway",
    title: "Ex-Google | Ex-Meta | Top Voice",
    variant: "c",
    time: "7h",
    slop: "Humbled and speechless to be named a LinkedIn Top Voice. None of this happens without YOU — my incredible community. We did this together. 🙏✨",
    honest: "I post 6 times a day.",
  },
];

export const PHRASES: [string, string][] = [
  ["“I’m humbled and honored…”", "Look at me."],
  ["“Open to new opportunities”", "I got let go."],
  ["“We’re like a family here”", "We will underpay you."],
  ["“Let’s circle back on this”", "Let’s never discuss this again."],
  ["“Passionate about what I do”", "I answer emails at 11pm."],
  ["“Comfortable wearing many hats”", "Three jobs, one salary."],
  ["“Fast-paced environment”", "Chronically understaffed."],
  ["“Thoughts? 👇”", "Please validate me."],
];

export const FAQS: [string, string][] = [
  [
    "Does the person who posted get notified?",
    "No. The translation happens only on your screen. They keep posting into the void, blissfully unaware that anyone can now read them clearly.",
  ],
  [
    "Is it actually free?",
    "Yes. We translate slop for a living — we don’t sell it. No account, no paywall, no “premium honesty tier.”",
  ],
  [
    "Where does it work?",
    "Your feed, profiles, and messages. Anywhere a “thrilled to announce” is hiding, linkedn’t follows.",
  ],
  [
    "Do you read or store my data?",
    "No. Everything runs locally in your browser. We never see the posts, your account, or your questionable connections.",
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

export const DEMO: Post[] = [
  {
    name: "Dale Pemberton",
    title: "Growth Hacker | Keynote Speaker | Dad",
    time: "3h",
    variant: "d",
    slop: "Reflecting on an incredible quarter of learnings, pivots, and exponential growth. The future is so bright. 📈",
    honest: "The numbers were flat.",
  },
  {
    name: "Janelle Ruiz",
    title: "Founder & CEO | Building in public",
    time: "5h",
    variant: "b",
    slop: "Beyond grateful to my incredible network for all the love on my last post. You all inspire me every single day. 🙏",
    honest: "Please keep engaging with my posts.",
  },
];
