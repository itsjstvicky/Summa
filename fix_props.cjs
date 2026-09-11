const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

code = code.replace(/showNotification=\{showNotification\}/g, 'onShowNotification={showNotification}');

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code, 'utf8');
