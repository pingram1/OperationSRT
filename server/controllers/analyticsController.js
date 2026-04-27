const Booking = require('../models/Booking');
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');

/**
 * @desc    Get analytics data for admin dashboard
 * @route   GET /api/analytics
 * @access  Private (Admin only)
 */
const getAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    
    // Previous period for comparison (same duration, before startDate)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // Calculate metrics
    const metrics = await calculateMetrics(startDate, now, previousStartDate, startDate);
    
    // Generate chart data
    const charts = await generateChartData(startDate, now, days);
    
    // Generate recent activity
    const recentActivity = await generateRecentActivity(startDate, now);

    res.json({
      metrics,
      charts,
      recentActivity,
    });
  } catch (error) {
    console.error('[getAnalytics] Error:', error);
    res.status(500).json({ message: 'Server error while fetching analytics' });
  }
};

/**
 * Calculate key metrics for the analytics dashboard
 */
const calculateMetrics = async (currentStart, currentEnd, previousStart, previousEnd) => {
  // Total Revenue - from completed bookings and active memberships
  const currentRevenue = await calculateRevenue(currentStart, currentEnd);
  const previousRevenue = await calculateRevenue(previousStart, previousEnd);
  const revenueChange = previousRevenue > 0 
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
    : (currentRevenue > 0 ? 100 : 0);

  // New Signups - count of users created in period
  const currentSignups = await User.countDocuments({
    createdAt: { $gte: currentStart, $lte: currentEnd }
  });
  const previousSignups = await User.countDocuments({
    createdAt: { $gte: previousStart, $lte: previousEnd }
  });
  const signupsChange = previousSignups > 0
    ? ((currentSignups - previousSignups) / previousSignups) * 100
    : (currentSignups > 0 ? 100 : 0);

  // Sessions Completed - count of completed bookings
  const currentSessions = await Booking.countDocuments({
    status: 'completed',
    sessionDate: { $gte: currentStart, $lte: currentEnd }
  });
  const previousSessions = await Booking.countDocuments({
    status: 'completed',
    sessionDate: { $gte: previousStart, $lte: previousEnd }
  });
  const sessionsChange = previousSessions > 0
    ? ((currentSessions - previousSessions) / previousSessions) * 100
    : (currentSessions > 0 ? 100 : 0);

  // Average Tutor Rating - calculate from actual booking ratings
  const currentRatings = await Booking.find({
    status: 'completed',
    sessionDate: { $gte: currentStart, $lte: currentEnd },
    'rating.value': { $exists: true, $ne: null }
  }).select('rating.value');

  const previousRatings = await Booking.find({
    status: 'completed',
    sessionDate: { $gte: previousStart, $lte: previousEnd },
    'rating.value': { $exists: true, $ne: null }
  }).select('rating.value');

  // Calculate average rating for current period
  let currentAvgRating = null;
  if (currentRatings.length > 0) {
    const sum = currentRatings.reduce((acc, booking) => acc + (booking.rating?.value || 0), 0);
    currentAvgRating = sum / currentRatings.length;
  }

  // Calculate average rating for previous period
  let previousAvgRating = null;
  if (previousRatings.length > 0) {
    const sum = previousRatings.reduce((acc, booking) => acc + (booking.rating?.value || 0), 0);
    previousAvgRating = sum / previousRatings.length;
  }

  // Calculate change percentage
  let ratingChange = 0;
  if (previousAvgRating !== null && previousAvgRating > 0) {
    if (currentAvgRating !== null) {
      ratingChange = ((currentAvgRating - previousAvgRating) / previousAvgRating) * 100;
    }
  } else if (currentAvgRating !== null && currentAvgRating > 0) {
    ratingChange = 100; // New ratings, so 100% increase
  }

  const avgTutorRating = {
    value: currentAvgRating, // null if no ratings, otherwise the average
    change: ratingChange,
    changeType: ratingChange >= 0 ? 'increase' : 'decrease',
    maxValue: 5,
    hasRatings: currentAvgRating !== null
  };

  // MRR - Monthly Recurring Revenue (from active monthly memberships)
  const currentMRR = await calculateMRR(currentEnd);
  const previousMonthEnd = new Date(currentEnd);
  previousMonthEnd.setMonth(previousMonthEnd.getMonth() - 1);
  const previousMRR = await calculateMRR(previousMonthEnd);
  const mrrChange = previousMRR > 0
    ? ((currentMRR - previousMRR) / previousMRR) * 100
    : (currentMRR > 0 ? 100 : 0);

  // Active Students - distinct students with bookings in period
  const studentIds = await Booking.distinct('student', { sessionDate: { $gte: currentStart, $lte: currentEnd } });
  const activeStudents = studentIds.length;
  const prevStudentIds = await Booking.distinct('student', { sessionDate: { $gte: previousStart, $lte: previousEnd } });
  const prevActiveStudents = prevStudentIds.length;
  const activeStudentsChange = prevActiveStudents > 0
    ? ((activeStudents - prevActiveStudents) / prevActiveStudents) * 100
    : (activeStudents > 0 ? 100 : 0);

  // Tutor Utilization Rate - completed session hours / (tutors * capacity)
  const activeTutorsCount = await User.countDocuments({ role: 'tutor' });
  const totalCompletedMinutes = await Booking.aggregate([
    { $match: { status: 'completed', sessionDate: { $gte: currentStart, $lte: currentEnd } } },
    { $group: { _id: null, total: { $sum: '$duration' } } }
  ]);
  const minutes = totalCompletedMinutes[0]?.total || 0;
  const hoursPerTutorPerWeek = 20; // assumed capacity
  const weeksInPeriod = (currentEnd - currentStart) / (7 * 24 * 60 * 60 * 1000);
  const capacityMinutes = Math.max(activeTutorsCount, 1) * hoursPerTutorPerWeek * 60 * Math.max(weeksInPeriod, 0.1);
  const tutorUtilizationRate = Math.min(100, Math.round((minutes / capacityMinutes) * 100));

  // Session Completion Rate - completed / (completed + cancelled)
  const cancelledCount = await Booking.countDocuments({
    status: 'cancelled',
    sessionDate: { $gte: currentStart, $lte: currentEnd }
  });
  const totalFinalSessions = currentSessions + cancelledCount;
  const sessionCompletionRate = totalFinalSessions > 0
    ? Math.round((currentSessions / totalFinalSessions) * 100)
    : 0;
  const prevCancelled = await Booking.countDocuments({
    status: 'cancelled',
    sessionDate: { $gte: previousStart, $lte: previousEnd }
  });
  const prevTotal = previousSessions + prevCancelled;
  const prevCompletionRate = prevTotal > 0 ? (previousSessions / prevTotal) * 100 : 0;
  const completionRateChange = prevCompletionRate > 0
    ? ((sessionCompletionRate - prevCompletionRate) / prevCompletionRate) * 100
    : (sessionCompletionRate > 0 ? 100 : 0);

  // Average Session Length (minutes)
  const sessionLengthAgg = await Booking.aggregate([
    { $match: { status: 'completed', sessionDate: { $gte: currentStart, $lte: currentEnd } } },
    { $group: { _id: null, avg: { $avg: '$duration' }, count: { $sum: 1 } } }
  ]);
  const avgSessionLength = sessionLengthAgg[0]?.avg ? Math.round(sessionLengthAgg[0].avg) : null;
  const prevLengthAgg = await Booking.aggregate([
    { $match: { status: 'completed', sessionDate: { $gte: previousStart, $lte: previousEnd } } },
    { $group: { _id: null, avg: { $avg: '$duration' } } }
  ]);
  const prevAvgLength = prevLengthAgg[0]?.avg || 0;
  const avgLengthChange = prevAvgLength > 0 && avgSessionLength
    ? ((avgSessionLength - prevAvgLength) / prevAvgLength) * 100
    : (avgSessionLength ? 100 : 0);

  return {
    totalRevenue: {
      value: currentRevenue,
      change: revenueChange,
      changeType: revenueChange >= 0 ? 'increase' : 'decrease'
    },
    mrr: {
      value: currentMRR,
      change: mrrChange,
      changeType: mrrChange >= 0 ? 'increase' : 'decrease'
    },
    newSignups: {
      value: currentSignups,
      change: signupsChange,
      changeType: signupsChange >= 0 ? 'increase' : 'decrease'
    },
    activeStudents: {
      value: activeStudents,
      change: activeStudentsChange,
      changeType: activeStudentsChange >= 0 ? 'increase' : 'decrease'
    },
    sessionsCompleted: {
      value: currentSessions,
      change: sessionsChange,
      changeType: sessionsChange >= 0 ? 'increase' : 'decrease'
    },
    tutorUtilizationRate: {
      value: tutorUtilizationRate,
      change: 0, // could add comparison
      changeType: 'increase'
    },
    sessionCompletionRate: {
      value: sessionCompletionRate,
      change: completionRateChange,
      changeType: completionRateChange >= 0 ? 'increase' : 'decrease'
    },
    avgSessionLength: {
      value: avgSessionLength,
      change: avgLengthChange,
      changeType: avgLengthChange >= 0 ? 'increase' : 'decrease'
    },
    avgTutorRating
  };
};

