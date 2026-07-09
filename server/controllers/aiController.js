const Anthropic = require('@anthropic-ai/sdk');
const User = require('../models/User');
const Task = require('../models/Task');
const Livestock = require('../models/Livestock');
const Attendance = require('../models/Attendance');
const TrustScore = require('../models/TrustScore');

const handleQuery = async (req, res) => {
  try {
    const { question, history = [] } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ message: 'Please enter a question' });
    }

    const user = req.user;
    const role = user.role;
    let contextData = '';

    if (role === 'worker') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [myTasks, myAttendance, myTrustScore] = await Promise.all([
        Task.find({ assignedTo: user._id })
          .sort({ dueDate: 1 })
          .limit(20)
          .select('title status priority dueDate category riskFlag completedAt'),
        Attendance.find({ worker: user._id, date: { $gte: thirtyDaysAgo } })
          .sort({ date: -1 })
          .limit(14)
          .select('date status checkIn checkOut'),
        TrustScore.findOne({ worker: user._id })
      ]);

      const pendingTasks = myTasks.filter((t) => t.status === 'Pending');
      const overdueTasks = myTasks.filter((t) => t.status === 'Overdue');
      const completedTasks = myTasks.filter((t) => t.status === 'Completed');
      const presentDays = myAttendance.filter((a) => a.status === 'Present').length;
      const lateDays = myAttendance.filter((a) => a.status === 'Late').length;
      const absentDays = myAttendance.filter((a) => a.status === 'Absent').length;

      contextData = `
WORKER: ${user.name} (${user.position || 'Farm Worker'}, ${user.department || 'General'})
TRUST SCORE: ${myTrustScore?.overallScore ?? 'Not calculated'}%
Components: Attendance ${myTrustScore?.attendanceScore ?? 'N/A'}%, Punctuality ${myTrustScore?.punctualityScore ?? 'N/A'}%, Task Completion ${myTrustScore?.taskCompletionScore ?? 'N/A'}%, Responsiveness ${myTrustScore?.responsivenessScore ?? 'N/A'}%, Consistency ${myTrustScore?.consistencyScore ?? 'N/A'}%

MY TASKS (${myTasks.length} total):
- Pending: ${pendingTasks.length} — ${pendingTasks.map((t) => `"${t.title}" (due ${new Date(t.dueDate).toLocaleDateString()})`).join(', ') || 'none'}
- Overdue: ${overdueTasks.length} — ${overdueTasks.map((t) => `"${t.title}" (was due ${new Date(t.dueDate).toLocaleDateString()})`).join(', ') || 'none'}
- Completed: ${completedTasks.length}
- High Risk Tasks: ${myTasks.filter((t) => t.riskFlag === 'High').map((t) => t.title).join(', ') || 'none'}

ATTENDANCE (last 30 days):
Present: ${presentDays} days, Late: ${lateDays} days, Absent: ${absentDays} days
Recent: ${myAttendance.slice(0, 5).map((a) => `${new Date(a.date).toLocaleDateString()}: ${a.status}`).join(', ')}`;
    } else if (role === 'manager') {
      const [workers, livestock, tasks, riskTasks, trustScores] = await Promise.all([
        User.find({ role: 'worker', isActive: true }).populate('trustScore').select('name position department trustScore'),
        Livestock.find({ isArchived: false }).select('animalId species animalType healthStatus location gender'),
        Task.find({}).populate('assignedTo', 'name').select('title status priority dueDate riskFlag assignedTo category'),
        Task.find({ riskFlag: { $in: ['High', 'Medium'] }, status: { $nin: ['Completed'] } }).populate('assignedTo', 'name').select('title riskFlag status assignedTo dueDate'),
        TrustScore.find({}).populate('worker', 'name').sort({ overallScore: 1 })
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayAttendance = await Attendance.find({ date: { $gte: today } }).populate('worker', 'name').select('worker status checkIn');

      const healthGroups = {};
      livestock.forEach((animal) => {
        if (!healthGroups[animal.healthStatus]) healthGroups[animal.healthStatus] = [];
        healthGroups[animal.healthStatus].push(animal.animalId);
      });

      const taskGroups = {};
      tasks.forEach((task) => {
        if (!taskGroups[task.status]) taskGroups[task.status] = 0;
        taskGroups[task.status] += 1;
      });

      const lowTrustWorkers = trustScores.filter((score) => score.overallScore < 60);

      contextData = `
FARM: ${user.name}'s Farm
DATE: ${new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

WORKERS (${workers.length} active):
${workers.map((worker) => `- ${worker.name} (${worker.position || worker.department || 'Worker'}): Trust Score ${worker.trustScore?.overallScore ?? 'N/A'}%`).join('\n')}

LOW TRUST WORKERS (below 60%):
${lowTrustWorkers.length > 0 ? lowTrustWorkers.map((score) => `- ${score.worker?.name}: ${score.overallScore}%`).join('\n') : 'None — all workers above 60%'}

TODAY'S ATTENDANCE (${todayAttendance.length} records so far):
${todayAttendance.length > 0 ? todayAttendance.map((entry) => `- ${entry.worker?.name}: ${entry.status}${entry.checkIn ? ' (checked in ' + new Date(entry.checkIn).toLocaleTimeString() + ')' : ''}`).join('\n') : 'No check-ins recorded yet today'}

LIVESTOCK (${livestock.length} total):
${Object.entries(healthGroups).map(([status, ids]) => `- ${status}: ${ids.length} animals (${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''})`).join('\n')}
Species: ${[...new Set(livestock.map((animal) => animal.species))].join(', ')}

TASKS:
${Object.entries(taskGroups).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

AT-RISK TASKS (${riskTasks.length}):
${riskTasks.length > 0 ? riskTasks.map((task) => `- "${task.title}" assigned to ${task.assignedTo?.name || 'Unknown'} — ${task.riskFlag} risk, due ${new Date(task.dueDate).toLocaleDateString()}`).join('\n') : 'No active risk-flagged tasks'}`;
    } else if (role === 'admin') {
      const [totalUsers, managers, workers, activeUsers, totalLivestock, totalTasks] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: 'manager' }),
        User.countDocuments({ role: 'worker' }),
        User.countDocuments({ isActive: true }),
        Livestock.countDocuments({ isArchived: false }),
        Task.countDocuments({})
      ]);

      contextData = `
PLATFORM STATISTICS:
Total Users: ${totalUsers} (${managers} managers, ${workers} workers, ${activeUsers} active)
Total Livestock Records: ${totalLivestock}
Total Tasks: ${totalTasks}`;
    }

    const systemPrompt = `You are Abariisa AI, the intelligent assistant for the Abariisa Smart Farm Management System.

You are speaking with ${user.name}, who is a ${role === 'worker' ? 'Farm Worker' : role === 'manager' ? 'Farm Manager' : 'System Administrator'}.

Here is their current farm data:
${contextData}

INSTRUCTIONS:
- Answer questions based ONLY on the data provided above
- Be concise, friendly, and practical
- Use simple language, avoid technical jargon
- Use clear bullet points when listing items
- If asked about something not in your data, say so clearly
- For workers: focus on tasks, attendance, and trust score
- For managers: help with livestock, workers, and task assignments
- For admins: provide platform-level insights
- Never make up data or guess numbers
- Keep responses under 150 words unless a longer answer is clearly needed
- If a worker has overdue tasks, gently remind them to complete them
- If a manager asks about risk, refer to the Trust Score and risk flag data
- Today's date is ${new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const messages = [
      ...history.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: question }
    ];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages
    });

    const answer = response.content[0]?.text || 'I could not generate an answer right now.';
    res.json({ answer, question });
  } catch (err) {
    console.error('AI query error:', err);
    res.status(500).json({ message: 'AI assistant is temporarily unavailable. Please try again.' });
  }
};

module.exports = { handleQuery };
