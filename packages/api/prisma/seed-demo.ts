import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const prisma = new PrismaClient();

const sampleStudents = [
  { firstName: 'Aarav', lastName: 'Sharma', admissionNo: 'MIS-2026-1001', email: 'student1001@medicaps.edu.in', gender: 'MALE' },
  { firstName: 'Ananya', lastName: 'Patel', admissionNo: 'MIS-2026-1002', email: 'student1002@medicaps.edu.in', gender: 'FEMALE' },
  { firstName: 'Vihaan', lastName: 'Verma', admissionNo: 'MIS-2026-1003', email: 'student1003@medicaps.edu.in', gender: 'MALE' },
  { firstName: 'Saanvi', lastName: 'Rao', admissionNo: 'MIS-2026-1004', email: 'student1004@medicaps.edu.in', gender: 'FEMALE' },
  { firstName: 'Ishaan', lastName: 'Mehta', admissionNo: 'MIS-2026-1005', email: 'student1005@medicaps.edu.in', gender: 'MALE' },
  { firstName: 'Akshitha', lastName: '', admissionNo: 'MIS-2026-1010', email: 'akshitha@medicaps.edu.in', gender: 'FEMALE' },
  { firstName: 'Pranavi', lastName: 'Reddy', admissionNo: 'MIS-2026-1011', email: 'pranavi.reddy@medicaps.edu.in', gender: 'FEMALE' },
  { firstName: 'Aditya', lastName: 'Varma', admissionNo: 'MIS-2026-1012', email: 'aditya.varma@medicaps.edu.in', gender: 'MALE' },
  { firstName: 'Hari', lastName: 'Chandana', admissionNo: 'MIS-2026-1013', email: 'hari.chandana@medicaps.edu.in', gender: 'MALE' },
  { firstName: 'Sony', lastName: '', admissionNo: 'MIS-2026-1014', email: 'sony@medicaps.edu.in', gender: 'FEMALE' },
];

