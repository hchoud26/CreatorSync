const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// Create creator profile
router.post('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({ error: 'Only creators can create creator profiles' });
    }

    const { displayName, bio, whatStream, wantEditor, contentType, preferredStyles } = req.body;

    if (!displayName || !bio || !whatStream || !wantEditor || !contentType) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if profile already exists
    const existing = await db.getAsync(
      'SELECT id FROM creators WHERE user_id = ?',
      [req.user.userId]
    );

    if (existing) {
      return res.status(409).json({ error: 'Profile already exists' });
    }

    // Create creator profile
    const creatorId = uuidv4();
    await db.runAsync(
      'INSERT INTO creators (id, user_id, display_name, bio, what_stream, want_editor, content_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [creatorId, req.user.userId, displayName, bio, whatStream, wantEditor, contentType]
    );

    // Add preferred styles
    if (preferredStyles && Array.isArray(preferredStyles)) {
      for (const style of preferredStyles) {
        await db.runAsync(
          'INSERT INTO creator_preferred_styles (id, creator_id, style_name) VALUES (?, ?, ?)',
          [uuidv4(), creatorId, style]
        );
      }
    }

    res.status(201).json({
      message: 'Creator profile created successfully',
      creatorId
    });
  } catch (error) {
    console.error('Create creator profile error:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Update creator profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { displayName, bio, whatStream, wantEditor, contentType, preferredStyles } = req.body;

    const creator = await db.getAsync(
      'SELECT id FROM creators WHERE user_id = ?',
      [req.user.userId]
    );

    if (!creator) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update profile
    await db.runAsync(
      'UPDATE creators SET display_name = ?, bio = ?, what_stream = ?, want_editor = ?, content_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [displayName, bio, whatStream, wantEditor, contentType, creator.id]
    );

    // Update preferred styles if provided
    if (preferredStyles) {
      await db.runAsync('DELETE FROM creator_preferred_styles WHERE creator_id = ?', [creator.id]);
      for (const style of preferredStyles) {
        await db.runAsync(
          'INSERT INTO creator_preferred_styles (id, creator_id, style_name) VALUES (?, ?, ?)',
          [uuidv4(), creator.id, style]
        );
      }
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update creator profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get curated feed (smart matching algorithm)
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const creator = await db.getAsync(
      'SELECT id, content_type FROM creators WHERE user_id = ?',
      [req.user.userId]
    );

    if (!creator) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    // Get creator's preferred styles
    const preferredStyles = await db.allAsync(
      'SELECT style_name FROM creator_preferred_styles WHERE creator_id = ?',
      [creator.id]
    );
    const styleNames = preferredStyles.map(s => s.style_name);

    // Find editors who:
    // 1. Match content type
    // 2. Haven't been passed or already matched
    // 3. Prioritize style match
    const editors = await db.allAsync(`
      SELECT DISTINCT
        e.id,
        e.anonymous_name,
        e.bio,
        (
          SELECT COUNT(*) FROM editor_tags et2 
          WHERE et2.editor_id = e.id 
          AND et2.tag_type = 'style' 
          AND et2.tag_name IN (${styleNames.map(() => '?').join(',')})
        ) as style_match_count
      FROM editors e
      JOIN editor_tags et ON e.id = et.editor_id
      WHERE et.tag_type = 'content_type' 
      AND et.tag_name = ?
      AND e.id NOT IN (
        SELECT editor_id FROM match_requests 
        WHERE creator_id = ? 
        AND status IN ('passed', 'matched', 'pending', 'accepted')
      )
      ORDER BY style_match_count DESC, RANDOM()
      LIMIT 10
    `, [...styleNames, creator.content_type, creator.id]);

    // For each editor, get one representative clip and their tags
    const feed = [];
    for (const editor of editors) {
      // Get all clips for this editor
      const clips = await db.allAsync(
        'SELECT id, file_path, title, description FROM editor_clips WHERE editor_id = ? ORDER BY order_index',
        [editor.id]
      );

      if (clips.length === 0) continue;

      // Select one clip (first one for simplicity, could be random)
      const selectedClip = clips[0];

      // Get all tags
      const tags = await db.allAsync(
        'SELECT tag_name, tag_type FROM editor_tags WHERE editor_id = ?',
        [editor.id]
      );

      feed.push({
        editorId: editor.id,
        anonymousName: editor.anonymous_name,
        bio: editor.bio,
        tags: tags.map(t => t.tag_name),
        contentTypeTags: tags.filter(t => t.tag_type === 'content_type').map(t => t.tag_name),
        styleTags: tags.filter(t => t.tag_type === 'style').map(t => t.tag_name),
        clip: {
          id: selectedClip.id,
          filePath: selectedClip.file_path,
          title: selectedClip.title,
          description: selectedClip.description
        },
        allClips: clips.length,
        styleMatchScore: editor.style_match_count
      });
    }

    res.json({ feed });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Like an editor (create request)
router.post('/like/:editorId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { editorId } = req.params;
    const { clipId } = req.body;

    const creator = await db.getAsync(
      'SELECT id FROM creators WHERE user_id = ?',
      [req.user.userId]
    );

    if (!creator) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    // Check if editor exists
    const editor = await db.getAsync(
      'SELECT id FROM editors WHERE id = ?',
      [editorId]
    );

    if (!editor) {
      return res.status(404).json({ error: 'Editor not found' });
    }

    // Check if request already exists
    const existing = await db.getAsync(
      'SELECT id FROM match_requests WHERE creator_id = ? AND editor_id = ?',
      [creator.id, editorId]
    );

    if (existing) {
      return res.status(409).json({ error: 'Request already exists' });
    }

    // Create match request
    const requestId = uuidv4();
    await db.runAsync(
      'INSERT INTO match_requests (id, creator_id, editor_id, clip_id, status, creator_liked_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [requestId, creator.id, editorId, clipId, 'pending']
    );

    // Record in feed history
    await db.runAsync(
      'INSERT INTO feed_history (id, creator_id, editor_id, clip_id, action) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), creator.id, editorId, clipId, 'liked']
    );

    res.status(201).json({
      message: 'Request sent successfully',
      requestId
    });
  } catch (error) {
    console.error('Like editor error:', error);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// Pass an editor
router.post('/pass/:editorId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { editorId } = req.params;
    const { clipId } = req.body;

    const creator = await db.getAsync(
      'SELECT id FROM creators WHERE user_id = ?',
      [req.user.userId]
    );

    if (!creator) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    // Record in feed history
    await db.runAsync(
      'INSERT INTO feed_history (id, creator_id, editor_id, clip_id, action) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), creator.id, editorId, clipId, 'passed']
    );

    res.json({ message: 'Editor passed' });
  } catch (error) {
    console.error('Pass editor error:', error);
    res.status(500).json({ error: 'Failed to pass editor' });
  }
});

// Get sent requests
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'creator') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const creator = await db.getAsync(
      'SELECT id FROM creators WHERE user_id = ?',
      [req.user.userId]
    );

    if (!creator) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    const requests = await db.allAsync(`
      SELECT 
        mr.id as request_id,
        mr.status,
        mr.creator_liked_at,
        mr.editor_accepted_at,
        mr.final_matched_at,
        mr.created_at,
        e.id as editor_id,
        e.anonymous_name,
        e.bio
      FROM match_requests mr
      JOIN editors e ON mr.editor_id = e.id
      WHERE mr.creator_id = ?
      ORDER BY mr.created_at DESC
    `, [creator.id]);

    // Get tags for each editor
    for (const req of requests) {
      const tags = await db.allAsync(
        'SELECT tag_name FROM editor_tags WHERE editor_id = ?',
        [req.editor_id]
      );
      req.tags = tags.map(t => t.tag_name);
    }

    res.json({ requests });
  } catch (error) {
    console.error('Get creator requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

module.exports = router;