/**
 * FileUpload - Component for uploading files to Firebase via storage service
 * Supports drag-and-drop and progress tracking
 */

import { useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/convex/_generated/api';
import type { Id } from '../../../convex/convex/_generated/dataModel';

interface FileUploadProps {
    sessionId: Id<"sessions">;
    conversationId: Id<"conversations">;
    ownerId: Id<"users">;
    onUploadComplete?: (fileId: string) => void;
}

export function FileUpload({ sessionId, conversationId, ownerId, onUploadComplete }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createFileMetadata = useMutation(api.files.createFileMetadata);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const uploadFile = async (file: File) => {
        // Basic validation
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        if (file.size > MAX_SIZE) {
            setError('File size exceeds 50MB limit');
            return;
        }

        setIsUploading(true);
        setProgress(0);
        setError(null);

        try {
            const storageServerUrl = import.meta.env.VITE_STORAGE_SERVER_URL || 'http://localhost:3002';

            const formData = new FormData();
            formData.append('file', file);
            formData.append('sessionId', sessionId);
            formData.append('conversationId', conversationId);

            // Use XMLHttpRequest for progress tracking
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    setProgress(percentComplete);
                }
            });

            const uploadPromise = new Promise<{ fileId: string; downloadUrl: string }>((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (e) {
                            reject(new Error('Invalid response from storage server'));
                        }
                    } else {
                        reject(new Error(`Upload failed: ${xhr.statusText}`));
                    }
                };
                xhr.onerror = () => reject(new Error('Network error during upload'));
            });

            xhr.open('POST', `${storageServerUrl}/upload`);
            xhr.send(formData);

            const result = await uploadPromise;

            // Sync metadata to Convex - fixed field names to match schema
            const convexFileId = await createFileMetadata({
                fileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
                externalFileId: result.fileId,
                downloadUrl: result.downloadUrl,
                storageProvider: 'firebase',
                sessionId: sessionId,
                conversationId: conversationId,
                ownerId: ownerId,
            });

            setIsUploading(false);
            onUploadComplete?.(convexFileId);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (err) {
            console.error('Upload failed:', err);
            setError(err instanceof Error ? err.message : 'Upload failed');
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    relative group cursor-pointer
                    border-2 border-dashed rounded-2xl p-6
                    transition-all duration-300 ease-out
                    flex flex-col items-center justify-center text-center
                    ${isDragging
                        ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                    }
                `}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {isUploading ? (
                    <div className="w-full space-y-3 animate-in fade-in">
                        <div className="relative w-12 h-12 mx-auto">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    className="text-white/10"
                                    strokeWidth="3"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="22"
                                    cx="24"
                                    cy="24"
                                />
                                <circle
                                    className="text-indigo-500 transition-all duration-300 ease-out"
                                    strokeWidth="3"
                                    strokeDasharray={138}
                                    strokeDashoffset={138 - (138 * progress) / 100}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="22"
                                    cx="24"
                                    cy="24"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">
                                {progress}%
                            </div>
                        </div>
                        <p className="text-white font-bold text-xs uppercase tracking-widest">Uploading...</p>
                    </div>
                ) : (
                    <>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
                            <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <h3 className="text-white font-bold text-sm mb-1">Click to share files</h3>
                        <p className="text-gray-500 text-[10px] max-w-[160px]">
                            PDF, Slides, Code (Max 50MB)
                        </p>
                    </>
                )}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                    <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-red-400 font-medium leading-tight">{error}</p>
                </div>
            )}
        </div>
    );
}
