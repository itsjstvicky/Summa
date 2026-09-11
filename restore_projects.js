const fs = require('fs');
const dbPath = 'data/portfolio-db.json';
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

db.projects = [
  {
    id: 'p_1787426680001',
    title: 'Raja Isaiyil Deadpoola',
    category: 'Video Editing Projects',
    featured: true,
    visible: true,
    order: 1
  },
  {
    id: 'p_1787426680002',
    title: 'Morais Marathan',
    category: 'AI Videos Projects',
    featured: true,
    visible: true,
    order: 2
  },
  {
    id: 'p_1787426680003',
    title: 'MORAIS CITY',
    category: 'UX/UI Projects',
    featured: true,
    visible: true,
    order: 3
  }
];

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Restored projects!');
