const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

const syncBlockSave = `
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
`;
code = code.replace(`      if (!res.ok) throw new Error("Failed to save skill");`, syncBlockSave);

const syncBlockDelete = `
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
`;
code = code.replace(`      if (!res.ok) throw new Error("Failed to delete skill");`, syncBlockDelete);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code, 'utf8');
