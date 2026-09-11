const fs = require('fs');
let content = fs.readFileSync('src/components/admin/GoogleDriveManager.tsx', 'utf8');

const t1 = '    if (!selectedFile) {\n      onNotification("Please select a file to upload", "error");\n      return;\n    const finalName = customFileName.trim() || selectedFile.name;';
const r1 = '    if (!selectedFile) {\n      onNotification("Please select a file to upload", "error");\n      return;\n    }\n    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }\n    const finalName = customFileName.trim() || selectedFile.name;';

if (content.indexOf(t1) > -1) {
    content = content.replace(t1, r1);
} else {
    // try with \r\n
    const t1_rn = '    if (!selectedFile) {\r\n      onNotification("Please select a file to upload", "error");\r\n      return;\r\n    const finalName = customFileName.trim() || selectedFile.name;';
    const r1_rn = '    if (!selectedFile) {\r\n      onNotification("Please select a file to upload", "error");\r\n      return;\r\n    }\r\n    if (isTokenExpired()) { try { const res = await googleSignIn(); if (res?.user) setUser(res.user); } catch(err) { onNotification("Session expired. Please sign in again.", "error"); return; } }\r\n    const finalName = customFileName.trim() || selectedFile.name;';
    content = content.replace(t1_rn, r1_rn);
}

fs.writeFileSync('src/components/admin/GoogleDriveManager.tsx', content);
