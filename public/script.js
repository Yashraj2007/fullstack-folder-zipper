async function upload() {
  const input = document.getElementById("folderInput");
  const files = input.files;

  if (!files.length) return alert("Select a folder!");

  const formData = new FormData();
  for (let file of files) {
    formData.append("files", file, file.webkitRelativePath);
  }

  document.getElementById("status").innerText = "Uploading...";

  try {
    const res = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Failed");

    const data = await res.json();
    document.getElementById("status").innerHTML = `
      <a href="${data.downloadUrl}" download>Download ZIP</a>
    `;
  } catch (err) {
    document.getElementById("status").innerText = "Error uploading!";
  }
}
