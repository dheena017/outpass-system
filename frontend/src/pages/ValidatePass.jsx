import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { outpassAPI } from '../api/endpoints';
import { FiCheckCircle, FiXCircle, FiClock, FiMapPin, FiUser, FiInfo } from 'react-icons/fi';
import Loading from '../components/Loading';
import Logo from '../components/Logo';
import { nativeImpact } from '../utils/native';

export default function ValidatePass() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const handleBack = async () => {
        await nativeImpact();
    };

    useEffect(() => {
        const fetchValidation = async () => {
            try {
                const res = await outpassAPI.validatePass(id);
                setData(res.data);
            } catch (err) {
                setError(err.response?.data?.detail || 'Invalid or missing outpass ID.');
            } finally {
                setLoading(false);
            }
        };
        fetchValidation();
    }, [id]);

    if (loading) return <Loading message="Verifying Outpass..." />;

    if (error) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
                <div className="glass premium-card w-full max-w-md p-8 text-center border-t-8 border-rose-500 shadow-rose-500/20">
                    <FiXCircle className="mx-auto text-rose-500 mb-4" size={64} />
                    <h1 className="text-3xl font-black text-white mb-2 uppercase">INVALID</h1>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <Link to="/" onClick={handleBack} className="w-full btn-primary bg-rose-600 hover:bg-rose-700">
                        Return to System
                    </Link>
                </div>
            </div>
        );
    }

    const { valid, status, student_name, student_id, destination, departure_time, expected_return_time } = data;

    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Security Blobs */}
            <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000 ${valid ? 'bg-emerald-600/20' : 'bg-rose-600/20'}`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] transition-colors duration-1000 ${valid ? 'bg-blue-600/10' : 'bg-rose-900/10'}`}></div>

            <div className={`glass premium-card w-full max-w-lg p-0 relative z-10 animate-slide-up border-t-8 ${valid ? 'border-emerald-500 shadow-emerald-500/20' : 'border-rose-500 shadow-rose-500/20'}`}>
                {/* Header Section */}
                <div className="p-8 text-center border-b border-white/5 bg-white/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                        <FiCheckCircle size={100} />
                   </div>
                   
                    {valid ? (
                        <>
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-emerald-500/20 text-emerald-500 mb-6 shadow-xl shadow-emerald-500/10 transform hover:scale-110 transition-transform">
                                <FiCheckCircle size={56} />
                            </div>
                            <h1 className="text-4xl font-black text-white mb-2 tracking-tight uppercase italic">Validated Pass</h1>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-black tracking-widest uppercase">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Secure Access Granted
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-rose-500/20 text-rose-500 mb-6 shadow-xl shadow-rose-500/10">
                                <FiXCircle size={56} />
                            </div>
                            <h1 className="text-4xl font-black text-white mb-2 tracking-tight uppercase">Invalid Pass</h1>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-500/20 border border-rose-500/30 rounded-full text-rose-400 text-xs font-black tracking-widest uppercase">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Clearance Denied
                            </div>
                        </>
                    )}
                </div>

                {/* Content Section */}
                <div className="p-8 space-y-8">
                    {/* Student Info */}
                    <div className="group/field">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400/60 uppercase tracking-[0.3em] mb-3">
                            <FiUser className="text-blue-500" /> Student Identity
                        </div>
                        <div className="bg-white/5 border border-white/5 p-5 rounded-2xl group-hover/field:border-blue-500/20 transition-all">
                            <p className="text-2xl font-black text-white leading-tight">{student_name}</p>
                            <p className="text-blue-400 font-bold tracking-widest text-sm mt-1">ID: {student_id}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Destination */}
                        <div className="group/field">
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400/60 uppercase tracking-[0.3em] mb-3">
                                <FiMapPin className="text-indigo-500" /> Destination
                            </div>
                            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl group-hover/field:border-indigo-500/20 transition-all">
                                <p className="text-lg font-bold text-gray-200">{destination}</p>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="group/field">
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400/60 uppercase tracking-[0.3em] mb-3">
                                <FiInfo className="text-amber-500" /> System Status
                            </div>
                            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl group-hover/field:border-amber-500/20 transition-all flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full animate-pulse ${valid ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                <p className="text-lg font-bold text-gray-200 uppercase tracking-wider">{status}</p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Info */}
                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                        <div className="grid grid-cols-2 gap-8 relative">
                            {/* Connector line */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-white/10 hidden md:block" />
                            
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                    <FiClock className="text-blue-500" /> Expected Out
                                </div>
                                <p className="text-white font-bold">{new Date(departure_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div className="space-y-1 text-right md:text-left md:pl-8">
                                <div className="flex items-center md:justify-start justify-end gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                    <FiInfo className="text-blue-500" /> Expected In
                                </div>
                                <p className="text-white font-bold">{new Date(expected_return_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-8 pt-0 mt-4">
                    <Link to="/" onClick={handleBack} className="w-full btn-secondary text-gray-400 hover:text-white py-4 flex items-center justify-center gap-2 group">
                        <span className="group-hover:-translate-x-1 transition-transform">←</span>
                        Return to Control Deck
                    </Link>
                </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
                <Logo size="sm" />
                <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500/50 w-1/2 animate-[loading_2s_infinite]"></div>
                </div>
            </div>
        </div>
    );
}
