const express = require("express");
const Youtube = require("youtube-stream-url");
const ejs = require("ejs");
const { exec } = require("child_process");
const fs = require("fs");
const app = express();
app.set("view engine", "ejs");
const port = 3000;
const ytdl = require("@distube/ytdl-core");
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/", async (req, res) => {
  try {
    const providedLink = req.body.url;
    const videoInfo = await Youtube.getInfo({ url: providedLink });
    const videoDetails = videoInfo.videoDetails;


    const info = await ytdl.getInfo(providedLink);
    const title =info.videoDetails.title;
    const thumbnailUrl=info.videoDetails.thumbnails[info.videoDetails.thumbnails.length-1].url;
    const videoFormats = ytdl.filterFormats(info.formats, "videoonly");
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");

    res.render("str", {
      title: title,
      thumbnailUrl: thumbnailUrl,
      videoQualities: videoFormats,
      videoUrl: providedLink
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error processing your request");
  }
});

app.post("/download", async (req, res) => {
  try {
    const providedLink = req.body.url;
    const qualityIndex = parseInt(req.body.qualityIndex);

    const info = await ytdl.getInfo(providedLink);
    const title =info.videoDetails.title;
    const videoFormats = ytdl.filterFormats(info.formats, "videoonly");
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");

    if (!videoFormats[qualityIndex] || !audioFormats[0]) {
      throw new Error("Invalid format selected");
    }

    const videoFormat = videoFormats[qualityIndex];
    const audioFormat = audioFormats[0];
    const uniqueId = Date.now() + "-" + Math.random().toString(36).substr(2, 9);

    const videoFilename = `video_${uniqueId}.mp4`;
    const audioFilename = `audio_${uniqueId}.mp3`;
    const outputFilename = `output_${uniqueId}.mp4`;

    // Download video and audio
    await Promise.all([
      new Promise((resolve, reject) => {
        ytdl(providedLink, { format: videoFormat })
          .pipe(fs.createWriteStream(videoFilename))
          .on("close", resolve)

          .on("error", reject);
      }),
      new Promise((resolve, reject) => {
        ytdl(providedLink, { format: audioFormat })
          .pipe(fs.createWriteStream(audioFilename))
          .on("close", resolve)
          .on("error", reject);
      })
    ]);

    // Merge with ffmpeg
    await new Promise((resolve, reject) => {
      exec(
        `ffmpeg -i "${videoFilename}" -i "${audioFilename}" -c:v copy "${outputFilename}"`,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

 

  
    
    res.download(outputFilename, `${title}.mp4`, (err) => {
      [videoFilename, audioFilename, outputFilename].forEach((file) => {
        fs.unlink(file, (unlinkErr) => {
          if (unlinkErr) console.error(`Error deleting ${file}:`, unlinkErr);
        });
      });
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).send("Error downloading the video");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});