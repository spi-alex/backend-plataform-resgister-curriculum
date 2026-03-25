// mockCurriculums.ts

import { generateCurriculums } from "./curriculumFactory";
import type { Curriculum } from "./curriculumFactory";

export const mockCurriculums: Curriculum[] = generateCurriculums(500);
