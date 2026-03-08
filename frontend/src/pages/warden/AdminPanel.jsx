import { useState, useEffect } from 'react';
import { adminAPI, authAPI } from '../../api/endpoints';
import Loading from '../../components/Loading';
import toastService from '../../utils/toastService';
import { FiUsers, FiTrash2, FiUserCheck, FiPlus, FiX } from 'react-icons/fi';

export default function AdminPanel() {
    const [wardens, setWardens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        warden_id: '',
        department: '',
        assigned_dorms_input: ''
    });

    useEffect(() => {
        fetchWardens();
    }, []);

    const fetchWardens = async () => {
        try {
            const response = await adminAPI.getWardens();
            setWardens(response.data);
            setError('');
        } catch (err) {
            if (err.response?.status === 403) {
                setError('You do not have permission to view this page. Super-Admin access required.');
            } else {
                setError(err.response?.data?.detail || 'Failed to load wardens');
                toastService.error('Failed to load wardens');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDisableWarden = async (id) => {
        if (!window.confirm('Are you sure you want to disable this warden account?')) return;

        try {
            await adminAPI.disableWarden(id);
            toastService.success('Warden account disabled successfully');
            fetchWardens();
        } catch (err) {
            toastService.error(err.response?.data?.detail || 'Failed to disable warden');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const dataToSubmit = {
                ...formData,
                assigned_dorms: formData.assigned_dorms_input.split(',').map(d => d.trim()).filter(Boolean)
            };

            await authAPI.registerWarden(dataToSubmit);
            toastService.success('Warden account created successfully!');
            setShowModal(false);
            setFormData({
                email: '', username: '', password: '', first_name: '', last_name: '',
                phone_number: '', warden_id: '', department: '', assigned_dorms_input: ''
            });
            fetchWardens();
        } catch (err) {
            toastService.error(err.response?.data?.detail || 'Registration failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Loading message="Loading warden data..." />;

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg shadow max-w-2xl mx-auto text-center">
                    <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FiUsers className="text-purple-600" />
                        Super-Admin Panel
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage Warden Accounts</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition shadow"
                >
                    <FiPlus /> Add Warden
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Registered Wardens</h2>
                </div>

                {wardens.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No wardens found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50">
                                    <th className="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Warden ID</th>
                                    <th className="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Department</th>
                                    <th className="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Dorms Assigned</th>
                                    <th className="px-6 py-3 font-semibold text-gray-700 dark:text-gray-300 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {wardens.map((warden) => (
                                    <tr key={warden.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-800 dark:text-gray-200">{warden.user?.first_name} {warden.user?.last_name}</div>
                                            <div className="text-sm text-gray-500">{warden.warden_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {warden.department}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                            {warden.assigned_dorms}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {warden.user?.is_active ? (
                                                <button
                                                    onClick={() => handleDisableWarden(warden.id)}
                                                    className="flex items-center gap-1 ml-auto text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition"
                                                >
                                                    <FiTrash2 size={14} /> Disable
                                                </button>
                                            ) : (
                                                <span className="flex items-center justify-end gap-1 text-sm text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                                                    <FiUserCheck size={14} /> Disabled
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Registration Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Register New Warden</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <FiX size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleRegister} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                                    <input required type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                                    <input required type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                    <input required type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                    <input required type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                                    <input required type="text" value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warden ID</label>
                                    <input required type="text" value={formData.warden_id} onChange={e => setFormData({ ...formData, warden_id: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                                    <input required type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Dorms (Comma separated)</label>
                                <input required type="text" placeholder="e.g. Block A, Block B" value={formData.assigned_dorms_input} onChange={e => setFormData({ ...formData, assigned_dorms_input: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold disabled:bg-blue-300 transition">
                                    {submitting ? 'Creating...' : 'Create Warden'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
