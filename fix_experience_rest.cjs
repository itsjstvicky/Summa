const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ExperienceManager.tsx', 'utf8');

const syncBlock = `
      try {
        const latestRes = await fetch("/api/experiences", { headers: { Authorization: \`Bearer \${token}\` } });
        if (latestRes.ok) {
           const latestExp = await latestRes.json();
           if (IS_FIREBASE_CONNECTED) {
              await syncMasterStateToFirestore({ experiences: latestExp });
           }
        }
      } catch (e) {}
`;

// fix handleDeleteExperience
code = code.replace(
  `      if (!res.ok) throw new Error("Failed to delete experience");\n\n      onShowNotification("Experience entry removed");\n      onRefresh();`,
  `      if (!res.ok) throw new Error("Failed to delete experience");\n${syncBlock}\n      onShowNotification("Experience entry removed");\n      onRefresh();`
);

// fix handleToggleVisible
code = code.replace(
  `      if (!res.ok) throw new Error("Failed to update visibility");\n\n      onShowNotification(\`Experience \${!exp.visible ? "enabled" : "hidden"}\`);\n      onRefresh();`,
  `      if (!res.ok) throw new Error("Failed to update visibility");\n${syncBlock}\n      onShowNotification(\`Experience \${!exp.visible ? "enabled" : "hidden"}\`);\n      onRefresh();`
);

// fix handleMoveOrder
code = code.replace(
  `      if (!res.ok) throw new Error("Failed to reorder experiences");\n\n      onShowNotification("Experience order updated");\n      onRefresh();`,
  `      if (!res.ok) throw new Error("Failed to reorder experiences");\n${syncBlock}\n      onShowNotification("Experience order updated");\n      onRefresh();`
);

fs.writeFileSync('src/components/admin/ExperienceManager.tsx', code, 'utf8');
