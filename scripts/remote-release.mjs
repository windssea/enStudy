// Compare immutable lesson identities as well as the aggregate release label.
export function sameLessonRelease(actual, expected) {
  if (!Array.isArray(actual?.lessons) || actual.release !== expected.release)
    return false;
  const identities = (lessons) =>
    lessons
      .map(
        (lesson) =>
          `${lesson.id}@${lesson.version ?? 1}:${lesson.releaseId ?? ""}`,
      )
      .sort();
  return (
    JSON.stringify(identities(actual.lessons)) ===
    JSON.stringify(identities(expected.lessons))
  );
}
