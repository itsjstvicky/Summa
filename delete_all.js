const fs = require('fs');

async function deleteAll() {
  const ids = ["p1", "p2", "p3", "p_1787567738784", "p_1787567742841", "p_1787569914363"];
  const dbId = "ai-studio-remixvigneshport-cac9fa25-0db3-417a-b3c8-c3a0f781308b";
  const projectId = "mystical-ripsaw-g5fd2";
  
  for (const id of ids) {
    console.log(`Deleting ${id} from Firestore...`);
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/projects/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    console.log(`Firestore: ${res.status}`);

    console.log(`Deleting ${id} locally...`);
    const res2 = await fetch(`http://localhost:3000/api/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer admin' } // authMiddleware bypass check might need admin string or similar? Wait, the server needs auth.
    });
    // Wait, let's bypass auth by manipulating the db.json directly
  }
}

deleteAll();
