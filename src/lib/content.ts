/*
 * Sahasak Naada — editable content.
 *
 * All unconfirmed values live here as clearly-labelled placeholders so the
 * organizers can replace them in one place. Confirmed facts only:
 *   - Event: Sahasak Naada — inter-school audio workshop
 *   - Host: Radio Electronics Association of D. S. Senanayake College
 *   - Themes: Sound / Science / Creativity
 *   - Hero headline: "The Future of Sound Starts Here"
 * No real dates, venues, fees, contacts or photos have been supplied.
 */

export type NavSection = { label: string; href: string };

export const EVENT = {
  name: "Sahasak Naada",
  edition: "Sahasak Naada '26",
  tagline: "Inter-school audio workshop",
  host: "Radio Electronics Association of D. S. Senanayake College",
  heroHeadline: "The Future of Sound Starts Here",
  heroAccentWord: "Sound",
  heroCopy:
    "Sahasak Naada is an inter-school audio workshop by The Radio Electronics Association of D. S. Senanayake College — bringing students together to explore sound, audio technology and creativity.",
  /** WhatsApp group invite link shown after a school registers. Leave empty until the organizers supply it. */
  whatsappGroupUrl: "https://chat.whatsapp.com/BF0zJgiSR8b6BPAiKCRcZB",
  /** Approved official event logo */
  logoUrl:
    "https://vibe.filesafe.space/1792255075376368762/attachments/a5dfb02f-b950-4856-8229-19cd618d2205.png",
};

export const NAV_SECTIONS: NavSection[] = [
  { label: "Themes", href: "/#themes" },
  { label: "Gallery", href: "/#gallery" },
  { label: "Agenda", href: "/#agenda" },
  { label: "Team", href: "/#team" },
  { label: "FAQ", href: "/#faq" },
];

export type ThemeWord = {
  word: string;
  /** white vs gold emphasis */
  emphasis: "white" | "gold";
  /** horizontal stagger in rem on desktop (paddingLeft inside a w-full row) */
  offset: number;
  /** horizontal stagger in rem on mobile — small so CREATIVITY never clips */
  mobileOffset: number;
};

export const THEMES: ThemeWord[] = [
  { word: "SOUND", emphasis: "white", offset: 0, mobileOffset: 0 },
  { word: "SCIENCE", emphasis: "gold", offset: 4, mobileOffset: 0.5 },
  { word: "CREATIVITY", emphasis: "white", offset: 8, mobileOffset: 1 },
];

export type GalleryItem = {
  id: string;
  title: string;
  caption: string;
  /** Approved photo URL — replace placeholder once assets are supplied. */
  src: string | null;
  alt: string;
};

export const GALLERY: GalleryItem[] = [
  {
    id: "g1",
    title: "Association delegation",
    caption: "Intra-school workshop session at D. S. Senanayake College",
    src: "https://vibe.filesafe.space/1792255075376368762/attachments/1b393843-7b24-412a-9889-275305f60e89.jpg",
    alt: "Radio Electronics Association students and instructor gathered after an intra-school session at D. S. Senanayake College",
  },
  {
    id: "g6",
    title: "On stage at Sahasak Naada",
    caption: "An earlier edition of the workshop",
    src: "/gallery/stage-1.jpg",
    alt: "Association members in school blazers on stage beside a presenter with a microphone, in front of a Sahasak Naada backdrop",
  },
  {
    id: "g2",
    title: "Audio engineering session",
    caption: "Live console training and sound technology demonstration",
    src: "https://vibe.filesafe.space/1792255075376368762/attachments/fda2f282-cac4-43f6-98f8-45150a26b313.jpg",
    alt: "Instructor demonstrating live mixing console techniques to students during an audio workshop",
  },
  {
    id: "g7",
    title: "Presenting the team",
    caption: "Introductions on stage",
    src: "/gallery/stage-2.jpg",
    alt: "A presenter with a microphone introducing association members lined up on stage beside a projection screen",
  },
  {
    id: "g3",
    title: "Student audience",
    caption: "Listening to the sound theory and acoustics lecture",
    src: "https://vibe.filesafe.space/1792255075376368762/attachments/61fa87e9-52aa-43af-80fb-9dad013b6ed5.jpg",
    alt: "Students seated in the hall attentively following the audio workshop lecture",
  },
  {
    id: "g8",
    title: "In the hall",
    caption: "A full house for the session",
    src: "/gallery/hall-1.jpg",
    alt: "A classroom hall full of seated students facing a speaker at a lectern and a projection screen",
  },
  {
    id: "g4",
    title: "Hands-on participation",
    caption: "Junior and senior members in the workshop auditorium",
    src: "https://vibe.filesafe.space/1792255075376368762/attachments/38c1f4af-493e-4b0a-aaf4-7b6a63cc4c48.jpg",
    alt: "School participants seated during an intra-school audio workshop session",
  },
  {
    id: "g9",
    title: "Listening in",
    caption: "Students following the session",
    src: "/gallery/audience-1.jpg",
    alt: "A man in a white shirt and seated students listening attentively during a workshop session",
  },
  {
    id: "g5",
    title: "Professional mixing desk",
    caption: "Digital audio console and tablet interface in the workshop hall",
    src: "https://vibe.filesafe.space/1792255075376368762/attachments/f740b9e2-75a6-4b78-9b59-1bcf707a789e.jpg",
    alt: "Close-up of a digital audio mixing desk with tablet monitor set up for the workshop",
  },
];

