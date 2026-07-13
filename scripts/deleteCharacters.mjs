import fs from 'fs';
import path from 'path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function main() {
  const saPath = path.resolve(process.cwd(), 'scripts', 'keys', 'serviceAccountKey.json');
  if (!fs.existsSync(saPath)) {
    console.error('Service account file not found:', saPath);
    process.exit(1);
  }
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  initializeApp({ credential: cert(sa) });
  const db = getFirestore();

  console.log(`Connecting to project: ${sa.project_id}`);
  const collectionRef = db.collection('characters');
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log('La collection "characters" est déjà vide.');
    process.exit(0);
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  console.log(`Nombre de documents supprimés de la collection 'characters' : ${snapshot.size}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err?.message ?? err);
  process.exit(1);
});
