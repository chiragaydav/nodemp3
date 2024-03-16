const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000; // Use the PORT environment variable if available, or default to 3000

app.use(cors({
  origin: 'https://youtubetomp3hub.com' // Update CORS settings for your frontend domain
}));

app.use(bodyParser.json());

const videoTitles = {};

app.post('/fetch_info', async (req, res) => {
  const { video_id } = req.body;
  if (!video_id) {
    return res.status(400).json({ error: 'No video ID provided.' });
  }

  try {
    const info = await ytdl.getInfo(video_id);
    const title = info.videoDetails.title;
    const normalizedTitle = title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
    videoTitles[video_id] = `${normalizedTitle}.mp3`;

    const downloadLink = `${req.protocol}://${req.get('host')}/download_mp3?video_id=${video_id}`;

    const audioInfo = {
      title: title,
      thumbnail_url: info.videoDetails.thumbnails[0].url,
      downloadLink: downloadLink
    };

    res.json(audioInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching video info.' });
  }
});

app.get('/download_mp3', (req, res) => {
  const { video_id } = req.query;
  if (!video_id) {
    return res.status(400).send('No video ID provided.');
  }
  
  const title = videoTitles[video_id] || 'default_title.mp3';

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', `attachment; filename="${title}"`);

  const stream = ytdl(video_id, { quality: 'highestaudio' });
  ffmpeg(stream)
    .audioCodec('libmp3lame')
    .toFormat('mp3')
    .pipe(res)
    .on('error', error => {
      console.error(error);
      res.status(500).send('Error converting video to MP3.');
    });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
