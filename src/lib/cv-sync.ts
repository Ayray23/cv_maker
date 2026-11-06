import type { CvDocument } from "./cv";

function timestamp(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Resolve same-ID local/cloud copies without discarding a newer offline edit. */
export function mergeCvDocuments(remote: CvDocument[], local: CvDocument[]): CvDocument[] {
  const byId = new Map<string, CvDocument>();
  for (const document of remote) byId.set(document.id, document);
  for (const document of local) {
    const cloudCopy = byId.get(document.id);
    if (!cloudCopy || timestamp(document.updatedAt) >= timestamp(cloudCopy.updatedAt)) {
      byId.set(document.id, document);
    }
  }
  return [...byId.values()].sort((a, b) => timestamp(b.updatedAt) - timestamp(a.updatedAt));
}
