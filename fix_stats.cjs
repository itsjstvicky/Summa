const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

const oldStats = `      if (resStats) {
        setStats(resStats);
      } else {
        setStats({`;

const newStats = `      if (resStats) {
        setStats({
          ...resStats,
          unreadMessages: fetchedMessages.filter((m: any) => !m.read).length,
          totalMessages: fetchedMessages.length,
        });
      } else {
        setStats({`;

code = code.replace(oldStats, newStats);

// Also need to update the else branch
const oldUnread = `unreadMessages: Array.isArray(resMsg) ? resMsg.filter((m: any) => !m.read).length : 0,`;
const newUnread = `unreadMessages: fetchedMessages.filter((m: any) => !m.read).length,`;
code = code.replace(oldUnread, newUnread);

const oldTotal = `totalMessages: Array.isArray(resMsg) ? resMsg.length : 0,`;
const newTotal = `totalMessages: fetchedMessages.length,`;
code = code.replace(oldTotal, newTotal);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code, 'utf8');
