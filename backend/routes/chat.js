const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// Send a message
router.post('/:matchId/messages', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Verify match exists and is confirmed
    const match = await db.getAsync(
      'SELECT id, creator_id, editor_id, status FROM match_requests WHERE id = ?',
      [matchId]
    );

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'matched') {
      return res.status(403).json({ error: 'Chat only available for confirmed matches' });
    }

    // Verify user is part of this match
    let isAuthorized = false;
    if (req.user.role === 'creator') {
      const creator = await db.getAsync(
        'SELECT id FROM creators WHERE user_id = ? AND id = ?',
        [req.user.userId, match.creator_id]
      );
      isAuthorized = !!creator;
    } else if (req.user.role === 'editor') {
      const editor = await db.getAsync(
        'SELECT id FROM editors WHERE user_id = ? AND id = ?',
        [req.user.userId, match.editor_id]
      );
      isAuthorized = !!editor;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create message
    const messageId = uuidv4();
    await db.runAsync(
      'INSERT INTO chat_messages (id, match_id, sender_id, message) VALUES (?, ?, ?, ?)',
      [messageId, matchId, req.user.userId, message.trim()]
    );

    // Get the created message with timestamp
    const createdMessage = await db.getAsync(
      'SELECT id, match_id, sender_id, message, read, created_at FROM chat_messages WHERE id = ?',
      [messageId]
    );

    res.status(201).json({
      message: 'Message sent successfully',
      data: createdMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages for a match
router.get('/:matchId/messages', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { limit = 50, before } = req.query;

    // Verify match exists
    const match = await db.getAsync(
      'SELECT id, creator_id, editor_id, status FROM match_requests WHERE id = ?',
      [matchId]
    );

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'matched') {
      return res.status(403).json({ error: 'Chat only available for confirmed matches' });
    }

    // Verify user is part of this match
    let isAuthorized = false;
    if (req.user.role === 'creator') {
      const creator = await db.getAsync(
        'SELECT id FROM creators WHERE user_id = ? AND id = ?',
        [req.user.userId, match.creator_id]
      );
      isAuthorized = !!creator;
    } else if (req.user.role === 'editor') {
      const editor = await db.getAsync(
        'SELECT id FROM editors WHERE user_id = ? AND id = ?',
        [req.user.userId, match.editor_id]
      );
      isAuthorized = !!editor;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get messages
    let query = 'SELECT id, match_id, sender_id, message, read, created_at FROM chat_messages WHERE match_id = ?';
    let params = [matchId];

    if (before) {
      query += ' AND created_at < ?';
      params.push(before);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const messages = await db.allAsync(query, params);

    // Mark messages from other user as read
    await db.runAsync(
      'UPDATE chat_messages SET read = 1 WHERE match_id = ? AND sender_id != ? AND read = 0',
      [matchId, req.user.userId]
    );

    // Reverse to get chronological order
    messages.reverse();

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark messages as read
router.post('/:matchId/read', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;

    // Verify match exists
    const match = await db.getAsync(
      'SELECT id, creator_id, editor_id FROM match_requests WHERE id = ?',
      [matchId]
    );

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verify user is part of this match
    let isAuthorized = false;
    if (req.user.role === 'creator') {
      const creator = await db.getAsync(
        'SELECT id FROM creators WHERE user_id = ? AND id = ?',
        [req.user.userId, match.creator_id]
      );
      isAuthorized = !!creator;
    } else if (req.user.role === 'editor') {
      const editor = await db.getAsync(
        'SELECT id FROM editors WHERE user_id = ? AND id = ?',
        [req.user.userId, match.editor_id]
      );
      isAuthorized = !!editor;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark all messages from other user as read
    const result = await db.runAsync(
      'UPDATE chat_messages SET read = 1 WHERE match_id = ? AND sender_id != ? AND read = 0',
      [matchId, req.user.userId]
    );

    res.json({ 
      message: 'Messages marked as read',
      count: result.changes
    });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get unread message count across all matches
router.get('/unread/count', authMiddleware, async (req, res) => {
  try {
    const result = await db.getAsync(
      'SELECT COUNT(*) as count FROM chat_messages WHERE sender_id != ? AND read = 0',
      [req.user.userId]
    );

    res.json({ unreadCount: result.count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

module.exports = router;