import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { QRCodeCanvas } from 'qrcode.react';
import { FiMaximize2, FiDownload, FiX, FiCheck, FiShare2, FiCheckCircle } from 'react-icons/fi';

export default function QRCodeDisplay({ value, size = 72, label = "SCAN", requestId, status }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [prevStatus, setPrevStatus] = useState(status);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Persist to local storage for offline access
    useEffect(() => {
        if (value && requestId) {
            localStorage.setItem(`qr_cache_${requestId}`, JSON.stringify({
                value,
                status,
                timestamp: new Date().toISOString()
            }));
        }
    }, [value, requestId, status]);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-close modal when status changes (indicates successful scan/validation)
    useEffect(() => {
        if (isModalOpen && status !== prevStatus) {
            setIsValidating(true);
            // Hide the "Success" state and the modal after a brief delay
            const timer = setTimeout(() => {
                setIsValidating(false);
                setIsModalOpen(false);
                setPrevStatus(status);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [status, isModalOpen, prevStatus]);

    // Keep prevStatus in sync when modal is closed
    useEffect(() => {
        if (!isModalOpen) {
            setPrevStatus(status);
        }
    }, [status, isModalOpen]);

    const downloadQRCode = () => {
        const canvas = document.getElementById(`qr-canvas-${requestId}`) as HTMLCanvasElement | null;
        if (!canvas) return;
        const pngUrl = canvas
            .toDataURL("image/png")
            .replace("image/png", "image/octet-stream");
        let downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `Outpass_QR_${requestId}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    };

    return (
        <>
            <div className="relative group">
                <div
                    className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-xl shadow-indigo-500/5 border border-gray-100 dark:border-white/5 transition-all group-hover:shadow-indigo-500/20 group-hover:border-indigo-500/30 flex flex-col items-center cursor-pointer relative overflow-hidden"
                    onClick={() => setIsModalOpen(true)}
                >
                    {/* Futuristic corner borders */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/30 rounded-tl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/30 rounded-br-lg"></div>

                    <div className="relative p-2 bg-white rounded-xl shadow-inner">
                        <QRCodeCanvas
                            id={`qr-canvas-preview-${requestId}`}
                            value={value}
                            size={size}
                            level="H"
                            includeMargin={false}
                            className="rounded-lg"
                            fgColor="#312e81" // Indigo 900
                        />
                        {/* Scanning Line Animation */}
                        <div className="absolute inset-0 w-full h-0.5 bg-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-[scan_2s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="absolute inset-0 flex items-center justify-center bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-all rounded-lg">
                            <FiMaximize2 className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" size={24} />
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 p-1.5 bg-emerald-500 text-white rounded-bl-xl transform translate-x-full translate-y-[-100%] transition-all group-hover:translate-x-0 group-hover:translate-y-0 shadow-lg">
                        <FiCheck size={12} strokeWidth={4} />
                    </div>

                    {isOffline && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 rounded-full text-[8px] font-black text-white uppercase tracking-wider animate-pulse z-10">
                            Offline Cache
                        </div>
                    )}

                    <p className="text-[9px] text-center text-indigo-600 dark:text-indigo-400 font-black mt-3 pt-2 border-t border-gray-100 dark:border-white/5 w-full tracking-[0.3em] uppercase opacity-70 group-hover:opacity-100 transition-opacity">
                        {label}
                    </p>
                </div>
            </div>

            {/* Modal for larger view */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in"
                        onClick={() => !isValidating && setIsModalOpen(false)}
                    />

                    {/* Modal Dialog */}
                    <div
                        className="relative w-full max-w-sm my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-zoom-in max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Success Overlay Layer */}
                        {isValidating && (
                            <div className="absolute inset-0 z-[110] bg-indigo-600/95 backdrop-blur-md flex flex-col items-center justify-center text-white animate-fade-in text-center p-6 rounded-3xl">
                                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-zoom-in">
                                    <FiCheckCircle size={52} className="text-white animate-bounce" />
                                </div>
                                <h2 className="text-2xl font-black mb-1 uppercase tracking-tight">Validated!</h2>
                                <p className="text-indigo-100 text-sm font-medium">Your outpass status has been updated successfully.</p>
                            </div>
                        )}

                        {/* Modal Header */}
                        <div className="p-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                                    Official Outpass QR
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                disabled={isValidating}
                                aria-label="Close dialog"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col items-center flex-1">
                            <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-slate-200/80 mb-4 shrink-0">
                                <QRCodeCanvas
                                    id={`qr-canvas-${requestId}`}
                                    value={value}
                                    size={190}
                                    level="H"
                                    includeMargin={false}
                                    fgColor="#0f172a"
                                    bgColor="#ffffff"
                                    className="rounded-lg"
                                />
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 text-center px-2 font-medium leading-relaxed">
                                Present this QR code to the gate security personnel for digital validation.
                            </p>

                            <div className="mt-3 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest border border-slate-200/60 dark:border-slate-700/60">
                                Outpass #{requestId}
                            </div>
                        </div>

                        {/* Fixed Action Footer */}
                        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 flex gap-2.5">
                            <button
                                onClick={downloadQRCode}
                                className="btn-primary flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <FiDownload size={16} />
                                <span>Save QR</span>
                            </button>

                            {navigator.share && (
                                <button
                                    onClick={() => {
                                        navigator.share({
                                            title: 'Outpass QR Code',
                                            text: `Outpass QR Code for ID #${requestId}`,
                                            url: value,
                                        }).catch(console.warn);
                                    }}
                                    className="btn-secondary px-4 py-3 text-sm font-bold"
                                    title="Share pass"
                                >
                                    <FiShare2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

QRCodeDisplay.propTypes = {
    value: PropTypes.string.isRequired,
    size: PropTypes.number,
    label: PropTypes.string,
    requestId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    status: PropTypes.string.isRequired
};
