import { PortfolioInfo, Experience, Skill } from "../types";

/**
 * Extracts Google Drive / Docs File ID from multiple URL patterns
 */
export function extractGoogleDriveFileId(url: string): { id: string; type: "drive" | "docs" } | null {
  if (!url || typeof url !== "string") return null;

  // Google Docs Document pattern
  const docsMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i);
  if (docsMatch && docsMatch[1]) {
    return { id: docsMatch[1], type: "docs" };
  }

  // Google Drive standard file pattern: /file/d/{id}
  const fileMatch = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]+&)*id=)([a-zA-Z0-9_-]+)/i);
  if (fileMatch && fileMatch[1]) {
    return { id: fileMatch[1], type: "drive" };
  }

  // General id query param on google domain
  if (url.includes("google.com")) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    if (idMatch && idMatch[1]) {
      return { id: idMatch[1], type: "drive" };
    }
  }

  return null;
}

/**
 * Gets a clean online embed/preview URL suitable for iframes and online viewing
 */
export function getResumeOnlineViewUrl(resumeUrl?: string): string {
  if (!resumeUrl || typeof resumeUrl !== "string") return "";

  const driveInfo = extractGoogleDriveFileId(resumeUrl);
  if (driveInfo) {
    if (driveInfo.type === "docs") {
      return `https://docs.google.com/document/d/${driveInfo.id}/preview`;
    }
    return `https://drive.google.com/file/d/${driveInfo.id}/preview`;
  }

  return resumeUrl;
}

/**
 * Gets a direct downloadable URL
 */
export function getResumeDirectDownloadUrl(resumeUrl?: string): string {
  if (!resumeUrl || typeof resumeUrl !== "string") return "";

  const driveInfo = extractGoogleDriveFileId(resumeUrl);
  if (driveInfo) {
    if (driveInfo.type === "docs") {
      return `https://docs.google.com/document/d/${driveInfo.id}/export?format=pdf`;
    }
    return `https://drive.google.com/uc?export=download&id=${driveInfo.id}`;
  }

  return resumeUrl;
}

/**
 * Trigger immediate client-side download of the resume file
 */
export async function downloadResumeFile(
  portfolio: Partial<PortfolioInfo>,
  experiences: Experience[] = [],
  skills: Skill[] = []
): Promise<{ success: boolean; message: string }> {
  const fileName = `${(portfolio.name || "Vignesh").replace(/[^a-zA-Z0-9_-]/g, "_")}_Resume.pdf`;

  if (portfolio.resumeUrl && portfolio.resumeUrl.trim()) {
    const resumeUrl = portfolio.resumeUrl.trim();
    const driveInfo = extractGoogleDriveFileId(resumeUrl);

    if (driveInfo) {
      const downloadUrl = getResumeDirectDownloadUrl(resumeUrl);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true, message: "Google Drive download initiated." };
    }

    // Try fetch blob for direct download (works for /uploads/ and same-origin / CORS-enabled URLs)
    try {
      if (resumeUrl.startsWith("/") || resumeUrl.startsWith("data:") || resumeUrl.startsWith("blob:") || resumeUrl.includes(window.location.host)) {
        const res = await fetch(resumeUrl);
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
          return { success: true, message: "Resume downloaded successfully." };
        }
      }
    } catch {
      // Fall through to standard anchor click if fetch fails
    }

    // Fallback: direct anchor download
    const link = document.createElement("a");
    link.href = resumeUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, message: "Resume file opened for download." };
  }

  // If no resume URL uploaded yet, generate and trigger print/download of formatted portfolio resume
  generateAndDownloadHtmlResume(portfolio, experiences, skills, fileName);
  return { success: true, message: "Interactive Portfolio Resume generated and downloaded." };
}

/**
 * Generate a clean standalone resume HTML document and trigger print/download
 */
function generateAndDownloadHtmlResume(
  portfolio: Partial<PortfolioInfo>,
  experiences: Experience[] = [],
  skills: Skill[] = [],
  fileName: string
) {
  const name = portfolio.name || "Vignesh";
  const role = portfolio.role || "Digital Creator & UI/UX Designer";
  const bio = portfolio.longBio || portfolio.shortBio || "Creative UI/UX Designer and AI Video Artist.";
  const location = portfolio.locationText || portfolio.location || "Trichy, Tamil Nadu, India";

  const expHtml = experiences
    .filter((e) => e.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(
      (e) => `
      <div style="margin-bottom: 18px;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px;">
          <h3 style="margin:0; font-size:16px; color:#0f2854;">${e.role}</h3>
          <span style="font-size:13px; color:#64748b; font-weight:600;">${e.startDate} – ${e.currentPosition ? "Present" : e.endDate || "Present"}</span>
        </div>
        <div style="color:#2563eb; font-weight:bold; font-size:14px; margin-bottom:6px;">${e.companyName}</div>
        <p style="margin:0 0 6px 0; font-size:13px; line-height:1.5; color:#334155;">${e.description || ""}</p>
      </div>
    `
    )
    .join("");

  const skillsHtml = skills
    .filter((s) => s.visible !== false)
    .map(
      (s) => `
      <span style="display:inline-block; background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:4px; font-size:12px; font-weight:600; margin:3px;">
        ${s.name} ${s.experience ? `(${s.experience})` : ""}
      </span>
    `
    )
    .join("");

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${name} - Resume</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; background: #fff; }
    h1 { margin: 0; font-size: 28px; color: #0f2854; letter-spacing: -0.5px; }
    h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #1d4ed8; border-bottom: 2px solid #93c5fd; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
    .tagline { font-size: 16px; color: #0284c7; font-weight: 600; margin-top: 4px; }
    .meta { font-size: 13px; color: #64748b; margin-top: 8px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; padding: 12px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 13px; color: #0369a1;">📄 Generated Portfolio Resume Document</span>
    <button onclick="window.print()" style="background: #1d4ed8; color: white; border: none; padding: 6px 16px; border-radius: 4px; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
  </div>

  <div>
    <h1>${name}</h1>
    <div class="tagline">${role}</div>
    <div class="meta">📍 ${location}</div>
  </div>

  <h2>Summary</h2>
  <p style="font-size: 14px; color: #334155;">${bio}</p>

  ${expHtml ? `<h2>Experience</h2>${expHtml}` : ""}

  ${skillsHtml ? `<h2>Skills & Proficiencies</h2><div style="margin-top: 8px;">${skillsHtml}</div>` : ""}

  <div style="margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
    ${name} • Digital Portfolio Workstation
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, "_blank");
  if (!printWindow) {
    // If popup blocked, trigger file download
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName.replace(".pdf", ".html");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
