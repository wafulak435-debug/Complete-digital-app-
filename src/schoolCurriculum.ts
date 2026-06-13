export interface AssessmentQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  topic: string;
  slogan: string;
  intro: string;
  points: string[];
  illustrationPrompt?: string;
  imageUrl?: string;
  selfAssessment: AssessmentQuestion[];
  courseCode?: string;
  courseFee?: number;
  duration?: string;
}

export const PREBUILT_LESSONS: Lesson[] = [
  {
    id: "visionary_leadership",
    topic: "Visionary Leadership",
    slogan: "Cast Vision, Ignite Transformational Action",
    intro: "A visionary leader does not just look at the horizon; they build the road toward it. Power comes from articulating a clear, desirable future state that aligns with the core values of local assets.",
    points: [
      "Defining the 'Why': People follow goals only when they understand the fundamental purpose of the work. The leader must establish a clear reason for mobilization.",
      "Communicating with Simplicity: Use highly relatable analogies and repeatable slogans to paint the future state, avoiding complex jargon during outreach.",
      "Grounding in Local Realities: Align broad, inspirational concepts with practical local capacities, whether in Bungoma, Nairobi, or across developing sectors.",
      "Designing Core Milestones: Break down a grand ten-year roadmap into structured quarterly objectives, ensuring execution remains steady.",
      "Iterative Vision Auditing: Continuously measure participant engagement and refine key messaging channels based on direct feedback loops."
    ],
    selfAssessment: [
      {
        question: "What is the primary driver of visionary alignment within a developing cohort?",
        options: [
          "Rigorous top-down commands and strictly enforced oversight boundaries.",
          "Articulating a clear, desirable 'Why' that connects with people's values.",
          "Ignoring local resources and focusing exclusively on theoretical global parameters.",
          "Withholding project goals to prevent administrative confusion."
        ],
        correctIndex: 1,
        explanation: "Visionary leadership inspires engagement from within. By clearly communicating the core 'Why', leaders earn willing dedication rather than forced compliance."
      },
      {
        question: "How should a visionary leader utilize repeatable slogans and relatable analogies?",
        options: [
          "As superficial jargon to impress external academic observers.",
          "To translate complex strategic goals into simple, memorable, and actionable shared milestones.",
          "To avoid writing operational guidelines altogether.",
          "To replace real database audits with casual storytelling."
        ],
        correctIndex: 1,
        explanation: "Analogies and slogans bypass complex jargon loops, ensuring that every level of the cohort can accurately memorize and execute the primary mission goals."
      },
      {
        question: "Why should strategic visioning be grounded in local realities (e.g. Bungoma, Kenya)?",
        options: [
          "Because local realities never align with general leadership principles.",
          "To ensure that resource availability, culture, and practical local strengths guide our execution buffers.",
          "Simply to satisfy municipal government reporting requirements.",
          "To exclude international collaborators from participating in local projects."
        ],
        correctIndex: 1,
        explanation: "A vision that ignores local culture and resource constraints is built on sand. Solid execution requires aligning goals with localized strengths."
      },
      {
        question: "What constitutes the core function of structured quarterly milestones on a 10-year roadmap?",
        options: [
          "To make the roadmap look unnecessarily complex in the ledger.",
          "To provide immediate tactical checkpoints that keep daily operations aligned with the long-term vision.",
          "To replace the final project evaluation with minor checklists.",
          "To allow administrators to change primary vision goals every month."
        ],
        correctIndex: 1,
        explanation: "Quarterly milestones bridge the gap between grand long-term goals and daily focus, ensuring steady momentum without losing sight of the broader horizon."
      },
      {
        question: "What role does iterative vision auditing play to prevent organizational drift?",
        options: [
          "It forces absolute blind compliance from all project coordinators.",
          "It allows the leader to gauge internal alignment, collect feedback, and clarify target values dynamically.",
          "It eliminates the need for any formal written contracts or assignments.",
          "It guarantees that projects are completed beneath initial budget lines on every occasion."
        ],
        correctIndex: 1,
        explanation: "Ongoing vision audits create continuous learning loops. They ensure that misalignments or strategic drift are caught and addressed proactively."
      }
    ]
  },
  {
    id: "effective_communication",
    topic: "Effective Communication",
    slogan: "Connect First, Listen Deeply, Speak with Precision",
    intro: "The fundamental failure in communication is assuming that it has taken place. Effective leaders prioritize active listening, empathetic verification, and closed loops.",
    points: [
      "The 70-30 Rule: Spend 70% of your operational conversations listening to feedback, local ideas, and concerns.",
      "Acknowledge Before Answering: Establish immediate safety by letting your listeners feel heard and respected.",
      "Closed Loop Verification: Always ask target listeners to re-describe core actions in their own words to prevent gaps.",
      "High-Empathy Framing: Tailor your message to the listener's perspective, utilizing emotional intelligence as an asset.",
      "Structured Multi-Channel Outlines: Distribute instructions via visual summaries, brief audio briefs, and official text ledgers."
    ],
    selfAssessment: [
      {
        question: "What does the 70-30 rule of communicative listening establish?",
        options: [
          "A leader should speak 70% of the time to maintain absolute intellectual focus.",
          "A leader should spend 70% of the time actively listening to feedback and local perspectives.",
          "That only 30% of any spoken instruction is translated into workable PDFs.",
          "Allowing only 30% of cohort members to speak during general assemblies."
        ],
        correctIndex: 1,
        explanation: "Active listening demonstrates humility and gathers crucial local context. Speaking less and studying more prevents strategic mistakes."
      },
      {
        question: "Which technique is vital to execute 'Closed Loop Verification' in daily meetings?",
        options: [
          "Simply asking 'Do you understand?' at the end of a long monologue.",
          "Having participants summarize the core action deliverables in their own words to verify alignment.",
          "Recording the entire meeting in audio to play back later at high speed.",
          "Writing a formal email detailing penalties for non-compliance."
        ],
        correctIndex: 1,
        explanation: "Closed loop verification requires the listener to actively process and re-state the directive, exposing any gaps or misunderstandings instantly."
      },
      {
        question: "How does 'Acknowledge Before Answering' improve organizational culture?",
        options: [
          "It creates immediate psychological safety, making team members more receptive to critical feedback.",
          "It replaces the need to answer difficult or budget-challenging questions directly.",
          "It speeds up meetings by shutting down unnecessary discussions.",
          "It establishes an administrative hierarchy where only approved moderators speak."
        ],
        correctIndex: 0,
        explanation: "Acknowledging feedback builds trust. When individuals feel heard, defensive walls crumble, fostering genuine collaborative problem-solving."
      },
      {
        question: "What is the primary benefit of High-Empathy Framing when delivering critical change?",
        options: [
          "It avoids addressing controversial topics or hard facts.",
          "It aligns the strategic reason for change with the personal values and concerns of the audience.",
          "It forces the audience to accept lower wages without complaint.",
          "It guarantees that no team member will ever make mistakes again."
        ],
        correctIndex: 1,
        explanation: "Empathy helps bridge divides. By styling the message around the audience's point of view, you turn resistance into understanding."
      },
      {
        question: "Why should an administrator utilize a Multi-Channel approach when publishing directives?",
        options: [
          "To increase paper waste and document size files.",
          "To appeal to different learning preferences (visual, auditory, textual) and ensure redundancy.",
          "To confuse low-level coordinators about which version is currently active.",
          "To prove that the administrator is hyper-active across all networks."
        ],
        correctIndex: 1,
        explanation: "Multi-channel distribution minimizes transmission failure. It provides redundant pathways for critical information, securing consistent execution."
      }
    ]
  },
  {
    id: "strategic_management",
    topic: "Strategic Thinking & Management",
    slogan: "Map Multi-Order Consequences & Resource Buffers",
    intro: "Tactics are what you do when there is something to do. Strategy is what you do when there is nothing to do. True managers map future risks and build defensive buffers.",
    points: [
      "Anticipating Multi-Order Effects: Look beyond the immediate result of an action to trace its second- and third-order impacts.",
      "Buffer Allocation: Allocate defensive capital and resources to absorb unexpected operational shocks.",
      "Objective Centering: Anchor hourly duties to our primary long-term vision, letting minor steps adapt dynamically.",
      "Continuous Competitive Scans: Consistently evaluate external tech and socio-economic shifts to pivot early.",
      "Scenario Planning Matrixes: Map out 'Best Case, Base Case, and Worst Case' strategies to guarantee readiness."
    ],
    selfAssessment: [
      {
        question: "Which of the following is core to strategic thinking as opposed to tactical execution?",
        options: [
          "Focusing purely on immediate, short-term reactive actions.",
          "Anticipating multi-order effects of decisions and defending resources with buffers.",
          "Ignoring long-term values to complete checkboxes faster.",
          "Relying entirely on yesterday's guidelines or static outdated procedures."
        ],
        correctIndex: 1,
        explanation: "Strategy is proactive. It builds defensive buffers and anticipates second-order consequences to protect the long-term vision."
      },
      {
        question: "What is a 'Second-Order Effect' in strategic management?",
        options: [
          "A minor error that only affects low-level administrative personnel.",
          "The secondary, indirect consequence that stems from our immediate, direct tactical decisions.",
          "The speed at which a secondary server takes over during network outages.",
          "A feedback loop that occurs only inside the second quarter of the academic year."
        ],
        correctIndex: 1,
        explanation: "First-order choices create immediate visible wins. Second-order effects are the downstream ripples, which are often negative if not planned defensively."
      },
      {
        question: "Why is defensive 'Buffer Allocation' crucial for sustainable organizational survival?",
        options: [
          "To keep money idle so that audits appear completely safe.",
          "To absorb unexpected shocks, budget overruns, and logistical delays without collapsing daily operations.",
          "To pay out bonuses to top-level administrative coordinators early.",
          "To exclude minor projects from receiving seed capital."
        ],
        correctIndex: 1,
        explanation: "Unforeseen shocks are guaranteed to occur. Strategic buffering preserves stability and provides breathing room to adjust formulas."
      },
      {
        question: "What does 'Objective Centering' allow a team to do during crisis periods?",
        options: [
          "It allows them to pivot their tactical actions freely while keeping their primary goal immutable.",
          "It forces them to repeat failed approaches indefinitely.",
          "It shuts down all communication lines until a formal review is completed.",
          "It removes all performance guidelines to reduce stress levels."
        ],
        correctIndex: 0,
        explanation: "When crisis hits, rigid paths break. Objective centering provides a magnetic north, allowing the team to innovate new paths to the same goal."
      },
      {
        question: "How does a 'Scenario Planning Matrix' protect organizational integrity?",
        options: [
          "By predicting the exact date on which a project will finish.",
          "By pre-defining action plans for multiple future states, ensuring rapid coordinate response.",
          "By removing the need for regular board meetings.",
          "By limiting the number of books in the digital library."
        ],
        correctIndex: 1,
        explanation: "Scenario planning replaces panic with structured steps. It ensures that when worst-case realities hit, the team has a pre-verified manual ready."
      }
    ]
  },
  {
    id: "ethical_governance",
    topic: "Ethical Governance & Stewardship",
    slogan: "Aligning Operations with Servant-Dignity",
    intro: "Authentic ethical governance requires placing service of the cohort above self-enrichment. A leader coordinates assets with absolute financial transparency and respect for human dignity.",
    points: [
      "The Principle of Servant Leadership: Power is a delegated trust to be spent on empowering the margin, not self-aggrandizement.",
      "Meticulous Asset Transparency: Implement clear, auditable records for all finances, books, and operational credits.",
      "Respecting Human Dignity: Valuing all collaborators as scholars, refusing to treat people as mere cog statistics.",
      "Conflict of Interest Mitigation: Disclosing personal linkages and ensuring resource allocations are fair.",
      "Continuous Stewardship Audits: Engaging independent scholars to evaluate organization systems and verify safety standards."
    ],
    selfAssessment: [
      {
        question: "Under the guidelines of Ethical Governance, how should authority be viewed by a Zion leader?",
        options: [
          "As a personal privilege to dominate and control organization assets.",
          "As a delegated trust to be spent entirely on serving and empowering the cohort.",
          "As an unnecessary barrier that slows down decision speed.",
          "As a financial tool to secure private capital lines."
        ],
        correctIndex: 1,
        explanation: "Authority is never an end in itself. Ethical leaders view power as a resource delegated to them solely to lower barriers for others."
      },
      {
        question: "What is the primary function of establishing 'Meticulous Asset Transparency'?",
        options: [
          "To satisfy compliance rules while maintaining hidden ledgers privately.",
          "To invite public trust, foster accountability, and eliminate vulnerability points for corruption.",
          "To make the financial reports too complicated for standard members to read.",
          "To ensure that only certified accountants can use the digital portal."
        ],
        correctIndex: 1,
        explanation: "Transparency is the ultimate detergent for corruption. Public, auditable financial records keep systems healthy and build secure organizational faith."
      },
      {
        question: "How does treating team members as 'Scholars rather than Cogs' affect productivity?",
        options: [
          "It decreases output because scholars spend too much time reading books.",
          "It unlocks internal pride, fosters creative agency, and drives higher long-term commitment.",
          "It forces the leader to seek consensus for minor daily decisions.",
          "It increases administration payroll costs unnecessarily."
        ],
        correctIndex: 1,
        explanation: "Dignity is a master key. When people feel valued as intellectual agents with real potential, they invest their best energies into execution."
      },
      {
        question: "What constitutes a proactive method to mitigate Conflicts of Interest?",
        options: [
          "Hiding personal relationships from general reviews.",
          "Full disclosure of linkages and recusing oneself from decisions that affect personal assets.",
          "Re-allocating organizational budgets to trusted family members quietly.",
          "Eliminating all external independent oversight protocols."
        ],
        correctIndex: 1,
        explanation: "Disclosure builds protective walls around organizational integrity. It prevents personal bias from eroding the objective trust of the cohort."
      },
      {
        question: "Why are independent Stewardship Audits highly recommended for active NGOs?",
        options: [
          "To catch and punish low-performing students immediately.",
          "To provide objective, unbiased reviews of system metrics and protect cohort assets.",
          "To change the primary vision statements without consulting founders.",
          "To replace local managers with foreign advisors permanently."
        ],
        correctIndex: 1,
        explanation: "Internal reviews are prone to blindspots. Independent auditors provide an objective sanity check, ensuring system compliance and safety."
      }
    ]
  },
  {
    id: "conflict_resolution",
    topic: "Conflict Resolution & Alignment",
    slogan: "Transforming Tension into Shared Mission Goals",
    intro: "Conflict is inevitable, but combat is optional. Elite leaders treat tension as raw feedback, utilizing modern mediation tools to align divided factions back to the common vision.",
    points: [
      "Tension as Feedback: Treat friction as an indicator of an underlying process gap or communication failure.",
      "The Interest-Based Mediation: Re-route discussions away from defensive positions to focus on shared primary goals.",
      "The Active Listening Anchor: Dedicating quiet space for both sides to express issues without interruption.",
      "Collaborative Problem Synthesis: Jointly drafting an action manifest that incorporates the needs of both forces.",
      "Post-Agreement Integration Audits: Checking back with participants at 30- and 60-day markers to maintain peace."
    ],
    selfAssessment: [
      {
        question: "How should an outstanding administrative leader perceive team conflict?",
        options: [
          "As a personal attack on their authority that must be crushed instantly.",
          "As raw feedback pointing to unresolved gaps, offering an opportunity for process renewal.",
          "As proof that the team is completely incompetent.",
          "As an excuse to delay critical project deliverables indefinitely."
        ],
        correctIndex: 1,
        explanation: "Friction indicates underlying design gaps. An ethical leader uses the energy of conflict to reveal hidden system bottlenecks and forge better paths."
      },
      {
        question: "What is the core target of 'Interest-Based Mediation'?",
        options: [
          "To force both sides to accept the leader's personal decision without compromise.",
          "To focus the conversation away from rigid emotional positions and find common, shared core interests.",
          "To determine which of the two parties is legally and financially at fault.",
          "To replace active team members with external neutral consultants."
        ],
        correctIndex: 1,
        explanation: "Positions are rigid, but interests are negotiable. Identifying shared baseline values allows divided teams to find creative win-win solutions."
      },
      {
        question: "Why must a mediator anchor the session with uninterrupted 'Active Listening' slots?",
        options: [
          "To let the session drag on so people get tired and agree faster.",
          "To lower emotional defenses, make participants feel respected, and capture clear factual details.",
          "To avoid taking any definitive administrative stance during the crisis.",
          "To allow the dominant party to exhaust and silence the weaker party."
        ],
        correctIndex: 1,
        explanation: "Defensiveness melts when a participant feels fully heard. Providing uninterrupted speaking time establishes respect and uncovers core truths."
      },
      {
        question: "What is 'Collaborative Problem Synthesis'?",
        options: [
          "Writing a long, verbose report about the history of the dispute.",
          "Co-creating a practical, forward-looking action checklist that honors both parties' core values and interests.",
          "Splitting the organization into two separate entities to avoid contact.",
          "Allowing the most vocal party to dictate the final agreement."
        ],
        correctIndex: 1,
        explanation: "Synthesis takes the best of both perspectives. The resulting checklist feels co-owned by both parties, ensuring deep commitment."
      },
      {
        question: "Why are post-agreement 30- and 60-day Integration Audits necessary?",
        options: [
          "To reopen old debates and check who is still angry.",
          "To verify compliance with the agreement, support healing alignment, and adjust guidelines dynamically.",
          "To find reasons to fine or penalize coordinators.",
          "To prove that the mediator has absolute control over team schedules."
        ],
        correctIndex: 1,
        explanation: "Paper agreements can fail in real-world application. Routine check-ins ensure minor friction is addressed before it escalates back into a crisis."
      }
    ]
  },
  {
    id: "delegation_empowerment",
    topic: "Empowered Local Delegation",
    slogan: "Distribute Authority, Entrust Ownership & Track Outcomes",
    intro: "A bottleneck leader limits growth. True leadership scaling requires delegating real decision authority to competent scholars, giving them complete ownership while auditing core outcomes.",
    points: [
      "The Bottleneck Trap: Understanding that retaining too much central control slows response time and stifles team growth.",
      "Capability-Matched Entrustment: Match delegated roles to recorded competence and historical execution records.",
      "Clear Boundary Framing: Delegate authority within clear guidelines, parameters, and safety bounds.",
      "Securing Executive Autonomy: Refusing to micromanage, letting the assigned scholar select their tactical path.",
      "Objective Audit Loops: Review outcomes transparently at fixed schedules, offering high-fidelity supportive reviews."
    ],
    selfAssessment: [
      {
        question: "What is the primary danger of the 'Bottleneck Trap' for active administrators?",
        options: [
          "It makes the administrator's schedule too light.",
          "It slows organization response speed, lowers trust, and halts team capability development.",
          "It forces the system to spend excess budget on server hosting.",
          "It causes minor formatting issues when publishing eBooks."
        ],
        correctIndex: 1,
        explanation: "A manager who must approve every line of work becomes a literal bottleneck. Delegation releases energy and raises organization IQ."
      },
      {
        question: "How should 'Capability-Matched Entrustment' be executed in a school setting?",
        options: [
          "By giving the most difficult tasks to the newest, youngest scholars to test them.",
          "By auditing previous performance records and assigning tasks that match proven competency scales.",
          "By assigning vital logistics purely based on personal friendships.",
          "By letting everyone vote on who should handle financial allocations."
        ],
        correctIndex: 1,
        explanation: "Delegation is built on proven ability. Aligning the complexity of a role with individual skills prevents frustration and system crashes."
      },
      {
        question: "Why must delegated authority be wrapped in clear 'Boundary Framing'?",
        options: [
          "To prevent the delegated scholar from taking any initiative whatsoever.",
          "To define safety parameters, budget caps, and moral guidelines where they can operate with absolute autonomy.",
          "To make the project guidelines long and difficult to memorize.",
          "To ensure that only senior administrators retain access codes."
        ],
        correctIndex: 1,
        explanation: "Boundaries don't restrict; they define the playground. Clear scopes prevent fear of overstepping and keep everyone structurally secure."
      },
      {
        question: "What does 'Refusing to Micromanage' communicate to a designated leader?",
        options: [
          "That the director does not care about the quality of the project outcomes.",
          "An expression of high administrative trust, boosting internal owner accountability and creative problem-solving.",
          "That the director lacks the technical skills to audit the work.",
          "An invitation to skip daily operational updates altogether."
        ],
        correctIndex: 1,
        explanation: "Freedom breeds accountability. When you give leaders space to own their decisions, they assume a profound sense of pride in the results."
      },
      {
        question: "How should an outstanding director conduct an 'Objective Audit Loop'?",
        options: [
          "By making sudden unannounced inspections to catch mistakes.",
          "Through scheduled, transparent reviews of outcomes against target goals, providing constructive feedback.",
          "By ignoring performance metrics unless a major failure is reported.",
          "By letting the scholar grade themselves without external verification."
        ],
        correctIndex: 1,
        explanation: "Audit loops must be predictable and constructive. They focus on objective outcome goals while supporting the leader's continuous learning."
      }
    ]
  }
];

