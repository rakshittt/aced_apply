
import { prisma } from '../lib/db';

async function main() {
    const run = await prisma.jobRun.findFirst({
        orderBy: { createdAt: 'desc' }
    });
    console.log('Run ID:', run?.id);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
