const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getAedifyEmbedding } = require('../services/aedify');

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

// Upload clip
router.post('/clips', async (req, res) => {
  try {
    const { editorId, videoUrl, description, contentType, styleTags } = req.body;
    
    if (!editorId || !videoUrl || !contentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const data = getData();
    
    // Try to get Aedify embedding
    let embedding = null;
    let aedifyUsed = false;
    
    try {
      const text = `${contentType} ${styleTags.join(' ')} ${description || ''}`;
      console.log('🤖 Generating Aedify embedding for:', text);
      embedding = await getAedifyEmbedding(text);
      aedifyUsed = embedding !== null;
      console.log(aedifyUsed ? '✅ Aedify embedding generated' : '⚠️ Aedify failed, using fallback');
    } catch (error) {
      console.log('⚠️ Aedify embedding failed:', error.message);
    }
    
    const clip = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      editorId,
      videoUrl,
      description: description || '',
      contentType,
      styleTags: styleTags || [],
      embedding,
      createdAt: new Date().toISOString()
    };
    
    data.clips.push(clip);
    saveData(data);
    
    console.log('✅ Clip uploaded:', clip.id);
    
    res.json({ 
      success: true,
      clip,
      aedifyUsed 
    });
  } catch (error) {
    console.error('❌ Clip upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get editor's clips
router.get('/clips/:editorId', (req, res) => {
  try {
    const { editorId } = req.params;
    const data = getData();
    
    const clips = data.clips.filter(c => c.editorId === editorId);
    
    res.json({ clips });
  } catch (error) {
    console.error('❌ Get clips error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending matches
router.get('/pending-matches/:editorId', (req, res) => {
  try {
    const { editorId } = req.params;
    const data = getData();
    
    const matches = data.matches.filter(
      m => m.editorId === editorId && m.status === 'creator_liked'
    );
    
    const matchesWithInfo = matches.map(match => {
      const creator = data.users.find(u => u.id === match.creatorId);
      return {
        matchId: match.id,
        creatorBio: creator?.bio || 'No bio yet',
        contentType: creator?.contentType || 'Not specified',
        clipId: match.clipId
      };
    });
    
    res.json({ matches: matchesWithInfo });
  } catch (error) {
    console.error('❌ Pending matches error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Accept a creator
router.post('/accept/:matchId', (req, res) => {
  try {
    const { matchId } = req.params;
    const data = getData();
    
    const matchIndex = data.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    data.matches[matchIndex].status = 'editor_accepted';
    data.matches[matchIndex].editorAcceptedAt = new Date().toISOString();
    
    saveData(data);
    
    console.log('✅ Editor accepted match:', matchId);
    
    res.json({ success: true, match: data.matches[matchIndex] });
  } catch (error) {
    console.error('❌ Accept error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;