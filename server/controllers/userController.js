const User = require('../models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs').promises;

/**
 * @desc    Get the profile of the currently logged-in user
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
    try {
        // req.user.id is attached by the authMiddleware after token verification
        // Populate children if they exist (for parent users)
        const user = await User.findById(req.user.id)
            .select('-password') // Exclude password from the result
            .populate('children', 'name email avatar role'); // Populate children with basic info

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If user is a student, find all parents that have this student in their children array
        if (user.role === 'student') {
            const parents = await User.find({
                role: 'parent',
                children: user._id
            }).select('name email avatar role studentPaymentSettings');
            
            // Check payment permission from linked parents
            let canMakePayments = true; // Default to true if no parents
            if (parents.length > 0) {
                const studentIdStr = user._id.toString();
                // Check first parent's payment settings (assuming one primary parent)
                const parent = parents[0];
                if (parent.studentPaymentSettings) {
                    let paymentSetting = null;
                    if (parent.studentPaymentSettings instanceof Map) {
                        paymentSetting = parent.studentPaymentSettings.get(studentIdStr);
                    } else if (typeof parent.studentPaymentSettings === 'object') {
                        paymentSetting = parent.studentPaymentSettings[studentIdStr];
                    }
                    if (paymentSetting && paymentSetting.canMakePayments === false) {
                        canMakePayments = false;
                    }
                }
            }
            
            // Add parents array and payment permission to user object
            const userObj = user.toObject();
            userObj.parents = parents.map(p => {
                const pObj = p.toObject ? p.toObject() : p;
                // Don't expose studentPaymentSettings to student
                delete pObj.studentPaymentSettings;
                return pObj;
            });
            userObj.canMakePayments = canMakePayments;
            userObj.hasLinkedParent = parents.length > 0;
            return res.json(userObj);
        }

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * @desc    Update a user's profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
    const {
        name,
        email,
        avatar,
        tutorInfo,
        studentProfile,
        notifications,
        availableAsTutor,
        dateOfBirth,
        scholarshipPayout,
        studentInstitution,
    } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the fields that were provided
        if (name !== undefined) user.name = name;
        if (email !== undefined) {
            // Check if email is already taken by another user
            const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
            if (existingUser && existingUser._id.toString() !== req.user.id) {
                return res.status(400).json({ message: 'Email already in use by another user' });
            }
            user.email = email.toLowerCase().trim();
        }
        if (avatar !== undefined) user.avatar = avatar;
        
        // Update tutor info if user is a tutor or super_admin
        if ((user.role === 'tutor' || user.role === 'super_admin') && tutorInfo) {
            user.tutorInfo = { ...user.tutorInfo, ...tutorInfo };
        }
        
        // Update availableAsTutor for super_admin
        if (user.role === 'super_admin' && availableAsTutor !== undefined) {
            user.availableAsTutor = availableAsTutor;
        }
        
        // Update student profile if user is a student
        if (user.role === 'student' && studentProfile) {
            user.studentProfile = { ...user.studentProfile, ...studentProfile };
        }

        if (user.role === 'student' && dateOfBirth !== undefined) {
            if (dateOfBirth === null || dateOfBirth === '') {
                user.dateOfBirth = null;
            } else {
                const d = new Date(dateOfBirth);
                if (Number.isNaN(d.getTime())) {
                    return res.status(400).json({ message: 'Invalid dateOfBirth' });
                }
                user.dateOfBirth = d;
            }
        }

        if (user.role === 'student' && studentInstitution && typeof studentInstitution === 'object') {
            const next = { ...(user.studentInstitution || {}) };
            if (studentInstitution.name !== undefined) {
                next.name = String(studentInstitution.name || '').trim().slice(0, 240);
            }
            if (studentInstitution.type !== undefined) {
                const t =
                    studentInstitution.type === '' || studentInstitution.type === null
                        ? null
                        : studentInstitution.type;
                if (t && !['high_school', 'college', 'technical_trade'].includes(t)) {
                    return res.status(400).json({ message: 'Invalid institution type' });
                }
                next.type = t;
            }
            if (studentInstitution.sector !== undefined) {
                const s =
                    studentInstitution.sector === '' || studentInstitution.sector === null
                        ? null
                        : studentInstitution.sector;
                if (s && !['public', 'private'].includes(s)) {
                    return res.status(400).json({ message: 'Invalid institution sector' });
                }
                next.sector = s;
            }
            user.studentInstitution = next;
        }

        if (user.role === 'student' && scholarshipPayout && typeof scholarshipPayout === 'object') {
            const {
                parentConsentVerified: _v,
                parentConsentVerifiedAt: _a,
                parentConsentVerifiedBy: _b,
                ...payoutStudentFields
            } = scholarshipPayout;
            user.scholarshipPayout = {
                ...user.scholarshipPayout,
                ...payoutStudentFields,
            };
            if (payoutStudentFields.parentGuardianEmail !== undefined && user.scholarshipPayout.parentGuardianEmail) {
                user.scholarshipPayout.parentGuardianEmail = String(user.scholarshipPayout.parentGuardianEmail)
                    .toLowerCase()
                    .trim();
            }
            if (
                payoutStudentFields.parentGuardianName !== undefined ||
                payoutStudentFields.parentGuardianEmail !== undefined
            ) {
                user.scholarshipPayout.parentConsentVerified = false;
                user.scholarshipPayout.parentConsentVerifiedAt = null;
                user.scholarshipPayout.parentConsentVerifiedBy = null;
            }
        }
        
        // Update notification preferences
        if (notifications) {
            user.notifications = { ...user.notifications, ...notifications };
        }

        const updatedUser = await user.save();

        // Return updated user without password
        const userResponse = updatedUser.toObject();
        delete userResponse.password;

        res.json(userResponse);

    } catch (err) {
        console.error('[updateUserProfile] Error:', err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        res.status(500).json({ message: 'Server error while updating profile', error: err.message });
    }
};

/**
 * @desc    Get all users (for admin purposes)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password')
            .populate('children', 'name email avatar role'); // Populate children for parent users
        console.log(`[getAllUsers] Found ${users.length} users`);
        res.json(users);
    } catch (err) {
        console.error('Error in getAllUsers:', err.message);
        res.status(500).json({ message: 'Server error while fetching users' });
    }
};

/**
 * @desc    Get all tutors (accessible to all authenticated users)
 * @route   GET /api/users/tutors
 * @access  Private
 */
