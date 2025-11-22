/**
 * Database Seed Script
 * Seeds CoachCard data for all 7 interview stages
 */

import { PrismaClient, InterviewStage } from '@prisma/client';

// Prisma 6/7 compatibility - disable driver adapters for traditional connection
const prisma = new PrismaClient({
  adapter: null,
} as any);

async function main() {
  console.log('Seeding database...');

  // Coach Cards for all 7 stages
  const coachCards = [
    {
      stage: InterviewStage.RECRUITER,
      whatMeasured: [
        'Communication skills',
        'Basic qualifications fit',
        'Motivation and interest',
        'Salary expectations',
        'Availability and timeline',
      ],
      scaffold: `RECRUITER SCREEN FRAMEWORK:

1. INTRODUCTION (2 min)
   - Your 30-second elevator pitch
   - Why this company/role excites you

2. EXPERIENCE WALKTHROUGH (5-7 min)
   - Recent role highlights
   - Key accomplishments with metrics
   - Technologies you've worked with

3. MOTIVATION (3-5 min)
   - Why leaving current role?
   - What are you looking for?
   - Why this company specifically?

4. LOGISTICS (2 min)
   - Timeline and availability
   - Salary expectations (have range ready)
   - Questions for recruiter

TIPS:
- Be enthusiastic but professional
- Have specific reasons for interest
- Know your numbers (salary, metrics)
- Ask about next steps`,
      failureModes: [
        'Being unprepared to explain gaps in resume',
        'Not knowing basic company information',
        'Unclear about what you want in next role',
        'Dodging salary questions or giving unrealistic ranges',
        'Not having any questions for the recruiter',
      ],
      followUps: [
        'Can you walk me through your decision to leave your current role?',
        'What would make you excited to join our team?',
      ],
    },
    {
      stage: InterviewStage.TECH_SCREEN,
      whatMeasured: [
        'Coding fundamentals',
        'Problem-solving approach',
        'Communication while coding',
        'Time and space complexity awareness',
        'Testing and edge cases',
      ],
      scaffold: `TECHNICAL SCREEN FRAMEWORK:

1. PROBLEM CLARIFICATION (3-5 min)
   - Repeat problem in your own words
   - Ask clarifying questions (inputs, outputs, constraints)
   - Confirm edge cases

2. APPROACH DISCUSSION (5 min)
   - Explain your approach BEFORE coding
   - Discuss time/space complexity
   - Get interviewer buy-in

3. IMPLEMENTATION (20-25 min)
   - Code out loud - explain as you type
   - Start with working solution, optimize later
   - Use meaningful variable names
   - Add comments for complex logic

4. TESTING (5 min)
   - Walk through example inputs
   - Test edge cases
   - Fix any bugs

TIPS:
- Think out loud constantly
- Ask questions when stuck
- Start simple, then optimize
- Test your code`,
      failureModes: [
        'Jumping into code without discussing approach',
        'Going silent while coding',
        'Not considering edge cases',
        'Over-optimizing before getting working solution',
        'Not testing code or missing obvious bugs',
      ],
      followUps: [
        'How would this solution perform with 1 billion inputs?',
        'What would you change if memory was unlimited?',
      ],
    },
    {
      stage: InterviewStage.SYSTEM_DESIGN,
      whatMeasured: [
        'Architectural thinking',
        'Scalability and performance',
        'Trade-off analysis',
        'Component design',
        'Production readiness',
      ],
      scaffold: `SYSTEM DESIGN FRAMEWORK:

1. REQUIREMENTS (5-8 min)
   FUNCTIONAL:
   - Core features (must-have vs nice-to-have)
   - User personas and use cases

   NON-FUNCTIONAL:
   - Scale (QPS, users, data size)
   - Latency/availability requirements
   - Consistency vs availability trade-offs

2. CAPACITY ESTIMATION (3-5 min)
   - Storage needed
   - Bandwidth required
   - Cache sizing

3. API DESIGN (5 min)
   - Key endpoints
   - Request/response formats
   - Authentication

4. HIGH-LEVEL DESIGN (10-15 min)
   - Draw boxes: clients, servers, databases, caches
   - Data flow for key operations
   - Identify bottlenecks

5. DEEP DIVES (15-20 min)
   - Database schema
   - Caching strategy
   - Scaling approach
   - Monitoring and alerts

TIPS:
- Start broad, go deep where interviewer guides
- Discuss trade-offs explicitly
- Think about failure modes
- Reference real systems you've built`,
      failureModes: [
        'Jumping to solution without clarifying requirements',
        'Ignoring scale and non-functional requirements',
        'Not discussing trade-offs',
        'Over-engineering or under-engineering',
        'Not considering monitoring, logging, or failure modes',
      ],
      followUps: [
        'How would you handle a 10x increase in traffic?',
        'What would you monitor to ensure system health?',
      ],
    },
    {
      stage: InterviewStage.BEHAVIORAL,
      whatMeasured: [
        'Past behavior in situations',
        'Leadership and influence',
        'Conflict resolution',
        'Learning from failure',
        'Culture fit',
      ],
      scaffold: `BEHAVIORAL INTERVIEW FRAMEWORK (STAR):

SITUATION: Set context (project, team, constraints)
TASK: Your specific responsibility
ACTION: What YOU did (not "we")
RESULT: Outcome with metrics

PREPARE 6-8 STORIES COVERING:

1. LEADERSHIP & INFLUENCE
   - Led team/project
   - Influenced without authority
   - Mentored others

2. PROBLEM-SOLVING
   - Complex technical problem
   - Ambiguous situation
   - Tight deadline

3. COLLABORATION
   - Conflict with teammate
   - Cross-functional project
   - Helped struggling colleague

4. FAILURE & LEARNING
   - Missed deadline or made mistake
   - Project that failed
   - Received critical feedback

TIPS:
- Use "I" not "we"
- Include metrics in results
- Show what you learned
- Be honest about failures`,
      failureModes: [
        'Using "we" instead of "I" - not owning your contributions',
        'Vague stories without specific outcomes or metrics',
        'Blaming others for failures',
        'Not showing learning or growth',
        'Rambling stories without STAR structure',
      ],
      followUps: [
        'What would you do differently if you could redo that project?',
        'How did that experience change your approach to similar situations?',
      ],
    },
    {
      stage: InterviewStage.HIRING_MANAGER,
      whatMeasured: [
        'Technical depth in role area',
        'Alignment with team goals',
        'Growth potential',
        'Working style fit',
        'Thought process and judgment',
      ],
      scaffold: `HIRING MANAGER INTERVIEW FRAMEWORK:

1. DEEP TECHNICAL DISCUSSION (20-30 min)
   - Walk through recent complex project
   - Technical decisions and trade-offs
   - Challenges and how you overcame them
   - Architecture and implementation details

2. ROLE ALIGNMENT (10 min)
   - What excites you about this role?
   - How do you see yourself growing?
   - What skills do you want to develop?

3. WORKING STYLE (10 min)
   - Preferred team structure
   - How you handle ambiguity
   - Communication preferences
   - Feedback approach

4. YOUR QUESTIONS (10 min)
   - Team dynamics
   - Success metrics for role
   - Challenges team is facing
   - Manager's leadership style

TIPS:
- Be ready to go deep on your experience
- Show curiosity about team/problems
- Demonstrate growth mindset
- Ask thoughtful questions`,
      failureModes: [
        'Surface-level technical discussion',
        'Not connecting your experience to role needs',
        'Appearing inflexible about working style',
        'Not asking questions about team/role',
        'Being defensive about technical decisions',
      ],
      followUps: [
        'How do you stay current with technology trends?',
        'What type of manager brings out your best work?',
      ],
    },
    {
      stage: InterviewStage.ONSITE,
      whatMeasured: [
        'Technical breadth and depth',
        'Cultural alignment',
        'Collaboration skills',
        'Consistency across interviewers',
        'Energy and engagement',
      ],
      scaffold: `ONSITE/LOOP PREPARATION:

TYPICAL ONSITE STRUCTURE (4-6 hours):
1. Coding interview (1-2 rounds)
2. System design
3. Behavioral
4. Hiring manager
5. "Bar raiser" or leadership interview

PREPARATION CHECKLIST:

BEFORE ONSITE:
- Research recent company news
- Review your stories for behavioral
- Practice coding on whiteboard/doc
- Prepare 5-10 questions for each interviewer
- Get good sleep, eat well

DURING ONSITE:
- Treat each interview as fresh start
- Stay energized and engaged
- Ask for breaks if needed
- Take notes between interviews
- Be consistent in your stories

BETWEEN INTERVIEWS:
- Jot down what was asked
- Adjust energy/approach if needed
- Stay hydrated and focused

TIPS:
- Each interviewer is independent
- Show enthusiasm consistently
- Ask different questions to each person
- Be yourself - authenticity matters`,
      failureModes: [
        'Inconsistent answers to different interviewers',
        'Low energy or engagement',
        'Not asking questions',
        'Being unprepared about company',
        'Treating some interviews as less important',
      ],
      followUps: [
        'What questions do you have about our team/culture?',
        'Is there anything we haven\'t covered that you\'d like to discuss?',
      ],
    },
    {
      stage: InterviewStage.OFFER,
      whatMeasured: [
        'Negotiation approach',
        'Understanding of compensation',
        'Decision-making process',
        'Competing offers',
        'Timeline to decision',
      ],
      scaffold: `OFFER NEGOTIATION FRAMEWORK:

1. OFFER REVIEW (Day 1)
   UNDERSTAND COMPONENTS:
   - Base salary
   - Equity (vesting schedule, strike price)
   - Bonus structure
   - Benefits (health, 401k, PTO)
   - Signing bonus
   - Relocation

2. RESEARCH (Days 1-3)
   - Market data (levels.fyi, Glassdoor)
   - Total compensation calculators
   - Equity value scenarios
   - Compare competing offers

3. NEGOTIATION (Days 3-5)
   APPROACH:
   - Express enthusiasm first
   - Be specific about asks
   - Justify with data/competing offers
   - Focus on total compensation
   - Know your walk-away number

4. DECISION (Days 5-7)
   FACTORS:
   - Compensation
   - Growth opportunity
   - Team/manager fit
   - Company trajectory
   - Work-life balance

NEGOTIATION SCRIPTS:

"I'm excited about this opportunity. Based on my research and a competing offer, I was hoping for [specific number]. Is there flexibility here?"

"The base salary works, but I'd like to discuss equity. Given the company stage and my level, I was expecting [X shares]."

TIPS:
- Always negotiate (respectfully)
- Get offers in writing
- Ask about next raise cycle
- Understand vesting cliffs`,
      failureModes: [
        'Accepting first offer without negotiation',
        'Not understanding equity/total comp',
        'Being aggressive or entitled in negotiation',
        'Dragging out decision unnecessarily',
        'Not getting competing offers for leverage',
      ],
      followUps: [
        'Do you have any competing offers we should be aware of?',
        'What timeline are you working with for your decision?',
      ],
    },
  ];

  // Upsert coach cards
  for (const card of coachCards) {
    await prisma.coachCard.upsert({
      where: { stage: card.stage },
      update: card,
      create: card,
    });
    console.log(`✓ Seeded coach card for ${card.stage}`);
  }

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
