import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedUniversity = {
  name: string;
  country: string;
  city: string;
  foundedYear: number;
  tuitionUsd: number;
  rankingScore: number;
  description: string;
  website: string;
  majors: string[];
  requirement: {
    requiredExams: string;
    minExamScore: string;
    minGpa: number;
    notes: string;
  };
};

const universities: SeedUniversity[] = [
  {
    name: "Nazarbayev University",
    country: "Kazakhstan",
    city: "Astana",
    foundedYear: 2010,
    tuitionUsd: 5000,
    rankingScore: 91,
    description:
      "Kazakhstan's flagship research university with English-medium instruction and partnerships with Cambridge, Duke, and UCL.",
    website: "https://nu.edu.kz",
    majors: ["Computer Science", "Engineering", "Business", "Medicine"],
    requirement: {
      requiredExams: "ЕНТ / SAT, IELTS or TOEFL",
      minExamScore: "ЕНТ ≥ 100 or SAT ≥ 1200; IELTS ≥ 6.0",
      minGpa: 3.6,
      notes: "Interview and NU-administered entrance exam also required for most schools.",
    },
  },
  {
    name: "Al-Farabi Kazakh National University",
    country: "Kazakhstan",
    city: "Almaty",
    foundedYear: 1934,
    tuitionUsd: 2500,
    rankingScore: 78,
    description:
      "The largest classical university in Kazakhstan and Central Asia, offering the broadest range of majors in the country.",
    website: "https://www.kaznu.kz",
    majors: ["Law", "Business", "Computer Science", "International Relations"],
    requirement: {
      requiredExams: "ЕНТ",
      minExamScore: "ЕНТ ≥ 70",
      minGpa: 3.2,
      notes: "Grant seats allocated by ЕНТ score ranking; paid seats have a lower threshold.",
    },
  },
  {
    name: "Kazakh-British Technical University",
    country: "Kazakhstan",
    city: "Almaty",
    foundedYear: 2001,
    tuitionUsd: 3200,
    rankingScore: 74,
    description:
      "A technical university focused on oil & gas, IT, and engineering with strong industry partnerships.",
    website: "https://kbtu.edu.kz",
    majors: ["Computer Science", "Engineering", "Business"],
    requirement: {
      requiredExams: "ЕНТ or SAT",
      minExamScore: "ЕНТ ≥ 75 or SAT ≥ 1050",
      minGpa: 3.3,
      notes: "English-track programs require IELTS ≥ 5.5.",
    },
  },
  {
    name: "Massachusetts Institute of Technology",
    country: "USA",
    city: "Cambridge",
    foundedYear: 1861,
    tuitionUsd: 57000,
    rankingScore: 98,
    description:
      "World-leading institute for engineering, computer science, and physical sciences with an emphasis on research.",
    website: "https://mit.edu",
    majors: ["Computer Science", "Engineering", "Physics", "Mathematics"],
    requirement: {
      requiredExams: "SAT/ACT (optional), TOEFL/IELTS for international students",
      minExamScore: "SAT ≥ 1500 (competitive); TOEFL ≥ 100",
      minGpa: 3.9,
      notes: "Extremely competitive holistic admissions; essays and recommendations weigh heavily.",
    },
  },
  {
    name: "Stanford University",
    country: "USA",
    city: "Stanford",
    foundedYear: 1885,
    tuitionUsd: 56000,
    rankingScore: 97,
    description:
      "Leading research university in Silicon Valley, strong in computer science, business, and entrepreneurship.",
    website: "https://stanford.edu",
    majors: ["Computer Science", "Business", "Engineering", "Design"],
    requirement: {
      requiredExams: "SAT/ACT (optional), TOEFL/IELTS for international students",
      minExamScore: "SAT ≥ 1480 (competitive); TOEFL ≥ 100",
      minGpa: 3.9,
      notes: "Holistic review; acceptance rate under 4%.",
    },
  },
  {
    name: "Arizona State University",
    country: "USA",
    city: "Tempe",
    foundedYear: 1885,
    tuitionUsd: 29000,
    rankingScore: 68,
    description:
      "Large public research university known for innovation and accessible admissions relative to its research output.",
    website: "https://asu.edu",
    majors: ["Business", "Computer Science", "Design", "Journalism"],
    requirement: {
      requiredExams: "SAT/ACT (optional), TOEFL/IELTS",
      minExamScore: "SAT ≥ 1100; TOEFL ≥ 80",
      minGpa: 3.0,
      notes: "Direct admission for many majors with GPA ≥ 3.0.",
    },
  },
  {
    name: "University of Oxford",
    country: "UK",
    city: "Oxford",
    foundedYear: 1096,
    tuitionUsd: 44000,
    rankingScore: 96,
    description:
      "One of the world's oldest universities, renowned across humanities, law, medicine, and sciences.",
    website: "https://ox.ac.uk",
    majors: ["Law", "Medicine", "Computer Science", "International Relations"],
    requirement: {
      requiredExams: "A-Levels or IB, IELTS/TOEFL, subject admissions test/interview",
      minExamScore: "A-Levels A*A*A; IB 38-40; IELTS ≥ 7.0",
      minGpa: 3.9,
      notes: "Subject-specific written tests (e.g. TSA, MAT) and interviews required.",
    },
  },
  {
    name: "University College London",
    country: "UK",
    city: "London",
    foundedYear: 1826,
    tuitionUsd: 34000,
    rankingScore: 89,
    description:
      "A top-ranked multidisciplinary university in central London with strengths in engineering, medicine, and architecture.",
    website: "https://ucl.ac.uk",
    majors: ["Engineering", "Medicine", "Computer Science", "Design"],
    requirement: {
      requiredExams: "A-Levels or IB, IELTS/TOEFL",
      minExamScore: "A-Levels AAA; IB 36-38; IELTS ≥ 6.5",
      minGpa: 3.7,
      notes: "Personal statement reviewed alongside predicted grades.",
    },
  },
  {
    name: "University of Manchester",
    country: "UK",
    city: "Manchester",
    foundedYear: 1824,
    tuitionUsd: 30000,
    rankingScore: 82,
    description:
      "A large research-intensive university with a strong reputation in engineering, business, and life sciences.",
    website: "https://manchester.ac.uk",
    majors: ["Business", "Engineering", "Computer Science", "Journalism"],
    requirement: {
      requiredExams: "A-Levels or IB, IELTS/TOEFL",
      minExamScore: "A-Levels AAB; IB 34; IELTS ≥ 6.5",
      minGpa: 3.5,
      notes: "Some programs (Medicine) require the UCAT admissions test.",
    },
  },
  {
    name: "Technical University of Munich",
    country: "Germany",
    city: "Munich",
    foundedYear: 1868,
    tuitionUsd: 1500,
    rankingScore: 88,
    description:
      "Germany's leading technical university, tuition-free for most programs with strong engineering and CS departments.",
    website: "https://tum.de",
    majors: ["Engineering", "Computer Science", "Physics"],
    requirement: {
      requiredExams: "Abitur/equivalent, TestAS, German (TestDaF) or English (IELTS) proficiency",
      minExamScore: "Abitur ≤ 2.0; IELTS ≥ 6.5 for English-taught programs",
      minGpa: 3.6,
      notes: "Only a small administrative semester fee (~€150); no tuition for most degrees.",
    },
  },
  {
    name: "Heidelberg University",
    country: "Germany",
    city: "Heidelberg",
    foundedYear: 1386,
    tuitionUsd: 1500,
    rankingScore: 85,
    description:
      "Germany's oldest university, strong across medicine, natural sciences, and the humanities.",
    website: "https://uni-heidelberg.de",
    majors: ["Medicine", "Law", "International Relations", "Physics"],
    requirement: {
      requiredExams: "Abitur/equivalent, DSH or TestDaF (German-taught), IELTS (English-taught)",
      minExamScore: "Abitur ≤ 2.3; TestDaF ≥ 4",
      minGpa: 3.5,
      notes: "Medicine is allocated centrally via hochschulstart.de with a separate quota system.",
    },
  },
  {
    name: "National University of Singapore",
    country: "Singapore",
    city: "Singapore",
    foundedYear: 1905,
    tuitionUsd: 17000,
    rankingScore: 92,
    description:
      "Asia's top-ranked university, especially strong in computer science, engineering, and business.",
    website: "https://nus.edu.sg",
    majors: ["Computer Science", "Business", "Engineering", "Design"],
    requirement: {
      requiredExams: "SAT/ACT or A-Levels/IB, TOEFL/IELTS",
      minExamScore: "SAT ≥ 1450; A-Levels AAA; IELTS ≥ 6.5",
      minGpa: 3.7,
      notes: "Highly competitive for international applicants; interviews for some programs.",
    },
  },
  {
    name: "University of Tokyo",
    country: "Japan",
    city: "Tokyo",
    foundedYear: 1877,
    tuitionUsd: 5000,
    rankingScore: 87,
    description:
      "Japan's top-ranked university with growing English-taught programs (PEAK) for international students.",
    website: "https://u-tokyo.ac.jp",
    majors: ["Engineering", "Computer Science", "Physics", "International Relations"],
    requirement: {
      requiredExams: "EJU (Examination for Japanese University Admission) or SAT for PEAK program, TOEFL/IELTS",
      minExamScore: "EJU top-tier scores; TOEFL ≥ 90 for PEAK",
      minGpa: 3.6,
      notes: "PEAK program allows admission without Japanese language proficiency.",
    },
  },
  {
    name: "University of Toronto",
    country: "Canada",
    city: "Toronto",
    foundedYear: 1827,
    tuitionUsd: 45000,
    rankingScore: 86,
    description:
      "Canada's top research university, strong across nearly all fields including CS, medicine, and business.",
    website: "https://utoronto.ca",
    majors: ["Computer Science", "Business", "Medicine", "Engineering"],
    requirement: {
      requiredExams: "High school transcript, SAT/ACT (optional), TOEFL/IELTS",
      minExamScore: "GPA ≥ 3.7 equivalent; IELTS ≥ 6.5",
      minGpa: 3.7,
      notes: "Program-specific supplementary applications for CS and Commerce.",
    },
  },
  {
    name: "University of Melbourne",
    country: "Australia",
    city: "Melbourne",
    foundedYear: 1853,
    tuitionUsd: 32000,
    rankingScore: 84,
    description:
      "Australia's top-ranked university with a flexible, US-style undergraduate curriculum.",
    website: "https://unimelb.edu.au",
    majors: ["Law", "Business", "Computer Science", "Design"],
    requirement: {
      requiredExams: "High school certificate/IB, IELTS/TOEFL",
      minExamScore: "ATAR ≥ 90 equivalent; IB ≥ 34; IELTS ≥ 6.5",
      minGpa: 3.5,
      notes: "Many professional degrees (Law, Medicine) are graduate-entry only.",
    },
  },
  {
    name: "Sorbonne University",
    country: "France",
    city: "Paris",
    foundedYear: 1257,
    tuitionUsd: 3000,
    rankingScore: 80,
    description:
      "A historic Parisian university strong in humanities, sciences, and medicine, with low public tuition.",
    website: "https://sorbonne-universite.fr",
    majors: ["Medicine", "Law", "Physics", "International Relations"],
    requirement: {
      requiredExams: "Parcoursup application (EU) or Études en France (international), DELF/TCF or IELTS",
      minExamScore: "Strong secondary transcript; DELF B2 for French-taught programs",
      minGpa: 3.4,
      notes: "Non-EU applicants apply via Campus France in their home country.",
    },
  },
  {
    name: "KAIST",
    country: "South Korea",
    city: "Daejeon",
    foundedYear: 1971,
    tuitionUsd: 4000,
    rankingScore: 85,
    description:
      "South Korea's leading science and technology university, fully English-taught undergraduate curriculum.",
    website: "https://kaist.ac.kr",
    majors: ["Computer Science", "Engineering", "Physics"],
    requirement: {
      requiredExams: "School transcript + essays, TOEFL/IELTS (or TOPIK for Korean track)",
      minExamScore: "Top decile transcript; TOEFL ≥ 85",
      minGpa: 3.7,
      notes: "Generous scholarships available for admitted international students.",
    },
  },
  {
    name: "ETH Zurich",
    country: "Switzerland",
    city: "Zurich",
    foundedYear: 1855,
    tuitionUsd: 1500,
    rankingScore: 93,
    description:
      "Switzerland's top technical university, globally elite in engineering, computer science, and physics.",
    website: "https://ethz.ch",
    majors: ["Engineering", "Computer Science", "Physics", "Mathematics"],
    requirement: {
      requiredExams: "Matura/equivalent secondary diploma, entrance exam if diploma not directly recognized",
      minExamScore: "Strong STEM grades; German proficiency for most Bachelor's programs",
      minGpa: 3.7,
      notes: "Bachelor's programs are mostly German-taught; Master's programs are largely English-taught.",
    },
  },
  {
    name: "IE University",
    country: "Spain",
    city: "Madrid",
    foundedYear: 1973,
    tuitionUsd: 27000,
    rankingScore: 73,
    description:
      "A private, internationally-oriented university known for business, design, and entrepreneurship programs.",
    website: "https://ie.edu",
    majors: ["Business", "Design", "International Relations", "Law"],
    requirement: {
      requiredExams: "IE Admission Test or SAT/ACT, IELTS/TOEFL",
      minExamScore: "IE Admission Test competitive score; IELTS ≥ 6.5",
      minGpa: 3.3,
      notes: "Interview is a mandatory part of the admissions process.",
    },
  },
  {
    name: "Astana IT University",
    country: "Kazakhstan",
    city: "Astana",
    foundedYear: 2019,
    tuitionUsd: 2800,
    rankingScore: 65,
    description:
      "A newer Kazakh university focused exclusively on IT, software engineering, and digital innovation.",
    website: "https://astanait.edu.kz",
    majors: ["Computer Science", "Engineering"],
    requirement: {
      requiredExams: "ЕНТ",
      minExamScore: "ЕНТ ≥ 65",
      minGpa: 3.0,
      notes: "Strong industry partnerships with local tech companies for internships.",
    },
  },
];

async function main() {
  console.log(`Seeding ${universities.length} universities...`);

  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.admissionRequirement.deleteMany();
  await prisma.university.deleteMany();
  await prisma.major.deleteMany();

  for (const u of universities) {
    await prisma.university.create({
      data: {
        name: u.name,
        country: u.country,
        city: u.city,
        foundedYear: u.foundedYear,
        tuitionUsd: u.tuitionUsd,
        rankingScore: u.rankingScore,
        description: u.description,
        website: u.website,
        majors: {
          connectOrCreate: u.majors.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
        requirement: {
          create: {
            requiredExams: u.requirement.requiredExams,
            minExamScore: u.requirement.minExamScore,
            minGpa: u.requirement.minGpa,
            notes: u.requirement.notes,
          },
        },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