const getTutors = async (req, res) => {
    try {
        // Find all users with role 'tutor' OR super_admin who are available as tutor
        const tutors = await User.find({
            $or: [
                { role: 'tutor' },
                { role: 'super_admin', availableAsTutor: true }
            ]
        })
            .select('-password') // Exclude password
            .select('name email avatar role tutorInfo createdAt availableAsTutor'); // Only return necessary fields
        
        console.log(`[getTutors] Found ${tutors.length} tutors`);
        res.json(tutors);
    } catch (err) {
        console.error('Error in getTutors:', err.message);
        res.status(500).json({ message: 'Server error while fetching tutors' });
    }
};

/**
 * @desc    Update a user by ID (Admin only)
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, password, avatar, tutorInfo } = req.body;

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields if provided
        if (name) user.name = name;
        if (email) {
            // Check if email is already taken by another user
            const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
            if (existingUser && existingUser._id.toString() !== id) {
                return res.status(400).json({ message: 'Email already in use by another user' });
            }
            user.email = email.toLowerCase().trim();
        }
        if (role) {
            const validRoles = ['student', 'parent', 'tutor', 'admin', 'super_admin'];
            if (validRoles.includes(role)) {
                // Only allow admin or super_admin to change roles to admin or super_admin
                if ((role === 'admin' || role === 'super_admin') && 
                    req.user.role !== 'admin' && req.user.role !== 'super_admin') {
                    return res.status(403).json({ message: 'Only admins can assign admin or super_admin roles' });
                }
                user.role = role;
                
                // If changing to tutor or super_admin, ensure tutorInfo exists
                if ((role === 'tutor' || role === 'super_admin') && !user.tutorInfo) {
                    user.tutorInfo = {
                        status: 'active',
                        subjects: []
                    };
                }
            }
        }
        if (avatar !== undefined) user.avatar = avatar;
        if (tutorInfo && (user.role === 'tutor' || user.role === 'super_admin')) {
            user.tutorInfo = { ...user.tutorInfo, ...tutorInfo };
        }

        // Handle password reset
        if (password) {
            if (password.length < 8) {
                return res.status(400).json({ message: 'Password must be at least 8 characters long' });
            }
            const hasLetter = /[a-zA-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            if (!hasLetter || !hasNumber) {
                return res.status(400).json({ message: 'Password must contain both letters and numbers' });
            }
            // Hash the new password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await user.save();

        // Return user without password
        const userResponse = updatedUser.toObject();
        delete userResponse.password;

        console.log(`[updateUser] User updated: ${id}`);
        res.json(userResponse);
    } catch (error) {
        console.error('[updateUser] Error:', error);
        res.status(500).json({ message: 'Server error while updating user', error: error.message });
    }
};

/**
 * @desc    Delete a user by ID (Admin only)
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves
        if (req.user.id === id) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.findByIdAndDelete(id);

        console.log(`[deleteUser] User deleted: ${id}`);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('[deleteUser] Error:', error);
        res.status(500).json({ message: 'Server error while deleting user', error: error.message });
    }
};

/**
 * @desc    Update user's password
 * @route   PUT /api/users/profile/password
 * @access  Private
 */
