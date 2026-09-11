const fs = require('fs');
let content = fs.readFileSync('src/components/admin/GoogleDriveManager.tsx', 'utf8');

const t1 = `  // Execute Upload with Custom Name
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      onNotification("Please select a file to upload", "error");
      return;
    const finalName = customFileName.trim() || selectedFile.name;`;

const r1 = `  // Execute Upload with Custom Name
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      onNotification("Please select a file to upload", "error");
      return;
    }
    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }
    const finalName = customFileName.trim() || selectedFile.name;`;

content = content.replace(t1, r1);

// Now for createFolder
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

// Now for delete
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

fs.writeFileSync('src/components/admin/GoogleDriveManager.tsx', content);
