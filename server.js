const express = require("express");
const multer = require("multer");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
app.use("/zipped", express.static(path.join(__dirname, "zipped")));

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
const upload = multer({ storage }).any();

app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));
const MAX_SIZE = 500 * 1024 * 1024; // 500MB

app.post("/upload", (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.error("Upload Error:", err);
      return res.status(500).send("Upload error.");
    }

    const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_SIZE) {
      fs.rmSync(path.resolve(__dirname, "uploads"), { recursive: true, force: true });
      return res.status(413).send("Folder size exceeds 500MB limit.");
    }

    const zipName = `folder-${Date.now()}.zip`;
    const zipPath = path.resolve(__dirname, "zipped", zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip");

    output.on("close", () => {
      console.log(` ZIP created: ${zipPath} (${archive.pointer()} total bytes)`);

      fs.rm(path.resolve(__dirname, "uploads"), { recursive: true, force: true }, (err) => {
        if (err) {
          console.error(" Error deleting uploads:", err);
        } else {
          console.log(" Uploads folder cleaned.");
        }
        res.json({ downloadUrl: `/zipped/${zipName}` });
      });
    });

    
  fs.rm(path.resolve(__dirname, "uploads"), { recursive: true, force: true }, (err) => {
    if (err) {
      console.error(" Error deleting uploads:", err);
    } else {
      console.log(" Uploads folder cleaned.");
    }
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