const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }
        const hasLetter = /[a-zA-Z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        if (!hasLetter || !hasNumber) {
            return res.status(400).json({ message: 'New password must contain both letters and numbers' });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash and save new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        console.log(`[updatePassword] Password updated for user: ${req.user.id}`);
        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('[updatePassword] Error:', error);
        res.status(500).json({ message: 'Server error while updating password', error: error.message });
    }
};

/**
 * @desc    Enable two-factor authentication
 * @route   POST /api/users/profile/2fa/enable
 * @access  Private
 */
const enableTwoFactor = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // For now, we'll just enable 2FA without actual TOTP implementation
        // In production, you would generate a secret and QR code here
        user.twoFactorEnabled = true;
        await user.save();

        console.log(`[enableTwoFactor] 2FA enabled for user: ${req.user.id}`);
        res.json({ 
            message: 'Two-factor authentication enabled successfully',
            twoFactorEnabled: user.twoFactorEnabled 
        });

    } catch (error) {
        console.error('[enableTwoFactor] Error:', error);
        res.status(500).json({ message: 'Server error while enabling 2FA', error: error.message });
    }
};

/**
 * @desc    Disable two-factor authentication
 * @route   POST /api/users/profile/2fa/disable
 * @access  Private
 */
const disableTwoFactor = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;
        await user.save();

        console.log(`[disableTwoFactor] 2FA disabled for user: ${req.user.id}`);
        res.json({ 
            message: 'Two-factor authentication disabled successfully',
            twoFactorEnabled: user.twoFactorEnabled 
        });

    } catch (error) {
        console.error('[disableTwoFactor] Error:', error);
        res.status(500).json({ message: 'Server error while disabling 2FA', error: error.message });
    }
};

/**
 * @desc    Link a student to a parent (Admin only)
 * @route   POST /api/users/:parentId/link-child/:childId
 * @access  Private/Admin
 */
const linkChildToParent = async (req, res) => {
    try {
        const { parentId, childId } = req.params;

        const parent = await User.findById(parentId);
        const child = await User.findById(childId);

        if (!parent) {
            return res.status(404).json({ message: 'Parent not found' });
        }

        if (!child) {
            return res.status(404).json({ message: 'Child (student) not found' });
        }

        if (parent.role !== 'parent') {
            return res.status(400).json({ message: 'User is not a parent' });
        }

        if (child.role !== 'student') {
            return res.status(400).json({ message: 'User is not a student' });
        }

        // Check if child is already linked
        if (parent.children.includes(childId)) {
            return res.status(400).json({ message: 'Child is already linked to this parent' });
        }

        // Add child to parent's children array
        parent.children.push(childId);
        await parent.save();

        // Populate children before returning
        await parent.populate('children', 'name email avatar role');

        console.log(`[linkChildToParent] Linked child ${childId} to parent ${parentId}`);
        res.json({ 
            message: 'Child linked to parent successfully',
            parent: parent
        });

    } catch (error) {
        console.error('[linkChildToParent] Error:', error);
        res.status(500).json({ message: 'Server error while linking child to parent', error: error.message });
    }
};

/**
 * @desc    Unlink a student from a parent (Admin only)
 * @route   DELETE /api/users/:parentId/unlink-child/:childId
 * @access  Private/Admin
 */
