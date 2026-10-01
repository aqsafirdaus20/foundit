// Seeds the admin, a handful of sample users, and a rich set of demo items/claims.
// Idempotent: safe to run more than once, and runs automatically on every server
// start (see server.js) so a fresh clone on any machine "just works" after
// `npm run dev` — no manual seeding step needed.
//
// Run directly with: node scripts/seed.js   (or: npm run seed)
import bcrypt from 'bcryptjs';
import { env } from '../src/env.js';
import { prisma } from '../src/db.js';

// Every sample user (not the admin) shares this password, so it's easy to log
// in as any of them on a fresh machine.
export const SAMPLE_PASSWORD = 'password123';

const SAMPLE_USERS = [
  { username: 'alice', name: 'Alice Fernandes', phone: '9876500001' },
  { username: 'bob', name: 'Bob Shaikh', phone: '9876500002' },
  { username: 'carol', name: 'Carol Mehta', phone: '9876500003' },
  { username: 'dave', name: 'Dave Kulkarni', phone: '9876500004' },
  { username: 'emma', name: 'Emma Joseph', phone: '9876500005' },
  { username: 'frank', name: 'Frank D’Souza', phone: '9876500006' },
];

// One secret question per item, and an optional `claim` describing a claim to
// seed against it: { by: <username>, answer, status, adminNote? }.
// `status: 'approved'` also flips the item to `claimed`.
const SAMPLE_ITEMS = [
  {
    title: 'Wireless Earbuds (white case)',
    category: 'electronics',
    description: 'A pair of wireless earbuds in a white charging case, found on a table.',
    locationFound: 'Library',
    dateFound: '2026-09-08',
    question: 'What color is the charging case?',
    answer: 'White',
    claim: { by: 'alice', answer: 'White', status: 'pending' },
  },
  {
    title: 'Bluetooth Speaker (black, JBL)',
    category: 'electronics',
    description: 'Small black portable Bluetooth speaker.',
    locationFound: 'Auditorium',
    dateFound: '2026-09-03',
    question: 'What color is the brand logo on it?',
    answer: 'Red',
  },
  {
    title: 'Black Leather Wallet',
    category: 'wallet',
    description: 'Bifold black leather wallet with a few cards inside.',
    locationFound: 'Canteen',
    dateFound: '2026-09-10',
    question: "What is attached to the wallet's keyring loop?",
    answer: 'A small silver bell',
    claim: {
      by: 'bob',
      answer: 'A small silver bell',
      status: 'approved',
      adminNote: 'Answer matched exactly',
    },
  },
  {
    title: 'Brown Card Holder',
    category: 'wallet',
    description: 'Slim brown card holder, holds a handful of cards.',
    locationFound: 'Parking Lot',
    dateFound: '2026-09-12',
    question: 'How many card slots does it have?',
    answer: 'Four',
    claim: { by: 'carol', answer: 'Four', status: 'pending' },
  },
  {
    title: 'College ID Card (Roll No 284)',
    category: 'id-card',
    description: 'Student ID card found near the main gate.',
    locationFound: 'Main Gate',
    dateFound: '2026-09-14',
    question: 'What blood group is printed on the card?',
    answer: 'O+',
    claim: { by: 'dave', answer: 'B+', status: 'rejected', adminNote: 'Blood group did not match' },
  },
  {
    title: 'Library ID Card',
    category: 'id-card',
    description: 'Library access card, found at the issue counter.',
    locationFound: 'Library Counter',
    dateFound: '2026-09-06',
    question: 'What issue year is printed on the card?',
    answer: '2024',
  },
  {
    title: 'Folder of Mark Sheets',
    category: 'documents',
    description: 'A clear plastic folder containing several semester mark sheets.',
    locationFound: 'Admin Office',
    dateFound: '2026-09-02',
    question: 'Whose name is on the topmost mark sheet?',
    answer: 'Priya Nair',
  },
  {
    title: 'Envelope of Passport Photos',
    category: 'documents',
    description: 'A small envelope with passport-size photographs inside.',
    locationFound: 'Exam Hall 1',
    dateFound: '2026-09-13',
    question: 'How many photos are inside?',
    answer: 'Six',
    claim: { by: 'emma', answer: 'Six', status: 'pending' },
  },
  {
    title: 'Bunch of Keys (red tag)',
    category: 'keys',
    description: 'A bunch of keys on a ring with a red plastic tag.',
    locationFound: 'Hostel Block B',
    dateFound: '2026-09-16',
    question: 'How many keys are on the bunch?',
    answer: 'Three',
  },
  {
    title: 'Bike Key (Honda keychain)',
    category: 'keys',
    description: 'A single bike key on a Honda-branded keychain.',
    locationFound: 'Parking Lot',
    dateFound: '2026-09-18',
    question: 'What text is on the keychain?',
    answer: 'Honda',
    claim: {
      by: 'carol',
      answer: 'Honda',
      status: 'approved',
      adminNote: 'Correct, returned in person',
    },
  },
  {
    title: 'Blue Backpack',
    category: 'bags',
    description: 'Blue backpack with a front pocket, found in the reading room.',
    locationFound: 'Library',
    dateFound: '2026-09-20',
    question: 'What sticker is on the front pocket?',
    answer: 'A cat sticker',
    claim: {
      by: 'frank',
      answer: 'A cat sticker',
      status: 'approved',
      adminNote: 'Matched, description convincing',
    },
  },
  {
    title: 'Grey Gym Bag',
    category: 'bags',
    description: 'Grey duffel-style gym bag.',
    locationFound: 'Sports Ground',
    dateFound: '2026-09-04',
    question: 'What initials are embroidered on it?',
    answer: 'R.K.',
  },
  {
    title: 'Silver Chain (star pendant)',
    category: 'jewellery',
    description: 'A thin silver chain with a small pendant.',
    locationFound: 'Auditorium washroom',
    dateFound: '2026-09-11',
    question: 'What shape is the pendant?',
    answer: 'A star',
  },
  {
    title: 'Pearl Earring (single)',
    category: 'jewellery',
    description: 'One pearl earring, found on the seminar hall floor.',
    locationFound: 'Seminar Hall',
    dateFound: '2026-09-17',
    question: 'What color is the earring backing?',
    answer: 'Gold',
    claim: {
      by: 'alice',
      answer: 'Silver',
      status: 'rejected',
      adminNote: 'Backing color did not match',
    },
  },
  {
    title: 'Grey Hoodie (size M)',
    category: 'clothing',
    description: 'Grey pullover hoodie, size M.',
    locationFound: 'Sports Ground',
    dateFound: '2026-09-09',
    question: 'What is written on the back of the hoodie?',
    answer: 'Team Falcons',
  },
  {
    title: 'Blue Denim Jacket',
    category: 'clothing',
    description: 'Blue denim jacket with a patch on one sleeve.',
    locationFound: 'Canteen',
    dateFound: '2026-09-01',
    question: 'What is on the sleeve patch?',
    answer: 'A flag patch',
    claim: { by: 'dave', answer: 'A flag patch', status: 'pending' },
  },
  {
    title: 'Data Structures Textbook',
    category: 'books',
    description: 'Course textbook with a worn cover.',
    locationFound: 'Classroom 101',
    dateFound: '2026-09-07',
    question: 'What name is written inside the cover?',
    answer: 'Rahul Verma',
  },
  {
    title: 'Organic Chemistry Notebook',
    category: 'books',
    description: 'A handwritten notebook with a sticky note on the cover.',
    locationFound: 'Library',
    dateFound: '2026-09-15',
    question: 'What color is the sticky note on the cover?',
    answer: 'Yellow',
  },
  {
    title: 'Umbrella (black, automatic)',
    category: 'other',
    description: 'Black automatic-open umbrella.',
    locationFound: 'Lobby',
    dateFound: '2026-09-19',
    question: 'What brand logo is on the handle?',
    answer: 'Kenko',
  },
  {
    title: 'Water Bottle (steel, blue)',
    category: 'other',
    description: 'Steel water bottle with a sticker on the side.',
    locationFound: 'Canteen',
    dateFound: '2026-09-21',
    question: 'What sticker is on the bottle?',
    answer: 'A superhero sticker',
    claim: { by: 'bob', answer: 'A superhero sticker', status: 'pending' },
  },
];

