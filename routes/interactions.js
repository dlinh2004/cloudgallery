// ==========================================
// ROUTES TƯƠNG TÁC (Likes & Comments)
// ==========================================

const express = require('express');
const router = express.Router();
const { toggleLike, getLikes, addComment, getComments, deleteComment } = require('../controllers/interactionController');
const { isAuthenticated } = require('../middleware/auth');

// Likes
router.post('/:imageId/like', isAuthenticated, toggleLike);
router.get('/:imageId/likes', getLikes);

// Comments
router.post('/:imageId/comments', isAuthenticated, addComment);
router.get('/:imageId/comments', getComments);
router.delete('/comments/:commentId', isAuthenticated, deleteComment);

module.exports = router;