const unlinkChildFromParent = async (req, res) => {
    try {
        const { parentId, childId } = req.params;

        const parent = await User.findById(parentId);

        if (!parent) {
            return res.status(404).json({ message: 'Parent not found' });
        }

        if (parent.role !== 'parent') {
            return res.status(400).json({ message: 'User is not a parent' });
        }

        // Check if child is linked
        if (!parent.children.includes(childId)) {
            return res.status(400).json({ message: 'Child is not linked to this parent' });
        }

        // Remove child from parent's children array
        parent.children = parent.children.filter(id => id.toString() !== childId);
        await parent.save();

        // Populate children before returning
        await parent.populate('children', 'name email avatar role');

        console.log(`[unlinkChildFromParent] Unlinked child ${childId} from parent ${parentId}`);
        res.json({ 
            message: 'Child unlinked from parent successfully',
            parent: parent
        });

    } catch (error) {
        console.error('[unlinkChildFromParent] Error:', error);
        res.status(500).json({ message: 'Server error while unlinking child from parent', error: error.message });
    }
};

/**
 * @desc    Get all students (for parent-child linking in admin panel)
 * @route   GET /api/users/students
 * @access  Private/Admin
 */
const getStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' })
            .select('-password')
            .select('name email avatar role createdAt');
        
        console.log(`[getStudents] Found ${students.length} students`);
        res.json(students);
    } catch (err) {
        console.error('Error in getStudents:', err.message);
        res.status(500).json({ message: 'Server error while fetching students', error: err.message });
    }
};

/**
 * @desc    Update payment permission for a student (Parent only)
 * @route   PUT /api/users/student-payment-permission/:studentId
 * @access  Private (Parent)
 */
const updateStudentPaymentPermission = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can update student payment permissions' });
        }

        const { studentId } = req.params;
        const { canMakePayments } = req.body;

        if (canMakePayments === undefined) {
            return res.status(400).json({ message: 'canMakePayments is required' });
        }

        // Verify the student is linked to this parent
        if (!user.children || !user.children.includes(studentId)) {
            return res.status(403).json({ message: 'Student is not linked to this parent account' });
        }

        // Verify the student exists
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Update payment permission
        if (!user.studentPaymentSettings) {
            user.studentPaymentSettings = new Map();
        }
        user.studentPaymentSettings.set(studentId.toString(), {
            canMakePayments: Boolean(canMakePayments)
        });

        await user.save();

        // Populate children before returning
        await user.populate('children', 'name email avatar role');

        console.log(`[updateStudentPaymentPermission] Updated payment permission for student ${studentId} to ${canMakePayments}`);
        res.json({ 
            message: 'Payment permission updated successfully',
            studentId,
            canMakePayments,
            parent: user
        });

    } catch (error) {
        console.error('[updateStudentPaymentPermission] Error:', error);
        res.status(500).json({ message: 'Server error while updating payment permission', error: error.message });
    }
};

/**
 * @desc    Upload a certification badge (Tutor, Admin, Super Admin only)
 * @route   POST /api/users/profile/certification-badges
 * @access  Private (Tutor, Admin, Super Admin)
 */
const uploadCertificationBadge = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only allow tutors, admins, and super_admins to upload badges
        if (user.role !== 'tutor' && user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only tutors, admins, and super admins can upload certification badges' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Badge image is required' });
        }

        const { name, issuedBy, issueDate, expiryDate, credentialId } = req.body;

        if (!name) {
            // Delete uploaded file if validation fails
            try {
                await fs.unlink(req.file.path);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
            return res.status(400).json({ message: 'Badge name is required' });
        }

        // Construct image URL (relative to server)
        const imageUrl = `/uploads/badges/${req.file.filename}`;

        // Create badge object
        const badge = {
            name: name.trim(),
            imageUrl,
            issuedBy: issuedBy ? issuedBy.trim() : '',
            issueDate: issueDate ? new Date(issueDate) : null,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            credentialId: credentialId ? credentialId.trim() : '',
            uploadedAt: new Date(),
        };

        // Add badge to user's certificationBadges array
        if (!user.certificationBadges) {
            user.certificationBadges = [];
        }
        user.certificationBadges.push(badge);
        await user.save();

        console.log(`[uploadCertificationBadge] Badge uploaded for user ${req.user.id}: ${name}`);
        res.status(201).json({
            message: 'Certification badge uploaded successfully',
            badge: badge,
        });
    } catch (error) {
        console.error('[uploadCertificationBadge] Error:', error);
        // Delete uploaded file if there's an error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }
        res.status(500).json({ message: 'Server error while uploading badge', error: error.message });
    }
};

