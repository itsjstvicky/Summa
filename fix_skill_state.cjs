const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

// Fix handleSaveSkill
const oldSaveSkill = `  // Save or Update Skill
  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    try {
      const isNew = !editingSkill.id;
      const url = isNew ? "/api/skills" : \`/api/skills/\${editingSkill.id}\`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: \`Bearer \${authToken}\` },
        body: JSON.stringify(editingSkill),
      });
      if (!res.ok) throw new Error("Failed to save skill");
      try {
        const latestRes = await fetch("/api/skills", { headers: { Authorization: \`Bearer \${authToken}\` } });
        if (latestRes.ok) {
           const latestSkills = await latestRes.json();
           if (IS_FIREBASE_CONNECTED) {
              await syncMasterStateToFirestore({ skills: latestSkills });
           }
        }
      } catch (e) {}
      showNotification(isNew ? "Skill created!" : "Skill updated!");
      setIsSkillModalOpen(false);
      setEditingSkill(null);
      fetchData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };`;

const newSaveSkill = `  // Save or Update Skill
  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    const activeToken = authToken || localStorage.getItem("admin_token") || "admin";
    try {
      const isNew = !editingSkill.id;
      const url = isNew ? "/api/skills" : \`/api/skills/\${editingSkill.id}\`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: \`Bearer \${activeToken}\` },
        body: JSON.stringify(editingSkill),
      });
      if (!res.ok) throw new Error("Failed to save skill");
      
      const resData = await res.json().catch(() => ({}));
      let updatedSkills = [];
      if (isNew && resData.skill) {
        updatedSkills = [...skills, resData.skill];
      } else if (!isNew && resData.skill) {
        updatedSkills = skills.map(s => s.id === editingSkill.id ? resData.skill : s);
      } else {
        updatedSkills = skills.map(s => s.id === editingSkill.id ? editingSkill : s);
      }
      
      setSkills(updatedSkills as Skill[]);
      saveLocalMasterBackup({ skills: updatedSkills });
      
      if (IS_FIREBASE_CONNECTED) {
        syncMasterStateToFirestore({ skills: updatedSkills }).catch(e => console.warn(e));
      }

      showNotification(isNew ? "Skill created!" : "Skill updated!");
      setIsSkillModalOpen(false);
      setEditingSkill(null);
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };`;

code = code.replace(oldSaveSkill, newSaveSkill);

// Fix handleDeleteSkill
const oldDeleteSkill = `  // Delete Skill
  const handleDeleteSkill = async (id: string) => {
    if (!confirm("Delete this skill?")) return;
    try {
      const res = await fetch(\`/api/skills/\${id}\`, {
        method: "DELETE",
        headers: { Authorization: \`Bearer \${authToken}\` },
      });
      if (!res.ok) throw new Error("Failed to delete skill");
      try {
        const latestRes = await fetch("/api/skills", { headers: { Authorization: \`Bearer \${authToken}\` } });
        if (latestRes.ok) {
           const latestSkills = await latestRes.json();
           if (IS_FIREBASE_CONNECTED) {
              await syncMasterStateToFirestore({ skills: latestSkills });
           }
        }
      } catch (e) {}
      showNotification("Skill deleted");
      fetchData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };`;

const newDeleteSkill = `  // Delete Skill
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

code = code.replace(oldDeleteSkill, newDeleteSkill);
fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code, 'utf8');
