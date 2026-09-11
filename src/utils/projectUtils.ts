import { Project } from "../types";

/**
 * Merge two project records non-destructively, preserving rich fields
 * (summary, aboutProject, workflow, outputs, thumbnail, etc.)
 */
export function mergeProjectItem(primary: any, fallback: any): Project {
  if (!primary && !fallback) return {} as Project;
  if (!primary) return fallback as Project;
  if (!fallback) return primary as Project;

  const outputs = (Array.isArray(primary.outputs) && primary.outputs.length > 0)
    ? primary.outputs
    : ((Array.isArray(primary.projectImages) && primary.projectImages.length > 0)
      ? primary.projectImages
      : (fallback.outputs || fallback.projectImages || []));

  const projectImages = (Array.isArray(primary.projectImages) && primary.projectImages.length > 0)
    ? primary.projectImages
    : (outputs.length > 0 ? outputs : (fallback.projectImages || fallback.outputs || []));

  return {
    ...fallback,
    ...primary,
    title: (primary.title && primary.title.trim()) || fallback.title || "Untitled Project",
    category: primary.category || fallback.category || "UX/UI Projects",
    shortDescription: (primary.shortDescription && primary.shortDescription.trim()) || fallback.shortDescription || "",
    summary: (primary.summary && primary.summary.trim()) || fallback.summary || "",
    aboutProject: (primary.aboutProject && primary.aboutProject.trim()) || fallback.aboutProject || "",
    fullDescription: (primary.fullDescription && primary.fullDescription.trim()) || fallback.fullDescription || "",
    thumbnail: primary.thumbnail || fallback.thumbnail || "",
    heroMediaType: primary.heroMediaType || fallback.heroMediaType || "image",
    heroMediaUrl: primary.heroMediaUrl || fallback.heroMediaUrl || "",
    heroMediaEmbedCode: primary.heroMediaEmbedCode || fallback.heroMediaEmbedCode || "",
    caseStudyUrl: primary.caseStudyUrl || fallback.caseStudyUrl || "",
    caseStudyVideoUrl: primary.caseStudyVideoUrl || fallback.caseStudyVideoUrl || "",
    showCaseStudyButton: primary.showCaseStudyButton !== undefined ? primary.showCaseStudyButton : (fallback.showCaseStudyButton ?? true),
    caseStudyButtonText: primary.caseStudyButtonText || fallback.caseStudyButtonText || "WATCH CASE STUDY",
    projectUrl: primary.projectUrl || fallback.projectUrl || "",
    roles: (Array.isArray(primary.roles) && primary.roles.length > 0) ? primary.roles : (fallback.roles || []),
    workflow: (Array.isArray(primary.workflow) && primary.workflow.length > 0) ? primary.workflow : (fallback.workflow || []),
    outputs,
    projectImages,
    impactMetrics: (Array.isArray(primary.impactMetrics) && primary.impactMetrics.length > 0) ? primary.impactMetrics : (fallback.impactMetrics || []),
    tags: (Array.isArray(primary.tags) && primary.tags.length > 0) ? primary.tags : (fallback.tags || []),
    date: primary.date || fallback.date || "2026",
    featured: primary.featured !== undefined ? primary.featured : (fallback.featured ?? false),
    visible: primary.visible !== undefined ? primary.visible : (fallback.visible ?? true),
    order: primary.order ?? fallback.order ?? 1,
    accentColor: primary.accentColor || fallback.accentColor || "#5460a8",
    bgColor: primary.bgColor || fallback.bgColor || "#8ea1d4",
  } as Project;
}

/**
 * Intelligently merges projects from two sources (e.g. server API and persistent local cache),
 * guaranteeing that rich fields (workflow steps, outputs, roles, summary, about, caseStudy)
 * are NEVER wiped out by an empty or stripped payload.
 */
export function smartMergeProjects(
  serverList: Project[] | any[] | undefined | null,
  cachedList: Project[] | any[] | undefined | null
): Project[] {
  const server = Array.isArray(serverList) ? serverList : [];
  const cached = Array.isArray(cachedList) ? cachedList : [];

  if (server.length === 0 && cached.length === 0) return [];
  if (server.length === 0) return cached as Project[];
  if (cached.length === 0) return server as Project[];

  const merged: Project[] = [];
  const processedIds = new Set<string>();

  for (const s of server) {
    if (!s || !s.id) continue;
    const sid = String(s.id);
    processedIds.add(sid);

    // Look for matching local cached project to merge rich fields
    const matchingCached = cached.find((c: any) => 
      c && (
        String(c.id) === sid ||
        (c.title && s.title && c.title.trim().toLowerCase() === s.title.trim().toLowerCase())
      )
    );

    if (matchingCached) {
      merged.push(mergeProjectItem(s, matchingCached));
    } else {
      merged.push(s as Project);
    }
  }

  // Include any local cached items that were newly created and not yet on server
  for (const c of cached) {
    if (c && c.id && !processedIds.has(String(c.id))) {
      const alreadyExists = merged.some(
        (m) => m.title && c.title && m.title.trim().toLowerCase() === c.title.trim().toLowerCase()
      );
      if (!alreadyExists) {
        merged.push(c as Project);
      }
    }
  }

  return merged;
}