async function upsertAdmin() {
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  return prisma.user.upsert({
    where: { username: env.ADMIN_USERNAME },
    update: { passwordHash, role: 'admin' },
    create: { username: env.ADMIN_USERNAME, passwordHash, name: 'Admin', role: 'admin' },
  });
}

async function upsertSampleUsers() {
  const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 10);
  const byUsername = {};
  for (const u of SAMPLE_USERS) {
    byUsername[u.username] = await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash, name: u.name, phone: u.phone },
      create: { ...u, passwordHash, role: 'user' },
    });
  }
  return byUsername;
}

async function seedItemsAndClaims(admin, usersByUsername) {
  // Idempotency check: if our first sample item already exists, assume the
  // whole batch does too, and don't create it (or any claims) again.
  const already = await prisma.item.findFirst({ where: { title: SAMPLE_ITEMS[0].title } });
  if (already) {
    console.log('Sample items already seeded — skipping items and claims.');
    return;
  }

  let itemCount = 0;
  let claimCount = 0;

  for (const sample of SAMPLE_ITEMS) {
    const item = await prisma.item.create({
      data: {
        title: sample.title,
        category: sample.category,
        description: sample.description,
        locationFound: sample.locationFound,
        dateFound: new Date(sample.dateFound),
        addedById: admin.id,
        questions: { create: [{ question: sample.question, answer: sample.answer }] },
      },
      include: { questions: true },
    });
    itemCount += 1;

    if (sample.claim) {
      const claimant = usersByUsername[sample.claim.by];
      const question = item.questions[0];
      const isApproved = sample.claim.status === 'approved';

      await prisma.claim.create({
        data: {
          itemId: item.id,
          claimantId: claimant.id,
          ownershipDetails: `This is mine — I can describe it in detail. (${sample.claim.status} demo claim)`,
          status: sample.claim.status,
          adminNote: sample.claim.adminNote,
          reviewedAt: sample.claim.status === 'pending' ? null : new Date(),
          answers: { create: [{ questionId: question.id, answer: sample.claim.answer }] },
        },
      });
      claimCount += 1;

      if (isApproved) {
        await prisma.item.update({ where: { id: item.id }, data: { status: 'claimed' } });
      }
    }
  }

  console.log(`Seeded ${itemCount} sample items and ${claimCount} sample claims.`);
}

export async function seed() {
  const admin = await upsertAdmin();
  console.log('Admin ready:', admin.username);

  const usersByUsername = await upsertSampleUsers();
  console.log(
    `Sample users ready: ${Object.keys(usersByUsername).join(', ')} (password: ${SAMPLE_PASSWORD})`,
  );

  await seedItemsAndClaims(admin, usersByUsername);
}

// Run directly (`node scripts/seed.js` / `npm run seed`), as opposed to being
// imported by server.js on startup.
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/seed.js');
if (isMain) {
  seed()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
