import React, { useState } from "react";
import { Experience } from "../../types";
import { PixelExperienceIcon } from "../PixelIcons";
import {
  IS_FIREBASE_CONNECTED,
  syncMasterStateToFirestore,
  saveExperiencesToFirestore,
  deleteExperienceFromFirestore,
} from "../../services/firebaseService";
import { isUserConnected, syncDatabaseToDrive } from "../../services/googleDriveService";

interface ExperienceManagerProps {
  experiences: Experience[];
  token: string;
  onRefresh: () => void;
  onShowNotification: (msg: string, type?: "success" | "error") => void;
}

export const ExperienceManager: React.FC<ExperienceManagerProps> = ({
  experiences,
  token,
  onRefresh,
  onShowNotification,
}) => {
  const [editingExp, setEditingExp] = useState<Partial<Experience> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expToDelete, setExpToDelete] = useState<Experience | null>(null);

  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExp) return;

    const activeToken = token || localStorage.getItem("admin_token") || "admin";

    try {
      const isNew = !editingExp.id;
      const url = isNew ? "/api/experiences" : `/api/experiences/${editingExp.id}`;
      const method = isNew ? "POST" : "PUT";

      // Process responsibilities, projects, achievements from string or arrays
      const formattedExp = {
        ...editingExp,
        order: typeof editingExp.order === "number" ? editingExp.order : experiences.length + 1,
        visible: editingExp.visible !== false,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(formattedExp),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save experience entry");
      }
      
      try {
        const latestRes = await fetch("/api/experiences", { headers: { Authorization: `Bearer ${activeToken}` } });
        if (latestRes.ok) {
           const latestExp = await latestRes.json();
           if (IS_FIREBASE_CONNECTED) {
              await saveExperiencesToFirestore(latestExp);
              await syncMasterStateToFirestore({ experiences: latestExp });
           }
        }
      } catch (e) {}

      if (isUserConnected()) {
        syncDatabaseToDrive().catch(() => {});
      }

      onShowNotification(isNew ? "Experience entry added!" : "Experience entry updated!", "success");
      setIsModalOpen(false);
      setEditingExp(null);
      onRefresh();
    } catch (err: any) {
      onShowNotification(err.message, "error");
    }
  };

  const handleDeleteExperience = (exp: Experience) => {
    setExpToDelete(exp);
  };

  const executeDeleteExperience = async (id: string) => {
    const activeToken = token || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch(`/api/experiences/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete experience");

      const remainingExp = experiences.filter((e) => e.id !== id);
      if (IS_FIREBASE_CONNECTED) {
        try {
          await deleteExperienceFromFirestore(id);
          await saveExperiencesToFirestore(remainingExp);
          await syncMasterStateToFirestore({ experiences: remainingExp });
        } catch (fsErr) {
          console.warn("Firestore delete experience notice:", fsErr);
        }
      }

      if (isUserConnected()) {
        syncDatabaseToDrive().catch(() => {});
      }

      onShowNotification("Experience entry removed & synced across Live Site", "success");
      onRefresh();
    } catch (err: any) {
      onShowNotification(err.message, "error");
    } finally {
      setExpToDelete(null);
    }
  };

  const handleToggleVisible = async (exp: Experience) => {
    try {
      const res = await fetch(`/api/experiences/${exp.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...exp,
          visible: !exp.visible,
        }),
      });
      if (!res.ok) throw new Error("Failed to update visibility");
      onShowNotification(`Experience ${!exp.visible ? "enabled" : "hidden"}`);
      onRefresh();
    } catch (err: any) {
      onShowNotification(err.message, "error");
    }
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= experiences.length) return;

    const sortedList = [...experiences].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Swap elements in the sorted list
    const temp = sortedList[index];
    sortedList[index] = sortedList[targetIndex];
    sortedList[targetIndex] = temp;

    const orderedIds = sortedList.map((exp) => exp.id);
    const activeToken = token || localStorage.getItem("admin_token") || "admin";

    try {
      const res = await fetch(`/api/experiences/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({ orderedIds }),
      });

      if (!res.ok) throw new Error("Failed to reorder experiences");
      
      try {
        const latestRes = await fetch("/api/experiences", { headers: { Authorization: `Bearer ${token}` } });
        if (latestRes.ok) {
           const latestExp = await latestRes.json();
           if (IS_FIREBASE_CONNECTED) {
              await syncMasterStateToFirestore({ experiences: latestExp });
           }
        }
      } catch (e) {}

      onShowNotification("Experience order updated");
      onRefresh();
    } catch (err: any) {
      onShowNotification(err.message, "error");
    }
  };

  const sortedExperiences = [...experiences].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a1e42] p-4 rounded-md border-2 border-[#1e3a8a]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#38bdf8] tracking-wide flex items-center gap-2">
            <span>💼</span> CAREER &amp; WORK EXPERIENCE MANAGER
          </h2>
          <p className="text-white/70 text-xs mt-0.5">
            Manage your employment history, roles, responsibilities, and achievements displayed in the My Experience window.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingExp({
              companyName: "",
              role: "",
              startDate: "",
              endDate: "Present",
              currentPosition: false,
              description: "",
              responsibilities: [],
              projects: [],
              achievements: [],
              order: experiences.length + 1,
              visible: true,
            });
            setIsModalOpen(true);
          }}
          className="bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white border-2 border-[#60a5fa] px-4 py-2.5 text-xs font-bold rounded cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md flex-shrink-0"
        >
          <span>➕</span> ADD WORK EXPERIENCE
        </button>
      </div>

      {/* Experience List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white/90">EXPERIENCE TIMELINE ({experiences.length})</h3>

        {experiences.length === 0 ? (
          <div className="bg-[#0f2854] border-2 border-[#1e3a8a] p-8 text-center text-white/60 rounded">
            No work experiences listed yet. Click "+ Add Work Experience" above to add your positions.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedExperiences.map((exp, idx) => {
              const respList = Array.isArray(exp.responsibilities)
                ? exp.responsibilities
                : typeof exp.responsibilities === "string"
                ? (exp.responsibilities as string).split("\n").filter(Boolean)
                : [];

              return (
                <div
                  key={exp.id}
                  className={`bg-[#0f2854] border-2 ${
                    exp.visible === false ? "border-[#475569] opacity-60" : "border-[#1e3a8a] hover:border-[#38bdf8]"
                  } p-4 rounded-md transition-all space-y-3`}
                >
                  {/* Top Bar: Title, Date, Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1e3a8a]">
                    <div className="flex items-center gap-3">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveOrder(idx, "up")}
                          className={`px-1.5 py-0.5 text-[10px] rounded border ${
                            idx === 0
                              ? "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"
                              : "bg-[#1e3a8a] text-white border-[#38bdf8] hover:bg-[#2563eb] cursor-pointer"
                          }`}
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === sortedExperiences.length - 1}
                          onClick={() => handleMoveOrder(idx, "down")}
                          className={`px-1.5 py-0.5 text-[10px] rounded border ${
                            idx === sortedExperiences.length - 1
                              ? "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"
                              : "bg-[#1e3a8a] text-white border-[#38bdf8] hover:bg-[#2563eb] cursor-pointer"
                          }`}
                          title="Move Down"
                        >
                          ▼
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-[#38bdf8]">{exp.role}</h4>
                          <span className="text-xs text-[#fbbf24] font-bold">@ {exp.companyName}</span>
                          {exp.currentPosition && (
                            <span className="bg-emerald-900/80 border border-emerald-500 text-emerald-300 text-[10px] px-2 py-0.2 rounded font-bold uppercase">
                              Current Role
                            </span>
                          )}
                          {exp.visible === false && (
                            <span className="bg-red-900/80 border border-red-500 text-red-300 text-[10px] px-1.5 rounded">
                              Hidden
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-white/70 block mt-0.5">
                          📅 {exp.startDate} – {exp.currentPosition ? "Present" : exp.endDate || "Present"}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleToggleVisible(exp)}
                        className={`px-2.5 py-1 rounded text-xs border font-pixel cursor-pointer transition-colors ${
                          exp.visible !== false
                            ? "bg-[#1e293b] text-white/80 border-[#475569] hover:bg-[#334155]"
                            : "bg-[#064e3b] text-emerald-300 border-emerald-500 hover:bg-[#065f46]"
                        }`}
                      >
                        {exp.visible !== false ? "👁️ Hide" : "👁️ Show"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingExp(exp);
                          setIsModalOpen(true);
                        }}
                        className="bg-[#1d4ed8] hover:bg-[#2563eb] text-white border border-[#60a5fa] px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExperience(exp)}
                        className="bg-[#881337] hover:bg-[#9f1239] text-white border border-[#f43f5e] px-2.5 py-1 rounded text-xs cursor-pointer transition-colors"
                        title="Delete Experience"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Description preview */}
                  {exp.description && (
                    <p className="text-white/80 text-xs leading-relaxed">{exp.description}</p>
                  )}

                  {/* Responsibilities bullets */}
                  {respList.length > 0 && (
                    <div className="text-xs text-white/70 pl-2 space-y-0.5">
                      <span className="text-[#38bdf8] font-bold text-[11px] block">Key Highlights:</span>
                      {respList.slice(0, 3).map((r, rIdx) => (
                        <div key={rIdx} className="flex items-start gap-1.5">
                          <span className="text-[#38bdf8]">▶</span>
                          <span className="line-clamp-1">{r}</span>
                        </div>
                      ))}
                      {respList.length > 3 && (
                        <span className="text-[10px] text-[#38bdf8]">+{respList.length - 3} more items...</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && editingExp && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0f2854] border-3 border-[#38bdf8] p-4 sm:p-6 rounded-md space-y-4 max-h-[92vh] flex flex-col my-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1e40af] pb-2 flex-shrink-0">
              <h3 className="text-base font-bold text-[#38bdf8]">
                {editingExp.id ? "EDIT WORK EXPERIENCE" : "ADD WORK EXPERIENCE"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/60 hover:text-white font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveExperience} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs font-pixel">
              {/* Role & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0a152d] border border-[#1e40af] p-3 rounded">
                <div>
                  <label className="block text-white/80 mb-1 font-bold">
                    Job / Role Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingExp.role || ""}
                    onChange={(e) => setEditingExp({ ...editingExp, role: e.target.value })}
                    placeholder="e.g. Lead UI/UX Designer"
                    className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded focus:border-[#38bdf8] outline-none font-pixel"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-1 font-bold">
                    Company / Organization <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingExp.companyName || ""}
                    onChange={(e) => setEditingExp({ ...editingExp, companyName: e.target.value })}
                    placeholder="e.g. Pixel Studio / Freelance"
                    className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded focus:border-[#38bdf8] outline-none font-pixel"
                  />
                </div>
              </div>

              {/* Dates & Current */}
              <div className="bg-[#0a152d] border border-[#1e40af] p-3 rounded space-y-3">
                <span className="text-[#38bdf8] font-bold block uppercase">Timeline &amp; Dates</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white/80 mb-1 font-bold">
                      Start Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingExp.startDate || ""}
                      onChange={(e) => setEditingExp({ ...editingExp, startDate: e.target.value })}
                      placeholder="e.g. Jan 2023 or 2023"
                      className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded focus:border-[#38bdf8] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 mb-1 font-bold">
                      End Date (or Present)
                    </label>
                    <input
                      type="text"
                      disabled={editingExp.currentPosition}
                      value={editingExp.currentPosition ? "Present" : editingExp.endDate || ""}
                      onChange={(e) => setEditingExp({ ...editingExp, endDate: e.target.value })}
                      placeholder="e.g. Dec 2024 or Present"
                      className={`w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded focus:border-[#38bdf8] outline-none ${
                        editingExp.currentPosition ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingExp.currentPosition || false}
                      onChange={(e) =>
                        setEditingExp({
                          ...editingExp,
                          currentPosition: e.target.checked,
                          endDate: e.target.checked ? "Present" : editingExp.endDate || "",
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-emerald-300 font-bold">I currently work in this role</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className="bg-[#0a152d] border border-[#1e40af] p-3 rounded space-y-2">
                <label className="block text-white/80 font-bold">Role Summary / Overview</label>
                <textarea
                  rows={3}
                  value={editingExp.description || ""}
                  onChange={(e) => setEditingExp({ ...editingExp, description: e.target.value })}
                  placeholder="Overview of your core mission, leadership, design systems, and client engagements..."
                  className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded resize-none"
                />
              </div>

              {/* Responsibilities */}
              <div className="bg-[#0a152d] border border-[#1e40af] p-3 rounded space-y-2">
                <label className="block text-white/80 font-bold">
                  Key Responsibilities (One per line)
                </label>
                <textarea
                  rows={4}
                  value={
                    Array.isArray(editingExp.responsibilities)
                      ? editingExp.responsibilities.join("\n")
                      : editingExp.responsibilities || ""
                  }
                  onChange={(e) =>
                    setEditingExp({
                      ...editingExp,
                      responsibilities: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                  placeholder="Designed end-to-end mobile and desktop SaaS platforms&#10;Created 50+ AI video generation workflows&#10;Led design system overhaul and sprint reviews"
                  className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded resize-none font-mono"
                />
              </div>

              {/* Key Projects & Achievements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0a152d] border border-[#1e40af] p-3 rounded">
                <div>
                  <label className="block text-white/80 mb-1 font-bold">
                    Key Projects (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={
                      Array.isArray(editingExp.projects)
                        ? editingExp.projects.join(", ")
                        : editingExp.projects || ""
                    }
                    onChange={(e) =>
                      setEditingExp({
                        ...editingExp,
                        projects: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Pixel OS, Finance App, AI Engine"
                    className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-1 font-bold">
                    Impact &amp; Achievements (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={
                      Array.isArray(editingExp.achievements)
                        ? editingExp.achievements.join(", ")
                        : editingExp.achievements || ""
                    }
                    onChange={(e) =>
                      setEditingExp({
                        ...editingExp,
                        achievements: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="40% conversion boost, 100K active users"
                    className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded"
                  />
                </div>
              </div>

              {/* Order & Visibility */}
              <div className="flex items-center justify-between flex-wrap gap-3 bg-[#0a152d] border border-[#1e40af] p-3 rounded">
                <div className="flex items-center gap-2">
                  <label className="text-white/80 font-bold">Order Priority:</label>
                  <input
                    type="number"
                    value={editingExp.order ?? 1}
                    onChange={(e) =>
                      setEditingExp({
                        ...editingExp,
                        order: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-20 bg-[#071022] border border-[#1e40af] p-1.5 text-white text-xs rounded"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingExp.visible !== false}
                    onChange={(e) =>
                      setEditingExp({
                        ...editingExp,
                        visible: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-white font-bold">Publicly visible</span>
                </label>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-[#0f2854] pt-3 pb-1 border-t border-[#1e40af] flex justify-end gap-3 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-[#334155] hover:bg-[#475569] px-4 py-2 text-xs rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-[#2563eb] active:bg-[#1e40af] text-white px-5 py-2 text-xs font-bold rounded cursor-pointer shadow-md"
                >
                  💾 Save Experience
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE EXPERIENCE CONFIRMATION MODAL */}
      {expToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 font-pixel">
          <div className="w-full max-w-md bg-[#0a152d] border-2 border-[#e11d48] p-5 rounded-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#f43f5e] border-b border-[#e11d48]/40 pb-3">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold text-sm text-white">DELETE EXPERIENCE CONFIRMATION</h3>
            </div>
            
            <p className="text-xs text-white/80 leading-relaxed">
              Are you sure you want to permanently delete experience entry:
              <br />
              <strong className="text-[#38bdf8] text-sm block mt-1">"{expToDelete.role || 'Untitled Role'}" {expToDelete.companyName ? `@ ${expToDelete.companyName}` : ''}</strong>
            </p>
            
            <div className="bg-[#1e1b4b]/60 border border-[#4338ca]/40 p-2.5 rounded text-[11px] text-white/60">
              This action will remove the experience record from the database, resume showcase, and cloud synchronization immediately.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExpToDelete(null)}
                className="bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-white px-4 py-2 text-xs font-bold rounded cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteExperience(expToDelete.id)}
                className="bg-[#e11d48] hover:bg-[#be123c] active:bg-[#9f1239] text-white px-5 py-2 text-xs font-bold rounded cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
