// Stable IDs shared by data, engine and app. Logic must use these, never display names.
// Suburbs use ABS Suburbs and Localities (SAL) 2021 codes. The list lives in JSON so data scripts can read it too.
import areas from "./data/study-areas.json";

export type StudyArea = { sal: string; name: string; lga: string };
export const STUDY_AREAS: StudyArea[] = areas;
export const SAL_CODES = STUDY_AREAS.map((a) => a.sal);
