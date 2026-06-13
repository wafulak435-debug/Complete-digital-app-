import { Book, Badge, Devotional, CommunityMessage, MemberUploadRequest } from "./types";

export const INITIAL_BOOKS: Book[] = [];

export const BADGES: Badge[] = [
  { id: "badge_1", name: "Fiction Explorer", description: "Read at least 10 minutes of fictional African literature.", icon: "📚", category: "Fiction" },
  { id: "badge_2", name: "Early Devoted", description: "Read the Devotional Bible before 8:00 AM dynamic time.", icon: "🌅", category: "Religion" },
  { id: "badge_3", name: "Bungoma Scholar", description: "Completed lessons inside the custom Leadership School.", icon: "🎓", category: "Education" },
  { id: "badge_4", name: "Streak Master", description: "Maintained a 5-day reading streak goal.", icon: "🔥", category: "General" },
  { id: "badge_5", name: "STEM Genius", description: "Run complex math problem calculations on the AI engine.", icon: "🔬", category: "Science" },
  { id: "badge_6", name: "Creator Companion", description: "Published a formatted book using the Wafula AI publishing machine.", icon: "✍️", category: "Self-Help" }
];

export const DEVOTIONALS: Devotional[] = [
  {
    id: "d1",
    title: "The Calling to Lead",
    verse: "Joshua 1:9",
    reflection: "True leadership involves strength, courage, and unconditional reliance on our God-given path. Kelvin Opara Wafula structures this as a foundational pillar for Bungoma local empowerment.",
    prayer: "Heavenly Father, grant me the resilience to lead with absolute integrity, clarity, and courage, guiding others to transform their world.",
    date: "2026-05-21"
  },
  {
    id: "d2",
    title: "Knowledge That Heals",
    verse: "Proverbs 4:7",
    reflection: "Wisdom is the principal thing; therefore get wisdom. Premium books open minds, unlock locked potentials, and inspire lasting impact.",
    prayer: "Lord, enrich my learning process with knowledge that transforms and instills long-term wisdom inside my heart.",
    date: "2026-05-22"
  }
];

export const BIBLE_DATA: { [key: string]: { [chapter: number]: string[] } } = {
  "John": {
    1: [
      "In the beginning was the Word, and the Word was with God, and the Word was God.",
      "The same was in the beginning with God.",
      "All things were made by him; and without him was not any thing made that was made.",
      "In him was life; and the life was the light of men.",
      "And the light shineth in darkness; and the darkness comprehended it not.",
      "There was a man sent from God, whose name was John.",
      "The same came for a witness, to bear witness of the Light, that all men through him might believe.",
      "He was not that Light, but was sent to bear witness of that Light.",
      "That was the true Light, which lighteth every man that cometh into the world.",
      "He was in the world, and the world was made by him, and the world knew him not.",
      "He came unto his own, and his own received him not.",
      "But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name:",
      "Which were born, not of blood, nor of the will of the flesh, nor of the will of man, but of God.",
      "And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth.",
      "John bare witness of him, and cried, saying, This was he of whom I spake, He that cometh after me is preferred before me: for he was before me.",
      "And of his fulness have all we received, and grace for grace.",
      "For the law was given by Moses, but grace and truth came by Jesus Christ.",
      "No man hath seen God at any time; the only begotten Son, which is in the bosom of the Father, he hath declared him.",
      "And this is the record of John, when the Jews sent priests and Levites from Jerusalem to ask him, Who art thou?",
      "And he confessed, and denied not; but confessed, I am not the Christ."
    ],
    2: [
      "And the third day there was a marriage in Cana of Galilee; and the mother of Jesus was there:",
      "And both Jesus was called, and his disciples, to the marriage.",
      "And when they wanted wine, the mother of Jesus saith unto him, They have no wine.",
      "Jesus saith unto her, Woman, what have I to do with thee? mine hour is not yet come.",
      "His mother saith unto the servants, Whatsoever he saith unto you, do it."
    ]
  },
  "Genesis": {
    1: [
      "In the beginning God created the heaven and the earth.",
      "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.",
      "And God said, Let there be light: and there was light.",
      "And God saw the light, that it was good: and God divided the light from the darkness.",
      "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.",
      "And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters."
    ]
  },
  "Psalms": {
    23: [
      "The LORD is my shepherd; I shall not want.",
      "He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
      "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake.",
      "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.",
      "He prepareth a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.",
      "Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever."
    ]
  },
  "Matthew": {
    1: [
      "The book of the generation of Jesus Christ, the son of David, the son of Abraham.",
      "Abraham begat Isaac; and Isaac begat Jacob; and Jacob begat Judas and his brethren;",
      "And Judas begat Phares and Zara of Thamar; and Phares begat Esrom; and Esrom begat Aram;"
    ]
  }
};

export const INITIAL_MEMBER_UPLOADS: MemberUploadRequest[] = [
  {
    id: "upl_1",
    userId: "subscriber@mail.com",
    userName: "Sarah Johnson",
    title: "Sermon_Outlines_Bungoma_Outreach.docx",
    type: "pdf",
    fileSize: "1.2 MB",
    status: "approved",
    allowedToPublic: true,
    date: "2026-05-18"
  },
  {
    id: "upl_2",
    userId: "subscriber@mail.com",
    userName: "Sarah Johnson",
    title: "Testimonial_Video_Bungoma_2026.mp4",
    type: "video",
    fileSize: "45.0 MB",
    status: "pending",
    allowedToPublic: false,
    date: "2026-05-20"
  }
];

export const INITIAL_COMMUNITY_CHATS: CommunityMessage[] = [
  {
    id: "msg_1",
    channel: "#General",
    userId: "wafulak435@gmail.com",
    userName: "Kelvin Opara Wafula",
    isAdmin: true,
    text: "Praise God, our digital bookstore is officially live! Feel free to discuss sermons, books, and study guides.",
    date: "2026-05-20",
    time: "10:30 AM"
  },
  {
    id: "msg_2",
    channel: "#General",
    userId: "sarah",
    userName: "Sarah Johnson",
    text: "This is beautiful, Kelvin! The interactive quizzes in the Leadership School are amazing. This app is incredibly clean.",
    date: "2026-05-20",
    time: "11:15 AM",
    parentId: "msg_1"
  }
];
