import fs from 'fs';
let content = fs.readFileSync('src/components/admin/GoogleDriveManager.tsx', 'utf8');

const t1 = `  // Execute Upload with Custom Name\r
  const handleUpload = async (e: React.FormEvent) => {\r
    e.preventDefault();\r
      return;\r
    }\r
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }\r
      onNotification("Please select a file to upload", "error");\r
      return;\r
    const finalName = customFileName.trim() || selectedFile.name;`;

const r1 = `  // Execute Upload with Custom Name\r
  const handleUpload = async (e: React.FormEvent) => {\r
    e.preventDefault();\r
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }\r
    if (!selectedFile) {\r
      onNotification("Please select a file to upload", "error");\r
      return;\r
    }\r
    const finalName = customFileName.trim() || selectedFile.name;`;

content = content.replace(t1, r1);
content = content.replace(t1.replace(/\r/g, ''), r1.replace(/\r/g, ''));


// handleCreateFolder
const t2 = `  // Create folder\r
  const handleCreateFolder = async (e: React.FormEvent) => {\r
    e.preventDefault();\r
    if (!newFolderName.trim()) return;`;
const r2 = `  // Create folder\r
  const handleCreateFolder = async (e: React.FormEvent) => {\r
    e.preventDefault();\r
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }\r
    if (!newFolderName.trim()) return;`;
content = content.replace(t2, r2);
content = content.replace(t2.replace(/\r/g, ''), r2.replace(/\r/g, ''));

// confirmDelete
const t3 = `  // Confirm Delete\r
  const confirmDelete = async () => {\r
    if (!fileToDelete) return;\r
    try {\r
      setIsDeleting(true);`;
const r3 = `  // Confirm Delete\r
  const confirmDelete = async () => {\r
    if (!fileToDelete) return;\r
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }\r
    try {\r
      setIsDeleting(true);`;
content = content.replace(t3, r3);
content = content.replace(t3.replace(/\r/g, ''), r3.replace(/\r/g, ''));

fs.writeFileSync('src/components/admin/GoogleDriveManager.tsx', content);