/**
 * Calculate MRR from active monthly memberships
 */
const calculateMRR = async (asOfDate) => {
  const activeMonthly = await User.find({
    'membership.status': 'active',
    'membership.startDate': { $lte: asOfDate }
  }).populate('membership.planId');

  let mrr = 0;
  activeMonthly.forEach(user => {
    if (user.membership?.planId?.priceType === 'monthly') {
      mrr += user.membership.planId.price;
    }
  });
  return Math.round(mrr);
};

/**
 * Calculate revenue from bookings and memberships
 */
const calculateRevenue = async (startDate, endDate) => {
  let revenue = 0;

  // Revenue from completed bookings
  // Estimate: $50 per hour (default rate, could be improved with actual pricing)
  const completedBookings = await Booking.find({
    status: 'completed',
    sessionDate: { $gte: startDate, $lte: endDate }
  }).populate('tutor', 'tutorInfo');

  completedBookings.forEach(booking => {
    const hourlyRate = booking.tutor?.tutorInfo?.hourlyRate || 50;
    const hours = booking.duration / 60;
    revenue += hourlyRate * hours;
  });

  // Revenue from active memberships that started in this period
  // Only count memberships that were active during this specific period
  const activeMemberships = await User.find({
    'membership.status': 'active',
    'membership.startDate': { $gte: startDate, $lte: endDate }
  }).populate('membership.planId');

  activeMemberships.forEach(user => {
    if (user.membership && user.membership.planId) {
      const plan = user.membership.planId;
      if (plan.priceType === 'monthly') {
        // For monthly plans, count the plan price once per membership start
        revenue += plan.price;
      } else if (plan.priceType === 'per_session') {
        // For per-session plans, estimate 4 sessions
        revenue += plan.price * 4;
      }
    }
  });

  return Math.round(revenue);
};

