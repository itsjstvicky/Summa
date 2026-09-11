const fs = require('fs');

// 1. Update server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(
  `proficiency: req.body.proficiency || 80,`,
  `proficiency: req.body.proficiency || 80,\n      experience: req.body.experience || "",`
);
serverCode = serverCode.replace(
  `{ id: "s1", name: "UI/UX Design", category: "Design", icon: "Layout", proficiency: 95, visible: true, order: 1 },`,
  `{ id: "s1", name: "UI/UX Design", category: "Design", icon: "Layout", proficiency: 95, experience: "5+ Years", visible: true, order: 1 },`
);
fs.writeFileSync('server.ts', serverCode, 'utf8');

// 2. Update defaultPortfolioData.ts
let defaultData = fs.readFileSync('src/data/defaultPortfolioData.ts', 'utf8');
defaultData = defaultData.replace(
  `{ id: "s1", name: "UI/UX Design", category: "Design", icon: "Layout", proficiency: 95, visible: true, order: 1 },`,
  `{ id: "s1", name: "UI/UX Design", category: "Design", icon: "Layout", proficiency: 95, experience: "5+ Years", visible: true, order: 1 },`
);
fs.writeFileSync('src/data/defaultPortfolioData.ts', defaultData, 'utf8');

// 3. Update AdminDashboard.tsx
let adminCode = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

// replace display in the skill list (line 1981 approx)
adminCode = adminCode.replace(
  `<span className="text-[#38bdf8] font-bold">{skill.proficiency}%</span>`,
  `<span className="text-[#38bdf8] font-bold">{skill.experience || ""}</span>`
);

// replace form field in edit skill (line 3317 approx)
adminCode = adminCode.replace(
  `              <div>
                <label className="block text-xs text-white/80 mb-1">
                  Proficiency: {editingSkill.proficiency || 80}%
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={editingSkill.proficiency || 80}
                  onChange={(e) =>
                    setEditingSkill({ ...editingSkill, proficiency: parseInt(e.target.value) })
                  }
                  className="w-full cursor-pointer"
                />
              </div>`,
  `              <div>
                <label className="block text-xs text-white/80 mb-1">
                  Years of Experience
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5+ Years"
                  value={editingSkill.experience || ""}
                  onChange={(e) =>
                    setEditingSkill({ ...editingSkill, experience: e.target.value })
                  }
                  className="w-full bg-[#0a152d] border border-[#1e40af] p-2 text-white text-xs rounded"
                />
              </div>`
);
fs.writeFileSync('src/components/admin/AdminDashboard.tsx', adminCode, 'utf8');

// 4. Update Modals.tsx
let modalsCode = fs.readFileSync('src/components/Modals.tsx', 'utf8');

// in renderSkills
modalsCode = modalsCode.replace(
  `                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">{skill.name}</span>
                            <span className="text-[#38bdf8] font-bold">{skill.proficiency}%</span>
                          </div>
                          <div className="w-full bg-[#1e293b] h-2.5 rounded overflow-hidden border border-[#334155]">
                            <div
                              className="bg-gradient-to-r from-[#0284c7] to-[#38bdf8] h-full transition-all duration-500"
                              style={{ width: \`\${skill.proficiency}%\` }}
                            />
                          </div>`,
  `                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">{skill.name}</span>
                            <span className="text-[#38bdf8] font-bold text-[11px]">{skill.experience || ""}</span>
                          </div>`
);

// in renderAbout (about 1123)
modalsCode = modalsCode.replace(
  `<span className="text-[#34d399] text-[10px]">{s.proficiency}%</span>`,
  `<span className="text-[#34d399] text-[10px]">{s.experience || ""}</span>`
);

fs.writeFileSync('src/components/Modals.tsx', modalsCode, 'utf8');

// 5. Update Windows11StartMenu.tsx
let startMenuCode = fs.readFileSync('src/components/Windows11StartMenu.tsx', 'utf8');
startMenuCode = startMenuCode.replace(
  `<span className="text-[10px] text-purple-300 font-bold">{s.proficiency}%</span>`,
  `<span className="text-[10px] text-purple-300 font-bold">{s.experience || ""}</span>`
);
fs.writeFileSync('src/components/Windows11StartMenu.tsx', startMenuCode, 'utf8');

// 6. Update ResumeViewerModal.tsx
let resumeModalCode = fs.readFileSync('src/components/ResumeViewerModal.tsx', 'utf8');
resumeModalCode = resumeModalCode.replace(
  `{s.name} ({s.proficiency}%)`,
  `{s.name} {s.experience ? \`(\${s.experience})\` : ""}`
);
fs.writeFileSync('src/components/ResumeViewerModal.tsx', resumeModalCode, 'utf8');

// 7. Update resumeUtils.ts
let resumeUtilsCode = fs.readFileSync('src/utils/resumeUtils.ts', 'utf8');
resumeUtilsCode = resumeUtilsCode.replace(
  `\${s.name} (\${s.proficiency}%)`,
  `\${s.name} \${s.experience ? \`(\${s.experience})\` : ""}`
);
fs.writeFileSync('src/utils/resumeUtils.ts', resumeUtilsCode, 'utf8');

console.log("Updates applied successfully.");
