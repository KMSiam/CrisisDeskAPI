import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function getEmbedding(text: string): Promise<number[]> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined.');
    }
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: {
        outputDimensionality: 768,
      },
    });
    return response.embeddings[0].values;
  } catch (error) {
    console.warn(`[Seed Warning] Failed to generate embedding for "${text.substring(0, 30)}...". Using fallback zero-vector.`, error);
    return Array(768).fill(0);
  }
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data
  await prisma.report.deleteMany({});
  await prisma.admin.deleteMany({});
  console.log('🧹 Cleaned existing tables.');

  // Create admin account
  const hashedPassword = await bcrypt.hash('password123', 10);
  const admin = await prisma.admin.create({
    data: {
      email: 'admin@crisisdesk.com',
      password: hashedPassword,
      name: 'CrisisDesk Administrator',
    },
  });
  console.log(`👤 Created Admin: ${admin.email} (Password: password123)`);

  // Report 1: Dhaka Fire
  const desc1 = 'A massive fire broke out in a clothing market. Smoke is billowing out and people are trapped on the upper floors.';
  const emb1 = await getEmbedding(desc1);
  const r1 = await prisma.report.create({
    data: {
      name: 'Karim Ahmed',
      contact: '01812345678',
      location: 'Mirpur 10, Dhaka',
      description: desc1,
      language: 'en',
      category: 'fire',
      urgency: 'critical',
      summary: 'Clothing market fire in Mirpur 10, Dhaka with trapped occupants.',
      suggestedAction: 'Immediately dispatch fire service trucks and emergency medical units.',
      confidence: 0.98,
      status: 'pending',
    },
  });
  const vectorStr1 = `[${emb1.join(',')}]`;
  await prisma.$executeRaw`UPDATE "Report" SET embedding = ${vectorStr1}::vector WHERE id = ${r1.id}`;

  // Report 2: Sylhet Medical (in Bangla)
  const desc2 = 'Sylhet Bondor Bazar e ekjon stroke koreche. Taratari ambulance lagbe, se niswas nite parchena.';
  const emb2 = await getEmbedding('A person has had a stroke at Sylhet Bondor Bazar. Needs an ambulance quickly, they cannot breathe.');
  const r2 = await prisma.report.create({
    data: {
      name: 'Rahim Uddin',
      contact: '01712345678',
      location: 'Sylhet Bondor Bazar',
      description: desc2,
      language: 'bn',
      category: 'medical',
      urgency: 'critical',
      summary: 'Medical emergency: unresponsive stroke victim at Sylhet Bondor Bazar.',
      suggestedAction: 'Dispatch nearby ambulance immediately with life-support equipment.',
      confidence: 0.95,
      status: 'pending',
    },
  });
  const vectorStr2 = `[${emb2.join(',')}]`;
  await prisma.$executeRaw`UPDATE "Report" SET embedding = ${vectorStr2}::vector WHERE id = ${r2.id}`;

  // Report 3: Chittagong Accident
  const desc3 = 'A major road accident occurred between a bus and a CNG truck. Several people are injured and blocked on the road.';
  const emb3 = await getEmbedding(desc3);
  const r3 = await prisma.report.create({
    data: {
      name: 'Tanvir Hossain',
      contact: '01512345678',
      location: 'GEC Circle, Chittagong',
      description: desc3,
      language: 'en',
      category: 'accident',
      urgency: 'high',
      summary: 'Traffic accident involving a bus and CNG at GEC Circle, Chittagong.',
      suggestedAction: 'Send highway police and emergency rescue team to clear road and assist injured.',
      confidence: 0.92,
      status: 'assigned',
    },
  });
  const vectorStr3 = `[${emb3.join(',')}]`;
  await prisma.$executeRaw`UPDATE "Report" SET embedding = ${vectorStr3}::vector WHERE id = ${r3.id}`;

  // Report 4: Banani Water Logging (Flood)
  const desc4 = 'Severe water logging after heavy rain. Vehicles are unable to pass and some are flooded on the road.';
  const emb4 = await getEmbedding(desc4);
  const r4 = await prisma.report.create({
    data: {
      name: 'Anika Rahman',
      contact: '01912345678',
      location: 'Banani Road 11, Dhaka',
      description: desc4,
      language: 'en',
      category: 'flood',
      urgency: 'medium',
      summary: 'Water logging and traffic disruption at Banani Road 11, Dhaka.',
      suggestedAction: 'Coordinate with city drainage authority to clear sewer blockages.',
      confidence: 0.88,
      status: 'in_review',
    },
  });
  const vectorStr4 = `[${emb4.join(',')}]`;
  await prisma.$executeRaw`UPDATE "Report" SET embedding = ${vectorStr4}::vector WHERE id = ${r4.id}`;

  // Report 5: Khulna Power Failure
  const desc5 = 'Electric transformer sparked and caught fire. Power is completely out in the neighborhood.';
  const emb5 = await getEmbedding(desc5);
  const r5 = await prisma.report.create({
    data: {
      name: 'Suresh Kumar',
      contact: '01612345678',
      location: 'Khulna Sadar',
      description: desc5,
      language: 'en',
      category: 'utility',
      urgency: 'medium',
      summary: 'Electric transformer fire and power outage in Khulna.',
      suggestedAction: 'Notify the local power grid company for shutdown and replacement.',
      confidence: 0.90,
      status: 'resolved',
    },
  });
  const vectorStr5 = `[${emb5.join(',')}]`;
  await prisma.$executeRaw`UPDATE "Report" SET embedding = ${vectorStr5}::vector WHERE id = ${r5.id}`;

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
