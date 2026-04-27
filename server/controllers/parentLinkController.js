const ParentLinkRequest = require('../models/ParentLinkRequest');
const User = require('../models/User');

/**
 * @desc    Send a parent link request to a student by email
 * @route   POST /api/users/parent-link-request
 * @access  Private (Parent)
 */
const sendParentLinkRequest = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can send link requests' });
        }

        const { studentEmail, message } = req.body;

        if (!studentEmail) {
            return res.status(400).json({ message: 'Student email is required' });
        }

        // Find the student by email
        const student = await User.findOne({ 
            email: studentEmail.trim().toLowerCase(),
            role: 'student'
        });

        if (!student) {
            return res.status(404).json({ message: 'No student account found with that email address' });
        }

        // Check if parent is already linked to this student
        if (user.children && user.children.includes(student._id)) {
            return res.status(400).json({ message: 'You are already linked to this student' });
        }

        // Check if there's already a pending request
        const existingRequest = await ParentLinkRequest.findOne({
            parent: user._id,
            student: student._id,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'A pending request already exists for this student' });
        }

        // Create the request
        const request = new ParentLinkRequest({
            parent: user._id,
            student: student._id,
            message: message || '',
            status: 'pending',
        });

        await request.save();

        // Populate parent and student info for response
        await request.populate('parent', 'name email avatar');
        await request.populate('student', 'name email avatar');

        console.log(`[sendParentLinkRequest] Parent ${user._id} sent link request to student ${student._id}`);
        res.status(201).json({
            message: 'Link request sent successfully',
            request,
        });
    } catch (err) {
        console.error('[sendParentLinkRequest] Error:', err.message);
        res.status(500).json({ message: 'Server error while sending link request' });
    }
};

/**
 * @desc    Get all pending link requests for a student
 * @route   GET /api/users/parent-link-requests
 * @access  Private (Student)
 */
const getParentLinkRequests = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let requests = [];

        if (user.role === 'student') {
            // Get all requests for this student (all statuses)
            requests = await ParentLinkRequest.find({
                student: user._id,
            })
            .populate('parent', 'name email avatar')
            .sort({ createdAt: -1 });
        } else if (user.role === 'parent') {
            // Get all requests sent by this parent
            requests = await ParentLinkRequest.find({
                parent: user._id,
            })
            .populate('student', 'name email avatar')
            .sort({ createdAt: -1 });
        } else {
            return res.status(403).json({ message: 'Only students and parents can view link requests' });
        }

        res.json({ requests });
    } catch (err) {
        console.error('[getParentLinkRequests] Error:', err.message);
        res.status(500).json({ message: 'Server error while fetching link requests' });
    }
};

/**
 * @desc    Accept a parent link request
 * @route   PUT /api/users/parent-link-request/:requestId/accept
 * @access  Private (Student)
 */
const acceptParentLinkRequest = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can accept link requests' });
        }

        const request = await ParentLinkRequest.findById(req.params.requestId);
        if (!request) {
            return res.status(404).json({ message: 'Link request not found' });
        }

        // Verify the request is for this student
        const studentId = request.student._id || request.student;
        if (studentId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'You do not have permission to accept this request' });
        }

        // Verify the request is still pending
        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'This request has already been processed' });
        }

        // Update request status
        request.status = 'accepted';
        await request.save();

        // Add student to parent's children array
        const parentId = request.parent._id || request.parent;
        const parent = await User.findById(parentId);
        if (!parent) {
            return res.status(404).json({ message: 'Parent not found' });
        }

        if (!parent.children) {
            parent.children = [];
        }

        // Check if student is already in the array
        const studentIdToAdd = user._id.toString();
        const childrenIds = parent.children.map(c => (c._id || c).toString());
        if (!childrenIds.includes(studentIdToAdd)) {
            parent.children.push(user._id);
            await parent.save();
        }

        // Populate for response
        await request.populate('parent', 'name email avatar');
        await request.populate('student', 'name email avatar');

        console.log(`[acceptParentLinkRequest] Student ${user._id} accepted link request from parent ${request.parent}`);
        res.json({
            message: 'Link request accepted successfully',
            request,
        });
    } catch (err) {
        console.error('[acceptParentLinkRequest] Error:', err.message);
        res.status(500).json({ message: 'Server error while accepting link request' });
    }
};

