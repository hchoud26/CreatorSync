const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');

// Sample data
const EDITORS = [
  {
    email: 'editor1@test.com',
    password: 'password123',
    anonymousName: 'Anonymous Editor A',
    realName: 'AlexEditor',
    bio: 'Passionate about creating viral Minecraft content with fast-paced meme edits.',
    contentTypes: ['Minecraft'],
    styles: ['Fast-Paced', 'Meme Edits'],
    availability: 'weekly'
  },
  {
    email: 'editor2@test.com',
    password: 'password123',
    anonymousName: 'Anonymous Editor B',
    realName: 'SamEdits',
    bio: 'Specializing in cinematic IRL content with professional motion graphics.',
    contentTypes: ['IRL'],
    styles: ['Cinematic', 'Motion Graphics'],
    availability: 'monthly'
  },
  {
    email: 'editor3@test.com',
    password: 'password123',
    anonymousName: 'Anonymous Editor C',
    realName: 'GameCutter',
    bio: 'Quick turnaround editor focused on gaming highlights with crispy subtitles.',
    contentTypes: ['Gaming'],
    styles: ['Fast-Paced', 'Subtitles'],
    availability: 'weekly'
  }
];

const CREATORS = [
  {
    email: 'creator1@test.com',
    password: 'password123',
    displayName: 'DiamondMiner42',
    bio: 'Minecraft speedrunner and challenge creator. Love making epic moments even more epic!',
    whatStream: 'Minecraft speedruns, parkour challenges, and building competitions',
    wantEditor: 'Someone who can capture the hype moments and add funny meme inserts',
    contentType: 'Minecraft',
    preferredStyles: ['Fast-Paced', 'Meme Edits']
  },
  {
    email: 'creator2@test.com',
    password: 'password123',
    displayName: 'IRLExplorer',
    bio: 'Travel vlogger and adventure seeker. Always on the move!',
    whatStream: 'Travel streams, food adventures, and spontaneous city explorations',
    wantEditor: 'Cinematic storytelling that makes viewers feel like they are there',
    contentType: 'IRL',
    preferredStyles: ['Cinematic', 'Motion Graphics']
  }
];

async function seed() {
  console.log('🌱 Seeding database with test data...\n');

  try {
    // Create editors
    console.log('Creating editors...');
    for (const editorData of EDITORS) {
      const userId = uuidv4();
      const editorId = uuidv4();
      const passwordHash = await bcrypt.hash(editorData.password, 10);

      // Create user
      await db.runAsync(
        'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [userId, editorData.email, passwordHash, 'editor']
      );

      // Create editor profile
      await db.runAsync(
        'INSERT INTO editors (id, user_id, anonymous_name, bio, real_name, availability) VALUES (?, ?, ?, ?, ?, ?)',
        [editorId, userId, editorData.anonymousName, editorData.bio, editorData.realName, editorData.availability]
      );

      // Add content type tags
      for (const tag of editorData.contentTypes) {
        await db.runAsync(
          'INSERT INTO editor_tags (id, editor_id, tag_name, tag_type) VALUES (?, ?, ?, ?)',
          [uuidv4(), editorId, tag, 'content_type']
        );
      }

      // Add style tags
      for (const tag of editorData.styles) {
        await db.runAsync(
          'INSERT INTO editor_tags (id, editor_id, tag_name, tag_type) VALUES (?, ?, ?, ?)',
          [uuidv4(), editorId, tag, 'style']
        );
      }

      // Create sample clips (placeholder entries)
      for (let i = 0; i < 3; i++) {
        await db.runAsync(
          'INSERT INTO editor_clips (id, editor_id, file_path, title, order_index) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), editorId, `placeholder_${editorId}_${i}.mp4`, `Sample Clip ${i + 1}`, i]
        );
      }

      console.log(`  ✓ Created editor: ${editorData.anonymousName} (${editorData.email})`);
    }

    // Create creators
    console.log('\nCreating creators...');
    for (const creatorData of CREATORS) {
      const userId = uuidv4();
      const creatorId = uuidv4();
      const passwordHash = await bcrypt.hash(creatorData.password, 10);

      // Create user
      await db.runAsync(
        'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [userId, creatorData.email, passwordHash, 'creator']
      );

      // Create creator profile
      await db.runAsync(
        'INSERT INTO creators (id, user_id, display_name, bio, what_stream, want_editor, content_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [creatorId, userId, creatorData.displayName, creatorData.bio, creatorData.whatStream, creatorData.wantEditor, creatorData.contentType]
      );

      // Add preferred styles
      for (const style of creatorData.preferredStyles) {
        await db.runAsync(
          'INSERT INTO creator_preferred_styles (id, creator_id, style_name) VALUES (?, ?, ?)',
          [uuidv4(), creatorId, style]
        );
      }

      console.log(`  ✓ Created creator: ${creatorData.displayName} (${creatorData.email})`);
    }

    // Create a sample match request
    console.log('\nCreating sample match request...');
    const creator1 = await db.getAsync('SELECT id FROM creators LIMIT 1');
    const editor1 = await db.getAsync('SELECT id FROM editors LIMIT 1');
    const clip1 = await db.getAsync('SELECT id FROM editor_clips LIMIT 1');

    if (creator1 && editor1 && clip1) {
      await db.runAsync(
        'INSERT INTO match_requests (id, creator_id, editor_id, clip_id, status, creator_liked_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [uuidv4(), creator1.id, editor1.id, clip1.id, 'pending']
      );
      console.log('  ✓ Created sample match request');
    }

    console.log('\n✅ Seed data created successfully!\n');
    console.log('Test accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Editors:');
    EDITORS.forEach(e => {
      console.log(`  ${e.email} / ${e.password}`);
    });
    console.log('\nCreators:');
    CREATORS.forEach(c => {
      console.log(`  ${c.email} / ${c.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    db.close();
  }
}

// Run seed
seed();