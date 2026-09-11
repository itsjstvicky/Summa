const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

const fetchedMessagesBlock = `      let fetchedMessages = Array.isArray(resMsg) ? resMsg : [];
      if (IS_FIREBASE_CONNECTED) {
        try {
          const fsMsgs = await fetchMessagesFromFirestore();
          if (fsMsgs.length > 0 || fetchedMessages.length === 0) {
            fetchedMessages = fsMsgs;
          }
        } catch (e) {}
      }
      setMessages(fetchedMessages);`;

// Remove it from current location
code = code.replace(fetchedMessagesBlock, '');

// Insert it before if (resStats)
const targetPoint = `      if (resStats) {`;
code = code.replace(targetPoint, fetchedMessagesBlock + '\n\n' + targetPoint);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code, 'utf8');
