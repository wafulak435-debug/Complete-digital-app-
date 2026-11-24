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
      "He was with God in the beginning.",
      "Through him all things were made; without him nothing was made that has been made.",
      "In him was life, and that life was the light of all mankind.",
      "The light shines in the darkness, and the darkness has not overcome it.",
      "There was a man sent from God whose name was John.",
      "He came as a witness to testify concerning that light, so that through him all might believe.",
      "He himself was not the light; he came only as a witness to the light.",
      "The true light that gives light to everyone was coming into the world.",
      "He was in the world, and though the world was made through him, the world did not recognize him.",
      "He came to that which was his own, but his own did not receive him.",
      "Yet to all who did receive him, to those who believed in his name, he gave the right to become children of God—",
      "children born not of natural descent, nor of human decision or a husband’s will, but born of God.",
      "The Word became flesh and made his dwelling among us. We have seen his glory, the glory of the one and only Son, who came from the Father, full of grace and truth.",
      "(John testified concerning him. He cried out, saying, “This is the one I spoke about when I said, ‘He who comes after me has surpassed me because he was before me.’ ”)",
      "Out of his fullness we have all received grace in place of grace already given.",
      "For the law was given through Moses; grace and truth came through Jesus Christ.",
      "No one has ever seen God, but the one and only Son, who is himself God and is in closest relationship with the Father, has made him known."
    ],
    3: [
      "Now there was a Pharisee, a man named Nicodemus who was a member of the Jewish ruling council.",
      "He came to Jesus at night and said, “Rabbi, we know that you are a teacher who has come from God. For no one could perform the signs you are doing if God were not with him.”",
      "Jesus replied, “Very truly I tell you, no one can see the kingdom of God unless they are born again.”",
      "“How can someone be born when they are old?” Nicodemus asked. “Surely they cannot enter a second time into their mother’s womb to be born!”",
      "Jesus answered, “Very truly I tell you, no one can enter the kingdom of God unless they are born of water and the Spirit.",
      "Flesh gives birth to flesh, but the Spirit gives birth to spirit.",
      "You should not be surprised at my saying, ‘You must be born again.’",
      "The wind blows wherever it pleases. You hear its sound, but you cannot tell where it comes from or where it is going. So it is with everyone born of the Spirit.”",
      "“How can this be?” Nicodemus asked.",
      "“You are Israel’s teacher,” said Jesus, “and do you not understand these things?",
      "Very truly I tell you, we speak of what we know, and we testify to what we have seen, but still you people do not accept our testimony.",
      "I have spoken to you of earthly things and you do not believe; how then will you believe if I speak of heavenly things?",
      "No one has ever gone into heaven except the one who came from heaven—the Son of Man.",
      "Just as Moses lifted up the snake in the wilderness, so the Son of Man must be lifted up,",
      "that everyone who believes may have eternal life in him.”",
      "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
      "For God did not send his Son into the world to condemn the world, but to save the world through him."
    ]
  },
  "Genesis": {
    1: [
      "In the beginning God created the heavens and the earth.",
      "Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.",
      "And God said, “Let there be light,” and there was light.",
      "God saw that the light was good, and he separated the light from the darkness.",
      "God called the light “day,” and the darkness he called “night.” And there was evening, and there was morning—the first day.",
      "And God said, “Let there be a vault between the waters to separate water from water.”",
      "So God made the vault and separated the water under the vault from the water above it. And it was so.",
      "God called the vault “sky.” And there was evening, and there was morning—the second day.",
      "And God said, “Let the water under the sky be gathered to one place, and let dry ground appear.” And it was so.",
      "God called the dry ground “land,” and the gathered waters he called “seas.” And God saw that it was good.",
      "Then God said, “Let the land produce vegetation: seed-bearing plants and trees on the land that bear fruit with seed in it, according to their various kinds.” And it was so."
    ]
  },
  "Psalms": {
    23: [
      "The LORD is my shepherd, I lack nothing.",
      "He makes me lie down in green pastures, he leads me beside quiet waters,",
      "he refreshes my soul. He guides me along the right paths for his name’s sake.",
      "Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.",
      "You prepare a table before me in the presence of my enemies. You anoint my head with oil; my cup overflows.",
      "Surely your goodness and love will follow me all the days of my life, and I will dwell in the house of the LORD forever."
    ]
  },
  "Matthew": {
    1: [
      "This is the genealogy of Jesus the Messiah the son of David, the son of Abraham:",
      "Abraham was the father of Isaac, Isaac the father of Jacob, Jacob the father of Judah and his brothers,",
      "Judah the father of Perez and Zerah, whose mother was Tamar, Perez the father of Hezron, Hezron the father of Ram,",
      "Ram the father of Amminadab, Amminadab the father of Nahshon, Nahshon the father of Salmon,",
      "Salmon the father of Boaz, whose mother was Rahab, Boaz the father of Obed, whose mother was Ruth, Obed the father of Jesse,",
      "and Jesse the father of King David. David was the father of Solomon, whose mother had been Uriah’s wife."
    ]
  },
  "Romans": {
    8: [
      "Therefore, there is now no condemnation for those who are in Christ Jesus,",
      "because through Christ Jesus the law of the Spirit who gives life has set you free from the law of sin and death.",
      "For what the law was powerless to do because it was weakened by the flesh, God did by sending his own Son in the likeness of sinful flesh to be a sin offering.",
      "And so he condemned sin in the flesh, in order that the righteous requirement of the law might be fully met in us, who do not live according to the flesh but according to the Spirit.",
      "Those who live according to the flesh have their minds set on what the flesh desires; but those who live in accordance with the Spirit have their minds set on what the Spirit desires.",
      "The mind governed by the flesh is death, but the mind governed by the Spirit is life and peace."
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
