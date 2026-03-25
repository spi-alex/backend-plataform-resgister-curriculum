import {
  names,
  areas,
  coursesByArea,
  institutions,
  skillsByArea,
  cities,
  educationDescriptions,
  extraCourses,
  languages,
  experiencesTemplates,
  projectTemplates, // ✅ NOVO
  generatePhone
} from "./curriculumData";

// =======================
// TYPES
// =======================
export interface Curriculum {
  id: number;
  name: string;
  area: string;
  course: string;
  institution: string;
  email: string;

  phone: string;
  city: string;

  education: {
    course: string;
    institution: string;
    description: string;
  };

  experiences: {
    role: string;
    company: string;
    period: string;
    description: string;
  }[];

  // ✅ NOVO CAMPO
  projects: {
    title: string;
    description: string;
    technologies: string;
  }[];

  skills: string[];
  extraCourses: string[];
  languages: string[];
}

// =======================
// HELPERS
// =======================
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomItems<T>(array: T[], min = 1, max = 3): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  return [...array]
    .sort(() => 0.5 - Math.random())
    .slice(0, count);
}

function generateId(index: number): number {
  return Number(String(index + 1).padStart(4, "0"));
}

// =======================
// FACTORY
// =======================
export function generateCurriculums(amount = 50): Curriculum[] {
  const curriculums: Curriculum[] = [];

  for (let i = 0; i < amount; i++) {
    const area = randomItem(areas);
    const course = randomItem(coursesByArea[area]);
    const institution = randomItem(institutions);
    const name = randomItem(names);

    curriculums.push({
      id: generateId(i),
      name,
      area,
      course,
      institution,
      email: `${name.toLowerCase().replace(/\s/g, ".")}@email.com`,

      phone: generatePhone(),
      city: randomItem(cities),

      education: {
        course,
        institution,
        description: randomItem(educationDescriptions),
      },

      experiences: randomItems(experiencesTemplates, 1, 3).map(exp => ({
        role: exp.role,
        company: exp.company,
        period: exp.period,
        description: exp.description,
      })),

      // ✅ PROJETOS ACADÊMICOS (70% terão projetos)
      projects:
        Math.random() > 0.3
          ? randomItems(projectTemplates, 1, 2).map(project => ({
              title: project.title,
              description: project.description,
              technologies: project.technologies,
            }))
          : [],

      skills: skillsByArea[area],
      extraCourses: randomItems(extraCourses, 1, 3),
      languages: randomItems(languages, 1, 2),
    });
  }

  return curriculums;
}