export type AgendaEntry = {
  id: string;
  item: string;
  time: string;
  /** "placeholder" entries are clearly labelled, not presented as final. */
  isPlaceholder: boolean;
};

/** Agenda to be confirmed by organizers — placeholder shown until supplied. */
export const AGENDA: AgendaEntry[] = [
  { id: "a1", item: "Agenda to be announced", time: "—", isPlaceholder: true },
];

export type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  isPlaceholder: boolean;
};

/** Answers not confirmed by organizers — labelled placeholders, not invented facts. */
export const FAQS: FaqEntry[] = [
  {
    id: "f1",
    question: "Who can register?",
    answer: "The workshop is open to students from any school, providing an opportunity to learn and engage with audio technology.",
    isPlaceholder: false,
  },
  {
    id: "f2",
    question: "Is there a registration fee?",
    answer: "No. Participation in the workshop is completely free of charge.",
    isPlaceholder: false,
  },
  {
    id: "f3",
    question: "Where and when does the workshop take place?",
    answer: "The workshop will be held on 13 November at D. S. Senanayake College.",
    isPlaceholder: false,
  },
  {
    id: "f4",
    question: "What should I bring?",
    answer: "Participants are advised to bring their own note-taking materials to record key information and insights during the sessions.",
    isPlaceholder: false,
  },
  {
    id: "f5",
    question: "How will I know my registration is confirmed?",
    answer: "Registered participants will be contacted via WhatsApp message or phone call to confirm their registration.",
    isPlaceholder: false,
  },
];

export type FooterLink = { label: string; href: string | null };

export const FOOTER_SOCIALS: FooterLink[] = [
  { label: "Instagram", href: null },
  { label: "Facebook", href: null },
  { label: "YouTube", href: null },
];

/** Copyright year — replace with the confirmed edition year once supplied. */
export const COPYRIGHT_YEAR = "—";

/*
 * Registration form field configuration.
 * Organizers must confirm which fields are included and required.
 */
export type FieldKey = "fullName" | "school" | "grade" | "email" | "phone" | "notes";

export type FieldDef = {
  key: FieldKey;
  label: string;
  hint?: string;
  type: "text" | "email" | "tel";
  required: boolean;
  maxLength: number;
};

export const REG_FIELDS: FieldDef[] = [
  { key: "fullName", label: "Full name", type: "text", required: true, maxLength: 80 },
  { key: "school", label: "School", type: "text", required: true, maxLength: 120 },
  { key: "grade", label: "Grade / year", type: "text", required: true, maxLength: 20 },
  { key: "email", label: "Email", type: "email", required: true, maxLength: 120 },
  { key: "phone", label: "Contact number", type: "tel", required: true, maxLength: 20 },
  {
    key: "notes",
    label: "Anything else we should know? (optional)",
    type: "text",
    required: false,
    maxLength: 300,
  },
];

/** The team behind the workshop (top board photo). Replace the file in public/team to update it. */
export const TEAM = {
  photoUrl: "/team/top-board.jpg",
  width: 2000,
  height: 1500,
  alt: "The top board of The Radio Electronics Association of D. S. Senanayake College in school blazers, standing and seated in front of a statue in the school grounds",
  caption: "The top board of The Radio Electronics Association of D. S. Senanayake College",
};
