import fs from 'fs';
let content = fs.readFileSync('src/components/admin/GoogleDriveManager.tsx', 'utf8');

const t1 = `  // Execute Upload with Custom Name
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
      return;
    }
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }
      onNotification("Please select a file to upload", "error");
      return;
    const finalName = customFileName.trim() || selectedFile.name;`;

const r1 = `  // Execute Upload with Custom Name
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }
    if (!selectedFile) {
      onNotification("Please select a file to upload", "error");
      return;
    }
    const finalName = customFileName.trim() || selectedFile.name;`;

content = content.replace(t1, r1);

// Now handleCreateFolder
const t2 = `  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;`;

const r2 = `  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }
    if (!newFolderName.trim()) return;`;

content = content.replace(t2, r2);

// Now confirmDelete
const t3 = `  // Confirm Delete
  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      setIsDeleting(true);`;

const r3 = `  // Confirm Delete
  const confirmDelete = async () => {
    if (!fileToDelete) return;
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }
    try {
      setIsDeleting(true);`;

content = content.replace(t3, r3);

// Replace handleExpired and loadDriveInfo
content = content.replace(`    const handleExpired = () => {
      // Intentionally not setting user to null so we stay in the workspace view
      setQuota(null);
      setFiles([]);
    };`, `    const handleExpired = () => {
      // User stays visually logged in
    };`);

content = content.replace(`        // Token expired or invalid, reset to sign-in state cleanly without noisy red alerts
        // Intentionally not setting user to null so we stay in the workspace view
        setQuota(null);
        setFiles([]);`, `        // User stays visually logged in
        setFiles([]);`);


fs.writeFileSync('src/components/admin/GoogleDriveManager.tsx', content);
