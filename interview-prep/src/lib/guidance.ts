// "What the interviewer is looking for" — a short brief per question so you can
// draft your own answer with intent. Keyed by exact question text. Used to seed
// and to backfill existing questions (only when their guidance is empty).
export const GUIDANCE: Record<string, string> = {
  "Explain your current project.":
    "They want to see you can explain complex work simply and own your impact. Show the business problem, the architecture at a high level, and specifically what YOU did. End with a measurable result.",
  "Explain o9 architecture.":
    "They're testing depth on the platform, not memorization. Show you understand how the pieces fit (knowledge graph, IBPL, planning layers) and can explain why it's built that way, not just name components.",
  "Why are you switching?":
    "They're checking your motivation and whether you'll be a flight risk. Stay positive, frame it as moving toward growth/scope, and connect it to what this role offers. Never bad-mouth your current employer.",
  "Explain Spark execution.":
    "They want to know if you understand what happens under the hood, not just the API. Show the job → stage → task flow, what triggers shuffles, and how that affects performance and tuning.",
  "Tell me about yourself.":
    "This sets the tone. They want a crisp 60–90s narrative — present, past, why this role — that signals fit and confidence, not your life story. Tailor it to what this job needs.",
  "Difference between INNER and LEFT JOIN?":
    "A fundamentals check. They want a clear, correct definition plus awareness of edge cases (NULLs, row multiplication) — ideally with a quick concrete example.",
  "Walk me through your project.":
    "They're assessing scope, ownership and communication. They want a clear end-to-end story, your specific role and decisions, one real challenge you solved, and the outcome — told at the right altitude.",
  "Walk me through your resume / background.":
    "They want a coherent narrative, not a re-read of the page. Show deliberate progression, why each move made sense, and land on why this role is the logical next step.",
  "Why are you interested in this role?":
    "They're gauging genuine motivation and fit. They want specifics from the JD tied to your experience and goals — evidence you chose this role, not just any job.",
  "Why do you want to work at this company?":
    "They're testing whether you did your homework and will be committed. They want authentic, specific reasons tied to their mission/product/team — not generic flattery.",
  "Why are you looking to leave your current job?":
    "They're screening for red flags and real motivation. They want a positive, forward-looking reason framed as what you're moving toward, with no negativity about your employer.",
  "Where do you see yourself in 3–5 years?":
    "They're checking ambition, self-awareness and whether your goals align with this role. They want realistic growth that plausibly runs through this company — not a rigid title demand.",
  "What motivates you?":
    "They want to know what actually drives your best work and whether this role provides it. They want 1–2 authentic drivers backed by a real example.",
  "What are your greatest strengths?":
    "They want strengths relevant to THIS role, each backed by evidence. They're checking self-awareness and whether your strengths match what the job needs.",
  "What is your biggest weakness?":
    "They're testing honesty and growth mindset, not looking for a flaw to reject you. They want a real, non-fatal weakness and clear evidence you're actively improving it.",
  "What are you most proud of? / Your biggest achievement?":
    "They want to see impact and how you create value. Use STAR, emphasize your specific actions, quantify the result, and pick something relevant to the role.",
  "What makes you a good fit for this role?":
    "They want you to connect the dots for them: your top strengths mapped to their key requirements, with proof — plus motivation and culture fit.",
  "Tell me about a time you faced a difficult challenge and how you solved it.":
    "They're assessing problem-solving and resilience. Use STAR, spend most of it on YOUR actions and reasoning, and quantify the result plus what you learned.",
  "Tell me about a conflict with a coworker or manager.":
    "They're checking emotional maturity and communication. They want a fairly-stated disagreement, how you listened and found common ground, and a professional resolution — no blame.",
  "Tell me about a time you failed or made a mistake.":
    "They're testing accountability and learning, not perfection. Own a real mistake, show how you fixed it, and emphasize the concrete lesson and change you made.",
  "Tell me about a time you worked under pressure or a tight deadline.":
    "They want to see composure and judgment under constraints. Show how you prioritized, communicated, and delivered (or managed the trade-off) — not just that you worked hard.",
  "Tell me about a time you took initiative or led something.":
    "They're looking for ownership and leadership without needing authority. Show the gap you spotted, how you drove it and influenced others, and the lasting impact.",
  "Tell me about a time you received difficult feedback.":
    "They're checking coachability. They want to see you took it without defensiveness, acted on it, and improved measurably.",
  "Give an example of working in a team.":
    "They're assessing collaboration. They want your specific contribution and how you handled differences — balancing 'I' and 'we' so you elevate the team.",
  "How do you handle stress and pressure?":
    "They want a practical, believable approach (prioritize, break down, communicate early) backed by an example — evidence you stay calm and keep quality high.",
  "How do you prioritize when everything is urgent?":
    "They're testing judgment and communication. They want a clear framework (impact, deadlines, dependencies), alignment with stakeholders, and honesty about trade-offs.",
  "What are your salary expectations?":
    "They're finding alignment and gauging your self-worth. Ideally defer or ask their range first; otherwise give a researched range anchored to your value, and signal flexibility.",
  "Do you have any questions for us?":
    "They're gauging your genuine interest and how you think. They want thoughtful questions about the team, success metrics, or challenges — and to see you researched them.",
};