export const COMPUTER_LESSONS: Lesson[] = [
  {
    id: "robotics_automation",
    topic: "Robotics and Automation",
    courseCode: "ZIO09/001/26",
    courseFee: 2500,
    duration: "4 Months",
    slogan: "Gain In-Demand Smart Tech Skills & Intelligent Machine Systems",
    intro: "Students will learn how intelligent machines are designed, programmed, automated, and controlled to solve real-world problems in industries, businesses, healthcare, agriculture, security, and education.",
    points: [
      "Physical Kinematics and Sensors: Understanding how microcontrollers interface with ultrasonic distance meters, gyroscopes, thermal scanners, and actuators.",
      "The Closed Loop Feedback System: How proportional-integral-derivative (PID) controllers smooth out automated movement.",
      "Industrial IoT Architecture: Integrating local sensor networks with safe MQTT gateways or secure cloud telemetry buckets.",
      "Path Planning and Obstacle Detection: Writing simple navigation rules that calculate safe pathways around dynamic physical obstructions.",
      "Bungoma Agricultural Automation: Smart solar-pump drip systems reading local ground moisture to minimize water waste."
    ],
    selfAssessment: [
      {
        question: "What is the primary function of a Proportional-Integral-Derivative (PID) controller in robotics automation?",
        options: [
          "To secure M-Pesa API transactions from external MITM breaches.",
          "To continuously calculate correction signals that smoothly drive mechanical states toward a target value.",
          "To automatically translate Arduino scripts into python representations.",
          "To count the physical layout dimensions of local microcontroller cards."
        ],
        correctIndex: 1,
        explanation: "PID controllers use feedback error integrals and derivatives to modulate actuator voltage, preventing mechanical overshoot and jerky movements."
      },
      {
        question: "Which transmission protocol is a standard, lightweight choice for IoT sensor telemetry?",
        options: [
          "Secure Shell (SSH)",
          "Message Queuing Telemetry Transport (MQTT)",
          "Hypertext Transfer Protocol Secure (HTTPS) with heavy XML pages",
          "Simple File Transfer Protocol (SFTP)"
        ],
        correctIndex: 1,
        explanation: "MQTT utilizes a lightweight publish-subscribe model, making it ideal for remote solar-powered sensors operating over low-bandwidth cellular nodes."
      },
      {
        question: "What does an ultrasonic sensor measure to compute physical distance?",
        options: [
          "The chemical composition of ambient surrounding air.",
          "The round-trip flight time of high-frequency sound wave pulses bouncing off an object.",
          "The thermal infrared heat signatures emitted by dynamic moving parts.",
          "The electrical conductance of metallic framework structures."
        ],
        correctIndex: 1,
        explanation: "Ultrasonic sensors emit high-frequency pings and count the time taken to capture the echo, multiplying by the speed of sound to deduce exact distance."
      },
      {
        question: "In automated agriculture, how do sensor nodes save pump electricity?",
        options: [
          "By increasing the voltage speed whenever clouds appear.",
          "By reading moisture data and running water pumps only when the soil drops below a critical dryness threshold.",
          "By deleting historic ledger database logs to clear memory.",
          "By downloading heavy external books in background mode."
        ],
        correctIndex: 1,
        explanation: "Conditional irrigation ensures that resource-guzzling pumps run only when necessary, saving water and conserving solar-battery capacities."
      },
      {
        question: "What constitutes the 'actuator' portion of an automated robotic arm system?",
        options: [
          "The central motherboard computing logic calculations.",
          "The electric motors, servos, or pneumatic cylinders that execute physical movement.",
          "The ultrasonic sensor reading distance parameters.",
          "The security credential key assigned to the node."
        ],
        correctIndex: 1,
        explanation: "Actuators are the muscles of automation. While sensors observe and chips decide, actuators receive the output voltage to manipulate physical space."
      }
    ]
  },
  {
    id: "html_css_coding",
    topic: "HTML and CSS Coding Course",
    courseCode: "ZIO10/001/26",
    courseFee: 2500,
    duration: "4 Months",
    slogan: "Master Structural Web Architecture & Responsive Layout Visuals",
    intro: "An HTML and CSS coding course typically covers foundational web development through modules focused on creating structure, styling content, and ensuring responsiveness.",
    points: [
      "Document Object Model (DOM) Foundations: Drafting semantic HTML structures using header, section, footer, and main tags.",
      "The CSS Box Model: Managing content, padding, borders, and margins to position visual container boxes flawlessly.",
      "Vibrant Typography Rules: Importing Google fonts and defining elegant proportions, weights, heights, and tracking styles.",
      "Responsive Layout Powerhouses: Harnessing Tailwind CSS Flexbox and Grid rules to build designs that adapt from mobile to wide monitors.",
      "Elegant CSS Animations: Writing lightweight transform, transition, and keyframe rules to guide user focus."
    ],
    selfAssessment: [
      {
        question: "Under the standard CSS Box Model, how are the dimensions of an element computed?",
        options: [
          "Content width only, ignoring physical margins and padding values.",
          "Content space plus padding width, border thickness, and optionally outer margin widths.",
          "By measuring the overall display frame coordinates of the viewport.",
          "By compiling the script files inside the dev server."
        ],
        correctIndex: 1,
        explanation: "The total size of a CSS box represents the sum of its raw content space, left/right padding widths, and borders. Margins push other boxes away."
      },
      {
        question: "Which HTML5 element represents semantic container placement rather than standard divs?",
        options: [
          "`<font>`",
          "`<section>`",
          "`<center>`",
          "`<bold>`"
        ],
        correctIndex: 1,
        explanation: "Semantic tags like section, main, header, and footer describe the content layout clearly to search engines and web screen readers."
      },
      {
        question: "How does CSS Flexbox help align children boxes inside a parent container wrapper?",
        options: [
          "By forcing all elements to render as circular pixels.",
          "By dynamically spacing, wrapping, and centering children along a designated main-axis and cross-axis.",
          "By converting standard text paragraphs into binary database tables.",
          "By disabling browser hover styles on mobile layout sizes."
        ],
        correctIndex: 1,
        explanation: "Flexbox manages 1-dimensional layouts instantly. Flex layout rules ease alignment, centering, and size adaptation without fixed calculations."
      },
      {
        question: "In responsive layout designs, what is the role of CSS Media Queries?",
        options: [
          "To request camera and microphone frame permissions from the user.",
          "To apply distinct CSS styling blocks depending on the screen width or viewport properties.",
          "To stream high-definition video guides from county databases.",
          "To verify if the user's connection bypass is currently paid."
        ],
        correctIndex: 1,
        explanation: "Media queries (and modern Tailwind utility prefixes like sm:, md:, lg:) allow styling to adapt based on screen dimension thresholds."
      },
      {
        question: "What's the key advantage of Tailwind utility classes over custom external CSS sheets?",
        options: [
          "Tailwind eliminates the need to compile any JavaScript code.",
          "Direct inline class application avoids CSS bloat, streamlines visual iterations, and secures design system tokens.",
          "Tailwind allows the website to bypass search engine crawler protocols.",
          "It automatically encrypts the HTML pages from browser inspections."
        ],
        correctIndex: 1,
        explanation: "Utility frameworks provide precalculated constraint tokens for margins, padding, and colors. This avoids duplicate CSS write-ups and keeps things cohesive."
      }
    ]
  },
  {
    id: "python_programming_flyer",
    topic: "Python Programming",
    courseCode: "ZIO04/001/26",
    courseFee: 2500,
    duration: "4 Months",
    slogan: "Introduction to Python Programming with Practical Projects & Problem Solving",
    intro: "Introduction to Python programming with practical projects and problem solving. Master Python variables, control loops, modular functions, and key algorithmic concepts.",
    points: [
      "Pythonic Logic Flow: Managing conditions with if-elif-else and utilizing robust for/while loop boundaries.",
      "Native Data Storage: Harnessing lists, dictionaries, tuples, and sets to manipulate collection lists efficiently.",
      "Object-Oriented Programming (OOP): Designing reusable class models with internal methods and inherited parameters.",
      "Text Processing and Files: Reading and writing local CSV, JSON, and text reports with absolute format safety.",
      "Debugging and Exceptions: Catching runtime errors with try-except safety frameworks to shield scripts from crash events."
    ],
    selfAssessment: [
      {
        question: "How is an item retrieved from a Python Dictionary in O(1) time complexity?",
        options: [
          "By looping through every element sequentially from first to last.",
          "By querying the dictionary using its unique, direct, associated string or integer key.",
          "By converting the dictionary into a tuple list structures.",
          "By running a background shell command in execution mode."
        ],
        correctIndex: 1,
        explanation: "Dictionaries use hash maps underneath. Querying by key bypasses search loops and fetches values instantly regardless of size."
      },
      {
        question: "What is the primary significance of 'Indentation Whitespace' in Python coding syntaxes?",
        options: [
          "It is purely optional cosmetic spacing to make the layout look pretty.",
          "It defines execution blocks and visual scopes, replacing the need for curly braces or begin-end tags.",
          "It tells the runtime engine to store the values as floating-point decimals.",
          "It encrypts variables from being accessed in adjacent classes."
        ],
        correctIndex: 1,
        explanation: "Whitespace indentation is a structural requirement in Python. Incorrect alignment raises direct IndentationError during compile phase."
      },
      {
        question: "Which script block ensures that a Python program can recover gracefully from a potential division-by-zero risk?",
        options: [
          "`while True ... else`",
          "`try ... except ZeroDivisionError`",
          "`if exception == True ...`",
          "`assert x != 0` with no fallback handler"
        ],
        correctIndex: 1,
        explanation: "Try-except blocks intercept exceptions, executing alternative corrective pathways rather than terminating the operational script."
      },
      {
        question: "What does list slicing like `numbers[1:4]` return in Python?",
        options: [
          "A brand new sub-list containing the elements from index 1 up to (but excluding) index 4.",
          "The first and fourth numbers of the list only.",
          "An integer summing the values of those positions.",
          "A custom tuple that deletes those indices from the parent list."
        ],
        correctIndex: 0,
        explanation: "Slicing slices collections cleanly. Inclusive of start index and exclusive of end index, it crafts a rapid, lightweight subset copy."
      },
      {
        question: "What is the goal of utilizing Python's `with open('report.txt', 'r') as f:` context manager?",
        options: [
          "To speed up hard disk reading velocities by 200%.",
          "To ensure the file stream closes safely and fully automatically, even if errors occur inside the read block.",
          "To translate the file formatting into beautiful PDF reports.",
          "To block other county network nodes from writing into this file."
        ],
        correctIndex: 1,
        explanation: "The with keyword acts as a context manager. It guarantees resource release immediately after block exit, avoiding memory leakage or locked files."
      }
    ]
  },
  {
    id: "graphic_design",
    topic: "Graphic Design",
    courseCode: "ZIO06/001/26",
    courseFee: 2600,
    duration: "4 Months",
    slogan: "Complete Visual Arts: Branding, Vector Graphics & Typographic Harmony",
    intro: "Complete graphic design course covering branding principles, composite layout software, typographic pairing, color wheels, and high-impact visual aesthetics.",
    points: [
      "The Principles of Composition: Unlocking alignment, tracking, hierarchy, negative space, and contrast rhythm.",
      "The Golden Ratio: Utilizing harmonic proportional divisions (1:1.618) to frame focal assets elegantly.",
      "Vector vs Raster Formats: Sculpting infinite-scalable math vector paths rather than fixed pixel arrays prone to blurring.",
      "Color Psychology and Mood: Pairing cool slates, warm ambers, and vibrant gold finishes based on color theory guides.",
      "Modern Brand Engineering: Packaging comprehensive corporate style ledgers that unify web views with print covers."
    ],
    selfAssessment: [
      {
        question: "What is the fundamental difference between Vector Graphics and Raster Images?",
        options: [
          "Vector graphics use fixed colored pixels, while raster graphics use transparent mathematical equations.",
          "Vector graphics are built from mathematical paths that scale infinitely without losing crispness, while raster graphics use fixed pixel arrays that blur when enlarged.",
          "Vectors are always stored in binary database ledgers, whereas rasters are text-based.",
          "There is no difference; both formats compile into standard PDF certificates identically."
        ],
        correctIndex: 1,
        explanation: "Vectors declare geometry (points, lines, curves). This secures crisp display branding on large physical posters or microscopic mobile icons."
      },
      {
        question: "How does the 'Golden Ratio' (approximately 1.618) assist professional designers?",
        options: [
          "It calculates how many golden colors to use on the logo design.",
          "It provides a natural, visually aesthetic mathematical proportion for layout divisions, image framings, and grid sizes.",
          "It dictates how many fonts are permitted on an administrative report.",
          "It speeds up file upload size calculation inside the browser."
        ],
        correctIndex: 1,
        explanation: "Found repeatedly in nature, the golden ratio represents organic balance. Applying it to layout dimensions triggers immediate visual comfort."
      },
      {
        question: "Which font pairing strategy represents a clean and standard design methodology?",
        options: [
          "Combining three distinct decorative fantasy fonts on the same line coordinates.",
          "Pairing a strong, distinctive Display Heading (e.g. Space Grotesk) with a highly legible Sans-Serif body font (e.g. Inter).",
          "Using only heavy industrial pixel art fonts for lengthy narrative studies.",
          "Disabling font smoothing on high-resolution screens."
        ],
        correctIndex: 1,
        explanation: "Contrast anchors hierarchy. A readable body font keeps reading comfortable, while bold header fonts guide attention checkpoints."
      },
      {
        question: "What is represented by 'Negative Space' in graphic layouts?",
        options: [
          "The color black when applied to a dark mode background theme.",
          "The intentional empty, unmarked area surrounding visual elements, letting the elements breathe and stand out.",
          "An administrative error where images fail to render because of broken URL paths.",
          "The bottom footer space where system log metrics are saved."
        ],
        correctIndex: 1,
        explanation: "Whitespace is not empty waste; it is a vital active force. It frames objects, clarifies relationships, and establishes premium layout elegance."
      },
      {
        question: "What describes a brand's 'Style Guide'?",
        options: [
          "A manual specifying the precise typefaces, logos, exact color palettes, margins, and brand usage rules for consistent public image.",
          "A spreadsheet tracking the hourly earnings of design personnel.",
          "An automated script that automatically changes layout colors every week.",
          "A validation key required to access county design servers."
        ],
        correctIndex: 0,
        explanation: "Consistent presentation fosters recognition. Style guides keep web apps, print, and physical storefront assets uncompromised and cohesive."
      }
    ]
  },
  {
    id: "video_editing",
    topic: "Introduction to Video Editing",
    courseCode: "ZIO07/001/26",
    courseFee: 2500,
    duration: "4 Months",
    slogan: "Master Digital Storytelling, Transition Cut Sequences & Color Grading",
    intro: "Learn video editing basics, creative storytelling structures, frame clipping profiles, audio integration, pacing, and motion graphics overlay.",
    points: [
      "The Art of the Cut: Executing tight J-cuts, L-cuts, and match cuts to keep narration sequences smooth and captivating.",
      "The Frame Rate Rule: Master standard playback speeds like cinematic 24 FPS, TV 30 FPS, or crisp sports 60 FPS.",
      "Color Correction and Grading: Standardizing highlight bounds and implementing custom LUT maps for aesthetic mood consistency.",
      "Audio Dynamics and Multi-track: Normalizing voice dialogue levels to safe -6dB while ducking ambient background music layers.",
      "Dynamic Keyframe Overlays: Anchoring lower-thirds graphics, subtitles, and vector icons using linear translation paths."
    ],
    selfAssessment: [
      {
        question: "What is represented by a 'J-Cut' in digital video timeline sequences?",
        options: [
          "A cut that deletes all adjacent audio waves instantly.",
          "When the audio of the following scene begins playing before the physical visual cut occurs.",
          "A diagonal transition effect that slides from left to right coordinates.",
          "Encrypting the exported video using high-concurrency security blocks."
        ],
        correctIndex: 1,
        explanation: "J-cuts blend scenes. By letting the listener hear the next scene before they see it, transitions feel fluid, conversational, and natural."
      },
      {
        question: "Why is audio levels normalized to peak around -6dB to -12dB in video timelines?",
        options: [
          "Because computers automatically crash if audio crosses the zero point.",
          "To preserve audio headroom and avoid digital clipping distortion while keeping vocals clear across standard speakers.",
          "To make the final exported file size 50% smaller.",
          "To satisfy municipal license boundaries for local sound broadcasts."
        ],
        correctIndex: 1,
        explanation: "0dB represents standard absolute ceiling logic thresholds. Vocal peaks hitting 0dB distort. Hovering near -6dB secures crisp sound delivery."
      },
      {
        question: "What does 'Color Correction' accomplish before 'Color Grading'?",
        options: [
          "Color correction automatically deletes black-and-white clips.",
          "It standardizes exposure, color balance, and neutral whites so every single shot looks scientifically accurate and consistent.",
          "It converts the file format into highly compressed web streams.",
          "It writes custom background code that processes video sequences."
        ],
        correctIndex: 1,
        explanation: "Consistency precedes styling. Correct first to set a neutral, balanced baseline, then apply artistic grading or custom LUT looks."
      },
      {
        question: "What is a 'Lookup Table' (LUT) used for in video post-production?",
        options: [
          "A database script that stores metadata tables on the server.",
          "A mathematical matrix that instantly remaps raw camera logs into styled, cinematic color profiles.",
          "A troubleshooting list used to identify broken system files.",
          "An automated tool that counts the total frames in a clip."
        ],
        correctIndex: 1,
        explanation: "LUTs act as color recipes. They take input colors and apply custom mathematical curves to render cinematic shadow depths or retro warm tones."
      },
      {
        question: "Which frame-rate speed is standard for classic, Hollywood-style cinematic video playback?",
        options: [
          "120 frames per second (FPS) for hyper-realistic simulation.",
          "24 frames per second (FPS), matches physical photo shutter traditions.",
          "60 frames per second (FPS) for fluid digital gaming.",
          "10 frames per second (FPS) to save cloud storage space."
        ],
        correctIndex: 1,
        explanation: "24 FPS delivers a classic motion blur that humans associate with cinematic movies. Higher speeds look clinical or resembles reality TV feeds."
      }
    ]
  },
  {
    id: "advanced_programming",
    topic: "Advanced Level Computer Programming",
    courseCode: "ZIO03/001/26",
    courseFee: 2500,
    duration: "4 Months",
    slogan: "Deep Algorithms, High Concurrency API Services & Defensive Code",
    intro: "Advanced programming concepts including database, automation, and secure software design. Resolve complex backends, thread concurrency, and data structures.",
    points: [
      "Time Complexity (Big O Notation): Auditing logic steps to secure O(1) or O(N log N) speeds over O(N²) crawl loops.",
      "RESTful API Integrity: Designing secure endpoint paths (`/api/*`) utilizing token-based CORS and rate limit buffers.",
      "Asynchronous Event Architectures: Coordinating promises, worker threads, and event loops to handle high concurrency smoothly.",
      "Database Modeling and Joins: Normalizing schemas and utilizing foreign index keys to query millions of rows in milliseconds.",
      "Secure System Gates: Guarding backend architectures against SQL Injection, XSS, and unauthorized credentials leaks."
    ],
    selfAssessment: [
      {
        question: "What does an O(N²) time complexity signify in software operations?",
        options: [
          "The script will run at lightning speed, regardless of input volume.",
          "Execution overhead grows quadratically, meaning a 10x input increase triggers a 100x increase in operation loops.",
          "The physical system will demand 5 times more CPU servers.",
          "Encryption key lengths are automatically doubled."
        ],
        correctIndex: 1,
        explanation: "Quadratic time O(N²) (often triggered by nested loops) bogs down on large data collections. Senior architects avoid it, preferring O(N log N) algorithms."
      },
      {
        question: "What constitutes a proactive prevention against SQL Injection attacks on endpoints?",
        options: [
          "Encoding all string variables into hexadecimal coordinates manually.",
          "Re-routing requests to clients for verification.",
          "Using parameterized queries and prepared statements to isolate instruction commands from incoming data inputs.",
          "Erasing key table schemas from the disk."
        ],
        correctIndex: 2,
        explanation: "Parameterization treats user inputs strictly as parameters, never as executable code strings. Malicious injected scripts remain benign text variables."
      },
      {
        question: "How does 'Asynchronous Event Handling' boost Node.js thread efficiency?",
        options: [
          "By creating hundreds of physical CPU cores on demand.",
          "By utilizing non-blocking operations so the main single thread can cycle other requests while waiting for disk or network I/O events.",
          "By converting compiled files into client side packages.",
          "By forcing callers to reload their browser pages during data updates."
        ],
        correctIndex: 1,
        explanation: "Instead of sleeping while waiting for databases, Node registers a callback and continues cycling. The event loop fires the callback upon I/O arrival."
      },
      {
        question: "Which of the following represents a standard HTTP response code for a missing or unregistered endpoint?",
        options: [
          "200 OK",
          "500 Server Error",
          "404 Not Found",
          "403 Forbidden"
        ],
        correctIndex: 2,
        explanation: "404 is the classic HTTP standard error telling the client browser that the requested URI location does not point to any active backend handler in the router."
      },
      {
        question: "What is CORS (Cross-Origin Resource Sharing) designed to regulate?",
        options: [
          "How database tables join across relational indexes.",
          "A browser security gate restricting web scripts from pulling assets from distinct domain servers without authorization headers.",
          "How fast microcontrollers can send sensor signals to remote MQTT relays.",
          "The maximum size parameter for file uploads."
        ],
        correctIndex: 1,
        explanation: "CORS prevents rogue scripts on website A from calling private APIs on server B inside the browser session, protecting user cookies and identity data."
      }
    ]
  },
  {
    id: "motion_graphics",
    topic: "Motion Graphics",
    courseCode: "ZIO05/001/26",
    courseFee: 2500,
    duration: "4 Months",
    slogan: "Professional Keyframe Vectors, Animation Interpolations & Particle Effects",
    intro: "Professional motion graphics and animation training with industry-standard tools. Understand keyframes, vector scaling, interpolation, and rendering pipelines.",
    points: [
      "Keyframe Interpolation: Mastering linear paths (rigid speed) vs Ease-In/Ease-Out curves (natural physical rhythms).",
      "Dynamic Kinetic Typography: Animating text blocks using tracking bounds, scale scales, and coordinated character fades.",
      "The Layer Parent Anchor: Linking complex child graphics to a single parent null block to scale nested systems cleanly.",
      "Particle Engine Fields: Simulating natural wind, sparks, ambient stardust, or realistic liquid ripples inside scenes.",
      "The Render Pipeline: Exporting lossless alpha formats or web-optimized animations utilizing modern lightweight lottie files."
    ],
    selfAssessment: [
      {
        question: "What does an 'Ease-In' interpolation curve simulate in physics animations?",
        options: [
          "An immediate, structural, rigid speed that starts and stops with zero acceleration.",
          "A realistic object starting completely static and slowly accelerating up to speed, matching standard physical friction properties.",
          "A bouncy, chaotic movement that bounces off boundary coordinates.",
          "An immediate fade out that deletes the active graphic layer."
        ],
        correctIndex: 1,
        explanation: "Natural movements have weight and momentum. Easing curves adjust parameter progression based on math, smoothing transitions."
      },
      {
        question: "Why are vector-based 'Lottie Files' highly popular inside web and mobile applications?",
        options: [
          "Lottie files automatically translate static English books into vocal audio summaries.",
          "They represent animations via lightweight JSON data arrays that scale infinitely without pixel artifacts or heavy memory consumption.",
          "They isolate the server from undergoing cyber security intrusion attacks.",
          "They disable browser web socket errors dynamically in background mode."
        ],
        correctIndex: 1,
        explanation: "Lottie exports raw keyframes into JSON markup. Web engines read this code and draw the shapes dynamically on a canvas, saving bandwidth."
      },
      {
        question: "What occurs when you parent Graphic Layer A to Graphic Layer B in timelines?",
        options: [
          "Layer A is deleted automatically to optimize screen layout.",
          "Layer A inherits all scale, coordinates, and rotation offsets of Layer B automatically, while maintaining its own relative offsets.",
          "An export error is thrown because layers cannot coexist inside nested paradigms.",
          "The file is encrypted and hidden from county administration checks."
        ],
        correctIndex: 1,
        explanation: "Parenting binds components coordinate spaces together. Moving the parent automatically moves the child, keeping compound assemblies synchronized."
      },
      {
        question: "What is the primary function of a Motion Shutter Angle parameter?",
        options: [
          "Defining the camera viewing angle inside a bento-grid layout.",
          "Simulating realistic directional motion blur on rapid moving objects, mirroring actual physical cameras.",
          "Reducing the exported video frame size files on the hard disk.",
          "Generating random gold colored banners on the website headers."
        ],
        correctIndex: 1,
        explanation: "Shutter angle dictates motion blur. A larger angle blends frames together more dramatically during high-velocity movements, enhancing realism."
      },
      {
        question: "Which of the following describes the 'Alpha Channel' in visual layouts?",
        options: [
          "The first priority course module listed in the digital catalog.",
          "The designated color space reserved strictly for grey tones.",
          "A mask layer containing transparency values, letting background content show through unoccupied areas.",
          "The security rules validation protocol on the county server database."
        ],
        correctIndex: 2,
        explanation: "Standard files store Red, Green, and Blue values (RGB). Adding an Alpha channel (RGBA) allows layering transparent elements perfectly on background layers."
      }
    ]
  },
  {
    id: "maintenance_troubleshooting",
    topic: "Basic Maintenance and Troubleshooting",
    courseCode: "ZIO08/001/26",
    courseFee: 2500,
    duration: "4 Months",
    slogan: "Diagnostics, Part Replaced, OS Tuning & Cyber Guard",
    intro: "Essential computer maintenance, troubleshooting, and security awareness. Repair system errors, understand hardware diagnostics, and secure files.",
    points: [
      "Hardware Component Anatomy: Recognizing motherboard logic, CPU caches, RAM chips, storage bounds, and backup power.",
      "The Blue Screen Diagnostics: Examining crash logs and event files to pinpoint faulty system files or conflict drivers.",
      "Disk Clearing and OS Tuning: Cleaning up temporary assets, cache registers, and registry blocks to speed up user experiences.",
      "Peripheral and Driver Synchronization: Managing operational software triggers that bridge physical ports with code registers.",
      "Clean Operating Environment: Safe physical maintenance guidelines to shield microchips from moisture, static, and heat bottlenecks."
    ],
    selfAssessment: [
      {
        question: "What is the primary operational difference between Random Access Memory (RAM) and a Hard Disk Drive (HDD/SSD)?",
        options: [
          "RAM is expensive and stores records permanently, while hard disks are volatile clearing blocks.",
          "RAM is fast, volatile temporary storage that clears on shutdown, while HDDs and SSDs write files permanently onto stable media.",
          "RAM can only process written numbers, while hard drives handle text sequences only.",
          "RAM is a system database stored exclusively in remote cloud hosting servers."
        ],
        correctIndex: 1,
        explanation: "RAM feeds active processes directly. When electricity cuts off, RAM contents evaporate. Hard drives retain records for future startups."
      },
      {
        question: "Which keyboard shortcut utility is standard to invoke the Task Manager of a stalled computer to terminate lagging tasks?",
        options: [
          "Ctrl + Shift + Esc",
          "Alt + Spacebar",
          "Ctrl + Enter",
          "Ctrl + Alt + Spacebar"
        ],
        correctIndex: 0,
        explanation: "On modern systems, Task Manager displays instant active thread logs and memory consumption, assisting scholars to isolate and end frozen systems."
      },
      {
        question: "How does a Solid State Drive (SSD) boost computer performance compared to a classic rotational Hard Disk Drive (HDD)?",
        options: [
          "SSDs use laser beams that automatically repair software code bugs.",
          "SSDs use physical spinning plates that read data sequentially.",
          "SSDs write data to non-volatile flash memory chips with zero mechanical latency, offering immensely faster read/write speeds.",
          "SSDs bypass browser websocket restrictions."
        ],
        correctIndex: 2,
        explanation: "SSDs have no moving mechanical parts. They read and write records directly via high-density electrical paths, decreasing OS boot speeds to seconds."
      },
      {
        question: "What is a 'Device Driver' inside operating systems?",
        options: [
          "A hardware driver who delivers computers physically across Kanduyi and Webuye districts.",
          "An administrative script that registers student credentials in the ledger.",
          "A localized translator software bridging operating system commands with raw physical circuit parameters.",
          "An encryption key that locks the keyboard from unapproved typing."
        ],
        correctIndex: 2,
        explanation: "Drivers translate general OS commands (e.g. 'draw line') into signals that unique brands of hardware (e.g. printer chips) can physically decode."
      },
      {
        question: "What does a high CPU operating temperature (above 90°C) trigger inside modern computer systems to prevent melting?",
        options: [
          "The computer automatically doubles its RAM bandwidth.",
          "The thermal safety logic throttles CPU performance speeds, or triggers immediate shutdown to avoid permanent circuit damage.",
          "A standard email is dispatched to the county administrator.",
          "The computer translates its active programs into python script variables."
        ],
        correctIndex: 1,
        explanation: "Thermal throttling is a defensive safety shield. Chips reduce calculations to drop heat, shutting down if temperatures breach safe thresholds."
      }
    ]
  },
  {
    id: "digital_service_delivery",
    topic: "Integrated Digital Service Delivery",
    courseCode: "ZIO01/001/26",
    courseFee: 3000,
    duration: "4 Months",
    slogan: "Comprehensive Digital Literacy, e-Government Operations & Cyber Operations",
    intro: "Comprehensive digital literacy and cyber operations training for modern service delivery. Connect local systems efficiently to county frameworks and digital hubs.",
    points: [
      "The Digital Citizen Paradigm: Accessing and processing formal transactions securely inside e-government portals.",
      "Mobile Integration Gateways: Standardizing M-Pesa API payload exchanges to process public fees or tuition securely.",
      "Decentralized Civic Hubs: Deploying low-latency local Wi-Fi relays to feed educational reference libraries to remote regions.",
      "Data Safety and Form Archival: Designing clean, secure user submission structures with redundant PDF backup archives.",
      "Local Asset Mobilization: Connecting candidate skills with active marketplace vacancies across Western Kenya."
    ],
    selfAssessment: [
      {
        question: "What constitutes the master purpose of an 'e-Government Portal' inside developing districts?",
        options: [
          "To force all community members to buy high-priced computers.",
          "To centralize public document registry, fee processing, and administrative permits online, lowering delivery overheads and corruption vectors.",
          "To replace school directors with automated AI servers.",
          "To stream international sports events for free on local nets."
        ],
        correctIndex: 1,
        explanation: "e-Government cuts out physical gatekeeping and endless queues. Structured online access secures direct ledger postings and uniform public treatment."
      },
      {
        question: "How do REST APIs assist e-Citizen platforms looking to process merchant payments?",
        options: [
          "They automatically change bank balances without permission.",
          "They enable secure digital handshake exchanges between civic systems and mobile money gateways (e.g. Lipa Na M-Pesa).",
          "They print a hard copy receipt on the user's printer.",
          "They translate database schemas into readable books on demand."
        ],
        correctIndex: 1,
        explanation: "Web APIs send structured payloads containing price, account, and transaction codes. The payment gate resolves the payment, returning an approved response."
      },
      {
        question: "Why are localized off-grid Wi-Fi relays valuable to students in rural Webuye and Kanduyi?",
        options: [
          "They connect directly to satellite arrays without hardware equipment.",
          "They host local copies of academy textbooks and lessons, allowing students to study without costly mobile data charges.",
          "They make the student's physical device batteries last 3 times longer.",
          "They disable all examinations dynamically inside the school."
        ],
        correctIndex: 1,
        explanation: "Connectivity has costs. Local digital offline archives allow infinite reads of massive study textbooks from local cache servers completely data-free."
      },
      {
        question: "What does 'Digital Integrity' demand when handling sensitive public registration details?",
        options: [
          "Disclosing all submitted profile records on the public forum to prove transparency.",
          "Anonymizing personal data, encrypting critical storage, and restricting access to certified county administrators.",
          "Storing database records in public spreadsheets that anyone can edit.",
          "Deleting applicant details immediately after the meeting."
        ],
        correctIndex: 1,
        explanation: "Governance mandates privacy behavior. Restricting data profiles to authenticated staff protects student details from marketing bots or credential theft."
      },
      {
        question: "How does a 'Digital Skill Ledger' support localized economic empowerment?",
        options: [
          "By automatically printing out money certificates for participants.",
          "By logging verified student course achievements and assessments score hashes, proving job-readiness instantly to certified employers.",
          "By increasing the price of printed textbooks on the online store.",
          "By restricting students from moving outside their district boundaries."
        ],
        correctIndex: 1,
        explanation: "Authentic, digitized proof of capability lowers hiring hesitation, directly connecting talent with actual technical developer vacancies."
      }
    ]
  },
  {
    id: "computer_programming_office",
    topic: "Computer Programming & Digital Literacy",
    courseCode: "ZIO02/001/26",
    courseFee: 2500,
    duration: "4 Months",
    slogan: "Master Microsoft Office, Excel Financial Models & Professional Layouts",
    intro: "Foundation course covering Microsoft Office Suite and digital integrity. Understand Word processing layouts, fast spreadsheets modeling, and electronic document integrity.",
    points: [
      "Document Styling in Word: Setting legal margins, style guides, headers, table of contents, and structural indices.",
      "Excel Accounting Formulas: Master cell grid calculations with raw equations like SUM, AVERAGE, COUNT, and IF statements.",
      "The VLOOKUP and XLOOKUP Indexing: Dynamic data matching across massive record files and secondary spreadsheets.",
      "Visual Presentation Dynamics in PPT: Crafting high-impact presentations using strict contrast rules and minimal bullet clutter.",
      "High-Speed Data Entry Ethics: Establishing rapid typing speeds paired with absolute attention to input verification."
    ],
    selfAssessment: [
      {
        question: "What does an equals sign (=) preceding a cell entry inside Excel indicate?",
        options: [
          "The cell will align its text strictly to the left margin border.",
          "Excel must treat the following expression as a calculation formula instead of flat text values.",
          "The cell is locked from undergoing any future editing modifications.",
          "The values are automatically synced with the remote database server."
        ],
        correctIndex: 1,
        explanation: "The leading equals sign triggers the Excel calculation parser to evaluate cell mathematical coordinates and output the computed value."
      },
      {
        question: "In professional report writing in Microsoft Word, which margin constraint is standard?",
        options: [
          "No margins whatsoever to save printing paper sizes.",
          "Standard 1 inch (2.54 cm) margins on all sides to hold balance and text layout breathing grids.",
          "Left-hand margin only, with zero borders on the right side.",
          "Variable margins that change size dynamically with every page."
        ],
        correctIndex: 1,
        explanation: "Consistent standard margins preserve visual tracking, leaving spaces that keep printed reports readable and aesthetic."
      },
      {
        question: "What is the primary function of the `=XLOOKUP()` formula in modern spreadsheets?",
        options: [
          "To automatically convert Excel values into Google Slides coordinates.",
          "To scan a column range for a specific search value and return the corresponding data from any column in the row, without direction restrictions.",
          "To calculate the average coordinate values of multiple cells.",
          "To check if the sheet file contains any software viruses."
        ],
        correctIndex: 1,
        explanation: "XLOOKUP is the powerful successor of VLOOKUP. It scans both left and right, handles vertical and horizontal records, and includes default if-not-found fallbacks."
      },
      {
        question: "Which visual style maximizes audience attention during slide presentations?",
        options: [
          "Packing full pages of tiny 10px text and reading it verbatim.",
          "Applying high contrast colors, spacious negative space, large typography, and crisp, minimal bullet summaries.",
          "Using seven flashing background animations and sound effects on every slide.",
          "Keeping all slide slides in black-and-white code blocks only."
        ],
        correctIndex: 1,
        explanation: "Slides are visual companions, not transcript read-outs. Large typography and generous space force the audience to focus on the speaker's vocal guidance."
      },
      {
        question: "Why acts 'Typing Accuracy' as a superior skill compared to pure 'Typing Speed'?",
        options: [
          "By default, typing fast automatically triggers microchip overheating errors.",
          "Because speed with mistakes creates chaotic data records that demand hours of costly manual auditing and correction.",
          "Because computers automatically lock if accuracy drops below 50%.",
          "Because accuracy reduces the physical size parameter of exported files."
        ],
        correctIndex: 1,
        explanation: "Data integrity is critical. Slow, accurate entry beats hyper-fast sloppy inputs on every occasion. Correctness is the baseline of digital systems."
      }
    ]
  }
];

