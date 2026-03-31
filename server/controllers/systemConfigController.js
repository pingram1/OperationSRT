const SystemConfig = require('../models/SystemConfig');

/**
 * @desc    Get system configuration
 * @route   GET /api/system-config
 * @access  Private (Admin only)
 */
const getSystemConfig = async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();
        res.json(config);
    } catch (error) {
        console.error('[getSystemConfig] Error:', error);
        res.status(500).json({ message: 'Server error while fetching system config', error: error.message });
    }
};

/**
 * @desc    Update system configuration
 * @route   PUT /api/system-config
 * @access  Private (Admin only)
 */
const updateSystemConfig = async (req, res) => {
    try {
        const {
            maintenanceMode,
            maintenanceMessage,
            businessHours,
            contactEmail,
            tutorSchedule,
            subjects,
            matchingWeights,
        } = req.body;

        const userId = req.user.id;

        // Get or create config
        let config = await SystemConfig.findOne();
        if (!config) {
            config = new SystemConfig();
        }

        // Update fields if provided
        if (typeof maintenanceMode === 'boolean') {
            config.maintenanceMode = maintenanceMode;
        }
        if (maintenanceMessage !== undefined) {
            config.maintenanceMessage = maintenanceMessage;
        }
        if (businessHours !== undefined) {
            config.businessHours = businessHours;
        }
        if (contactEmail !== undefined) {
            config.contactEmail = contactEmail;
        }
        if (tutorSchedule !== undefined) {
            config.tutorSchedule = tutorSchedule;
        }
        if (subjects !== undefined) {
            // Ensure subjects is an array and remove duplicates
            config.subjects = [...new Set(subjects.filter(s => s && s.trim()))];
        }
        if (matchingWeights !== undefined && typeof matchingWeights === 'object') {
            const mw = matchingWeights;
            if (typeof mw.styleCompatibility === 'number' && typeof mw.subjectMatch === 'number' && typeof mw.teachingAlignment === 'number') {
                const sum = mw.styleCompatibility + mw.subjectMatch + mw.teachingAlignment;
                if (Math.abs(sum - 1) < 0.01) {
                    config.matchingWeights = {
                        styleCompatibility: mw.styleCompatibility,
                        subjectMatch: mw.subjectMatch,
                        teachingAlignment: mw.teachingAlignment,
                    };
                }
            }
        }

        config.lastUpdatedBy = userId;

        const updatedConfig = await config.save();
        await updatedConfig.populate('lastUpdatedBy', 'name email');

        console.log(`[updateSystemConfig] System config updated by user: ${userId}`);
        res.json(updatedConfig);
    } catch (error) {
        console.error('[updateSystemConfig] Error:', error);
        res.status(500).json({ message: 'Server error while updating system config', error: error.message });
    }
};

/**
 * @desc    Get tutor schedule (public endpoint for tutors)
 * @route   GET /api/system-config/tutor-schedule
 * @access  Private (Tutors and Admin)
 */
const getTutorSchedule = async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();
        res.json({
            schedule: config.tutorSchedule,
            businessHours: config.businessHours,
        });
    } catch (error) {
        console.error('[getTutorSchedule] Error:', error);
        res.status(500).json({ message: 'Server error while fetching tutor schedule', error: error.message });
    }
};

/**
 * @desc    Get available subjects (public endpoint for booking forms)
 * @route   GET /api/system-config/subjects
 * @access  Public (no auth required)
 */
const getSubjects = async (req, res) => {
    try {
        const config = await SystemConfig.getConfig();
        res.json({
            subjects: config.subjects || [],
        });
    } catch (error) {
        console.error('[getSubjects] Error:', error);
        res.status(500).json({ message: 'Server error while fetching subjects', error: error.message });
    }
};

module.exports = {
    getSystemConfig,
    updateSystemConfig,
    getTutorSchedule,
    getSubjects,
};

