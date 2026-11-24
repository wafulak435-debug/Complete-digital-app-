// Server-only confidential examination answer keys (never bundled into client src/dist)
export interface ExamAnswerKeyEntry {
  correctIndex: number;
  explanation: string;
}

export interface ExamKeyRecord {
  topic: string;
  answers: ExamAnswerKeyEntry[];
}

export const BUILTIN_EXAM_ANSWER_KEYS: Record<string, ExamKeyRecord> = {
  "visionary_leadership": {
    "topic": "Visionary Leadership",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Visionary leadership inspires engagement from within. By clearly communicating the core 'Why', leaders earn willing dedication rather than forced compliance."
      },
      {
        "correctIndex": 1,
        "explanation": "Analogies and slogans bypass complex jargon loops, ensuring that every level of the cohort can accurately memorize and execute the primary mission goals."
      },
      {
        "correctIndex": 1,
        "explanation": "A vision that ignores local culture and resource constraints is built on sand. Solid execution requires aligning goals with localized strengths."
      },
      {
        "correctIndex": 1,
        "explanation": "Quarterly milestones bridge the gap between grand long-term goals and daily focus, ensuring steady momentum without losing sight of the broader horizon."
      },
      {
        "correctIndex": 1,
        "explanation": "Ongoing vision audits create continuous learning loops. They ensure that misalignments or strategic drift are caught and addressed proactively."
      }
    ]
  },
  "effective_communication": {
    "topic": "Effective Communication",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Active listening demonstrates humility and gathers crucial local context. Speaking less and studying more prevents strategic mistakes."
      },
      {
        "correctIndex": 1,
        "explanation": "Closed loop verification requires the listener to actively process and re-state the directive, exposing any gaps or misunderstandings instantly."
      },
      {
        "correctIndex": 0,
        "explanation": "Acknowledging feedback builds trust. When individuals feel heard, defensive walls crumble, fostering genuine collaborative problem-solving."
      },
      {
        "correctIndex": 1,
        "explanation": "Empathy helps bridge divides. By styling the message around the audience's point of view, you turn resistance into understanding."
      },
      {
        "correctIndex": 1,
        "explanation": "Multi-channel distribution minimizes transmission failure. It provides redundant pathways for critical information, securing consistent execution."
      }
    ]
  },
  "strategic_management": {
    "topic": "Strategic Thinking & Management",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Strategy is proactive. It builds defensive buffers and anticipates second-order consequences to protect the long-term vision."
      },
      {
        "correctIndex": 1,
        "explanation": "First-order choices create immediate visible wins. Second-order effects are the downstream ripples, which are often negative if not planned defensively."
      },
      {
        "correctIndex": 1,
        "explanation": "Unforeseen shocks are guaranteed to occur. Strategic buffering preserves stability and provides breathing room to adjust formulas."
      },
      {
        "correctIndex": 0,
        "explanation": "When crisis hits, rigid paths break. Objective centering provides a magnetic north, allowing the team to innovate new paths to the same goal."
      },
      {
        "correctIndex": 1,
        "explanation": "Scenario planning replaces panic with structured steps. It ensures that when worst-case realities hit, the team has a pre-verified manual ready."
      }
    ]
  },
  "ethical_governance": {
    "topic": "Ethical Governance & Stewardship",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Authority is never an end in itself. Ethical leaders view power as a resource delegated to them solely to lower barriers for others."
      },
      {
        "correctIndex": 1,
        "explanation": "Transparency is the ultimate detergent for corruption. Public, auditable financial records keep systems healthy and build secure organizational faith."
      },
      {
        "correctIndex": 1,
        "explanation": "Dignity is a master key. When people feel valued as intellectual agents with real potential, they invest their best energies into execution."
      },
      {
        "correctIndex": 1,
        "explanation": "Disclosure builds protective walls around organizational integrity. It prevents personal bias from eroding the objective trust of the cohort."
      },
      {
        "correctIndex": 1,
        "explanation": "Internal reviews are prone to blindspots. Independent auditors provide an objective sanity check, ensuring system compliance and safety."
      }
    ]
  },
  "conflict_resolution": {
    "topic": "Conflict Resolution & Alignment",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Friction indicates underlying design gaps. An ethical leader uses the energy of conflict to reveal hidden system bottlenecks and forge better paths."
      },
      {
        "correctIndex": 1,
        "explanation": "Positions are rigid, but interests are negotiable. Identifying shared baseline values allows divided teams to find creative win-win solutions."
      },
      {
        "correctIndex": 1,
        "explanation": "Defensiveness melts when a participant feels fully heard. Providing uninterrupted speaking time establishes respect and uncovers core truths."
      },
      {
        "correctIndex": 1,
        "explanation": "Synthesis takes the best of both perspectives. The resulting checklist feels co-owned by both parties, ensuring deep commitment."
      },
      {
        "correctIndex": 1,
        "explanation": "Paper agreements can fail in real-world application. Routine check-ins ensure minor friction is addressed before it escalates back into a crisis."
      }
    ]
  },
  "delegation_empowerment": {
    "topic": "Empowered Local Delegation",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "A manager who must approve every line of work becomes a literal bottleneck. Delegation releases energy and raises organization IQ."
      },
      {
        "correctIndex": 1,
        "explanation": "Delegation is built on proven ability. Aligning the complexity of a role with individual skills prevents frustration and system crashes."
      },
      {
        "correctIndex": 1,
        "explanation": "Boundaries don't restrict; they define the playground. Clear scopes prevent fear of overstepping and keep everyone structurally secure."
      },
      {
        "correctIndex": 1,
        "explanation": "Freedom breeds accountability. When you give leaders space to own their decisions, they assume a profound sense of pride in the results."
      },
      {
        "correctIndex": 1,
        "explanation": "Audit loops must be predictable and constructive. They focus on objective outcome goals while supporting the leader's continuous learning."
      }
    ]
  },
  "robotics_automation": {
    "topic": "Robotics and Automation",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "PID controllers use feedback error integrals and derivatives to modulate actuator voltage, preventing mechanical overshoot and jerky movements."
      },
      {
        "correctIndex": 1,
        "explanation": "MQTT utilizes a lightweight publish-subscribe model, making it ideal for remote solar-powered sensors operating over low-bandwidth cellular nodes."
      },
      {
        "correctIndex": 1,
        "explanation": "Ultrasonic sensors emit high-frequency pings and count the time taken to capture the echo, multiplying by the speed of sound to deduce exact distance."
      },
      {
        "correctIndex": 1,
        "explanation": "Conditional irrigation ensures that resource-guzzling pumps run only when necessary, saving water and conserving solar-battery capacities."
      },
      {
        "correctIndex": 1,
        "explanation": "Actuators are the muscles of automation. While sensors observe and chips decide, actuators receive the output voltage to manipulate physical space."
      }
    ]
  },
  "html_css_coding": {
    "topic": "HTML and CSS Coding Course",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "The total size of a CSS box represents the sum of its raw content space, left/right padding widths, and borders. Margins push other boxes away."
      },
      {
        "correctIndex": 1,
        "explanation": "Semantic tags like section, main, header, and footer describe the content layout clearly to search engines and web screen readers."
      },
      {
        "correctIndex": 1,
        "explanation": "Flexbox manages 1-dimensional layouts instantly. Flex layout rules ease alignment, centering, and size adaptation without fixed calculations."
      },
      {
        "correctIndex": 1,
        "explanation": "Media queries (and modern Tailwind utility prefixes like sm:, md:, lg:) allow styling to adapt based on screen dimension thresholds."
      },
      {
        "correctIndex": 1,
        "explanation": "Utility frameworks provide precalculated constraint tokens for margins, padding, and colors. This avoids duplicate CSS write-ups and keeps things cohesive."
      }
    ]
  },
  "python_programming_flyer": {
    "topic": "Python Programming",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Dictionaries use hash maps underneath. Querying by key bypasses search loops and fetches values instantly regardless of size."
      },
      {
        "correctIndex": 1,
        "explanation": "Whitespace indentation is a structural requirement in Python. Incorrect alignment raises direct IndentationError during compile phase."
      },
      {
        "correctIndex": 1,
        "explanation": "Try-except blocks intercept exceptions, executing alternative corrective pathways rather than terminating the operational script."
      },
      {
        "correctIndex": 0,
        "explanation": "Slicing slices collections cleanly. Inclusive of start index and exclusive of end index, it crafts a rapid, lightweight subset copy."
      },
      {
        "correctIndex": 1,
        "explanation": "The with keyword acts as a context manager. It guarantees resource release immediately after block exit, avoiding memory leakage or locked files."
      }
    ]
  },
  "graphic_design": {
    "topic": "Graphic Design",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Vectors declare geometry (points, lines, curves). This secures crisp display branding on large physical posters or microscopic mobile icons."
      },
      {
        "correctIndex": 1,
        "explanation": "Found repeatedly in nature, the golden ratio represents organic balance. Applying it to layout dimensions triggers immediate visual comfort."
      },
      {
        "correctIndex": 1,
        "explanation": "Contrast anchors hierarchy. A readable body font keeps reading comfortable, while bold header fonts guide attention checkpoints."
      },
      {
        "correctIndex": 1,
        "explanation": "Whitespace is not empty waste; it is a vital active force. It frames objects, clarifies relationships, and establishes premium layout elegance."
      },
      {
        "correctIndex": 0,
        "explanation": "Consistent presentation fosters recognition. Style guides keep web apps, print, and physical storefront assets uncompromised and cohesive."
      }
    ]
  },
  "video_editing": {
    "topic": "Introduction to Video Editing",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "J-cuts blend scenes. By letting the listener hear the next scene before they see it, transitions feel fluid, conversational, and natural."
      },
      {
        "correctIndex": 1,
        "explanation": "0dB represents standard absolute ceiling logic thresholds. Vocal peaks hitting 0dB distort. Hovering near -6dB secures crisp sound delivery."
      },
      {
        "correctIndex": 1,
        "explanation": "Consistency precedes styling. Correct first to set a neutral, balanced baseline, then apply artistic grading or custom LUT looks."
      },
      {
        "correctIndex": 1,
        "explanation": "LUTs act as color recipes. They take input colors and apply custom mathematical curves to render cinematic shadow depths or retro warm tones."
      },
      {
        "correctIndex": 1,
        "explanation": "24 FPS delivers a classic motion blur that humans associate with cinematic movies. Higher speeds look clinical or resembles reality TV feeds."
      }
    ]
  },
  "advanced_programming": {
    "topic": "Advanced Level Computer Programming",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Quadratic time O(N²) (often triggered by nested loops) bogs down on large data collections. Senior architects avoid it, preferring O(N log N) algorithms."
      },
      {
        "correctIndex": 2,
        "explanation": "Parameterization treats user inputs strictly as parameters, never as executable code strings. Malicious injected scripts remain benign text variables."
      },
      {
        "correctIndex": 1,
        "explanation": "Instead of sleeping while waiting for databases, Node registers a callback and continues cycling. The event loop fires the callback upon I/O arrival."
      },
      {
        "correctIndex": 2,
        "explanation": "404 is the classic HTTP standard error telling the client browser that the requested URI location does not point to any active backend handler in the router."
      },
      {
        "correctIndex": 1,
        "explanation": "CORS prevents rogue scripts on website A from calling private APIs on server B inside the browser session, protecting user cookies and identity data."
      }
    ]
  },
  "motion_graphics": {
    "topic": "Motion Graphics",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Natural movements have weight and momentum. Easing curves adjust parameter progression based on math, smoothing transitions."
      },
      {
        "correctIndex": 1,
        "explanation": "Lottie exports raw keyframes into JSON markup. Web engines read this code and draw the shapes dynamically on a canvas, saving bandwidth."
      },
      {
        "correctIndex": 1,
        "explanation": "Parenting binds components coordinate spaces together. Moving the parent automatically moves the child, keeping compound assemblies synchronized."
      },
      {
        "correctIndex": 1,
        "explanation": "Shutter angle dictates motion blur. A larger angle blends frames together more dramatically during high-velocity movements, enhancing realism."
      },
      {
        "correctIndex": 2,
        "explanation": "Standard files store Red, Green, and Blue values (RGB). Adding an Alpha channel (RGBA) allows layering transparent elements perfectly on background layers."
      }
    ]
  },
  "maintenance_troubleshooting": {
    "topic": "Basic Maintenance and Troubleshooting",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "RAM feeds active processes directly. When electricity cuts off, RAM contents evaporate. Hard drives retain records for future startups."
      },
      {
        "correctIndex": 0,
        "explanation": "On modern systems, Task Manager displays instant active thread logs and memory consumption, assisting scholars to isolate and end frozen systems."
      },
      {
        "correctIndex": 2,
        "explanation": "SSDs have no moving mechanical parts. They read and write records directly via high-density electrical paths, decreasing OS boot speeds to seconds."
      },
      {
        "correctIndex": 2,
        "explanation": "Drivers translate general OS commands (e.g. 'draw line') into signals that unique brands of hardware (e.g. printer chips) can physically decode."
      },
      {
        "correctIndex": 1,
        "explanation": "Thermal throttling is a defensive safety shield. Chips reduce calculations to drop heat, shutting down if temperatures breach safe thresholds."
      }
    ]
  },
  "digital_service_delivery": {
    "topic": "Integrated Digital Service Delivery",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "e-Government cuts out physical gatekeeping and endless queues. Structured online access secures direct ledger postings and uniform public treatment."
      },
      {
        "correctIndex": 1,
        "explanation": "Web APIs send structured payloads containing price, account, and transaction codes. The payment gate resolves the payment, returning an approved response."
      },
      {
        "correctIndex": 1,
        "explanation": "Connectivity has costs. Local digital offline archives allow infinite reads of massive study textbooks from local cache servers completely data-free."
      },
      {
        "correctIndex": 1,
        "explanation": "Governance mandates privacy behavior. Restricting data profiles to authenticated staff protects student details from marketing bots or credential theft."
      },
      {
        "correctIndex": 1,
        "explanation": "Authentic, digitized proof of capability lowers hiring hesitation, directly connecting talent with actual technical developer vacancies."
      }
    ]
  },
  "computer_programming_office": {
    "topic": "Computer Programming & Digital Literacy",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "The leading equals sign triggers the Excel calculation parser to evaluate cell mathematical coordinates and output the computed value."
      },
      {
        "correctIndex": 1,
        "explanation": "Consistent standard margins preserve visual tracking, leaving spaces that keep printed reports readable and aesthetic."
      },
      {
        "correctIndex": 1,
        "explanation": "XLOOKUP is the powerful successor of VLOOKUP. It scans both left and right, handles vertical and horizontal records, and includes default if-not-found fallbacks."
      },
      {
        "correctIndex": 1,
        "explanation": "Slides are visual companions, not transcript read-outs. Large typography and generous space force the audience to focus on the speaker's vocal guidance."
      },
      {
        "correctIndex": 1,
        "explanation": "Data integrity is critical. Slow, accurate entry beats hyper-fast sloppy inputs on every occasion. Correctness is the baseline of digital systems."
      }
    ]
  },
  "bible_theology": {
    "topic": "Biblical Hermeneutics & Systematic Theology",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Exegesis literally means 'to lead out'. Safe theology demands exegesis—drawing truth from scripture rather than reading custom beliefs into it."
      },
      {
        "correctIndex": 1,
        "explanation": "The Abrahamic Covenant is unconditional (Genesis 15) and serves as the master blueprint for redemptive history, ultimately fulfilled under Christ's global lineage."
      },
      {
        "correctIndex": 1,
        "explanation": "Original languages provide the rawest truth of scripture. Understanding Greek/Hebrew words prevents dogmatic errors based on weak English translations."
      },
      {
        "correctIndex": 1,
        "explanation": "Scripture was written *to* a specific people at a specific time. Stripping verses from their historical-cultural canvas leads to cultic legalism or modern error."
      },
      {
        "correctIndex": 0,
        "explanation": "Exegesis first defines target meaning. Application translates that meaning into relevant, ethical daily action, maintaining scriptural authority."
      }
    ]
  },
  "bible_ministry": {
    "topic": "Homiletics, Ministry, & Pastoral Counseling",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Expository preaching makes the main point of the scripture passage the main point of the sermon, maintaining absolute alignment with text files."
      },
      {
        "correctIndex": 1,
        "explanation": "Pastoral counseling respects active therapeutic sciences, but anchors ultimate restoration in covenantal hope, repentance, grace, and relational peace in Christ."
      },
      {
        "correctIndex": 1,
        "explanation": "Ethical stewardship demands flawless asset transparency. Multi-person oversight prevents financial errors, protects pastors, and builds deep community trust."
      },
      {
        "correctIndex": 1,
        "explanation": "In deep trauma, answers are often unwelcome. The ministry of presence values human dignity, offering supportive silence and simple compassionate reassurance."
      },
      {
        "correctIndex": 1,
        "explanation": "James 2 defines pure religion as serving orphans and widows. Faith must translate into practical localized empowerment, grounding the Gospel in works of love."
      }
    ]
  },
  "evangelism_great_commission": {
    "topic": "Evangelism & The Great Commission",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Jesus commanded His followers to go, make disciples, baptize, and teach all nations—making Evangelism the fundamental mission of the Church."
      },
      {
        "correctIndex": 1,
        "explanation": "1 Peter 3:15 instructs believers to always be prepared to give an answer to everyone who asks, doing so with gentleness and respect."
      },
      {
        "correctIndex": 1,
        "explanation": "Evangelism without discipleship leaves new believers vulnerable. Discipleship fosters long-term spiritual health, community root, and fruitfulness."
      },
      {
        "correctIndex": 1,
        "explanation": "Relational evangelism demonstrates Christ's love in action first, building trust and opening hearts to hear the message of salvation."
      }
    ]
  },
  "church_planting_growth": {
    "topic": "Church Planting, Missions & Community Discipleship",
    "answers": [
      {
        "correctIndex": 1,
        "explanation": "Biblical church planting creates living assemblies that nurture believers, glorify God, and reach surrounding communities with the gospel."
      },
      {
        "correctIndex": 1,
        "explanation": "Small groups foster deep community, allow everyone to exercise spiritual gifts, and provide personal pastoral support that larger gatherings cannot easily offer."
      }
    ]
  }
};
