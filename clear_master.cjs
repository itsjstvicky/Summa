async function clearMaster() {
  const dbId = "ai-studio-remixvigneshport-cac9fa25-0db3-417a-b3c8-c3a0f781308b";
  const projectId = "mystical-ripsaw-g5fd2";
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/cms_state/master?updateMask.fieldPaths=projects`;
  const body = { fields: { projects: { arrayValue: { values: [] } } } };
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  console.log(`Master CMS State update: ${res.status}`);
}
clearMaster();
