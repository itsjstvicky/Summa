const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ExperienceManager.tsx', 'utf8');

const newImports = `import React, { useState } from "react";
import { Experience } from "../../types";
import { PixelExperienceIcon } from "../PixelIcons";
import { IS_FIREBASE_CONNECTED, syncMasterStateToFirestore } from "../../services/firebaseService";
`;

code = code.replace(`import React, { useState } from "react";\nimport { Experience } from "../../types";\nimport { PixelExperienceIcon } from "../PixelIcons";`, newImports);

// Fix handleSaveExperience
const oldSave = `      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save experience entry");
      }

      onShowNotification(isNew ? "Experience entry added!" : "Experience entry updated!");
      setIsModalOpen(false);
      setEditingExp(null);
      onRefresh();`;

const newSave = `      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save experience entry");
      }
      
      try {
        const latestRes = await fetch("/api/experiences", { headers: { Authorization: \`Bearer \${token}\` } });
        if (latestRes.ok) {
           const latestExp = await latestRes.json();
           if (IS_FIREBASE_CONNECTED) {
              await syncMasterStateToFirestore({ experiences: latestExp });
           }
        }
      } catch (e) {}

      onShowNotification(isNew ? "Experience entry added!" : "Experience entry updated!");
      setIsModalOpen(false);
      setEditingExp(null);
      onRefresh();`;

code = code.replace(oldSave, newSave);

// Also fix handleDeleteExperience
const oldDelete = `      if (!res.ok) throw new Error("Failed to delete experience");

      onShowNotification("Experience entry removed");
      onRefresh();`;

const newDelete = `      if (!res.ok) throw new Error("Failed to delete experience");
      
      try {
        const latestRes = await fetch("/api/experiences", { headers: { Authorization: \`Bearer \${token}\` } });
        if (latestRes.ok) {
           const latestExp = await latestRes.json();
           if (IS_FIREBASE_CONNECTED) {
              await syncMasterStateToFirestore({ experiences: latestExp });
           }
        }
      } catch (e) {}

      onShowNotification("Experience entry removed");
      onRefresh();`;

code = code.replace(oldDelete, newDelete);

// Also fix handleToggleVisible
const oldToggle = `      if (!res.ok) throw new Error("Failed to update visibility");

      onShowNotification(\`Experience \${!exp.visible ? "enabled" : "hidden"}\`);
      onRefresh();`;

const newToggle = `      if (!res.ok) throw new Error("Failed to update visibility");
      
      try {
        const latestRes = await fetch("/api/experiences", { headers: { Authorization: \`Bearer \${token}\` } });
        if (latestRes.ok) {
           const latestExp = await latestRes.json();
           if (IS_FIREBASE_CONNECTED) {
              await syncMasterStateToFirestore({ experiences: latestExp });
           }
        }
      } catch (e) {}

      onShowNotification(\`Experience \${!exp.visible ? "enabled" : "hidden"}\`);
      onRefresh();`;
code = code.replace(oldToggle, newToggle);

// Also fix handleMoveOrder
const oldMove = `      if (!res.ok) throw new Error("Failed to reorder experiences");

      onShowNotification("Experience order updated");
      onRefresh();`;

const newMove = `      if (!res.ok) throw new Error("Failed to reorder experiences");
      
      try {
        const latestRes = await fetch("/api/experiences", { headers: { Authorization: \`Bearer \${token}\` } });
        if (latestRes.ok) {
           const latestExp = await latestRes.json();
           if (IS_FIREBASE_CONNECTED) {
              await syncMasterStateToFirestore({ experiences: latestExp });
           }
        }
      } catch (e) {}

      onShowNotification("Experience order updated");
      onRefresh();`;
code = code.replace(oldMove, newMove);

fs.writeFileSync('src/components/admin/ExperienceManager.tsx', code, 'utf8');
