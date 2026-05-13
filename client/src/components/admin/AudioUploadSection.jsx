import { useState, useRef } from 'react';
import { Music, Upload, Trash2, Play, Pause, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AudioUploadSection({ moduleId, existingAudioUrl, existingPublicId, onUploadSuccess, onDeleteSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl);
  const [publicId, setPublicId] = useState(existingPublicId);
  const [playing, setPlaying] = useState(false);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm', 'audio/x-m4a'];
    if (!allowed.includes(file.type)) {
      toast.error('Only MP3, WAV, M4A, OGG files allowed');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Maximum file size is 100MB');
      return;
    }
    uploadFile(file);
  };

  const uploadFile = (file) => {
    const formData = new FormData();
    formData.append('audio', file);
    setUploading(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/modules/${moduleId}/upload-audio`);
    const token = localStorage.getItem('accessToken');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        setAudioUrl(data.audioUrl);
        setPublicId(data.publicId);
        onUploadSuccess?.({ url: data.audioUrl, publicId: data.publicId });
        toast.success('Audio uploaded successfully');
      } else {
        let msg = 'Upload failed';
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.error) msg = body.error;
        } catch { /* ignore */ }
        toast.error(msg);
      }
    };

    xhr.onerror = () => { setUploading(false); toast.error('Upload failed'); };
    xhr.send(formData);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/modules/${moduleId}/audio`);
      setAudioUrl(null);
      setPublicId(null);
      onDeleteSuccess?.();
      toast.success('Audio deleted');
    } catch {
      toast.error('Failed to delete audio');
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const filename = audioUrl ? audioUrl.split('/').pop().split('?')[0] : '';

  return (
    <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
          <Music className="w-4 h-4 text-brand-600" />
        </div>
        <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Listening Audio File</span>
      </div>

      <div className="p-5">
        {!audioUrl && !uploading && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            className={clsx(
              'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
              dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10' : 'border-surface-300 dark:border-surface-600 hover:border-brand-400 hover:bg-surface-100 dark:hover:bg-surface-700'
            )}
          >
            <Upload className="w-10 h-10 text-surface-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-surface-600 dark:text-surface-300">Drag & drop your audio here</p>
            <p className="text-xs text-surface-400 mt-1">or click to browse files</p>
            <p className="text-xs text-surface-400 mt-4">Supports: MP3, WAV, M4A, OGG, WebM · Max: 100MB</p>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,.ogg,.webm" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />

        {uploading && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-brand-500 animate-pulse-soft" />
              <div className="flex-1 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-sm text-surface-500">{progress}%</span>
            </div>
            <p className="text-sm text-surface-500 text-center">Uploading...</p>
          </div>
        )}

        {audioUrl && !uploading && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-200 truncate">{filename || 'audio_file.mp3'}</p>
                <p className="text-xs text-surface-400">Uploaded successfully</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
              <button onClick={togglePlay} className="btn-secondary text-xs px-4 py-2">
                {playing ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Preview</>}
              </button>
              <button onClick={handleDelete} className="btn-danger text-xs px-4 py-2 ml-auto">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>

            <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-xs w-full justify-center">
              Replace Audio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}