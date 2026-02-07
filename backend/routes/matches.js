const express = require('express');
const db = require('../database/db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// Get all matches for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    let matches = [];

    if (req.user.role === 'creator') {
      const creator = await db.getAsync(
        'SELECT id FROM creators WHERE user_id = ?',
        [req.user.userId]
      );

      if (!creator) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      matches = await db.allAsync(`
        SELECT 
          mr.id as match_id,
          mr.status,
          mr.final_matched_at,
          e.id as editor_id,
          e.anonymous_name,
          e.real_name,
          e.bio as editor_bio
        FROM match_requests mr
        JOIN editors e ON mr.editor_id = e.id
        WHERE mr.creator_id = ? AND mr.status = 'matched'
        ORDER BY mr.final_matched_at DESC
      `, [creator.id]);

      // Get editor tags and clips for each match
      for (const match of matches) {
        const tags = await db.allAsync(
          'SELECT tag_name, tag_type FROM editor_tags WHERE editor_id = ?',
          [match.editor_id]
        );
        match.tags = tags.map(t => t.tag_name);

        const clips = await db.allAsync(
          'SELECT id, file_path, title FROM editor_clips WHERE editor_id = ? ORDER BY order_index',
          [match.editor_id]
        );
        match.clips = clips;

        // Get unread message count
        const unread = await db.getAsync(
          'SELECT COUNT(*) as count FROM chat_messages WHERE match_id = ? AND sender_id != ? AND read = 0',
          [match.match_id, req.user.userId]
        );
        match.unreadCount = unread.count;
      }

    } else if (req.user.role === 'editor') {
      const editor = await db.getAsync(
        'SELECT id FROM editors WHERE user_id = ?',
        [req.user.userId]
      );

      if (!editor) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      matches = await db.allAsync(`
        SELECT 
          mr.id as match_id,
          mr.status,
          mr.final_matched_at,
          c.id as creator_id,
          c.display_name,
          c.bio as creator_bio,
          c.what_stream,
          c.want_editor,
          c.content_type
        FROM match_requests mr
        JOIN creators c ON mr.creator_id = c.id
        WHERE mr.editor_id = ? AND mr.status = 'matched'
        ORDER BY mr.final_matched_at DESC
      `, [editor.id]);

      // Get preferred styles for each creator
      for (const match of matches) {
        const styles = await db.allAsync(
          'SELECT style_name FROM creator_preferred_styles WHERE creator_id = ?',
          [match.creator_id]
        );
        match.preferredStyles = styles.map(s => s.style_name);

        // Get unread message count
        const unread = await db.getAsync(
          'SELECT COUNT(*) as count FROM chat_messages WHERE match_id = ? AND sender_id != ? AND read = 0',
          [match.match_id, req.user.userId]
        );
        match.unreadCount = unread.count;
      }
    }

    res.json({ matches });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Get specific match details (with full identity reveal)
router.get('/:matchId', authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await db.getAsync(
      'SELECT id, creator_id, editor_id, status, final_matched_at FROM match_requests WHERE id = ?',
      [matchId]
    );

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== 'matched') {
      return res.status(403).json({ error: 'Match not yet confirmed' });
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

    // Get full creator details
    const creator = await db.getAsync(
      'SELECT id, display_name, bio, what_stream, want_editor, content_type FROM creators WHERE id = ?',
      [match.creator_id]
    );

    const creatorStyles = await db.allAsync(
      'SELECT style_name FROM creator_preferred_styles WHERE creator_id = ?',
      [match.creator_id]
    );

    // Get full editor details (including real name)
    const editor = await db.getAsync(
      'SELECT id, anonymous_name, real_name, bio, availability FROM editors WHERE id = ?',
      [match.editor_id]
    );

    const editorTags = await db.allAsync(
      'SELECT tag_name, tag_type FROM editor_tags WHERE editor_id = ?',
      [match.editor_id]
    );

    const editorClips = await db.allAsync(
      'SELECT id, file_path, title, description FROM editor_clips WHERE editor_id = ? ORDER BY order_index',
      [match.editor_id]
    );

    res.json({
      match: {
        id: match.id,
        status: match.status,
        matchedAt: match.final_matched_at
      },
      creator: {
        ...creator,
        preferredStyles: creatorStyles.map(s => s.style_name)
      },
      editor: {
        ...editor,
        tags: editorTags.map(t => t.tag_name),
        contentTypes: editorTags.filter(t => t.tag_type === 'content_type').map(t => t.tag_name),
        styles: editorTags.filter(t => t.tag_type === 'style').map(t => t.tag_name),
        clips: editorClips
      }
    });
  } catch (error) {
    console.error('Get match details error:', error);
    res.status(500).json({ error: 'Failed to fetch match details' });
  }
});

// Get match statistics (for analytics)
router.get('/stats/overview', authMiddleware, async (req, res) => {
  try {
    let stats = {};

    if (req.user.role === 'creator') {
      const creator = await db.getAsync(
        'SELECT id FROM creators WHERE user_id = ?',
        [req.user.userId]
      );

      if (!creator) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const pending = await db.getAsync(
        'SELECT COUNT(*) as count FROM match_requests WHERE creator_id = ? AND status = ?',
        [creator.id, 'pending']
      );

      const accepted = await db.getAsync(
        'SELECT COUNT(*) as count FROM match_requests WHERE creator_id = ? AND status = ?',
        [creator.id, 'accepted']
      );

      const matched = await db.getAsync(
        'SELECT COUNT(*) as count FROM match_requests WHERE creator_id = ? AND status = ?',
        [creator.id, 'matched']
      );

      const passed = await db.getAsync(
        'SELECT COUNT(*) as count FROM match_requests WHERE creator_id = ? AND status = ?',
        [creator.id, 'passed']
      );

      stats = {
        pending: pending.count,
        accepted: accepted.count,
        matched: matched.count,
        passed: passed.count
      };

    } else if (req.user.role === 'editor') {
      const editor = await db.getAsync(
        'SELECT id FROM editors WHERE user_id = ?',
        [req.user.userId]
      );

      if (!editor) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      const pending = await db.getAsync(
        'SELECT COUNT(*) as count FROM match_requests WHERE editor_id = ? AND status = ?',
        [editor.id, 'pending']
      );

      const accepted = await db.getAsync(
        'SELECT COUNT(*) as count FROM match_requests WHERE editor_id = ? AND status = ?',
        [editor.id, 'accepted']
      );

      const matched = await db.getAsync(
        'SELECT COUNT(*) as count FROM match_requests WHERE editor_id = ? AND status = ?',
        [editor.id, 'matched']
      );

      const passed = await db.getAsync(
        'SELECT COUNT(*) as count FROM match_requests WHERE editor_id = ? AND status = ?',
        [editor.id, 'passed']
      );

      stats = {
        incomingPending: pending.count,
        accepted: accepted.count,
        matched: matched.count,
        passed: passed.count
      };
    }

    res.json({ stats });
  } catch (error) {
    console.error('Get match stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;