/** Heading id for `sections[index]`. Index, not a slug, so "Home" and "Home!" cannot collide. */
export function sectionHeadingId(sectionIndex: number): string {
  return `section-${sectionIndex}`;
}
