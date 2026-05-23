import React, { useState } from "react";
import { Upload as UploadIcon, FileText, Video, Image, CheckCircle, RefreshCw, Trash2, HeartHandshake, AlertCircle } from "lucide-react";
import { MemberUploadRequest, User } from "../types";

interface UploadProps {
  currentUser: User | null;
  onLogIn: () => void;
  uploadRequests: MemberUploadRequest[];
  onAddNewUpload: (title: string, type: 'pdf' | 'video' | 'photo', subFiles?: string[]) => void;
  onRequestDeleteUpload: (id: string) => void;
  onPayUpload: (id: string) => void;
}

export default function Upload({
  currentUser,
  onLogIn,
  uploadRequests,
  onAddNewUpload,
  onRequestDeleteUpload,
  onPayUpload
}: UploadProps) {
  const [activeType, setActiveType] = useState<'pdf' | 'video' | 'photo'>('pdf');
  const [titleInput, setTitleInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Support for PDF multi-file select batch queues
  const [queuedFiles, setQueuedFiles] = useState<string[]>([]);
  const [newQueueFileName, setNewQueueFileName] = useState("");

  const handlePayAfterApprovalSimulate = (id: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    setPayingId(id);
    setTimeout(() => {
      onPayUpload(id);
      setPayingId(null);
      alert("🎉 M-PESA KES 200 fee paid successfully! Your approved document is now live in the library catalog.");
    }, 1800);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!titleInput.trim()) return;

    setIsUploading(true);
    setTimeout(() => {
      onAddNewUpload(titleInput.trim(), activeType, activeType === "pdf" ? queuedFiles : []);
      setIsUploading(false);
      setSuccess(true);
      setTitleInput("");
      setQueuedFiles([]);
      setNewQueueFileName("");
      setTimeout(() => setSuccess(false), 4000);
    }, 2000);
  };

  const myUploads = uploadRequests.filter((u) => u.userId === (currentUser?.email || "anonymous"));

  return (
    <div id="upload_section_panel" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Publish with the <span className="text-red-700">Community</span>
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          Share your books, testimonials, training snippets, or videos. To maintain high-fidelity academic excellence, all uploads go through our rigorous review before public launch.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Upload Form Area */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-display text-lg font-bold text-neutral-950">Member Upload Portal</h3>
            
            <div className="rounded-xl bg-red-50 p-4 text-xs text-red-900 flex items-start space-x-2.5">
              <AlertCircle className="h-4.5 w-4.5 text-red-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Important Notice</span>: To cover cloud hosting and validation reviews, a minor upload fee of **KES 200** applies to member contributions. Admin uploads are exempt and are automatically featured.
              </div>
            </div>

            {/* Select what type they are uploading */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => setActiveType("pdf")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${
                  activeType === "pdf" ? "border-red-400 bg-red-50 font-bold text-red-950" : "border-stone-200 bg-[#fbfbf9]"
                }`}
              >
                <FileText className="h-5 w-5 mb-1" />
                <span>Document / PDF</span>
              </button>
              <button
                onClick={() => setActiveType("video")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${
                  activeType === "video" ? "border-red-400 bg-red-50 font-bold text-red-950" : "border-stone-200 bg-[#fbfbf9]"
                }`}
              >
                <Video className="h-5 w-5 mb-1" />
                <span>Video Clip</span>
              </button>
              <button
                onClick={() => setActiveType("photo")}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border transition ${
                  activeType === "photo" ? "border-red-400 bg-red-50 font-bold text-red-950" : "border-stone-200 bg-[#fbfbf9]"
                }`}
              >
                <Image className="h-5 w-5 mb-1" />
                <span>Photo / Asset</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs text-left">
              <div>
                <label className="block text-stone-500 font-bold mb-1.5 uppercase tracking-wide">File Presentation Title</label>
                <input
                  type="text"
                  required
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full rounded-lg border border-stone-200 bg-neutral-50 px-3.5 py-2.5 outline-none focus:bg-white"
                  placeholder="e.g. My Sermon Outline"
                />
              </div>

              {/* Multi-File Selection PDF batch queue list */}
              {activeType === "pdf" && (
                <div className="rounded-xl border border-stone-200 bg-[#fbfcfa] p-4 space-y-3">
                  <span className="block text-stone-600 font-bold uppercase tracking-wide text-[10px]">
                    PDF Submission Batch Queue (Multi-File Selection)
                  </span>
                  <p className="text-[11px] text-stone-500 leading-normal">
                    You can bunch multiple PDF chapters or documents together under this single KES 200 review request.
                  </p>

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newQueueFileName}
                      onChange={(e) => setNewQueueFileName(e.target.value)}
                      placeholder="e.g. Chapter_1_Introduction.pdf"
                      className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 outline-none text-xs focus:ring-1 focus:ring-red-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newQueueFileName.trim()) {
                            setQueuedFiles([...queuedFiles, newQueueFileName.trim()]);
                            setNewQueueFileName("");
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newQueueFileName.trim()) {
                          setQueuedFiles([...queuedFiles, newQueueFileName.trim()]);
                          setNewQueueFileName("");
                        }
                      }}
                      className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 text-white font-bold rounded-lg transition text-xs shrink-0 cursor-pointer"
                    >
                      Add To Batch
                    </button>
                  </div>

                  {queuedFiles.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-stone-500 block">
                        Pending Queue Items ({queuedFiles.length} files added):
                      </span>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {queuedFiles.map((file, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white border border-stone-150 rounded px-2.5 py-1 text-[11px] font-mono">
                            <span className="truncate text-stone-700">{file}</span>
                            <button
                              type="button"
                              onClick={() => setQueuedFiles(queuedFiles.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 font-bold ml-2 transition cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed border-stone-200 rounded-lg text-stone-405 italic text-[11px] bg-white">
                      No additional files queued. Use inputs above to queue multiple docs.
                    </div>
                  )}
                </div>
              )}

              {/* Info text alerting about free submission and post-approval payment */}
              <div className="rounded-xl border border-amber-250 bg-amber-50/55 p-3.5 space-y-1 text-[11px] text-amber-900 leading-normal">
                <span className="font-bold flex items-center gap-1">
                  <HeartHandshake className="h-4 w-4 text-amber-700 shrink-0" />
                  Free Draft Submission Flow
                </span>
                <p>
                  No payment is required right now! Submit your draft completely for free. Once an Admin approves the contents, you can pay the KES 200 fee from your ledger on the right to make the download public.
                </p>
              </div>

              {success ? (
                <div className="rounded-lg bg-green-50 p-4 text-green-800">
                  🎉 Draft submission queued successfully! It is now sent to the Admin queue. Check the right-hand Ledger to view real-time validation and pay after approval!
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full flex items-center justify-center space-x-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold py-3 shadow-md disabled:opacity-45 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Transcribing & Submitting Draft...</span>
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-4 w-4" />
                      <span>Submit Draft for Admin Review (FREE)</span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Member Upload Listings ledger */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-2">My Upload Ledger</h3>

            {myUploads.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6">You haven't uploaded any documents through this portal yet.</p>
            ) : (
              <div className="space-y-3">
                {myUploads.map((u) => {
                  const isApproved = u.status === "approved";
                  const isPaid = u.paid === true;
                  const isPendingDelete = u.status === "pending_delete";

                  let badgeColor = "bg-amber-50 text-amber-700 border border-amber-200";
                  let badgeLabel = "Draft Review";

                  if (isApproved) {
                    if (isPaid) {
                      badgeColor = "bg-green-50 text-green-700 border border-green-200";
                      badgeLabel = "Public / Live";
                    } else {
                      badgeColor = "bg-blue-50 text-blue-700 border border-blue-200";
                      badgeLabel = "Approved (Unpaid)";
                    }
                  } else if (isPendingDelete) {
                    badgeColor = "bg-orange-50 text-orange-600 border border-orange-200 animate-pulse";
                    badgeLabel = "Void Quest";
                  }

                  return (
                    <div key={u.id} className="rounded-xl bg-[#fcfbf9] border border-stone-150 p-4 text-xs text-left space-y-2 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-stone-850 truncate max-w-[170px]">{u.title}</h4>
                          <span className="text-[10px] text-stone-400 font-mono block mt-0.5">{u.date} • {u.type.toUpperCase()}</span>
                        </div>
                        
                        {/* Live review label */}
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono ${badgeColor}`}>
                          {badgeLabel}
                        </span>
                      </div>

                      {u.subFiles && u.subFiles.length > 0 && (
                        <div className="bg-stone-50 border border-stone-150 rounded-lg p-2.5 mt-2 space-y-1.5">
                          <span className="text-[10px] font-bold text-stone-500 font-mono block">BATCH QUEUE DOCUMENTS ({u.subFiles.length}):</span>
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                            {u.subFiles.map((file, fIdx) => (
                              <div key={fIdx} className="text-[11px] text-stone-600 font-mono flex items-center space-x-1.5 pl-1">
                                <span>•</span>
                                <span className="truncate select-all">{file}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[11px] text-stone-605 space-y-1 bg-white border border-stone-100 rounded-lg p-2 mt-1">
                        <p className="font-semibold text-stone-700">
                          {u.allowedToPublic ? (
                            <span className="text-green-700">🔓 Visible & featured in public catalog</span>
                          ) : isApproved && !isPaid ? (
                            <span className="text-blue-700">🔒 Approved by Overseer but Private (Awaiting Payment)</span>
                          ) : (
                            <span className="text-amber-700">🔒 Private (Moderators evaluating content standards)</span>
                          )}
                        </p>
                        <p className="text-[10px] text-stone-400 font-mono">
                          Review Fee Status: {isPaid ? "✅ KES 200 Paid" : "❌ Unpaid (KES 200 review fee is due)"}
                        </p>
                      </div>

                      {/* Display Post-Approval Payment CTA */}
                      {isApproved && !isPaid && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 mt-2 space-y-2">
                          <p className="text-[10.5px] text-blue-900 leading-tight">
                            Your upload has been approved by the Admin! Pay the **KES 200** fee to finalize publication.
                          </p>
                          <button
                            type="button"
                            onClick={() => handlePayAfterApprovalSimulate(u.id)}
                            disabled={payingId === u.id}
                            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-[11px] cursor-pointer disabled:opacity-50"
                          >
                            {payingId === u.id ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                <span>Contacting Safaricom M-PESA...</span>
                              </>
                            ) : (
                              <>
                                <HeartHandshake className="h-3.5 w-3.5" />
                                <span>Pay KES 200 with M-PESA</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                        {/* Active download link */}
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); alert("Document bytes downloaded successfully!"); }}
                          className="text-stone-500 hover:text-red-700 font-bold hover:underline"
                        >
                          Download file
                        </a>

                        {/* Request deletion rule */}
                        {isPendingDelete ? (
                          <span className="text-[10px] text-orange-600 font-bold font-mono">Waiting for Delete Approval</span>
                        ) : (
                          <button
                            onClick={() => onRequestDeleteUpload(u.id)}
                            className="text-red-600 hover:text-red-800 font-bold flex items-center space-x-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Request Deletion</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
