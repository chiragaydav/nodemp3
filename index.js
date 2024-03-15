const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const app = express();
const port = 3000;

app.get('/convert', async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!ytdl.validateURL(videoUrl)) {
            return res.status(400).send('Invalid URL');
        }

        const videoInfo = await ytdl.getInfo(videoUrl);
        const videoTitle = videoInfo.videoDetails.title;
        const sanitizedVideoTitle = videoTitle.replace(/[^a-zA-Z0-9_-]/g, '');
        const outputPath = `./${sanitizedVideoTitle}.mp3`;

        const videoStream = ytdl(videoUrl, { quality: 'highestaudio', filter: 'audioonly' });

        const ffmpegProcess = ffmpeg(videoStream)
            .audioBitrate(128)
            .save(outputPath)
            .on('end', () => {
                // Once the conversion is complete, initiate the download
                res.download(outputPath, (err) => {
                    if (err) {
                        console.error(err);
                        res.status(500).send('An error occurred while sending the file');
                    }
                    // Delete the file after sending it
                    fs.unlink(outputPath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error('Error deleting the file:', unlinkErr);
                        }
                    });
                });
            })
            .on('error', (err) => {
                console.error(err);
                res.status(500).send('An error occurred during conversion');
                // Delete the file if an error occurs
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
            });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred during conversion');
    }
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
