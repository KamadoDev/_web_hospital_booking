import { prisma } from "../../../config/prisma.js";
import { foldVietnamese } from "../rules/text-normalizer.js";
import type { NLUResult } from "../ai/nlu.schema.js";
import type { ChatBookingDraft } from "../chatbot.types.js";

type ResolvedEntities = { patch: Partial<ChatBookingDraft> };

const scoreCandidate = (query: string, candidate: string) => {
  const normalizedQuery = foldVietnamese(query);
  const normalizedCandidate = foldVietnamese(candidate);

  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedQuery === normalizedCandidate) return 100;
  if (normalizedCandidate.includes(normalizedQuery)) return 80;
  if (normalizedQuery.includes(normalizedCandidate)) return 70;

  const queryTokens = new Set(normalizedQuery.split(" ").filter(Boolean));
  const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
  const overlap = candidateTokens.filter((token) => queryTokens.has(token)).length;

  return overlap ? (overlap / Math.max(queryTokens.size, candidateTokens.length)) * 60 : 0;
};

const findBest = <T>(
  query: string | null | undefined,
  items: T[],
  toSearchText: (item: T) => string,
) => {
  if (!query) return undefined;

  return items
    .map((item) => ({ item, score: scoreCandidate(query, toSearchText(item)) }))
    .filter((candidate) => candidate.score >= 35)
    .sort((a, b) => b.score - a.score)[0]?.item;
};

class ChatbotEntityResolver {
  async resolve(result: NLUResult): Promise<ResolvedEntities> {
    const [departments, packages, doctors] = await Promise.all([
      result.entities.departmentName
        ? prisma.department.findMany({
            where: { isActive: true },
            select: { id: true, name: true, slug: true },
            take: 50,
          })
        : Promise.resolve([]),
      result.entities.packageName
        ? prisma.package.findMany({
            where: { isActive: true },
            select: { id: true, name: true, slug: true, departmentId: true },
            take: 50,
          })
        : Promise.resolve([]),
      result.entities.doctorName
        ? prisma.doctorProfile.findMany({
            where: { isAvailable: true, user: { isActive: true } },
            select: {
              id: true,
              title: true,
              specialization: true,
              departmentId: true,
              user: { select: { fullName: true } },
            },
            take: 50,
          })
        : Promise.resolve([]),
    ]);

    const department = findBest(
      result.entities.departmentName,
      departments,
      (item) => `${item.name} ${item.slug || ""}`,
    );
    const packageItem = findBest(
      result.entities.packageName,
      packages,
      (item) => `${item.name} ${item.slug || ""}`,
    );
    const doctor = findBest(
      result.entities.doctorName,
      doctors,
      (item) =>
        `${item.title || ""} ${item.user.fullName} ${item.specialization || ""}`,
    );

    // Chỉ đưa ID vào draft sau khi khớp database; không tin trực tiếp tên từ AI.
    const patch: Partial<ChatBookingDraft> = {
      departmentId:
        department?.id || packageItem?.departmentId || doctor?.departmentId,
      departmentSlug: department?.slug || undefined,
      packageId: packageItem?.id,
      packageSlug: packageItem?.slug || undefined,
      serviceMode: packageItem ? "PACKAGE" : doctor ? "DOCTOR_ONLY" : undefined,
      doctorId: doctor?.id,
      date: result.entities.date || undefined,
      timePeriod: result.entities.timePeriod || undefined,
      symptoms: result.entities.symptoms,
      bodyParts: result.entities.bodyParts,
      symptomDuration: result.entities.duration || undefined,
      symptomSeverity: result.entities.severity || undefined,
      associatedSymptoms: result.entities.associatedSymptoms,
      reason: result.entities.reason || undefined,
    };

    return { patch };
  }
}

export default new ChatbotEntityResolver();