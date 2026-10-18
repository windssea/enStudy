export function sameLessonRelease(
  actual: unknown,
  expected: {
    release: string;
    lessons: readonly { id: string; version?: number; releaseId?: string }[];
  },
): boolean;
