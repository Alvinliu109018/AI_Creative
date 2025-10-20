
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { editImage, generateImage, generateVideo, outpaintImage, upscaleImage } from './services/geminiService';

type Tab = 'edit' | 'generateImage' | 'generateVideo' | 'upscale';

// --- UTILITY FUNCTIONS ---
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });

// --- UI HELPER COMPONENTS ---

const Spinner: React.FC = () => (
  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /> </svg> );
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /> </svg> );
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /> </svg> );

const ImagePreviewModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <img src={imageUrl} alt="預覽" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
  </div>
);

interface ImageCardProps {
  title: string;
  imageUrl: string | null;
  isLoading?: boolean;
  onImageClick?: (url: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ title, imageUrl, isLoading = false, onImageClick }) => (
  <div className="bg-gray-800/50 rounded-xl w-full aspect-square flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-700 backdrop-blur-sm">
    <h3 className="text-lg font-semibold text-gray-400 mb-4">{title}</h3>
    <div className="relative w-full h-full flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center rounded-lg z-10">
          <Spinner />
        </div>
      )}
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={title} 
          className={`max-w-full max-h-full object-contain rounded-lg shadow-lg ${onImageClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={() => onImageClick && imageUrl && onImageClick(imageUrl)}
        />
      ) : (
        <div className="text-gray-500 text-center">
          <p>您的媒體將會顯示在此處。</p>
        </div>
      )}
    </div>
  </div>
);

interface VideoCardProps {
    title: string;
    videoUrl: string | null;
    isLoading?: boolean;
    loadingMessage?: string;
}

const VideoCard: React.FC<VideoCardProps> = ({ title, videoUrl, isLoading = false, loadingMessage = '生成中...' }) => (
    <div className="bg-gray-800/50 rounded-xl w-full aspect-video flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-700 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-gray-400 mb-4">{title}</h3>
      <div className="relative w-full h-full flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 flex flex-col items-center justify-center rounded-lg z-10 text-center p-4">
            <Spinner />
            <p className="mt-4 text-white">{loadingMessage}</p>
          </div>
        )}
        {videoUrl && !isLoading ? (
          <video src={videoUrl} controls className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
        ) : !isLoading && (
          <div className="text-gray-500 text-center">
            <p>您的影片將會顯示在此處。</p>
          </div>
        )}
      </div>
    </div>
);

const FileUploadZone: React.FC<{
  file: File | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  accept: string;
  id: string;
  label: string;
  multiple?: boolean;
}> = ({ file, onFileChange, accept, id, label, multiple = false }) => (
  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-600 rounded-lg h-full hover:border-purple-400 transition-colors">
    <UploadIcon className="w-10 h-10 text-gray-500 mb-2" />
    <label htmlFor={id} className="relative cursor-pointer bg-gray-700 text-gray-200 font-semibold rounded-md px-4 py-2 hover:bg-purple-600 transition-colors">
      <span>{file ? `更換${label}` : `上傳${label}`}</span>
      <input id={id} type="file" className="sr-only" accept={accept} onChange={onFileChange} multiple={multiple} />
    </label>
    {file && <p className="mt-2 text-sm text-gray-400 truncate max-w-xs">{file.name}</p>}
  </div>
);

const Thumbnail: React.FC<{
  file: File;
  hasEditedVersion: boolean;
  isSelected: boolean;
  onClick: () => void;
}> = ({ file, hasEditedVersion, isSelected, onClick }) => {
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(imageUrl), [imageUrl]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden cursor-pointer flex-shrink-0 w-24 h-24 border-2 ${isSelected ? 'border-purple-500' : 'border-gray-700 hover:border-gray-500'}`}
      onClick={onClick}
    >
      <img src={imageUrl} alt={file.name} className="w-full h-full object-cover" />
      {hasEditedVersion && (
        <div className="absolute bottom-1 right-1 bg-purple-500 rounded-full p-1 pointer-events-none">
          <SparklesIcon className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
};


// --- MAIN APP COMPONENT ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('edit');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  
  // States per tab
  const [editState, setEditState] = useState({ 
    prompt: '為主體戴上海盜帽。', 
    originalFiles: [] as File[],
    editedImages: {} as Record<string, string | null>, // Key: "filename+lastModified", Value: base64 string
    selectedFileIndex: null as number | null,
    outputName: 'edited-image', 
    isOutpaint: false 
  });
  const [genState, setGenState] = useState({ prompt: '一個機器人拿著紅色滑板。', generatedImage: null as string | null, outputName: 'generated-image' });
  const [videoGenState, setVideoGenState] = useState({ prompt: '一隻貓的霓虹全息圖正在高速行駛。', sourceFile: null as File | null, generatedVideo: null as string | null, loadingMessage: '' });
  const [upscaleState, setUpscaleState] = useState({ originalFile: null as File | null, upscaledImage: null as string | null });

  const handleEditFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
        const newFiles = Array.from(files);
        setEditState(prev => {
            // Fix: Corrected the logic to compare the new file's lastModified date with existing files for proper de-duplication.
            const uniqueNewFiles = newFiles.filter(nf => !prev.originalFiles.some(of => of.name === nf.name && of.lastModified === nf.lastModified));
            const updatedFiles = [...prev.originalFiles, ...uniqueNewFiles];
            return {
                ...prev,
                originalFiles: updatedFiles,
                selectedFileIndex: prev.originalFiles.length, // Select first new file
            };
        });
        setError(null);
    }
  };
  
  const handleSingleFileChange = <K extends keyof any>(setter: React.Dispatch<React.SetStateAction<any>>, field: K, clearField?: K) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setter(prev => ({...prev, [field]: file, ...(clearField && {[clearField]: null})}));
      setError(null);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setError(null);
  }

  // Memoized Image URLs
  const selectedOriginalFile = useMemo(() => {
    if (editState.selectedFileIndex !== null && editState.originalFiles[editState.selectedFileIndex]) {
        return editState.originalFiles[editState.selectedFileIndex];
    }
    return null;
  }, [editState.originalFiles, editState.selectedFileIndex]);
  
  const originalImageUrl = useMemo(() => selectedOriginalFile ? URL.createObjectURL(selectedOriginalFile) : null, [selectedOriginalFile]);

  const editedImageUrl = useMemo(() => {
    if (selectedOriginalFile) {
        const fileKey = selectedOriginalFile.name + selectedOriginalFile.lastModified;
        const base64Data = editState.editedImages[fileKey];
        if (base64Data) {
            return `data:image/jpeg;base64,${base64Data}`;
        }
    }
    return null;
  }, [selectedOriginalFile, editState.editedImages]);

  const generatedImageUrl = useMemo(() => genState.generatedImage ? `data:image/jpeg;base64,${genState.generatedImage}` : null, [genState.generatedImage]);
  const upscaleOriginalUrl = useMemo(() => upscaleState.originalFile ? URL.createObjectURL(upscaleState.originalFile) : null, [upscaleState.originalFile]);
  const upscaledImageUrl = useMemo(() => upscaleState.upscaledImage ? `data:image/jpeg;base64,${upscaleState.upscaledImage}` : null, [upscaleState.upscaledImage]);


  const createApiHandler = useCallback((
    precheck: () => boolean, 
    apiCall: () => Promise<any>, 
    stateSetter: React.Dispatch<React.SetStateAction<any>>,
    resultField: keyof any
  ) => async () => {
    if (!precheck()) return;
    setIsLoading(true); setError(null); stateSetter(prev => ({...prev, [resultField]: null}));
    try {
      const result = await apiCall();
      stateSetter(prev => ({ ...prev, [resultField]: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知的錯誤。');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleEdit = async () => {
    if (!selectedOriginalFile) { setError('請先上傳並選擇一張圖片。'); return; }
    if (!editState.isOutpaint && !editState.prompt.trim()) { setError('請輸入編輯提示。'); return; }

    setIsLoading(true); setError(null);
    const fileKey = selectedOriginalFile.name + selectedOriginalFile.lastModified;
    setEditState(prev => ({ ...prev, editedImages: { ...prev.editedImages, [fileKey]: null } }));
    
    try {
        const base64Data = await fileToBase64(selectedOriginalFile);
        const result = editState.isOutpaint 
            ? await outpaintImage(base64Data, selectedOriginalFile.type, editState.prompt)
            : await editImage(base64Data, selectedOriginalFile.type, editState.prompt);
        setEditState(prev => ({...prev, editedImages: { ...prev.editedImages, [fileKey]: result }}));
    } catch (err) {
        setError(err instanceof Error ? err.message : '發生未知的錯誤。');
    } finally {
        setIsLoading(false);
    }
  };

  const handleGenerateImage = createApiHandler(
    () => {
      if (!genState.prompt.trim()) { setError('請輸入生成提示。'); return false; }
      return true;
    },
    () => generateImage(genState.prompt),
    setGenState, 'generatedImage'
  );

  const handleGenerateVideo = async () => {
    if (!videoGenState.prompt.trim()) { setError('請輸入生成提示。'); return; }
    setIsLoading(true); setError(null); setVideoGenState(prev => ({...prev, generatedVideo: null}));
    try {
      let base64Data: string | null = null;
      if (videoGenState.sourceFile) {
        base64Data = await fileToBase64(videoGenState.sourceFile);
      }
      const videoUrl = await generateVideo(videoGenState.prompt, base64Data, videoGenState.sourceFile?.type || null, (msg) => setVideoGenState(prev => ({...prev, loadingMessage: msg})));
      setVideoGenState(prev => ({...prev, generatedVideo: videoUrl}));
    } catch (err) { setError(err instanceof Error ? err.message : '發生未知的錯誤。'); }
    finally { setIsLoading(false); setVideoGenState(prev => ({...prev, loadingMessage: ''})); }
  };
  
  const handleUpscale = createApiHandler(
    () => {
      if (!upscaleState.originalFile) { setError('請先上傳一張圖片。'); return false; }
      return true;
    },
    async () => {
      const base64Data = await fileToBase64(upscaleState.originalFile!);
      return await upscaleImage(base64Data, upscaleState.originalFile!.type);
    },
    setUpscaleState, 'upscaledImage'
  );

  const handleImport = useCallback(async (imageUrl: string | null, outputName: string, targetTab: Tab | 'outpaint') => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const finalFileName = (outputName.trim() || `image-${Date.now()}`) + '.jpeg';
      const file = new File([blob], finalFileName, { type: blob.type });
      const fileKey = file.name + file.lastModified;

      if (targetTab === 'edit' || targetTab === 'outpaint') {
        setEditState(prev => {
            const updatedFiles = [...prev.originalFiles, file];
            return {
              ...prev,
              originalFiles: updatedFiles,
              editedImages: { ...prev.editedImages, [fileKey]: null },
              selectedFileIndex: updatedFiles.length - 1,
              isOutpaint: targetTab === 'outpaint',
              prompt: targetTab === 'outpaint' ? '' : '為主體戴上海盜帽。'
            };
        });
        setActiveTab('edit');
      } else if (targetTab === 'upscale') {
        setUpscaleState(prev => ({ ...prev, originalFile: file, upscaledImage: null }));
        setActiveTab('upscale');
      }

      window.scrollTo(0, 0);
    } catch (err) {
      setError("無法導入圖片。");
    }
  }, []);

  const handleDownload = (imageUrl: string, fileName: string) => () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const finalFileName = (fileName.trim() || 'download') + '.jpeg';
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const TabButton = ({ text, active, onClick }: { text: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${ active ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>
      {text}
    </button>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'edit': {
        const isOutpaint = editState.isOutpaint;
        return (
            <>
            {editState.originalFiles.length > 0 && (
                <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-400 mb-3">選擇要編輯的圖片</h4>
                    <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6">
                        {editState.originalFiles.map((file, index) => {
                            const fileKey = file.name + file.lastModified;
                            return (
                                <Thumbnail
                                    key={fileKey}
                                    file={file}
                                    isSelected={index === editState.selectedFileIndex}
                                    hasEditedVersion={!!editState.editedImages[fileKey]}
                                    onClick={() => setEditState(prev => ({ ...prev, selectedFileIndex: index }))}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="flex flex-col gap-4">
                  <FileUploadZone file={null} onFileChange={handleEditFileChange} accept="image/*" id="file-upload-edit" label="圖片" multiple />
                   {editState.originalFiles.length > 0 && <p className="text-sm text-gray-400 text-center -mt-2">{`已上傳 ${editState.originalFiles.length} 張圖片。點擊上方縮圖進行切換。`}</p>}
                </div>
                <div className="flex flex-col gap-4">
                <div className="flex items-center self-start">
                    <input
                        id="outpaint-checkbox"
                        type="checkbox"
                        checked={isOutpaint}
                        onChange={(e) => setEditState(prev => ({...prev, isOutpaint: e.target.checked}))}
                        className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-gray-800"
                    />
                    <label htmlFor="outpaint-checkbox" className="ml-2 text-sm font-medium text-gray-300">擴圖</label>
                </div>
                <textarea 
                    value={editState.prompt} 
                    onChange={(e) => setEditState(prev => ({...prev, prompt: e.target.value}))} 
                    placeholder={isOutpaint ? "擴圖提示詞 (選填)，例如：'在左側加入一座古老的城堡'" : "例如：'將紅色的車子變成藍色'"} 
                    className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow h-28 resize-none" />
                <input type="text" value={editState.outputName} onChange={(e) => setEditState(prev => ({...prev, outputName: e.target.value}))} placeholder="輸出圖名 (不含副檔名)" className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow" />
                <button onClick={handleEdit} disabled={!selectedOriginalFile || isLoading} className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"> 
                    {isLoading ? <><Spinner /> {isOutpaint ? '擴展中...' : '生成中...'}</> : <><SparklesIcon className="w-5 h-5" /> {isOutpaint ? '開始擴圖' : '生成編輯'}</>} 
                </button>
                </div>
            </div>
            {error && <p className="mt-4 text-center text-red-400 bg-red-900/30 p-3 rounded-lg">{error}</p>}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <ImageCard title="原始圖片" imageUrl={originalImageUrl} onImageClick={setPreviewImageUrl} />
                <div className="flex flex-col gap-4">
                <ImageCard title="修圖後圖片" imageUrl={editedImageUrl} isLoading={isLoading} onImageClick={setPreviewImageUrl} />
                {editedImageUrl && !isLoading && (
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleDownload(editedImageUrl, editState.outputName)} className="flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-all"><DownloadIcon className="w-5 h-5" />下載圖片</button>
                        <button onClick={() => handleImport(editedImageUrl, editState.outputName, 'edit')} className="flex items-center justify-center gap-2 bg-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-cyan-700 transition-all">繼續修圖</button>
                        <button onClick={() => handleImport(editedImageUrl, editState.outputName, 'outpaint')} className="flex items-center justify-center gap-2 bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-all">導入擴大</button>
                        <button onClick={() => handleImport(editedImageUrl, editState.outputName, 'upscale')} className="flex items-center justify-center gap-2 bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-all">導入升級</button>
                    </div>
                )}
                </div>
            </div>
            </>
        );
      }
      case 'generateImage': return (
        <>
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            <textarea value={genState.prompt} onChange={(e) => setGenState(prev => ({...prev, prompt: e.target.value}))} placeholder="例如：'一隻太空人在月球上騎馬的超現實油畫'" className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow h-28 resize-none" />
            <input type="text" value={genState.outputName} onChange={(e) => setGenState(prev => ({...prev, outputName: e.target.value}))} placeholder="輸出圖名 (不含副檔名)" className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow" />
            <button onClick={handleGenerateImage} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"> {isLoading ? <><Spinner /> 生成中...</> : <><SparklesIcon className="w-5 h-5" /> 生成圖片</>} </button>
          </div>
           {error && <p className="mt-4 text-center text-red-400 bg-red-900/30 p-3 rounded-lg">{error}</p>}
          <div className="mt-8 max-w-2xl mx-auto">
            <ImageCard title="生成圖片" imageUrl={generatedImageUrl} isLoading={isLoading} onImageClick={setPreviewImageUrl} />
            {generatedImageUrl && !isLoading && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <button onClick={handleDownload(generatedImageUrl, genState.outputName)} className="flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-all"><DownloadIcon className="w-5 h-5" />下載圖片</button>
                <button onClick={() => handleImport(generatedImageUrl, genState.outputName, 'edit')} className="flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-all">導入 AI 修圖</button>
                <button onClick={() => handleImport(generatedImageUrl, genState.outputName, 'outpaint')} className="flex items-center justify-center gap-2 bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-all">導入圖片擴大</button>
                <button onClick={() => handleImport(generatedImageUrl, genState.outputName, 'upscale')} className="flex items-center justify-center gap-2 bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-all">導入圖片升級</button>
              </div>
            )}
          </div>
        </>
      );
      case 'generateVideo': return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
             <FileUploadZone file={videoGenState.sourceFile} onFileChange={handleSingleFileChange(setVideoGenState, 'sourceFile', 'generatedVideo')} accept="image/*" id="file-upload-video" label="圖片 (可選)" />
            <div className="flex flex-col gap-4">
              <textarea value={videoGenState.prompt} onChange={(e) => setVideoGenState(prev => ({...prev, prompt: e.target.value}))} placeholder="例如：'一隻可愛的柯基犬在沙灘上奔跑的電影級慢動作鏡頭'" className="w-full p-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow h-28 resize-none" />
              <button onClick={handleGenerateVideo} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"> {isLoading ? <><Spinner /> 生成中...</> : <><SparklesIcon className="w-5 h-5" /> 生成影片</>} </button>
            </div>
          </div>
           {error && <p className="mt-4 text-center text-red-400 bg-red-900/30 p-3 rounded-lg">{error}</p>}
          <div className="mt-8 max-w-2xl mx-auto">
            <VideoCard title="生成影片" videoUrl={videoGenState.generatedVideo} isLoading={isLoading} loadingMessage={videoGenState.loadingMessage}/>
          </div>
        </>
      );
      case 'upscale': return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <FileUploadZone file={upscaleState.originalFile} onFileChange={handleSingleFileChange(setUpscaleState, 'originalFile', 'upscaledImage')} accept="image/*" id="file-upload-upscale" label="圖片" />
            <div className="flex flex-col gap-4 justify-center h-full">
              <p className="text-gray-400 text-center md:text-left">上傳一張低解析度或模糊的圖片，AI 將會提升其畫質與清晰度。</p>
              <button onClick={handleUpscale} disabled={!upscaleState.originalFile || isLoading} className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"> {isLoading ? <><Spinner /> 升級中...</> : <><SparklesIcon className="w-5 h-5" /> 提升畫質</>} </button>
            </div>
          </div>
           {error && <p className="mt-4 text-center text-red-400 bg-red-900/30 p-3 rounded-lg">{error}</p>}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <ImageCard title="原始圖片" imageUrl={upscaleOriginalUrl} onImageClick={setPreviewImageUrl} />
            <ImageCard title="升級後圖片" imageUrl={upscaledImageUrl} isLoading={isLoading} onImageClick={setPreviewImageUrl} />
          </div>
        </>
      );
      default: return null;
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 font-sans p-4 sm:p-6 lg:p-8">
      {previewImageUrl && <ImagePreviewModal imageUrl={previewImageUrl} onClose={() => setPreviewImageUrl(null)} />}
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            AI 創意工作室
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            一個多功能 AI 工具，可用於修圖、生圖、創作影片與更多。
          </p>
        </header>

        <section className="mb-8 p-6 bg-gray-800/30 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-md">
          <div className="flex justify-center border-b border-gray-700 mb-6 overflow-x-auto -mx-6 px-6">
            <div className="flex">
              <TabButton text="AI 修圖" active={activeTab === 'edit'} onClick={() => handleTabChange('edit')} />
              <TabButton text="AI 生圖" active={activeTab === 'generateImage'} onClick={() => handleTabChange('generateImage')} />
              <TabButton text="AI 生影片" active={activeTab === 'generateVideo'} onClick={() => handleTabChange('generateVideo')} />
              <TabButton text="圖片升級" active={activeTab === 'upscale'} onClick={() => handleTabChange('upscale')} />
            </div>
          </div>
          {renderContent()}
        </section>

      </div>
    </div>
  );
}
