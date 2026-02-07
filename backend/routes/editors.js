const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const { authMiddleware } = require('./auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/clips/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Create editor profile
router.post('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Only editors can create editor profiles' });
    }

    const { anonymousName, bio, realName, contentTypes, styles, availability } = req.body;

    if (!anonymousName) {
      return res.status(400).json({ error: 'Anonymous name is required' });
    }

    // Check if profile already exists
    const existing = await db.getAsync(
      'SELECT id FROM editors WHERE user_id = ?',
      [req.user.userId]
    );

    if (existing) {
      return res.status(409).json({ error: 'Profile already exists' });
    }

    // Create editor profile
    const editorId = uuidv4();
    await db.runAsync(
      'INSERT INTO editors (id, user_id, anonymous_name, bio, real_name, availability) VALUES (?, ?, ?, ?, ?, ?)',
      [editorId, req.user.userId, anonymousName, bio, realName, availability]
    );

    // Add content type tags
    if (contentTypes && Array.isArray(contentTypes)) {
      for (const tag of contentTypes) {
        await db.runAsync(
          'INSERT INTO editor_tags (id, editor_id, tag_name, tag_type) VALUES (?, ?, ?, ?)',
          [uuidv4(), editorId, tag, 'content_type']
        );
      }
    }

    // Add style tags
    if (styles && Array.isArray(styles)) {
      for (const tag of styles) {
        await db.runAsync(
          'INSERT INTO editor_tags (id, editor_id, tag_name, tag_type) VALUES (?, ?, ?, ?)',
          [uuidv4(), editorId, tag, 'style']
        );
      }
    }

    res.status(201).json({
      message: 'Editor profile created successfully',
      editorId
    });
  } catch (error) {
    console.error('Create editor profile error:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Update editor profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { bio, realName, contentTypes, styles, availability } = req.body;

    const editor = await db.getAsync(
      'SELECT id FROM editors WHERE user_id = ?',
      [req.user.userId]
    );

    if (!editor) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Update profile
    await db.runAsync(
      'UPDATE editors SET bio = ?, real_name = ?, availability = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [bio, realName, availability, editor.id]
    );

    // Update tags if provided
    if (contentTypes) {
      await db.runAsync('DELETE FROM editor_tags WHERE editor_id = ? AND tag_type = ?', [editor.id, 'content_type']);
      for (const tag of contentTypes) {
        await db.runAsync(
          'INSERT INTO editor_tags (id, editor_id, tag_name, tag_type) VALUES (?, ?, ?, ?)',
          [uuidv4(), editor.id, tag, 'content_type']
        );
      }
    }

    if (styles) {
      await db.runAsync('DELETE FROM editor_tags WHERE editor_id = ? AND tag_type = ?', [editor.id, 'style']);
      for (const tag of styles) {
        await db.runAsync(
          'INSERT INTO editor_tags (id, editor_id, tag_name, tag_type) VALUES (?, ?, ?, ?)',
          [uuidv4(), editor.id, tag, 'style']
        );
      }
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update editor profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload clips
router.post('/clips', authMiddleware, upload.array('clips', 5), async (req, res) => {
  try {
    if (req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const editor = await db.getAsync(
      'SELECT id FROM editors WHERE user_id = ?',
      [req.user.userId]
    );

    if (!editor) {
      return res.status(404).json({ error: 'Editor profile not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const clipIds = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const clipId = uuidv4();
      
      await db.runAsync(
        'INSERT INTO editor_clips (id, editor_id, file_path, order_index) VALUES (?, ?, ?, ?)',
        [clipId, editor.id, file.path, i]
      );
      
      clipIds.push(clipId);
    }

    res.status(201).json({
      message: 'Clips uploaded successfully',
      clipIds
    });
  } catch (error) {
    console.error('Upload clips error:', error);
    res.status(500).json({ error: 'Failed to upload clips' });
  }
});

// Get editor's own clips
router.get('/clips', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const editor = await db.getAsync(
      'SELECT id FROM editors WHERE user_id = ?',
      [req.user.userId]
    );

    if (!editor) {
      return res.status(404).json({ error: 'Editor profile not found' });
    }

    const clips = await db.allAsync(
      'SELECT id, file_path, title, description, order_index, created_at FROM editor_clips WHERE editor_id = ? ORDER BY order_index',
      [editor.id]
    );

    res.json({ clips });
  } catch (error) {
    console.error('Get clips error:', error);
    res.status(500).json({ error: 'Failed to fetch clips' });
  }
});

// Get incoming requests (editors see creators)
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const editor = await db.getAsync(
      'SELECT id FROM editors WHERE user_id = ?',
      [req.user.userId]
    );

    if (!editor) {
      return res.status(404).json({ error: 'Editor profile not found' });
    }

    // Get pending and accepted requests
    const requests = await db.allAsync(`
      SELECT 
        mr.id as request_id,
        mr.status,
        mr.creator_liked_at,
        mr.created_at,
        c.id as creator_id,
        c.display_name,
        c.bio,
        c.what_stream,
        c.want_editor,
        c.content_type
      FROM match_requests mr
      JOIN creators c ON mr.creator_id = c.id
      WHERE mr.editor_id = ? AND mr.status IN ('pending', 'accepted')
      ORDER BY mr.created_at DESC
    `, [editor.id]);

    // Get preferred styles for each creator
    for (const req of requests) {
      const styles = await db.allAsync(
        'SELECT style_name FROM creator_preferred_styles WHERE creator_id = ?',
        [req.creator_id]
      );
      req.preferred_styles = styles.map(s => s.style_name);
    }

    res.json({ requests });
  } catch (error) {
    console.error('Get editor requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Accept/Pass a request (Editor's decision)
router.post('/requests/:requestId/respond', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'pass'

    if (!['accept', 'pass'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "accept" or "pass"' });
    }

    const editor = await db.getAsync(
      'SELECT id FROM editors WHERE user_id = ?',
      [req.user.userId]
    );

    if (!editor) {
      return res.status(404).json({ error: 'Editor profile not found' });
    }

    const request = await db.getAsync(
      'SELECT id, status FROM match_requests WHERE id = ? AND editor_id = ?',
      [requestId, editor.id]
    );

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (action === 'pass') {
      await db.runAsync(
        'UPDATE match_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['passed', requestId]
      );
      res.json({ message: 'Request passed' });
    } else {
      await db.runAsync(
        'UPDATE match_requests SET status = ?, editor_accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['accepted', requestId]
      );
      res.json({ message: 'Request accepted - waiting for final confirmation' });
    }
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
});

// Final accept (creates match)
router.post('/requests/:requestId/final-accept', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { requestId } = req.params;

    const editor = await db.getAsync(
      'SELECT id FROM editors WHERE user_id = ?',
      [req.user.userId]
    );

    if (!editor) {
      return res.status(404).json({ error: 'Editor profile not found' });
    }

    const request = await db.getAsync(
      'SELECT id, status FROM match_requests WHERE id = ? AND editor_id = ? AND status = ?',
      [requestId, editor.id, 'accepted']
    );

    if (!request) {
      return res.status(404).json({ error: 'Request not found or not in correct state' });
    }

    // Create the match
    await db.runAsync(
      'UPDATE match_requests SET status = ?, final_matched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['matched', requestId]
    );

    res.json({ 
      message: 'Match created successfully!',
      matchId: requestId
    });
  } catch (error) {
    console.error('Final accept error:', error);
    res.status(500).json({ error: 'Failed to create match' });
  }
});

module.exports = router;