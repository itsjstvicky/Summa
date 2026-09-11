const fs = require('fs');

let adminCode = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf-8');

const startMarker = '<div>\n                    <label className="block text-white/80 mb-1">\n                      Thumbnail Image {googleUser && <span className="text-[10px] text-emerald-400">☁️ Google Drive Sync</span>}\n                    </label>';
const endMarker = '              {/* SECTION 4: PROJECT PAGE STRUCTURE & ALIGNMENT CUSTOMIZER */}';

const startIndex = adminCode.indexOf(startMarker);
const endIndex = adminCode.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find markers", { startIndex, endIndex });
  process.exit(1);
}

const replacement = `
                  {/* B. THUMBNAIL SECTION (Grid Visual) */}
                  <div className="bg-[#0a152d] border border-[#1e40af] p-3 rounded">
                    <label className="block text-white/80 font-bold mb-2 text-xs uppercase text-[#38bdf8]">
                      Thumbnail Image (Grid Preview) {googleUser && <span className="text-[10px] text-emerald-400 font-normal normal-case">☁️ Google Drive Sync</span>}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={editingProject.thumbnail || ""}
                          onChange={(e) => setEditingProject({ ...editingProject, thumbnail: e.target.value })}
                          placeholder="https://... (Image URL for grid display)"
                          className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded font-mono"
                        />
                        <div className="flex gap-2">
                          <label className="flex-1 bg-[#1d4ed8] hover:bg-[#2563eb] text-white p-2 rounded text-xs text-center font-bold cursor-pointer transition-colors">
                            📁 Upload File
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleImageUpload(e.target.files[0], (url) => {
                                    setEditingProject({ ...editingProject, thumbnail: url });
                                    showNotification("Thumbnail uploaded!");
                                  });
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              openDrivePicker(
                                "Select Thumbnail from Google Drive",
                                "images",
                                (media) => {
                                  setEditingProject((prev) => (prev ? { ...prev, thumbnail: media.url } : null));
                                  showNotification("Thumbnail selected from Drive!");
                                },
                                "Thumbnail"
                              )
                            }
                            className="flex-1 bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white p-2 text-xs font-bold rounded cursor-pointer transition-colors"
                          >
                            ☁️ Drive Upload
                          </button>
                        </div>
                      </div>
                      
                      {/* Thumbnail Preview */}
                      {editingProject.thumbnail && (
                        <div className="w-24 h-24 rounded border border-[#1e40af] bg-black overflow-hidden shrink-0 mx-auto sm:mx-0 shadow-inner">
                          <img 
                            src={editingProject.thumbnail} 
                            alt="Thumb Preview" 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* A. HERO MEDIA SECTION */}
              <div className="bg-[#0a152d] border-2 border-[#38bdf8]/60 p-3.5 rounded space-y-3 shadow-md">
                <div className="flex justify-between items-center pb-1 border-b border-[#1e40af]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎬</span>
                    <span className="text-[#38bdf8] font-bold uppercase">
                      Hero Media Setup
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-white/80 mb-1">Select Hero Media Type</label>
                    <select
                      value={editingProject.heroMediaType || "image"}
                      onChange={(e) =>
                        setEditingProject({
                          ...editingProject,
                          heroMediaType: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded"
                    >
                      <option value="image">Image Display</option>
                      <option value="video">Video Player</option>
                      <option value="embed">Embed Code (Iframe/Figma)</option>
                    </select>
                  </div>

                  {(editingProject.heroMediaType === "image" || editingProject.heroMediaType === "video") && (
                    <div className="space-y-2">
                      <label className="block text-white/80 mb-1">
                        Source URL (Direct URL or Local File Upload)
                      </label>
                      <input
                        type="text"
                        value={editingProject.heroMediaUrl || ""}
                        onChange={(e) => setEditingProject({ ...editingProject, heroMediaUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded font-mono mb-2"
                      />
                      <div className="flex gap-2">
                        <label className="flex-1 bg-[#1d4ed8] hover:bg-[#2563eb] text-white p-2 rounded text-xs text-center font-bold cursor-pointer transition-colors">
                          📁 Upload {editingProject.heroMediaType === 'video' ? 'Video' : 'Image'}
                          <input
                            type="file"
                            accept={editingProject.heroMediaType === 'video' ? 'video/*' : 'image/*'}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === "string") {
                                    setEditingProject({ ...editingProject, heroMediaUrl: reader.result });
                                    showNotification(editingProject.heroMediaType === 'video' ? "Video file loaded!" : "Image loaded!");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            openDrivePicker(
                              \`Select \${editingProject.heroMediaType === 'video' ? 'Video' : 'Image'} from Google Drive\`,
                              editingProject.heroMediaType === 'video' ? "videos" : "images",
                              (media) => {
                                setEditingProject((prev) => (prev ? { ...prev, heroMediaUrl: media.url } : null));
                                showNotification(\`\${editingProject.heroMediaType === 'video' ? 'Video' : 'Image'} selected from Drive!\`);
                              },
                              "Hero Media"
                            )
                          }
                          className="flex-1 bg-[#0e214d] hover:bg-[#133066] border border-[#38bdf8] text-[#38bdf8] hover:text-white p-2 text-xs font-bold rounded cursor-pointer transition-colors"
                        >
                          ☁️ Drive Upload
                        </button>
                      </div>
                      
                      {/* Live Hero Image/Video Preview */}
                      {editingProject.heroMediaUrl && (
                        <div className="mt-4 border border-[#1e40af] rounded bg-black overflow-hidden flex items-center justify-center min-h-[150px]">
                          {editingProject.heroMediaType === "video" ? (
                             <video 
                               src={editingProject.heroMediaUrl} 
                               controls 
                               className="w-full h-auto max-h-[300px]" 
                             />
                          ) : (
                             <img 
                               src={editingProject.heroMediaUrl} 
                               alt="Hero Preview" 
                               className="w-full h-auto max-h-[300px] object-contain" 
                             />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {editingProject.heroMediaType === "embed" && (
                    <div className="space-y-2">
                      <label className="block text-white/80 mb-1">
                        Embed Code (HTML &lt;iframe&gt;)
                      </label>
                      <textarea
                        rows={3}
                        value={editingProject.heroMediaEmbedCode || ""}
                        onChange={(e) => setEditingProject({ ...editingProject, heroMediaEmbedCode: e.target.value })}
                        placeholder='<iframe src="..." width="100%" height="450"></iframe>'
                        className="w-full bg-[#071022] border border-[#1e40af] p-2 text-white text-xs rounded font-mono resize-none"
                      />
                      {/* Live Embed Preview */}
                      {editingProject.heroMediaEmbedCode && (
                        <div className="mt-4 pt-2 border-t border-[#1e40af]">
                          <div className="flex items-center justify-between text-[11px] text-[#38bdf8] font-bold mb-2">
                            <span>🖥️ LIVE EMBED PREVIEW:</span>
                            <span className="text-emerald-400">Active</span>
                          </div>
                          <div className="rounded border border-[#1e40af] overflow-hidden bg-white/5">
                            <div 
                              className="aspect-video [&>iframe]:w-full [&>iframe]:h-full"
                              dangerouslySetInnerHTML={{ __html: editingProject.heroMediaEmbedCode }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

`;

const newCode = adminCode.substring(0, startIndex) + replacement + adminCode.substring(endIndex);
fs.writeFileSync('src/components/admin/AdminDashboard.tsx', newCode);
console.log("AdminDashboard.tsx patched successfully");