/**
 * Generate chart data for revenue over time
 */
const generateChartData = async (startDate, endDate, days) => {
  const revenueOverTime = [];
  const userGrowth = [];

  // Determine number of data points and interval
  let numPoints;
  let intervalDays;
  if (days <= 7) {
    numPoints = days; // Daily
    intervalDays = 1;
  } else if (days <= 30) {
    numPoints = Math.min(days, 14); // Up to 14 points for 30 days
    intervalDays = Math.ceil(days / numPoints);
  } else {
    numPoints = 12; // 12 points for 90 days
    intervalDays = Math.ceil(days / numPoints);
  }

  // Generate revenue over time data
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const intervalEnd = new Date(currentDate);
    intervalEnd.setDate(intervalEnd.getDate() + intervalDays);
    const actualEnd = intervalEnd > endDate ? new Date(endDate) : intervalEnd;

    // Calculate revenue for this interval
    const intervalRevenue = await calculateRevenue(new Date(currentDate), actualEnd);
    revenueOverTime.push({
      date: currentDate.toISOString(),
      revenue: intervalRevenue
    });

    // Move to next interval
    currentDate.setDate(currentDate.getDate() + intervalDays);
    
    // Limit to prevent too many points
    if (revenueOverTime.length >= numPoints) break;
  }

  // Generate user growth data - stacked: students vs tutors per interval
  const growthDate = new Date(startDate);
  while (growthDate <= endDate) {
    const intervalEnd = new Date(growthDate);
    intervalEnd.setDate(intervalEnd.getDate() + intervalDays);
    const actualEnd = intervalEnd > endDate ? new Date(endDate) : intervalEnd;

    const studentsInPeriod = await User.countDocuments({
      role: 'student',
      createdAt: { $gte: growthDate, $lte: actualEnd }
    });
    const tutorsInPeriod = await User.countDocuments({
      role: 'tutor',
      createdAt: { $gte: growthDate, $lte: actualEnd }
    });

    userGrowth.push({
      date: growthDate.toISOString(),
      students: studentsInPeriod,
      tutors: tutorsInPeriod,
      count: studentsInPeriod + tutorsInPeriod // backward compat
    });

    growthDate.setDate(growthDate.getDate() + intervalDays);
    if (userGrowth.length >= numPoints) break;
  }

  return {
    revenueOverTime,
    userGrowth
  };
};

