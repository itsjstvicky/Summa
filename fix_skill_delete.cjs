const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

// 1. Add skillToDelete state
code = code.replace(
  `const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);`,
  `const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);\n  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);`
);

// 2. Rewrite handleDeleteSkill and add executeDeleteSkill
const oldDeleteSkill = `  // Delete Skill
  const handleDeleteSkill = async (id: string) => {
    if (!confirm("Delete this skill?")) return;
    const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch(\`/api/skills/\${id}\`, {
        method: "DELETE",
        headers: { Authorization: \`Bearer \${activeToken}\` },
      });
      if (!res.ok) throw new Error("Failed to delete skill");
      
      const updatedSkills = skills.filter(s => s.id !== id);
      setSkills(updatedSkills);
      saveLocalMasterBackup({ skills: updatedSkills });
      
      if (IS_FIREBASE_CONNECTED) {
        syncMasterStateToFirestore({ skills: updatedSkills }).catch(e => console.warn(e));
      }
      
      showNotification("Skill deleted");
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };`;

const newDeleteSkill = `  // Delete Skill Trigger
  const handleDeleteSkill = (skill: Skill) => {
    setSkillToDelete(skill);
  };

  // Execute Confirmed Delete Skill
  const executeDeleteSkill = async (id: string) => {
    const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
    try {
      const res = await fetch(\`/api/skills/\${id}\`, {
        method: "DELETE",
        headers: { Authorization: \`Bearer \${activeToken}\` },
      });
      if (!res.ok) throw new Error("Failed to delete skill");
      
      const updatedSkills = skills.filter(s => s.id !== id);
      setSkills(updatedSkills);
      saveLocalMasterBackup({ skills: updatedSkills });
      
      if (IS_FIREBASE_CONNECTED) {
        syncMasterStateToFirestore({ skills: updatedSkills }).catch(e => console.warn(e));
      }
      
      showNotification("Skill deleted");
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setSkillToDelete(null);
    }
  };`;

code = code.replace(oldDeleteSkill, newDeleteSkill);

// 3. Update the onClick in JSX
code = code.replace(
  `onClick={() => handleDeleteSkill(skill.id)}`,
  `onClick={() => handleDeleteSkill(skill)}`
);

// 4. Add the modal JSX near the project modal
const projectModalMarker = `      {/* DELETE PROJECT CONFIRMATION MODAL */}`;
const skillModalJSX = `      {/* DELETE SKILL CONFIRMATION MODAL */}
      {skillToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 font-pixel">
          <div className="w-full max-w-md bg-[#0a152d] border-2 border-[#e11d48] p-5 rounded-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#f43f5e] border-b border-[#e11d48]/40 pb-3">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold text-sm text-white">DELETE SKILL CONFIRMATION</h3>
            </div>
            
            <p className="text-xs text-white/80 leading-relaxed">
              Are you sure you want to permanently delete skill:
              <br />
              <strong className="text-[#38bdf8] text-sm block mt-1">"{skillToDelete.name || 'Untitled Skill'}"</strong>
            </p>
            
            <div className="bg-[#1e1b4b]/60 border border-[#4338ca]/40 p-2.5 rounded text-[11px] text-white/60">
              This action will remove the skill from the database, live desktop showcase, and cloud synchronization immediately.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSkillToDelete(null)}
                className="bg-[#1e293b] hover:bg-[#334155] border border-[#475569] text-white px-4 py-2 text-xs font-bold rounded cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteSkill(skillToDelete.id)}
                className="bg-[#e11d48] hover:bg-[#be123c] active:bg-[#9f1239] text-white px-5 py-2 text-xs font-bold rounded cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

`;
code = code.replace(projectModalMarker, skillModalJSX + projectModalMarker);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code, 'utf8');