/**
 * @desc    Delete a certification badge (Tutor, Admin, Super Admin only)
 * @route   DELETE /api/users/profile/certification-badges/:badgeIndex
 * @access  Private (Tutor, Admin, Super Admin)
 */
const deleteCertificationBadge = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only allow tutors, admins, and super_admins to delete badges
        if (user.role !== 'tutor' && user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only tutors, admins, and super admins can delete certification badges' });
        }

        const badgeIndex = parseInt(req.params.badgeIndex, 10);

        if (isNaN(badgeIndex) || !user.certificationBadges || badgeIndex < 0 || badgeIndex >= user.certificationBadges.length) {
            return res.status(400).json({ message: 'Invalid badge index' });
        }

        const badge = user.certificationBadges[badgeIndex];

        // Delete the image file from the server
        if (badge.imageUrl) {
            const filePath = path.join(__dirname, '..', badge.imageUrl);
            try {
                await fs.unlink(filePath);
            } catch (err) {
                // File might not exist, log but don't fail
                console.warn(`[deleteCertificationBadge] Could not delete file ${filePath}:`, err.message);
            }
        }

        // Remove badge from array
        user.certificationBadges.splice(badgeIndex, 1);
        await user.save();

        console.log(`[deleteCertificationBadge] Badge deleted for user ${req.user.id} at index ${badgeIndex}`);
        res.json({
            message: 'Certification badge deleted successfully',
        });
    } catch (error) {
        console.error('[deleteCertificationBadge] Error:', error);
        res.status(500).json({ message: 'Server error while deleting badge', error: error.message });
    }
};

/**
 * @desc    Update a certification badge (Tutor, Admin, Super Admin only)
 * @route   PUT /api/users/profile/certification-badges/:badgeIndex
 * @access  Private (Tutor, Admin, Super Admin)
 */
const updateCertificationBadge = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only allow tutors, admins, and super_admins to update badges
        if (user.role !== 'tutor' && user.role !== 'admin' && user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only tutors, admins, and super admins can update certification badges' });
        }

        const badgeIndex = parseInt(req.params.badgeIndex, 10);

        if (isNaN(badgeIndex) || !user.certificationBadges || badgeIndex < 0 || badgeIndex >= user.certificationBadges.length) {
            return res.status(400).json({ message: 'Invalid badge index' });
        }

        const { name, issuedBy, issueDate, expiryDate, credentialId } = req.body;

        // Update badge fields
        if (name !== undefined) user.certificationBadges[badgeIndex].name = name.trim();
        if (issuedBy !== undefined) user.certificationBadges[badgeIndex].issuedBy = issuedBy.trim();
        if (issueDate !== undefined) user.certificationBadges[badgeIndex].issueDate = issueDate ? new Date(issueDate) : null;
        if (expiryDate !== undefined) user.certificationBadges[badgeIndex].expiryDate = expiryDate ? new Date(expiryDate) : null;
        if (credentialId !== undefined) user.certificationBadges[badgeIndex].credentialId = credentialId.trim();

        // If a new image is uploaded, replace the old one
        if (req.file) {
            const oldBadge = user.certificationBadges[badgeIndex];
            // Delete old image file
            if (oldBadge.imageUrl) {
                const oldFilePath = path.join(__dirname, '..', oldBadge.imageUrl);
                try {
                    await fs.unlink(oldFilePath);
                } catch (err) {
                    console.warn(`[updateCertificationBadge] Could not delete old file ${oldFilePath}:`, err.message);
                }
            }
            // Update with new image URL
            user.certificationBadges[badgeIndex].imageUrl = `/uploads/badges/${req.file.filename}`;
        }

        await user.save();

        console.log(`[updateCertificationBadge] Badge updated for user ${req.user.id} at index ${badgeIndex}`);
        res.json({
            message: 'Certification badge updated successfully',
            badge: user.certificationBadges[badgeIndex],
        });
    } catch (error) {
        console.error('[updateCertificationBadge] Error:', error);
        // Delete uploaded file if there's an error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }
        res.status(500).json({ message: 'Server error while updating badge', error: error.message });
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    getAllUsers,
    getTutors,
    getStudents,
    updateUser,
    deleteUser,
    updatePassword,
    enableTwoFactor,
    disableTwoFactor,
    linkChildToParent,
    unlinkChildFromParent,
    updateStudentPaymentPermission,
    uploadCertificationBadge,
    deleteCertificationBadge,
    updateCertificationBadge,
};