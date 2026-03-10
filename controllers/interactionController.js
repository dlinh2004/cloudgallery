// ==========================================
// CONTROLLER TƯƠNG TÁC (Likes & Comments)
// ==========================================

const pool = require('../config/db');

function toInt(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

async function getImageMeta(imageId) {
    const result = await pool.query(
        'SELECT id, user_id, title FROM images WHERE id = $1',
        [imageId]
    );
    return result.rows[0] || null;
}

async function createNotification({ recipientId, actorId, imageId, commentId = null, type, message }) {
    if (!recipientId || !actorId || recipientId === actorId) return;

    await pool.query(
        `INSERT INTO notifications (recipient_id, actor_id, image_id, comment_id, type, message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [recipientId, actorId, imageId, commentId, type, message]
    );
}

function buildCommentTree(comments) {
    const commentMap = new Map();
    const rootComments = [];

    comments.forEach((comment) => {
        commentMap.set(comment.id, {
            ...comment,
            replies: []
        });
    });

    comments.forEach((comment) => {
        const current = commentMap.get(comment.id);
        if (!comment.parent_id) {
            rootComments.push(current);
            return;
        }

        const parent = commentMap.get(comment.parent_id);
        if (parent) {
            parent.replies.push(current);
        } else {
            // Nếu parent đã bị xóa hoặc dữ liệu cũ không hợp lệ thì đẩy về root để tránh mất bình luận.
            rootComments.push(current);
        }
    });

    return rootComments;
}

// ---- TOGGLE LIKE (thả tim / bỏ tim) ----
async function toggleLike(req, res) {
    try {
        const imageId = toInt(req.params.imageId);
        const userId = req.session.user.id;
        const actorName = req.session.user.username || 'Ai đó';

        if (!imageId) {
            return res.status(400).json({ error: 'ID ảnh không hợp lệ' });
        }

        const image = await getImageMeta(imageId);

        if (!image) {
            return res.status(404).json({ error: 'Không tìm thấy ảnh' });
        }

        // Kiểm tra đã like chưa
        const existing = await pool.query(
            'SELECT id FROM likes WHERE image_id = $1 AND user_id = $2',
            [imageId, userId]
        );

        if (existing.rows.length > 0) {
            // Đã like → bỏ like
            await pool.query(
                'DELETE FROM likes WHERE image_id = $1 AND user_id = $2',
                [imageId, userId]
            );
            const count = await pool.query(
                'SELECT COUNT(*) FROM likes WHERE image_id = $1',
                [imageId]
            );
            return res.json({ liked: false, count: parseInt(count.rows[0].count) });
        } else {
            // Chưa like → thêm like
            await pool.query(
                'INSERT INTO likes (image_id, user_id) VALUES ($1, $2)',
                [imageId, userId]
            );

            await createNotification({
                recipientId: image.user_id,
                actorId: userId,
                imageId,
                type: 'like',
                message: `${actorName} đã thả tim ảnh "${image.title}" của bạn.`
            });

            const count = await pool.query(
                'SELECT COUNT(*) FROM likes WHERE image_id = $1',
                [imageId]
            );
            return res.json({ liked: true, count: parseInt(count.rows[0].count) });
        }
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ error: 'Lỗi khi thả tim' });
    }
}

// ---- LẤY LIKES CỦA ẢNH ----
async function getLikes(req, res) {
    try {
        const imageId = toInt(req.params.imageId);
        const userId = req.session?.user?.id || null;

        if (!imageId) {
            return res.status(400).json({ error: 'ID ảnh không hợp lệ' });
        }

        const count = await pool.query(
            'SELECT COUNT(*) FROM likes WHERE image_id = $1',
            [imageId]
        );

        let liked = false;
        if (userId) {
            const userLike = await pool.query(
                'SELECT id FROM likes WHERE image_id = $1 AND user_id = $2',
                [imageId, userId]
            );
            liked = userLike.rows.length > 0;
        }

        res.json({ count: parseInt(count.rows[0].count), liked });
    } catch (error) {
        console.error('Get likes error:', error);
        res.status(500).json({ error: 'Lỗi khi tải lượt thích' });
    }
}

// ---- THÊM BÌNH LUẬN ----
async function addComment(req, res) {
    try {
        const imageId = toInt(req.params.imageId);
        const userId = req.session.user.id;
        const actorName = req.session.user.username || 'Ai đó';
        const { content, parentId } = req.body;

        if (!imageId) {
            return res.status(400).json({ error: 'ID ảnh không hợp lệ' });
        }

        const image = await getImageMeta(imageId);

        if (!image) {
            return res.status(404).json({ error: 'Không tìm thấy ảnh' });
        }

        const parsedParentId = parentId ? toInt(parentId) : null;
        let parentComment = null;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Nội dung bình luận không được trống' });
        }

        if (parentId && !parsedParentId) {
            return res.status(400).json({ error: 'ID bình luận cha không hợp lệ' });
        }

        if (parsedParentId) {
            const parent = await pool.query(
                'SELECT id, user_id FROM comments WHERE id = $1 AND image_id = $2',
                [parsedParentId, imageId]
            );

            if (parent.rows.length === 0) {
                return res.status(404).json({ error: 'Không tìm thấy bình luận cha' });
            }

            parentComment = parent.rows[0];
        }

        const result = await pool.query(
            `INSERT INTO comments (image_id, user_id, parent_id, content)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [imageId, userId, parsedParentId, content.trim()]
        );

        // Trả về comment kèm username
        const comment = await pool.query(
            `SELECT comments.*, users.username
             FROM comments JOIN users ON comments.user_id = users.id
             WHERE comments.id = $1`,
            [result.rows[0].id]
        );

        await createNotification({
            recipientId: image.user_id,
            actorId: userId,
            imageId,
            commentId: result.rows[0].id,
            type: parsedParentId ? 'reply' : 'comment',
            message: parsedParentId
                ? `${actorName} đã trả lời trong ảnh "${image.title}" của bạn.`
                : `${actorName} đã bình luận ảnh "${image.title}" của bạn.`
        });

        if (parentComment && parentComment.user_id !== image.user_id) {
            await createNotification({
                recipientId: parentComment.user_id,
                actorId: userId,
                imageId,
                commentId: result.rows[0].id,
                type: 'reply',
                message: `${actorName} đã trả lời bình luận của bạn trong ảnh "${image.title}".`
            });
        }

        res.status(201).json(comment.rows[0]);
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Lỗi khi thêm bình luận' });
    }
}

// ---- LẤY BÌNH LUẬN CỦA ẢNH ----
async function getComments(req, res) {
    try {
        const imageId = toInt(req.params.imageId);

        if (!imageId) {
            return res.status(400).json({ error: 'ID ảnh không hợp lệ' });
        }

        const result = await pool.query(
            `SELECT comments.*, users.username
             FROM comments JOIN users ON comments.user_id = users.id
             WHERE comments.image_id = $1
             ORDER BY comments.created_at ASC`,
            [imageId]
        );

        const rootComments = buildCommentTree(result.rows);

        res.json(rootComments);
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Lỗi khi tải bình luận' });
    }
}

// ---- XÓA BÌNH LUẬN ----
async function deleteComment(req, res) {
    try {
        const commentId = toInt(req.params.commentId);
        const userId = req.session.user.id;

        if (!commentId) {
            return res.status(400).json({ error: 'ID bình luận không hợp lệ' });
        }

        const result = await pool.query(
            'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
            [commentId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Bạn không có quyền xóa bình luận này' });
        }

        res.json({ message: 'Đã xóa bình luận' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: 'Lỗi khi xóa bình luận' });
    }
}

module.exports = { toggleLike, getLikes, addComment, getComments, deleteComment };
