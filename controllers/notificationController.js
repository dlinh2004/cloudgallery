// ==========================================
// CONTROLLER THONG BAO (Notifications)
// ==========================================

const pool = require('../config/db');

async function getMyNotifications(req, res) {
    try {
        const userId = req.session.user.id;

        const notificationsResult = await pool.query(
            `SELECT n.id, n.type, n.message, n.image_id, n.comment_id, n.is_read, n.created_at,
                    u.username AS actor_username
             FROM notifications n
             JOIN users u ON u.id = n.actor_id
             WHERE n.recipient_id = $1
             ORDER BY n.created_at DESC
             LIMIT 30`,
            [userId]
        );

        const unreadResult = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE recipient_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({
            unreadCount: Number.parseInt(unreadResult.rows[0].count, 10),
            notifications: notificationsResult.rows
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Loi khi tai thong bao' });
    }
}

async function markAsRead(req, res) {
    try {
        const userId = req.session.user.id;
        const notificationId = Number.parseInt(req.params.id, 10);

        if (Number.isNaN(notificationId)) {
            return res.status(400).json({ error: 'ID thong bao khong hop le' });
        }

        const result = await pool.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE id = $1 AND recipient_id = $2
             RETURNING id`,
            [notificationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Khong tim thay thong bao' });
        }

        res.json({ message: 'Da danh dau da doc' });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Loi khi cap nhat thong bao' });
    }
}

async function markAllAsRead(req, res) {
    try {
        const userId = req.session.user.id;

        await pool.query(
            `UPDATE notifications
             SET is_read = TRUE
             WHERE recipient_id = $1 AND is_read = FALSE`,
            [userId]
        );

        res.json({ message: 'Da danh dau tat ca thong bao da doc' });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({ error: 'Loi khi cap nhat thong bao' });
    }
}

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
