import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { outpassAPI } from '../api/endpoints';
import { FiCheckCircle, FiXCircle, FiClock, FiMapPin, FiUser, FiInfo } from 'react-icons/fi';
import Loading from '../components/Loading';

export default function ValidatePass() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center border-t-8 border-red-500">
                    <FiXCircle className="mx-auto text-red-500 mb-4" size={64} />
                    <h1 className="text-3xl font-black text-gray-800 mb-2">INVALID</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Link to="/" className="text-blue-600 hover:text-blue-800 font-semibold underline">
                        Return to System
                    </Link>
                </div>
            </div>
        );
    }

    const { valid, status, student_name, student_id, destination, departure_time, expected_return_time } = data;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border-t-8 ${valid ? 'border-green-500' : 'border-red-500'}`}>
                <div className="p-8 text-center bg-gray-50 border-b border-gray-100">
                    {valid ? (
                        <>
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                                <FiCheckCircle className="text-green-500" size={48} />
                            </div>
                            <h1 className="text-3xl font-black text-green-600 mb-1 tracking-tight">VALID PASS</h1>
                            <p className="text-gray-500 font-medium uppercase text-sm">Status: {status}</p>
                        </>
                    ) : (
                        <>
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
                                <FiXCircle className="text-red-500" size={48} />
                            </div>
                            <h1 className="text-3xl font-black text-red-600 mb-1 tracking-tight">INVALID PASS</h1>
                            <p className="text-gray-500 font-medium uppercase text-sm">Status: {status}</p>
                        </>
                    )}
                </div>

                <div className="p-8 space-y-6">
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold mb-1">
                            <FiUser /> STUDENT DETAILS
                        </div>
                        <p className="text-xl font-bold text-gray-800 leading-tight">{student_name}</p>
                        <p className="text-gray-600">ID: {student_id}</p>
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    <div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold mb-1">
                            <FiMapPin /> DESTINATION
                        </div>
                        <p className="text-lg font-bold text-gray-800">{destination}</p>
                    </div>

                    <div className="h-px bg-gray-100 w-full" />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold mb-1">
                                <FiClock /> EXPECTED OUT
                            </div>
                            <p className="text-gray-800 font-medium">{new Date(departure_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 text-sm font-semibold mb-1">
                                <FiInfo /> EXPECTED IN
                            </div>
                            <p className="text-gray-800 font-medium">{new Date(expected_return_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                </div>
            </div>

            <p className="mt-8 text-sm text-gray-400 font-medium">Outpass Official Tracker Security System</p>
        </div>
    );
}
