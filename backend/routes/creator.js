const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { selectBestClip } = require('../services/matching');

const DATA_FILE = path.join(__dirname, '../data/data.json');

function getData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = { users: [], clips: [], matches: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Update creator profile
router.post('/profile', (req, res) => {
  try {
    const { creatorId, bio, contentType, preferredStyles } = req.body;
    
    if (!creatorId) {
      return res.status(400).json({ error: 'Missing creatorId' });
    }
    
    const data = getData();
    const userIndex = data.users.findIndex(u => u.id === creatorId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    data.users[userIndex].bio = bio;
    data.users[userIndex].contentType = contentType;
    data.users[userIndex].preferredStyles = preferredStyles || [];
    
    saveData(data);
    
    console.log('✅ Creator profile updated:', creatorId);
    
    res.json({ success: true, user: data.users[userIndex] });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get curated feed
router.get('/feed/:creatorId', (req, res) => {
  try {
    const { creatorId } = req.params;
    const data = getData();
    
    const creator = data.users.find(u => u.id === creatorId);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    
    // Get clips already seen/liked by this creator
    const seenClipIds = data.matches
      .filter(m => m.creatorId === creatorId)
      .map(m => m.clipId);
    
    // Get clips matching content type that haven't been seen
    let matchingClips = data.clips.filter(
      c => c.contentType === creator.contentType && !seenClipIds.includes(c.id)
    );
    
    if (matchingClips.length === 0) {
      return res.json({ clip: null, message: 'No more clips available' });
    }
    
    // Use matching service to select best clip
    const bestClip = selectBestClip(matchingClips, creator);
    
    console.log('✅ Serving clip to creator:', bestClip.id);
    
    res.json({ clip: bestClip });
  } catch (error) {
    console.error('❌ Feed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Like a clip
router.post('/like', (req, res) => {
  try {
    const { creatorId, clipId } = req.body;
    
    if (!creatorId || !clipId) {
      return res.status(400).json({ error: 'Missing creatorId or clipId' });
    }
    
    const data = getData();
    const clip = data.clips.find(c => c.id === clipId);
    
    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    const match = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      creatorId,
      editorId: clip.editorId,
      clipId,
      status: 'creator_liked',
      createdAt: new Date().toISOString()
    };
    
    data.matches.push(match);
    saveData(data);
    
    console.log('✅ Creator liked clip:', clipId);
    
    res.json({ success: true, match });
  } catch (error) {
    console.error('❌ Like error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pass on a clip
router.post('/pass', (req, res) => {
  try {
    const { creatorId, clipId } = req.body;
    
    const data = getData();
    
    // Create a "passed" match so we don't show this clip again
    const pass = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      creatorId,
      clipId,
      status: 'passed',
      createdAt: new Date().toISOString()
    };
    
    data.matches.push(pass);
    saveData(data);
    
    console.log('✅ Creator passed on clip:', clipId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Pass error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Confirm match
router.post('/confirm/:matchId', (req, res) => {
  try {
    const { matchId } = req.params;
    const data = getData();
    
    const matchIndex = data.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    data.matches[matchIndex].status = 'confirmed';
    data.matches[matchIndex].confirmedAt = new Date().toISOString();
    
    const match = data.matches[matchIndex];
    
    // Reveal identities
    const editor = data.users.find(u => u.id === match.editorId);
    const creator = data.users.find(u => u.id === match.creatorId);
    
    saveData(data);
    
    console.log('✅ Match confirmed:', matchId);
    
    res.json({
      success: true,
      match,
      editor: { id: editor.id, email: editor.email },
      creator: { id: creator.id, email: creator.email }
    });
  } catch (error) {
    console.error('❌ Confirm error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;