export const BIBLE_LESSONS: Lesson[] = [
  {
    id: "bible_theology",
    topic: "Biblical Hermeneutics & Systematic Theology",
    courseCode: "BIB01/001/26",
    courseFee: 2500,
    duration: "4 Months",
    slogan: "Learn to Study, Parse, and Apply Holy Scriptures with Contextual Rigor",
    intro: "Students will explore the scientific methods of scripture translation and exegesis, understanding original Hebrew-Greek paradigms, historical backdrops, covenant shifts, and systematic theology frameworks.",
    points: [
      "Foundations of Exegesis: Learning to separate 'exegesis' (drawing the text's original meaning out) from 'eisegesis' (reading your own pre-selected bias in) to maintain objective biblical interpretation.",
      "The Seven Covenants of Scripture: Mapping historical timeline agreements from Edenic and Abrahamic covenants to the ultimate fulfillment under the New Covenant of Jesus Christ.",
      "Linguistic Context & Greek-Hebrew Word Studies: Unpacking original vocabulary (such as Agape, Logos, and Shammah) inside ancient manuscripts, clarifying theological translation layers.",
      "Cultural & Historical Grounding: Examining ancient Near-Eastern geography, Roman-Hellenistic politics, and cultural traditions to decode prophetic visions and epistles.",
      "Practical Hermeneutical Application: Moving from historic meaning to modern execution boundaries, helping leaders preach sound sermons in local assemblies like Bungoma, Kenya."
    ],
    selfAssessment: [
      {
        question: "What is the key difference between Exegesis and Eisegesis?",
        options: [
          "Exegesis translates texts into local Swahili, whereas eisegesis is purely English study.",
          "Exegesis extracts the original author's intended meaning from the text, while eisegesis forces a reader's subjective ideas into it.",
          "Exegesis only analyzes the Old Testament covenants, while eisegesis covers the epistles.",
          "Exegesis utilizes digital calculators, while eisegesis uses offline notes."
        ],
        correctIndex: 1,
        explanation: "Exegesis literally means 'to lead out'. Safe theology demands exegesis—drawing truth from scripture rather than reading custom beliefs into it."
      },
      {
        question: "Under Systematic Theology, how is the Abrahamic Covenant classified?",
        options: [
          "As an conditional law-based decree that collapsed with Moses.",
          "As an unconditional covenant of promise, pointing directly to global blessing in Jesus.",
          "As a temporary agricultural contract restricted to farming sectors.",
          "As a secret code that requires Gemini AI credentials to decode."
        ],
        correctIndex: 1,
        explanation: "The Abrahamic Covenant is unconditional (Genesis 15) and serves as the master blueprint for redemptive history, ultimately fulfilled under Christ's global lineage."
      },
      {
        question: "Why are Hebrew and Greek studies valuable for local Christian apologists?",
        options: [
          "Because English translations are completely invalid.",
          "Because they reveal subtle nuances, structural grammar, and literary formats of the original manuscripts, overcoming translation gaps.",
          "To allow pastors to charge higher tuition fees for local Bible School certificates.",
          "To secure Wi-Fi hotspot links from external network intrusions."
        ],
        correctIndex: 1,
        explanation: "Original languages provide the rawest truth of scripture. Understanding Greek/Hebrew words prevents dogmatic errors based on weak English translations."
      },
      {
        question: "What is the primary danger of ignoring historical-cultural context during Bible study?",
        options: [
          "The reader might use the wrong size visual font on their sermon guide.",
          "It leads to severe misinterpretation, extracting allegorical or legalistic codes that contradict original intentions.",
          "It prevents the student from receiving their digital diploma PDF.",
          "It slows down the database sync frequency on server consoles."
        ],
        correctIndex: 1,
        explanation: "Scripture was written *to* a specific people at a specific time. Stripping verses from their historical-cultural canvas leads to cultic legalism or modern error."
      },
      {
        question: "In sermon preparation, how is 'Application' properly separated from the 'Textual Interpretation'?",
        options: [
          "Interpretation explains what the passage *meant* then; application connects that timeless truth to what we must *do* today.",
          "Application must ignore the original text to sound relevant to modern ears.",
          "Interpretation is handled exclusively by heads of portals, while students only do application.",
          "They are identical; no distinction is necessary under ethical statesmanship guides."
        ],
        correctIndex: 0,
        explanation: "Exegesis first defines target meaning. Application translates that meaning into relevant, ethical daily action, maintaining scriptural authority."
      }
    ]
  },
  {
    id: "bible_ministry",
    topic: "Homiletics, Ministry, & Pastoral Counseling",
    courseCode: "BIB02/001/26",
    courseFee: 2500,
    duration: "4 Months",
    slogan: "Sermon Design, Active Theological Listening, and Compassionate Counseling",
    intro: "A rigorous pastoral training course teaching sermon design (Homiletics), local administration, church history, counseling and crisis resolution.",
    points: [
      "The Three Homiletic Methods: Structuring Sermons into Topical, Textual, and Expository styles to communicate biblical truths clearly.",
      "The Active Listening Ministry: Mastering empathetic counseling techniques, establishing physical and spiritual sanctuary spaces.",
      "Church Administration and Ethics: Managing assembly funds transparently, planning community outreach, and avoiding power abuses.",
      "Spiritual Care in Crisis: Guiding families through grief, trauma, and sickness using biblically grounded pastoral counseling frameworks.",
      "Local Servant Mobilization: Running community outreach initiatives, agricultural co-ops, and literacy campaigns under servant-leadership parameters."
    ],
    selfAssessment: [
      {
        question: "Which sermon structure is defined as 'Expository Homiletics'?",
        options: [
          "A talk sharing interesting moral stories and personal anecdotes with no Bible citation.",
          "A systematic sermon that walks line-by-line of a single scriptural passage, exposing its literal context and direct truth.",
          "An administrative lecture outlining regional security quotas and county boundaries.",
          "A short speech delivered strictly off-the-grid when Wi-Fi hotspots collapse."
        ],
        correctIndex: 1,
        explanation: "Expository preaching makes the main point of the scripture passage the main point of the sermon, maintaining absolute alignment with text files."
      },
      {
        question: "How does Pastoral Counseling differ from secular psychotherapy frameworks?",
        options: [
          "It ignores clinical psychological insights entirely to maintain safety.",
          "It combines clinical human care techniques with biblical truth, prayer, and spiritual regeneration parameters.",
          "It charges no fee and has no professional standards in place.",
          "It requires all patients to have minor admin credentials first."
        ],
        correctIndex: 1,
        explanation: "Pastoral counseling respects active therapeutic sciences, but anchors ultimate restoration in covenantal hope, repentance, grace, and relational peace in Christ."
      },
      {
        question: "Under ministerial ethics, how should church ledger funds be managed?",
        options: [
          "By the head pastor privately to speed up local operational purchases.",
          "With transparent independent accounts, multi-signature check approvals, and routine disclosures to the general assembly.",
          "By converting all assembly collection cash into digital tokens in background mode.",
          "By ignoring physical ledger receipts to reduce administration workloads."
        ],
        correctIndex: 1,
        explanation: "Ethical stewardship demands flawless asset transparency. Multi-person oversight prevents financial errors, protects pastors, and builds deep community trust."
      },
      {
        question: "What constitutes the core focus of 'The ministry of presence' during pastoral crisis care?",
        options: [
          "Delivering a lengthy, logical lecture on systematic theology to the grieving family.",
          "Simply being present, actively listening, and extending quiet empathy and love during severe loss.",
          "Writing a detailed digital PDF report about the patient's condition for the admin portal.",
          "Re-routing regional payments to minor admin accounts."
        ],
        correctIndex: 1,
        explanation: "In deep trauma, answers are often unwelcome. The ministry of presence values human dignity, offering supportive silence and simple compassionate reassurance."
      },
      {
        question: "Why is local community outreach highlighted as a key biblical pastoral duty?",
        options: [
          "To raise the count of paying members so tuition fees are fully covered.",
          "Because theological wisdom is dead without fruit. True ministry mobilizes believers to serve the marginalized, feed the hungry, and build community.",
          "To replace local educational systems with church-governed programs in Kenya.",
          "To allow pastors to act as overseers of the financial portal."
        ],
        correctIndex: 1,
        explanation: "James 2 defines pure religion as serving orphans and widows. Faith must translate into practical localized empowerment, grounding the Gospel in works of love."
      }
    ]
  }
];

