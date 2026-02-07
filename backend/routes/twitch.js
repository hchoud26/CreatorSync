const express = require('express');
const router = express.Router();

// --- ROUTE 1: FAKE Streamer Profile ---
// Usage: http://localhost:5000/api/twitch/user?username=ninja
router.get('/user', (req, res) => {
    const username = req.query.username || "test_user";
    
    // Return fake profile data
    res.json({
        id: "12345",
        login: username,
        display_name: username.charAt(0).toUpperCase() + username.slice(1),
        type: "",
        broadcaster_type: "partner",
        description: "This is a dummy profile for testing purposes.",
        profile_image_url: "https://static-cdn.jtvnw.net/user-default-pictures-uuid/0.png",
        view_count: 8888,
        created_at: "2024-01-01T00:00:00Z"
    });
});

// --- ROUTE 2: FAKE Clips ---
// Usage: http://localhost:5000/api/twitch/clips?game=Minecraft
router.get('/clips', (req, res) => {
    // Return a list of fake clips
    res.json([
        {
            id: "Clip1",
            url: "https://www.twitch.tv/clip1",
            embed_url: "https://clips.twitch.tv/embed?clip=Clip1",
            broadcaster_name: "StreamerOne",
            creator_name: "ClipperOne",
            video_id: "",
            game_id: "123",
            language: "en",
            title: "Insane Clutch (Fake Clip)",
            view_count: 100,
            created_at: "2024-02-01T00:00:00Z",
            thumbnail_url: "https://via.placeholder.com/480x272.png?text=Fake+Clip+1"
        },
        {
            id: "Clip2",
            url: "https://www.twitch.tv/clip2",
            embed_url: "https://clips.twitch.tv/embed?clip=Clip2",
            broadcaster_name: "StreamerTwo",
            creator_name: "ClipperTwo",
            video_id: "",
            game_id: "123",
            language: "en",
            title: "Funny Moment (Fake Clip)",
            view_count: 50,
            created_at: "2024-02-02T00:00:00Z",
            thumbnail_url: "https://via.placeholder.com/480x272.png?text=Fake+Clip+2"
        }
    ]);
});

module.exports = router;