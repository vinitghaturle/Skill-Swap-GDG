/**
 * FilePreview - Component for displaying and downloading files
 * Shows file icon based on type and size information
 */

interface FilePreviewProps {
    file: {
        _id: string;
        name: string;
        type: string;
        size: number;
        downloadUrl: string;
        ownerId: string;
        _creationTime: number;
    };
    onDelete?: (fileId: string) => void;
    canDelete?: boolean;
}

export function FilePreview({ file, onDelete, canDelete }: FilePreviewProps) {
    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return (
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        );
        if (type.includes('pdf')) return (
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
        );
        if (type.includes('zip') || type.includes('archive')) return (
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
        );
        return (
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        );
    };

    return (
        <div className="group relative bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-2xl p-4 flex items-center gap-4 transition-all duration-300">
            <div className="w-14 h-14 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {getFileIcon(file.type)}
            </div>

            <div className="flex-1 min-w-0 pr-12">
                <h4 className="text-white font-bold text-sm truncate group-hover:text-indigo-300 transition-colors">
                    {file.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{formatSize(file.size)}</span>
                    <span className="w-1 h-1 rounded-full bg-white/10"></span>
                    <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(file._creationTime).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="absolute right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                    href={file.downloadUrl}
                    download={file.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-indigo-600 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                    title="Download"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </a>

                {canDelete && onDelete && (
                    <button
                        onClick={() => onDelete(file._id)}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-600 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                        title="Delete"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
