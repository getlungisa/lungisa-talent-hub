export type Role = "Barista" | "Front of house" | "Kitchen" | "Delivery";

export type Glance = {
  location: string;
  transport: string;
  earliestStart: string;
  weekends: string;
  languages: string;
  workStatus: string;
  availability: string;
  experience: string;
};

export type Candidate = {
  id: string;
  firstName: string;
  role: Role;
  rating: 1 | 2 | 3 | 4 | 5;
  attributes: { label: string; detail: string }[];
  assessment: string;
  background: string;
  verified: boolean;
  glance: Glance;
};

export const candidates: Candidate[] = [
  {
    id: "sipho",
    firstName: "Sipho",
    role: "Barista",
    rating: 4,
    attributes: [
      { label: "Reliable", detail: "Submitted his structured task two days early and followed up to confirm receipt." },
      { label: "Strong communicator", detail: "Spoke clearly and thoughtfully in interview, asks careful questions." },
      { label: "Punctual", detail: "Arrived 15 minutes early to every assessment touchpoint." },
    ],
    assessment:
      "Sipho completed a structured task with a 48-hour deadline and submitted ahead of time with a follow-up message checking it had been received. In his interview he spoke clearly about why reliability matters to him.",
    background:
      "Sipho grew up in Khayelitsha and has been pulling shots at a community café in Site B for the last eighteen months. He is studying part-time and wants to work somewhere he can keep learning the craft properly.",
    verified: true,
    glance: {
      location: "Khayelitsha, Cape Town",
      transport: "Public transport · MyCiti route",
      earliestStart: "6:00am",
      weekends: "Available",
      languages: "English · isiXhosa",
      workStatus: "SA ID holder",
      availability: "Full time or part time",
      experience: "18 months barista experience",
    },
  },
  {
    id: "ayanda",
    firstName: "Ayanda",
    role: "Front of house",
    rating: 5,
    attributes: [
      { label: "Warm", detail: "Naturally puts people at ease – guests and colleagues both noticed it." },
      { label: "Bilingual", detail: "Fluent in isiXhosa and English, comfortable switching between them all day." },
      { label: "Self-starter", detail: "Reorganised her training notes unprompted and shared them with peers." },
    ],
    assessment:
      "Ayanda ran a mock service shift and read the room beautifully – she remembered names, anticipated reorders, and recovered a small mistake without making it anyone else's problem.",
    background:
      "Ayanda is from Langa and has worked weekends in a family-run restaurant since she was sixteen. She wants a role where front of house is taken seriously as a craft, not treated as a stopgap.",
    verified: true,
    glance: {
      location: "Langa, Cape Town",
      transport: "Public transport · Train + taxi",
      earliestStart: "6:30am",
      weekends: "Available",
      languages: "English · isiXhosa",
      workStatus: "SA ID holder",
      availability: "Full time",
      experience: "3 years front of house",
    },
  },
  {
    id: "thandi",
    firstName: "Thandi",
    role: "Kitchen",
    rating: 4,
    attributes: [
      { label: "Detail-oriented", detail: "Sets up her station the same way every time. Cleans as she goes." },
      { label: "Fast learner", detail: "Picked up three new prep techniques in a single trial morning." },
      { label: "Calm under pressure", detail: "Steady when service got loud during her assessment." },
    ],
    assessment:
      "Thandi spent a morning in a working prep kitchen and took clear, careful notes on every new technique. By lunchtime she was running her own mise en place without prompting.",
    background:
      "Thandi cooks at home for a household of seven and has helped cater weddings in Gugulethu most weekends for the last two years. She wants a kitchen that will teach her properly.",
    verified: true,
    glance: {
      location: "Gugulethu, Cape Town",
      transport: "Public transport · Taxi route",
      earliestStart: "5:30am",
      weekends: "Available",
      languages: "English · isiXhosa",
      workStatus: "SA ID holder",
      availability: "Full time",
      experience: "2 years catering kitchens",
    },
  },
  {
    id: "nomvula",
    firstName: "Nomvula",
    role: "Front of house",
    rating: 5,
    attributes: [
      { label: "Reliable", detail: "Twelve consecutive weeks of perfect attendance in her last role." },
      { label: "Warm", detail: "Remembers regulars by name and order without needing to be told." },
      { label: "Punctual", detail: "Builds in extra travel time and is always early for shift handover." },
    ],
    assessment:
      "Nomvula has run front of house at a small bistro in Observatory for the last year. Her references describe her as the person who quietly holds the room together.",
    background:
      "Nomvula lives in Philippi and travels in for work every day. She is looking for a smaller, owner-led venue where she can build a long-term home.",
    verified: true,
    glance: {
      location: "Philippi, Cape Town",
      transport: "Public transport · MyCiti route",
      earliestStart: "6:00am",
      weekends: "Available",
      languages: "English · isiXhosa · Afrikaans",
      workStatus: "SA ID holder",
      availability: "Full time",
      experience: "1 year front of house lead",
    },
  },
  {
    id: "thabo",
    firstName: "Kagiso",
    role: "Barista",
    rating: 3,
    attributes: [
      { label: "Punctual", detail: "Never late across a four-week trial period." },
      { label: "Self-starter", detail: "Built his own latte art practice routine on his off days." },
      { label: "Eager to learn", detail: "Asks specific, thoughtful questions about extraction and dialling in." },
    ],
    assessment:
      "Kagiso is earlier in his coffee journey but his work ethic is unmistakable. He completed every practical exercise and asked for feedback on each one.",
    background:
      "Kagiso is from Mfuleni and started in coffee at a community training programme nine months ago. He is looking for a shop that will invest in him as he grows.",
    verified: true,
    glance: {
      location: "Mfuleni, Cape Town",
      transport: "Public transport · Train + taxi",
      earliestStart: "6:00am",
      weekends: "Available",
      languages: "English · isiXhosa",
      workStatus: "SA ID holder",
      availability: "Full time or part time",
      experience: "9 months barista training",
    },
  },
];

export const roleFilters: ("All roles" | Role)[] = [
  "All roles",
  "Barista",
  "Front of house",
  "Kitchen",
  "Delivery",
];