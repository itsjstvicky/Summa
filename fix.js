const fs = require('fs');
let content = fs.readFileSync('src/components/admin/GoogleDriveManager.tsx', 'utf8');

const regex = /    if \(!selectedFile\) \{\n      onNotification\("Please select a file to upload", "error"\);\n      return;\n    \}\n    if \(isTokenExpired\(\)\) \{ try \{ const res = await googleSignIn\(\); if \(res\?.user\) setUser\(res\.user\); \} catch\(err\) \{ onNotification\("Session expired\. Please sign in again\.", "error"\); return; \} \}\n    const finalName = customFileName\.trim\(\) \|\| selectedFile\.name;/;

content = content.replace(regex, `    if (!selectedFile) {
      onNotification("Please select a file to upload", "error");
      return;
    }
    const finalName = customFileName.trim() || selectedFile.name;`);

fs.writeFileSync('src/components/admin/GoogleDriveManager.tsx', content);