async function main() {
  const school = await prisma.school.findUnique({ where: { code: 'MIS-IDR' } });
  if (!school) throw new Error('Base school not found. Run the base seed first.');

  const session = await prisma.academicSession.findFirst({
    where: { schoolId: school.id, status: 'ACTIVE' },
  });
  const class10 = await prisma.class.findFirst({
    where: { schoolId: school.id, grade: 10 },
  });
  if (!session || !class10) throw new Error('Active academic session or Class 10 not found.');

  const sectionA = await prisma.section.findFirst({
    where: { classId: class10.id, name: 'A' },
  });
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@medicaps.edu.in' },
  });
  const teacher = await prisma.user.findUnique({
    where: { email: 'teacher@medicaps.edu.in' },
  });
  const subjects = await prisma.subject.findMany({ where: { classId: class10.id } });
  if (!sectionA || !admin || !teacher || subjects.length === 0) {
    throw new Error('Class 10A, base staff accounts, or subjects are missing.');
  }

  const studentPasswordHash = await bcrypt.hash('student123', 10);
  const students = [];
  for (let index = 0; index < sampleStudents.length; index++) {
    const person = sampleStudents[index];
    let user = await prisma.user.findUnique({ where: { email: person.email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firstName: person.firstName, lastName: person.lastName, role: 'STUDENT', schoolId: school.id },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: person.email,
          passwordHash: studentPasswordHash,
          firstName: person.firstName,
          lastName: person.lastName,
          role: 'STUDENT',
          schoolId: school.id,
        },
      });
    }

    let student = await prisma.student.findUnique({ where: { admissionNo: person.admissionNo } });
    if (student) {
      student = await prisma.student.update({
        where: { id: student.id },
        data: { userId: user.id, classId: class10.id, sectionId: sectionA.id, rollNo: index + 1, academicSessionId: session.id },
      });
    } else {
      student = await prisma.student.create({
        data: {
          admissionNo: person.admissionNo,
          userId: user.id,
          classId: class10.id,
          sectionId: sectionA.id,
          rollNo: index + 1,
          dateOfBirth: new Date(`2012-${String((index % 9) + 1).padStart(2, '0')}-15`),
          gender: person.gender,
          city: 'Indore',
          state: 'Madhya Pradesh',
          pincode: '452001',
          academicSessionId: session.id,
        },
      });
    }
    students.push(student);

    if (!(await prisma.guardian.findFirst({ where: { studentId: student.id } }))) {
      await prisma.guardian.create({
        data: {
          studentId: student.id,
          relation: 'PARENT',
          name: `Parent of ${person.firstName}`,
          phone: `+91 98765 43${String(index).padStart(2, '0')}0`,
        },
      });
    }
  }

  const subjectFor = (pattern: RegExp, fallbackIndex: number) =>
    subjects.find((subject) => pattern.test(subject.name)) ?? subjects[fallbackIndex % subjects.length];
  const math = subjectFor(/math/i, 0);
  const science = subjectFor(/science/i, 1);
  const english = subjectFor(/english/i, 2);
  const now = new Date();

  const assignments = [
    {
      title: 'Fractions in Daily Life', subject: math,
      instructions: 'Solve the practice problems and show each step.', totalMarks: 20, dueInDays: 7,
    },
    {
      title: 'States of Matter Lab Notes', subject: science,
      instructions: 'Submit observations and examples of solids, liquids, and gases.', totalMarks: 15, dueInDays: 10,
    },
    {
      title: 'Reading Comprehension: The Banyan Tree', subject: english,
      instructions: 'Read the passage and answer in complete sentences.', totalMarks: 10, dueInDays: 5,
    },
  ];

  for (const assignment of assignments) {
    if (!(await prisma.assignment.findFirst({ where: { title: assignment.title, subjectId: assignment.subject.id } }))) {
      await prisma.assignment.create({
        data: {
          title: assignment.title,
          instructions: assignment.instructions,
          type: 'FILE_SUBMISSION',
          subjectId: assignment.subject.id,
          classId: class10.id,
          sectionId: sectionA.id,
          teacherId: teacher.id,
          dueDate: new Date(now.getTime() + assignment.dueInDays * 86_400_000),
          totalMarks: assignment.totalMarks,
          isPublished: true,
          allowLate: true,
          academicSessionId: session.id,
        },
      });
    }
  }

  const assessments = [
    { title: 'Mathematics Unit Test 1', subject: math, totalMarks: 40 },
    { title: 'Science Chapter Check', subject: science, totalMarks: 30 },
  ];
  for (const assessment of assessments) {
    if (!(await prisma.assessment.findFirst({ where: { title: assessment.title, classId: class10.id } }))) {
      await prisma.assessment.create({
        data: {
          title: assessment.title,
          type: 'UNIT_TEST',
          tier: 1,
          subjectId: assessment.subject.id,
          classId: class10.id,
          academicSessionId: session.id,
          createdBy: teacher.id,
          totalMarks: assessment.totalMarks,
          passingMarks: assessment.totalMarks * 0.35,
          duration: 60,
          scheduledDate: new Date(now.getTime() + 14 * 86_400_000),
          isPublished: true,
        },
      });
    }
  }

  const currentDate = new Date();
  const today = new Date(Date.UTC(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    currentDate.getUTCDate(),
  ));
  for (let index = 0; index < students.length; index++) {
    const student = students[index];
    await prisma.attendance.upsert({
      where: { studentId_date: { studentId: student.id, date: today } },
      update: {},
      create: {
        studentId: student.id,
        date: today,
        status: index === 2 ? 'LATE' : 'PRESENT',
        markedById: teacher.id,
        remarks: index === 2 ? 'Arrived after assembly' : undefined,
      },
    });
  }

  const notices = [
    {
      title: 'Class 10 Parent Meeting',
      content: 'Parent-teacher meetings for Class 10 will be held next Friday. Please contact the class teacher to book a time.',
      audience: 'PARENTS',
    },
    {
      title: 'Science Fair Project Week',
      content: 'Class 10 students should bring their project materials next Monday. Please see the science teacher for details.',
      audience: 'STUDENTS',
    },
  ];
  for (const notice of notices) {
    if (!(await prisma.announcement.findFirst({ where: { title: notice.title, schoolId: school.id } }))) {
      await prisma.announcement.create({
        data: {
          title: notice.title,
          content: notice.content,
          type: 'NOTICE',
          audience: notice.audience,
          classId: class10.id,
          priority: 'NORMAL',
          publishedAt: now,
          isPublished: true,
          createdBy: admin.id,
          schoolId: school.id,
        },
      });
    }
  }

  let feeHead = await prisma.feeHead.findFirst({
    where: { name: 'Class 10 Annual Activity Fee', classId: class10.id, academicSessionId: session.id },
  });
  if (!feeHead) {
    feeHead = await prisma.feeHead.create({
      data: {
        name: 'Class 10 Annual Activity Fee',
        description: 'Annual activities and learning resources',
        amount: 2500,
        classId: class10.id,
        academicSessionId: session.id,
        isRecurring: false,
        frequency: 'ANNUALLY',
      },
    });
  }
  let feeStructure = await prisma.feeStructure.findUnique({
    where: { classId_academicSessionId: { classId: class10.id, academicSessionId: session.id } },
  });
  if (!feeStructure) {
    feeStructure = await prisma.feeStructure.create({
      data: { classId: class10.id, academicSessionId: session.id },
    });
  }
  await prisma.feeStructureFeeHead.upsert({
    where: { feeStructureId_feeHeadId: { feeStructureId: feeStructure.id, feeHeadId: feeHead.id } },
    update: {},
    create: { feeStructureId: feeStructure.id, feeHeadId: feeHead.id },
  });

  console.log('Demo data is ready: 10 students, 3 assignments, 2 assessments, attendance, announcements, and a fee item.');
  console.log('Student login password: student123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
