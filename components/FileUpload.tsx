
import React, { useCallback, useState } from 'react';

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V8.25c0-1.12.93-2.25 2.25-2.25h13.5c1.1 0 2.25 1.12 2.25 2.25v9c0 1.12-.93 2.25-2.25 2.25H5.25c-1.1 0-2.25-1.12-2.25-2.25Z" />
    </svg>
);

const DocumentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);


interface FileUploadProps {
    onFileSelect: (file: File) => void;
    previewUrl: string | null;
    fileName: string | null;
    isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, previewUrl, fileName, isLoading }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    }, [onFileSelect]);

    const acceptedFileTypes = "image/jpeg,image/png,application/pdf";

    return (
        <div className="w-full">
            <label
                htmlFor="file-upload"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 
                ${isDragging ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/50' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'} 
                ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadIcon className="w-10 h-10 mb-4 text-gray-500 dark:text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PDF, PNG, ou JPG</p>
                </div>
                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept={acceptedFileTypes} disabled={isLoading} />
            </label>

            {previewUrl && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-dark-card dark:border-gray-700">
                    <h3 className="font-semibold text-lg mb-2 text-light-text dark:text-dark-text">Pré-visualização do Arquivo:</h3>
                    {previewUrl.startsWith('data:image') ? (
                        <img src={previewUrl} alt="Preview" className="max-h-80 w-auto rounded-md shadow-md mx-auto" />
                    ) : (
                         <div className="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
                            <DocumentIcon className="w-16 h-16 text-brand-blue" />
                            <span className="ml-4 font-medium text-light-text dark:text-dark-text">{fileName}</span>
                         </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileUpload;
