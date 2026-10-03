// Every value in CoolGrid carries where it came from. Unknown is null, never a guess.
//   public       - downloaded from an official dataset
//   declared     - a planning input an officer would enter (capacity, staffing, backup)
//   illustrative - a labelled placeholder for the demo
//   unknown      - blocks the result and raises a question
export type Status = "public" | "declared" | "illustrative" | "unknown";

export type Sourced<T> = {
  value: T | null;
  status: Status;
  source: string; // e.g. "ABS SEIFA 2021, IRSD by SAL"
  date: string; // data date or download date
  licence?: string; // e.g. "CC BY 4.0"
};

export const isKnown = <T>(s: Sourced<T>): s is Sourced<T> & { value: T } => s.value !== null && s.status !== "unknown";
