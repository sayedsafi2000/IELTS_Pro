// ── FILE: server/prisma/seed.js ──
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminHash = await bcrypt.hash('Admin@123', 12);
  const studentHash = await bcrypt.hash('Student@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ieltsplatform.com' },
    update: { passwordHash: adminHash, role: 'ADMIN', isActive: true },
    create: { name: 'Admin User', email: 'admin@ieltsplatform.com', passwordHash: adminHash, role: 'ADMIN' }
  });

  const student1 = await prisma.user.upsert({
    where: { email: 'student1@test.com' },
    update: {},
    create: { name: 'John Smith', email: 'student1@test.com', passwordHash: studentHash, role: 'STUDENT', phone: '+1234567890' }
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@test.com' },
    update: {},
    create: { name: 'Sarah Johnson', email: 'student2@test.com', passwordHash: studentHash, role: 'STUDENT', phone: '+1234567891' }
  });

  const student3 = await prisma.user.upsert({
    where: { email: 'student3@test.com' },
    update: {},
    create: { name: 'Mike Brown', email: 'student3@test.com', passwordHash: studentHash, role: 'STUDENT', phone: '+1234567892' }
  });

  const existingTest = await prisma.test.findFirst({ where: { title: 'IELTS Full Mock Test' } });
  if (existingTest) {
    console.log('Test already exists, skipping seed');
    return;
  }

  const test = await prisma.test.create({
    data: {
      title: 'IELTS Full Mock Test',
      description: 'Complete IELTS Academic test covering all four modules: Listening, Reading, Writing, and Speaking.',
      type: 'FULL',
      isPublished: true,
      duration: 165
    }
  });

  const listeningModule = await prisma.module.create({
    data: {
      testId: test.id,
      type: 'LISTENING',
      title: 'Listening Module',
      instructions: 'You will hear a number of different recordings and you will have to answer questions on each one. In the real test you will only hear each recording once. For this practice test, you can replay the recordings.',
      durationMins: 30,
      orderIndex: 0
    }
  });

  const listeningQuestions = [
    { type: 'MULTIPLE_CHOICE', questionText: 'What is the main topic of the conversation?', options: JSON.stringify(['A. Travel plans', 'B. Hotel booking', 'C. Restaurant']), correctAnswer: 'A', section: 1, orderIndex: 0, marks: 1 },
    { type: 'MULTIPLE_CHOICE', questionText: 'When does the speaker suggest they should meet?', options: JSON.stringify(['A. 9 AM', 'B. 10 AM', 'C. 11 AM']), correctAnswer: 'B', section: 1, orderIndex: 1, marks: 1 },
    { type: 'FILL_BLANK', questionText: 'The meeting will be held at the __________ conference room.', correctAnswer: 'third', section: 1, orderIndex: 2, marks: 1 },
    { type: 'SHORT_ANSWER', questionText: 'What is the name of the hotel mentioned?', section: 1, orderIndex: 3, marks: 1 },
    { type: 'FILL_BLANK', questionText: 'The conference starts on __________ next week.', correctAnswer: 'Monday', section: 2, orderIndex: 4, marks: 1 },
    { type: 'MATCHING', questionText: 'Match each person with the correct department:', options: JSON.stringify(['A. Manager', 'B. Developer', 'C. Designer']), correctAnswer: 'A', section: 2, orderIndex: 5, marks: 1 },
    { type: 'FILL_BLANK', questionText: 'The project deadline is the end of __________.', correctAnswer: 'October', section: 2, orderIndex: 6, marks: 1 },
    { type: 'SHORT_ANSWER', questionText: 'How many team members are attending the meeting?', section: 2, orderIndex: 7, marks: 1 },
    { type: 'MULTIPLE_CHOICE', questionText: 'According to the speaker, what will be provided during the meeting?', options: JSON.stringify(['A. Lunch', 'B. Snacks only', 'C. Nothing']), correctAnswer: 'A', section: 2, orderIndex: 8, marks: 1 },
    { type: 'MULTIPLE_CHOICE', questionText: 'What is the total budget for the project?', options: JSON.stringify(['A. $50,000', 'B. $75,000', 'C. $100,000']), correctAnswer: 'C', section: 2, orderIndex: 9, marks: 1 }
  ];

  for (const q of listeningQuestions) {
    await prisma.question.create({ data: { ...q, moduleId: listeningModule.id } });
  }

  const readingModule = await prisma.module.create({
    data: {
      testId: test.id,
      type: 'READING',
      title: 'Reading Module',
      instructions: 'You should spend about 60 minutes on this section. Read the passages carefully and answer the questions.',
      durationMins: 60,
      orderIndex: 1
    }
  });

  const readingQuestions = [
    { type: 'TRUE_FALSE_NG', questionText: 'The study found that urban areas are growing faster than rural ones.', section: 1, orderIndex: 0, marks: 1, correctAnswer: 'True' },
    { type: 'TRUE_FALSE_NG', questionText: 'All participants in the study lived in cities with populations over one million.', section: 1, orderIndex: 1, marks: 1, correctAnswer: 'Not Given' },
    { type: 'TRUE_FALSE_NG', questionText: 'Climate change was identified as the primary driver of migration in the report.', section: 1, orderIndex: 2, marks: 1, correctAnswer: 'False' },
    { type: 'FILL_BLANK', questionText: 'The research was conducted over a period of __________ years.', correctAnswer: '5', section: 2, orderIndex: 3, marks: 1 },
    { type: 'MATCHING_HEADINGS', questionText: 'Match each paragraph with its correct heading from the options below.', section: 2, orderIndex: 4, marks: 1, correctAnswer: 'A' },
    { type: 'FILL_BLANK', questionText: 'The average temperature increase was approximately __________ degrees Celsius.', correctAnswer: '1.5', section: 2, orderIndex: 5, marks: 1 },
    { type: 'MULTIPLE_CHOICE', questionText: 'Which of the following was NOT mentioned as a finding in the passage?', options: JSON.stringify(['A. Increased migration to coastal cities', 'B. Decrease in agricultural productivity', 'C. Rise in global conflict']), correctAnswer: 'C', section: 2, orderIndex: 6, marks: 1 },
    { type: 'MULTIPLE_CHOICE', questionText: 'What was the primary conclusion of the researchers?', options: JSON.stringify(['A. Migration will slow down', 'B. Urban areas need better planning', 'C. Rural areas will become abandoned']), correctAnswer: 'B', section: 3, orderIndex: 7, marks: 1 },
    { type: 'SENTENCE_COMPLETION', questionText: 'The authors recommend that governments should focus on __________ infrastructure.', correctAnswer: 'urban', section: 3, orderIndex: 8, marks: 1 },
    { type: 'SENTENCE_COMPLETION', questionText: 'The report concludes that without intervention, cities may become __________ to live in.', correctAnswer: 'uninhabitable', section: 3, orderIndex: 9, marks: 1 }
  ];

  for (const q of readingQuestions) {
    await prisma.question.create({ data: { ...q, moduleId: readingModule.id } });
  }

  const writingModule = await prisma.module.create({
    data: {
      testId: test.id,
      type: 'WRITING',
      title: 'Writing Module',
      instructions: 'You should spend about 60 minutes on this section.',
      durationMins: 60,
      orderIndex: 2
    }
  });

  await prisma.question.create({
    data: {
      moduleId: writingModule.id,
      type: 'WRITING_TASK1',
      questionText: 'The bar chart below shows the number of students enrolled in different university programs in 2020 and 2021. Summarize the information by selecting and reporting the main features, and make comparisons where relevant.',
      instructions: 'Write at least 150 words.',
      section: 1, orderIndex: 0, marks: 1
    }
  });

  await prisma.question.create({
    data: {
      moduleId: writingModule.id,
      type: 'WRITING_TASK2',
      questionText: 'Some people believe that universities should focus on providing academic knowledge rather than teaching practical skills. Others believe that universities should prepare students for employment by teaching practical skills. Discuss both views and give your own opinion.',
      instructions: 'Write at least 250 words.',
      section: 2, orderIndex: 1, marks: 1
    }
  });

  const speakingModule = await prisma.module.create({
    data: {
      testId: test.id,
      type: 'SPEAKING',
      title: 'Speaking Module',
      instructions: 'The speaking test is divided into three parts. You will be interviewed by an examiner.',
      durationMins: 15,
      orderIndex: 3
    }
  });

  await prisma.question.create({ data: { moduleId: speakingModule.id, type: 'SPEAKING_PART1', questionText: 'Tell me about your hometown. What is it known for?', instructions: 'Answer each question in 30-60 seconds.', section: 1, orderIndex: 0, marks: 1 } });
  await prisma.question.create({ data: { moduleId: speakingModule.id, type: 'SPEAKING_PART1', questionText: 'Do you prefer studying alone or with others? Why?', section: 1, orderIndex: 1, marks: 1 } });
  await prisma.question.create({ data: { moduleId: speakingModule.id, type: 'SPEAKING_PART1', questionText: 'What do you usually do in your free time?', section: 1, orderIndex: 2, marks: 1 } });
  await prisma.question.create({ data: { moduleId: speakingModule.id, type: 'SPEAKING_PART2', questionText: 'Describe a book that you have recently read. You should say: what the book was about, why you decided to read it, and whether you would recommend it to others.', instructions: 'You will have 1 minute to prepare and can speak for 1-2 minutes.', section: 2, orderIndex: 3, marks: 1 } });
  await prisma.question.create({ data: { moduleId: speakingModule.id, type: 'SPEAKING_PART3', questionText: 'How has reading habits changed in your country over the last decade?', section: 3, orderIndex: 4, marks: 1 } });
  await prisma.question.create({ data: { moduleId: speakingModule.id, type: 'SPEAKING_PART3', questionText: 'Do you think e-books will eventually replace printed books? Why?', section: 3, orderIndex: 5, marks: 1 } });

  for (const student of [student1, student2, student3]) {
    await prisma.enrollment.create({ data: { userId: student.id, testId: test.id, assignedBy: admin.id } });
  }

  console.log('Seed complete!');
  console.log('Admin: admin@ieltsplatform.com / Admin@123');
  console.log('Students: student1@test.com / Student@123');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());