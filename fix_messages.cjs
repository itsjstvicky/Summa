const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

// Update handleDeleteMessage
const oldHandleDeleteMessage = `  const handleDeleteMessage = async (id: string) => {
    try {
      const res = await fetch(\`/api/messages/\${id}\`, {
        method: "DELETE",
        headers: { Authorization: \`Bearer \${authToken}\` },
      });
      if (!res.ok) throw new Error("Failed to delete message");
      showNotification("Message removed");
      fetchData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };`;

const newHandleDeleteMessage = `  const handleDeleteMessage = async (id: string) => {
    try {
      if (IS_FIREBASE_CONNECTED) {
        await deleteMessageFromFirestore(id);
      }
      const res = await fetch(\`/api/messages/\${id}\`, {
        method: "DELETE",
        headers: { Authorization: \`Bearer \${authToken}\` },
      });
      showNotification("Message removed");
      fetchData();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };`;
code = code.replace(oldHandleDeleteMessage, newHandleDeleteMessage);

// Fix fetchData
const oldFetchData = `      if (Array.isArray(resMsg)) setMessages(resMsg);`;
const newFetchData = `      let fetchedMessages = Array.isArray(resMsg) ? resMsg : [];
      if (IS_FIREBASE_CONNECTED) {
        try {
          const fsMsgs = await fetchMessagesFromFirestore();
          if (fsMsgs.length > 0 || fetchedMessages.length === 0) {
            fetchedMessages = fsMsgs;
          }
        } catch (e) {}
      }
      setMessages(fetchedMessages);`;
code = code.replace(oldFetchData, newFetchData);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code, 'utf8');
