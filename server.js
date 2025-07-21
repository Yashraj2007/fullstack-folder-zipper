const express = require("express");
const multer = require("multer");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

fs.mkdirSync("uploads", { recursive: true });
fs.mkdirSync("zipped", { recursive: true });

app.use(express.static("public"));
app.use("/zipped", express.static(path.resolve(__dirname, "zipped")));

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

app.post("/upload", (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      console.error("Upload Error:", err);
      return res.status(500).send("Upload error.");
    }

    const zipName = `folder-${Date.now()}.zip`;
    const zipPath = path.resolve(__dirname, "zipped", zipName);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip");

    output.on("close", () => {
      console.log(`✅ ZIP created: ${zipPath} (${archive.pointer()} total bytes)`);
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