/**
 * Generate recent activity feed
 */
const generateRecentActivity = async (startDate, endDate) => {
  const activities = [];

  // Recent signups
  const recentUsers = await User.find({
    createdAt: { $gte: startDate, $lte: endDate }
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('name email role createdAt');

  recentUsers.forEach(user => {
    const timeAgo = getTimeAgo(user.createdAt);
    activities.push({
      type: 'signup',
      message: `${user.name} (${user.role}) signed up`,
      timeAgo,
      timestamp: user.createdAt
    });
  });

  // Recent completed bookings
  const recentBookings = await Booking.find({
    status: 'completed',
    sessionDate: { $gte: startDate, $lte: endDate }
  })
    .populate('student', 'name')
    .populate('tutor', 'name')
    .sort({ sessionDate: -1 })
    .limit(10);

  recentBookings.forEach(booking => {
    const timeAgo = getTimeAgo(booking.sessionDate);
    const hours = booking.duration / 60;
    const estimatedAmount = 50 * hours; // Default rate
    activities.push({
      type: 'booking',
      message: `Session completed: ${booking.student?.name || 'Student'} with ${booking.tutor?.name || 'Tutor'}`,
      amount: estimatedAmount,
      timeAgo,
      timestamp: booking.sessionDate
    });
  });

  // Recent membership purchases (if membership startDate is in range)
  const recentMemberships = await User.find({
    'membership.status': 'active',
    'membership.startDate': { $gte: startDate, $lte: endDate }
  })
    .populate('membership.planId')
    .sort({ 'membership.startDate': -1 })
    .limit(10)
    .select('name membership');

  recentMemberships.forEach(user => {
    if (user.membership.planId) {
      const timeAgo = getTimeAgo(user.membership.startDate);
      activities.push({
        type: 'payment',
        message: `${user.name} purchased ${user.membership.planId.name} membership`,
        amount: user.membership.planId.price,
        timeAgo,
        timestamp: user.membership.startDate
      });
    }
  });

  // Sort all activities by timestamp (most recent first)
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Return top 20 most recent activities
  return activities.slice(0, 20);
};

/**
 * Helper function to calculate time ago string
 */
const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
};

module.exports = {
  getAnalytics,
};

