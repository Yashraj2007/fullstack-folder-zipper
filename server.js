process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Promise Rejection:", reason);
});
const express = require("express");
const multer = require("multer");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Ensure required folders exist
fs.mkdirSync("uploads", { recursive: true });
fs.mkdirSync("zipped", { recursive: true });

app.use(express.static("public"));
app.use("/zipped", express.static(path.resolve(__dirname, "zipped")));

// Set up multer to preserve folder structure
const storage = multer.diskStorage({
  
  destination: function (req, file, cb) {
    const uploadPath = path.join("uploads", path.dirname(file.originalname));
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, path.basename(file.originalname));
  },
});


app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));

const MAX_SIZE = 1000 * 1024 * 1024; // 1 GB
const upload = multer({ 
  storage,
  limits: {
    fileSize: MAX_SIZE,      // Max size per file
    fieldSize: MAX_SIZE,     // Max size of the entire field (multipart body)
    files: 200               // Max number of files allowed
  }
}).array("files", 200);

app.post("/upload", (req, res) => {
  upload(req, res, function (err) {

    if (err) {
      console.error("Upload Error:", err);
      return res.status(500).send("Upload error.");
    }
     if (!req.files || req.files.length === 0) {
      return res.status(400).send("No files uploaded.");
    }
    


    const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
        console.log(`📁 Received ${req.files.length} files, total size: ${totalSize / (1024*1024)} MB`);
if (totalSize > MAX_SIZE) {
  fs.rmSync(path.resolve(__dirname, "uploads"), { recursive: true, force: true });
  return res.status(413).send("Folder size exceeds 500MB limit.");
}

    if (totalSize > MAX_SIZE) {
      fs.rmSync(path.resolve(__dirname, "uploads"), { recursive: true, force: true });
      return res.status(413).send("Folder size exceeds 500MB limit.");
    }

    const zipName = `folder-${Date.now()}.zip`;
    const zipPath = path.resolve(__dirname, "zipped", zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip");

    output.on("close", () => {
      console.log(`✅ ZIP created: ${zipPath} (${archive.pointer()} total bytes)`);

      // Delete uploads folder *after* ZIP is finalized
      fs.rm(path.resolve(__dirname, "uploads"), { recursive: true, force: true }, (err) => {
        if (err) {
          console.error("❌ Error deleting uploads:", err);
        } else {
          console.log("🧹 Uploads folder cleaned.");
        }
      });

      res.json({ downloadUrl: `/zipped/${zipName}` });
    });

    archive.on("error", err => {
      console.error("Archiver Error:", err);
      res.status(500).send("Zipping failed.");
    });

    archive.pipe(output);
    archive.directory(path.resolve(__dirname, "uploads"), false);
    archive.finalize();
  });
});



  



app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
