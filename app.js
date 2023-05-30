const { response } = require("express");
const express = require("express");
const Youtube = require("youtube-stream-url");
const ejs = require("ejs");
const {exec} = require("child_process");
const fs = require("fs");
const app = express();
app.set("view engine", "ejs");
const port = 3000;
const ytdl = require("ytdl-core");
const bodyParser = require("body-parser");
const { log } = require("console");
const { title } = require("process");
const { loadavg } = require("os");


app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
////post 
app.post("/", (req, res) => {
  console.log("post requeset...");
  let ProviedLink = String(req.body.url);
  let thumbnailUrl = "";
  const videoURL = { url: ProviedLink };
  Youtube.getInfo(videoURL).then(function (video) {
  
   const title=video.videoDetails.title;
    console.log(title);

    thumbnailUrl = video.videoDetails.thumbnail.thumbnails[ video.videoDetails.thumbnail.thumbnails.length - 1 ].url;


    async function videoAndAudioFormatsDetails() {
      let info = await ytdl.getInfo(ytdl.getURLVideoID(ProviedLink));
      
      let videoFormats = [];
      let audioFormats=[];

      videoFormats = ytdl.filterFormats(info.formats, "videoonly");
     audioFormats=ytdl.filterFormats(info.formats,'audioonly');

     let audioUrl=audioFormats[0].url;

      const obj = {
        title:title.slice(0,32)+"...",
        thumbnailUrl: thumbnailUrl,
        videoQualities: videoFormats,
        audioUrl:audioUrl
      };

      app.post("/download", (request, response) => {
        const index = request.body.quality;

        console.log(videoFormats[index].qualityLabel+" quality is requested");

        //size 
        const videoSize= videoFormats[index].contentLength/1024/1024;
        const audioSize=audioFormats[0].contentLength/1024/1024;
        console.log(videoSize);
        console.log(audioSize);

        ////check if video is downloaded

        const videoPromise = new Promise((resolve, reject) => {
          console.log("video download started ");
          ytdl(ProviedLink,{format:videoFormats[index]})
            .pipe(fs.createWriteStream('video.mp4'))
            .on('close',()=>{
            
              resolve();
            })
            .on('error', reject);
        });
        ///checks audio is downloaded
        const audioPromise = new Promise((resolve, reject) => {
          console.log("audio started");
    
          ytdl(ProviedLink,{format:audioFormats[0]})
  
            .pipe(fs.createWriteStream('audio.mp3'))
            .on('close',()=>{
            
              resolve();
            })
            .on('error', reject);
        });


        ///checks wether both video and audio has been downloaded or not 

        Promise.all([videoPromise, audioPromise])
        .then(() => {
          console.log('Both video and audio downloaded');
          let downloadTilte= title;
          downloadTilte=downloadTilte.slice(0,title.length-13);
          
       const command=   `ffmpeg -i "video.mp4" -i "audio.mp3" -c:v copy  "outp.mp4"`;
          exec( command  ,(err ,stdout,sterr)=>{
            if(err){
              console.log(err)  ;return;
            }
            else{
              console.log("merging done");
              response.download("outp.mp4",downloadTilte+".mp4",()=>{
                fs.unlink("video.mp4",(err)=>{
                  if(err){
                    console.log(err);
                  }
                  else{
                    console.log("deleted");
                  }
                  
                })
                fs.unlink("audio.mp3",(err)=>{
                  if(err){
                    console.log(err);
                  }
                  else{
                    console.log("deleted");
                  }
                  
                })
                fs.unlink("outp.mp4",(err)=>{
                  if(err){
                    console.log(err);
                  }
                  else{
                    console.log("deleted");
                  }
                  
                })
              })
            }

          }   )

        })
        .catch((error) => {
          console.error('Error downloading video / audio :', error);
        });

      });
 
      res.render("str", obj);
    }
    videoAndAudioFormatsDetails();
    
  });
});

app.listen(port, (req, res) => {
  console.log(`server is running on port ${port}`);
});
