const Achievement = require('../models/Achievement');
const Booking = require('../models/Booking');
const User = require('../models/User');

/**
 * Achievement definitions with criteria
 */
const ACHIEVEMENT_DEFINITIONS = {
    first_session: {
        name: 'First Steps',
        description: 'Completed your first tutoring session!',
        icon: '🎉',
        category: 'milestone',
        check: async (studentId) => {
            const count = await Booking.countDocuments({ 
                student: studentId, 
                status: 'completed' 
            });
            return count >= 1;
        },
    },
    sessions_5: {
        name: 'Getting Started',
        description: 'Completed 5 tutoring sessions!',
        icon: '⭐',
        category: 'milestone',
        check: async (studentId) => {
            const count = await Booking.countDocuments({ 
                student: studentId, 
                status: 'completed' 
            });
            return count >= 5;
        },
    },
    sessions_10: {
        name: 'Dedicated Learner',
        description: 'Completed 10 tutoring sessions!',
        icon: '🌟',
        category: 'milestone',
        check: async (studentId) => {
            const count = await Booking.countDocuments({ 
                student: studentId, 
                status: 'completed' 
            });
            return count >= 10;
        },
    },
    sessions_25: {
        name: 'Academic Star',
        description: 'Completed 25 tutoring sessions!',
        icon: '🏆',
        category: 'milestone',
        check: async (studentId) => {
            const count = await Booking.countDocuments({ 
                student: studentId, 
                status: 'completed' 
            });
            return count >= 25;
        },
    },
    sessions_50: {
        name: 'Learning Champion',
        description: 'Completed 50 tutoring sessions!',
        icon: '👑',
        category: 'milestone',
        check: async (studentId) => {
            const count = await Booking.countDocuments({ 
                student: studentId, 
                status: 'completed' 
            });
            return count >= 50;
        },
    },
    sessions_100: {
        name: 'Master Learner',
        description: 'Completed 100 tutoring sessions!',
        icon: '💎',
        category: 'milestone',
        check: async (studentId) => {
            const count = await Booking.countDocuments({ 
                student: studentId, 
                status: 'completed' 
            });
            return count >= 100;
        },
    },
    subject_master: {
        name: 'Subject Master',
        description: 'Mastered a subject through consistent learning!',
        icon: '🎓',
        category: 'subject',
        check: async (studentId, metadata = {}) => {
            if (!metadata.subject) return false;
            const count = await Booking.countDocuments({ 
                student: studentId, 
                subject: metadata.subject,
                status: 'completed' 
            });
            return count >= 10;
        },
    },
    improvement_star: {
        name: 'Improvement Star',
        description: 'Showed significant improvement in a subject!',
        icon: '⭐',
        category: 'improvement',
        check: async (studentId, metadata = {}) => {
            // This would check session notes for improvement indicators
            // For now, we'll check if student has completed multiple sessions with positive notes
            const sessions = await Booking.find({ 
                student: studentId, 
                status: 'completed',
                'sessionNotes.conceptsMastered': { $exists: true, $ne: '' }
            }).limit(5);
            return sessions.length >= 3;
        },
    },
};

/**
 * Check and award achievements for a student
 * @desc    Check if student qualifies for any achievements and award them
 * @route   POST /api/achievements/check/:studentId
 * @access  Private (Admin, Parent, Student)
 */
const checkAndAwardAchievements = async (req, res) => {
    try {
        const { studentId } = req.params;
        const user = await User.findById(req.user.id);
        
        // Check permissions
        const isStudent = user.role === 'student' && user._id.toString() === studentId;
        const isParent = user.role === 'parent' && user.children && user.children.includes(studentId);
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        
        if (!isStudent && !isParent && !isAdmin) {
            return res.status(403).json({ message: 'You do not have permission to check achievements for this student' });
        }

        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        const awardedAchievements = [];
        
        // Check each achievement type
        for (const [type, definition] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
            // Check if student already has this achievement
            const existing = await Achievement.findOne({ 
                student: studentId, 
                type 
            });
            
            if (existing) continue;
            
            // Check if student qualifies
            const qualifies = await definition.check(studentId, {});
            
            if (qualifies) {
                // Award the achievement
                const achievement = new Achievement({
                    student: studentId,
                    type,
                    name: definition.name,
                    description: definition.description,
                    icon: definition.icon,
                    category: definition.category,
                    metadata: {
                        date: new Date(),
                    },
                });
                
                await achievement.save();
                awardedAchievements.push(achievement);
            }
        }

        res.json({ 
            message: 'Achievements checked',
            awarded: awardedAchievements.length,
            achievements: awardedAchievements
        });
    } catch (err) {
        console.error('[checkAndAwardAchievements] Error:', err.message);
        res.status(500).json({ message: 'Server error while checking achievements' });
    }
};

/**
 * Get all achievements for a student
 * @desc    Get all achievements earned by a student
 * @route   GET /api/achievements/student/:studentId
 * @access  Private (Admin, Parent, Student)
 */
const getStudentAchievements = async (req, res) => {
    try {
        const { studentId } = req.params;
        const user = await User.findById(req.user.id);
        
        // Check permissions
        const isStudent = user.role === 'student' && user._id.toString() === studentId;
        const isParent = user.role === 'parent' && user.children && user.children.includes(studentId);
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        
        if (!isStudent && !isParent && !isAdmin) {
            return res.status(403).json({ message: 'You do not have permission to view achievements for this student' });
        }

        const achievements = await Achievement.find({ student: studentId })
            .sort({ createdAt: -1 });

        // Group by category
        const grouped = achievements.reduce((acc, achievement) => {
            const category = achievement.category || 'milestone';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(achievement);
            return acc;
        }, {});

        res.json({ 
            achievements,
            grouped,
            total: achievements.length
        });
    } catch (err) {
        console.error('[getStudentAchievements] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching achievements' });
    }
};

/**
 * Get all achievements (Admin only)
 * @desc    Get all achievements in the system
 * @route   GET /api/achievements/all
 * @access  Private (Admin)
 */
const getAllAchievements = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
            return res.status(403).json({ message: 'Only administrators can view all achievements' });
        }

        const achievements = await Achievement.find()
            .populate('student', 'name email avatar')
            .sort({ createdAt: -1 });

        res.json(achievements);
    } catch (err) {
        console.error('[getAllAchievements] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching achievements' });
    }
};

/**
 * Auto-check achievements when a booking is completed
 * This should be called after a booking is marked as complete
 */
const autoCheckAchievements = async (studentId) => {
    try {
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return;
        }

        const awardedAchievements = [];
        
        // Check each achievement type
        for (const [type, definition] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
            // Check if student already has this achievement
            const existing = await Achievement.findOne({ 
                student: studentId, 
                type 
            });
            
            if (existing) continue;
            
            // Check if student qualifies
            const qualifies = await definition.check(studentId, {});
            
            if (qualifies) {
                // Award the achievement
                const achievement = new Achievement({
                    student: studentId,
                    type,
                    name: definition.name,
                    description: definition.description,
                    icon: definition.icon,
                    category: definition.category,
                    metadata: {
                        date: new Date(),
                    },
                });
                
                await achievement.save();
                awardedAchievements.push(achievement);
            }
        }

        return awardedAchievements;
    } catch (err) {
        console.error('[autoCheckAchievements] Error:', err.message);
        return [];
    }
};

module.exports = {
    checkAndAwardAchievements,
    getStudentAchievements,
    getAllAchievements,
    autoCheckAchievements,
    ACHIEVEMENT_DEFINITIONS,
};