/**
 * @desc    Reject a parent link request
 * @route   PUT /api/users/parent-link-request/:requestId/reject
 * @access  Private (Student)
 */
const rejectParentLinkRequest = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can reject link requests' });
        }

        const request = await ParentLinkRequest.findById(req.params.requestId);
        if (!request) {
            return res.status(404).json({ message: 'Link request not found' });
        }

        // Verify the request is for this student
        const studentId = request.student._id || request.student;
        if (studentId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'You do not have permission to reject this request' });
        }

        // Verify the request is still pending
        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'This request has already been processed' });
        }

        // Update request status
        request.status = 'rejected';
        await request.save();

        // Populate for response
        await request.populate('parent', 'name email avatar');
        await request.populate('student', 'name email avatar');

        console.log(`[rejectParentLinkRequest] Student ${user._id} rejected link request from parent ${request.parent}`);
        res.json({
            message: 'Link request rejected',
            request,
        });
    } catch (err) {
        console.error('[rejectParentLinkRequest] Error:', err.message);
        res.status(500).json({ message: 'Server error while rejecting link request' });
    }
};

/**
 * @desc    Cancel a parent link request
 * @route   PUT /api/users/parent-link-request/:requestId/cancel
 * @access  Private (Parent)
 */
const cancelParentLinkRequest = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'parent') {
            return res.status(403).json({ message: 'Only parents can cancel link requests' });
        }

        const request = await ParentLinkRequest.findById(req.params.requestId);
        if (!request) {
            return res.status(404).json({ message: 'Link request not found' });
        }

        // Verify the request is from this parent
        const parentId = request.parent._id || request.parent;
        if (parentId.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'You do not have permission to cancel this request' });
        }

        // Verify the request is still pending
        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'This request has already been processed' });
        }

        // Update request status
        request.status = 'cancelled';
        await request.save();

        // Populate for response
        await request.populate('parent', 'name email avatar');
        await request.populate('student', 'name email avatar');

        console.log(`[cancelParentLinkRequest] Parent ${user._id} cancelled link request to student ${request.student}`);
        res.json({
            message: 'Link request cancelled',
            request,
        });
    } catch (err) {
        console.error('[cancelParentLinkRequest] Error:', err.message);
        res.status(500).json({ message: 'Server error while cancelling link request' });
    }
};

/**
 * @desc    Send parent link request during signup
 * @route   POST /api/auth/register
 * @access  Public
 * @note    This is called from the registerUser function in authController
 */
const createParentLinkRequestFromSignup = async (parentId, studentEmail, message) => {
    try {
        // Find the student by email
        const student = await User.findOne({ 
            email: studentEmail.trim().toLowerCase(),
            role: 'student'
        });

        if (!student) {
            return { success: false, message: 'No student account found with that email address' };
        }

        // Check if parent is already linked to this student
        const parent = await User.findById(parentId);
        if (parent && parent.children && parent.children.includes(student._id)) {
            return { success: false, message: 'You are already linked to this student' };
        }

        // Check if there's already a pending request
        const existingRequest = await ParentLinkRequest.findOne({
            parent: parentId,
            student: student._id,
            status: 'pending'
        });

        if (existingRequest) {
            return { success: false, message: 'A pending request already exists for this student' };
        }

        // Create the request
        const request = new ParentLinkRequest({
            parent: parentId,
            student: student._id,
            message: message || '',
            status: 'pending',
        });

        await request.save();

        return { success: true, request };
    } catch (err) {
        console.error('[createParentLinkRequestFromSignup] Error:', err.message);
        return { success: false, message: err.message };
    }
};

module.exports = {
    sendParentLinkRequest,
    getParentLinkRequests,
    acceptParentLinkRequest,
    rejectParentLinkRequest,
    cancelParentLinkRequest,
    createParentLinkRequestFromSignup,
};

