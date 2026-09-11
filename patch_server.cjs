const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf-8');

// 1. Update Express limits
server = server.replace('app.use(express.json({ limit: "50mb" }));', 'app.use(express.json({ limit: "50gb" }));');
server = server.replace('app.use(express.urlencoded({ extended: true, limit: "50mb" }));', 'app.use(express.urlencoded({ extended: true, limit: "50gb" }));');

// 2. Add processBase64Media helper after the UPLOADS_DIR setup
const helperCode = `
// --- Media Helper ---
function processBase64Media(dataString, prefix) {
  if (!dataString) return dataString;
  if (!dataString.startsWith("data:")) return dataString;

  try {
    const matches = dataString.match(/^data:([A-Za-z-+\\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return dataString;
    
    const mimeType = matches[1];
    const base64Data = matches[2];
    
    let extension = "bin";
    if (mimeType.includes("video/mp4")) extension = "mp4";
    else if (mimeType.includes("video/webm")) extension = "webm";
    else if (mimeType.includes("image/jpeg")) extension = "jpg";
    else if (mimeType.includes("image/png")) extension = "png";
    else if (mimeType.includes("image/gif")) extension = "gif";
    else if (mimeType.includes("image/webp")) extension = "webp";
    else if (mimeType.includes("image/svg+xml")) extension = "svg";
    else {
      const parts = mimeType.split("/");
      if (parts.length === 2) extension = parts[1].split("+")[0];
    }
    
    const buffer = Buffer.from(base64Data, "base64");
    const filename = \`\${prefix}_\${Date.now()}_\${crypto.randomBytes(4).toString("hex")}.\${extension}\`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    return \`/uploads/\${filename}\`;
  } catch (error) {
    console.error(\`Error processing base64 media for \${prefix}:\`, error);
    return dataString;
  }
}
// --------------------
`;

if (!server.includes("function processBase64Media")) {
  server = server.replace('// Persistent Secret', helperCode + '\n// Persistent Secret');
}

// 3. Update POST /api/projects
server = server.replace(
  'thumbnail: req.body.thumbnail || "",',
  'thumbnail: processBase64Media(req.body.thumbnail, "thumb") || "",\n      heroMediaType: req.body.heroMediaType || "image",\n      heroMediaUrl: processBase64Media(req.body.heroMediaUrl, "hero") || "",\n      heroMediaEmbedCode: req.body.heroMediaEmbedCode || "",'
);

// 4. Update PUT /api/projects/:id
server = server.replace(
  'db.projects[index] = { ...db.projects[index], ...req.body };',
  `
    if (req.body.thumbnail) {
      req.body.thumbnail = processBase64Media(req.body.thumbnail, "thumb");
    }
    if (req.body.heroMediaUrl) {
      req.body.heroMediaUrl = processBase64Media(req.body.heroMediaUrl, "hero");
    }
    db.projects[index] = { ...db.projects[index], ...req.body };
  `
);

// 5. Add 413 Global Error handler near the end before app.listen
const errorHandler = `
  // Global Error Handler for Payload Too Large
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ success: false, error: "Payload Too Large: The file uploaded exceeds the server limit." });
    }
    next(err);
  });
`;
if (!server.includes("entity.too.large")) {
  server = server.replace('app.listen(PORT, "0.0.0.0"', errorHandler + '\n  app.listen(PORT, "0.0.0.0"');
}

fs.writeFileSync('server.ts', server);
console.log("Patched server.ts");
