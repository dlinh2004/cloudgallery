// ==========================================
// ROUTES THONG BAO (Notifications)
// ==========================================

const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const {
    getMyNotifications,
    markAsRead,
    markAllAsRead
} = require('../controllers/notificationController');

router.get('/', isAuthenticated, getMyNotifications);
router.post('/:id/read', isAuthenticated, markAsRead);
router.post('/read-all', isAuthenticated, markAllAsRead);

module.exports = router;
