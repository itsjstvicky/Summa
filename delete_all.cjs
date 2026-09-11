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
  }

  // Also remove from local db.json
  const path = 'data/portfolio-db.json';
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    data.projects = data.projects.filter(p => !ids.includes(p.id));
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
    console.log('Deleted from local db.json');
  } else {
    console.log('db.json not found locally');
  }
}

deleteAll();
