import { saveProjectsToFirestore, IS_FIREBASE_CONNECTED } from "./src/services/firebaseService";
async function run() {
  console.log("Connected:", IS_FIREBASE_CONNECTED);
  const success = await saveProjectsToFirestore([{ id: "test_proj", title: "Test Title" } as any]);
  console.log("Success:", success);
}
run();

