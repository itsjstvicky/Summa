const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

code = code.replace(
  `                      category: "Design",\n                      proficiency: 85,\n                      visible: true,`,
  `                      category: "Design",\n                      experience: "",\n                      visible: true,`
);
fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code, 'utf8');
