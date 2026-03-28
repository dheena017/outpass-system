import { useState, useEffect } from 'react';
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
        const canvas = document.getElementById(`qr-canvas-${requestId}`);
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
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in shadow-2xl">
                    <div
                        className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] border border-white/20 dark:border-gray-700/50 w-full max-w-sm animate-zoom-in max-h-[90vh] flex flex-col relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Success Overlay Layer */}
                        {isValidating && (
                            <div className="absolute inset-0 z-[110] bg-indigo-600/95 backdrop-blur-md flex flex-col items-center justify-center text-white animate-fade-in text-center p-8 rounded-[2.5rem]">
                                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-zoom-in">
                                    <FiCheckCircle size={64} className="text-white animate-bounce" />
                                </div>
                                <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">Validated!</h2>
                                <p className="text-indigo-100 font-medium">Your outpass status has been updated successfully.</p>
                                <div className="mt-8 flex gap-1">
                                    <div className="h-1.5 w-8 bg-white/30 rounded-full overflow-hidden">
                                        <div className="h-full bg-white animate-[loading_2s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-6 flex justify-between items-center border-b border-gray-100 dark:border-gray-700/50 shrink-0 rounded-t-[2.5rem]">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                Scan Outpass QR
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full transition-colors group"
                                disabled={isValidating}
                            >
                                <FiX size={20} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                            </button>
                        </div>

                        <div className="pt-8 px-8 pb-4 flex-1 overflow-y-auto flex flex-col items-center custom-scrollbar">
                            <div className="bg-white p-3 rounded-[1.5rem] shadow-[0_10px_40px_-10px_rgba(79,70,229,0.15)] border border-indigo-50 mb-6 shrink-0 transition-transform hover:scale-[1.02] duration-300">
                                <QRCodeCanvas
                                    id={`qr-canvas-${requestId}`}
                                    value={value}
                                    size={240}
                                    level="H"
                                    includeMargin={false}
                                    fgColor="#1e1b4b" // Indigo 950
                                    bgColor="#ffffff"
                                    className="rounded-lg"
                                />
                            </div>

                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4 px-2 font-medium leading-relaxed">
                                Present this QR code to the security personnel for digital validation.
                            </p>
                        </div>

                        {/* Fixed Action Footer */}
                        <div className="p-6 pb-10 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/50 shrink-0 rounded-b-[2.5rem]">
                            <div className="flex flex-col sm:flex-row gap-3 w-full mb-6">
                                <button
                                    onClick={downloadQRCode}
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 active:scale-95 group"
                                >
                                    <FiDownload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                                    Download
                                </button>

                                {navigator.share && (
                                    <button
                                        onClick={() => {
                                            navigator.share({
                                                title: 'Outpass QR Code',
                                                text: `Here is my Outpass QR code for validation. ID: #${requestId}`,
                                                url: value,
                                            }).catch(console.warn);
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gray-50 dark:bg-gray-700/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-gray-600 font-bold py-4 rounded-2xl transition-all hover:bg-white dark:hover:bg-gray-700 active:scale-95"
                                    >
                                        <FiShare2 size={18} />
                                        Share
                                    </button>
                                )}
                            </div>

                            <div className="text-center">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-[0.4em]">
                                    Outpass ID: #{requestId}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Background click to close */}
                    <div className="absolute inset-0 -z-10" onClick={() => !isValidating && setIsModalOpen(false)}></div>
                </div>
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
