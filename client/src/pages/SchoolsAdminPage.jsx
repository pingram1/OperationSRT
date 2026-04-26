import React, { useEffect, useMemo, useState } from 'react';
import {
    School as SchoolIcon,
    Plus,
    Search,
    Loader2,
    AlertCircle,
    CheckCircle,
    KeyRound,
    Users,
    X,
} from 'lucide-react';
import Button from '../components/common/Button.jsx';
import SchoolDetail from '../components/admin/SchoolDetail.jsx';
import { createSchool, getAllSchools } from '../api/schools.js';

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'active_pilot', label: 'Active Pilot' },
    { value: 'completed', label: 'Completed' },
    { value: 'inactive', label: 'Inactive' },
];

const STATUS_TONE = {
    pending: 'bg-amber-100 text-amber-800',
    active_pilot: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    inactive: 'bg-gray-200 text-gray-700',
};

const blankSchoolForm = {
    name: '',
    district: '',
    primaryContactName: '',
    primaryContactEmail: '',
    status: 'pending',
    pilotStartDate: '',
    pilotEndDate: '',
};

export default function SchoolsAdminPage() {
    const [schools, setSchools] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selectedSchoolId, setSelectedSchoolId] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const fetchSchools = async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getAllSchools();
            setSchools(Array.isArray(data) ? data : data?.schools || []);
        } catch (err) {
            setError(err && err.message ? err.message : 'Could not load schools.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchools();
    }, []);

    const filteredSchools = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return schools;
        return schools.filter((school) =>
            [school.name, school.district, school.registrationCode, school.primaryContactEmail]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term))
        );
    }, [schools, search]);

    const selectedSchool = useMemo(
        () => schools.find((s) => (s._id || s.id) === selectedSchoolId) || null,
        [schools, selectedSchoolId]
    );

    const handleSchoolCreated = async (newSchool) => {
        setIsCreateOpen(false);
        await fetchSchools();
        if (newSchool && (newSchool._id || newSchool.id)) {
            setSelectedSchoolId(newSchool._id || newSchool.id);
        }
    };

    return (
        <div>
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <SchoolIcon className="w-7 h-7 text-blue-600" />
                    School Pilots
                </h1>
                <p className="text-gray-600">
                    Manage school cohorts, registration codes, and roster uploads.
                </p>
            </header>

            {selectedSchool ? (
                <SchoolDetail
                    school={selectedSchool}
                    onBack={() => setSelectedSchoolId(null)}
                />
            ) : (
                <div className="bg-white rounded-xl shadow-md">
                    <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 p-4 border-b">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search schools, districts, codes…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={() => setIsCreateOpen(true)}
                            Icon={Plus}
                        >
                            New School
                        </Button>
                    </div>

                    {error && (
                        <div className="m-4 flex items-center p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" />
                            Loading schools…
                        </div>
                    ) : filteredSchools.length === 0 ? (
                        <div className="text-center py-12 text-sm text-gray-500">
                            {schools.length === 0
                                ? 'No schools yet. Use "New School" to add a pilot cohort.'
                                : 'No schools match your search.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">School</th>
                                        <th className="px-6 py-3">District</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Code</th>
                                        <th className="px-6 py-3">Primary Contact</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredSchools.map((school) => {
                                        const id = school._id || school.id;
                                        const tone = STATUS_TONE[school.status] || 'bg-gray-100 text-gray-800';
                                        return (
                                            <tr key={id} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium text-gray-800">{school.name}</td>
                                                <td className="px-6 py-3 text-gray-600">{school.district || '—'}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${tone}`}>
                                                        {String(school.status || 'pending').replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className="font-mono tracking-wider text-sm text-gray-700 inline-flex items-center gap-1">
                                                        <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                                                        {school.registrationCode || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-600">
                                                    {school.primaryContactName ? (
                                                        <div className="space-y-0.5">
                                                            <div className="font-medium text-gray-800">{school.primaryContactName}</div>
                                                            {school.primaryContactEmail && (
                                                                <div className="text-xs text-gray-500">{school.primaryContactEmail}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedSchoolId(id)}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <Users className="w-4 h-4" />
                                                        Manage
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <CreateSchoolModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={handleSchoolCreated}
            />
        </div>
    );
}

const CreateSchoolModal = ({ isOpen, onClose, onCreated }) => {
    const [form, setForm] = useState(blankSchoolForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            setForm(blankSchoolForm);
            setError('');
            setSuccess('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError('School name is required.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const payload = { ...form, name: form.name.trim() };
            // Strip blank optional fields so we don't send empty strings as dates.
            ['pilotStartDate', 'pilotEndDate', 'district', 'primaryContactName', 'primaryContactEmail'].forEach((key) => {
                if (!payload[key]) delete payload[key];
            });

            const created = await createSchool(payload);
            setSuccess(`Created “${created.name}”${created.registrationCode ? ` with code ${created.registrationCode}` : ''}.`);
            if (typeof onCreated === 'function') {
                onCreated(created);
            }
        } catch (err) {
            setError(err && err.message ? err.message : 'Failed to create school.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <SchoolIcon className="w-5 h-5 text-blue-600" />
                            New School
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Add a new school cohort. A registration code will be generated automatically.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                        aria-label="Close create school"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            School Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="name"
                            type="text"
                            value={form.name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. Lincoln High School"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                            <input
                                name="district"
                                type="text"
                                value={form.district}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Name</label>
                            <input
                                name="primaryContactName"
                                type="text"
                                value={form.primaryContactName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact Email</label>
                            <input
                                name="primaryContactEmail"
                                type="email"
                                value={form.primaryContactEmail}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="contact@school.org"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pilot Start Date</label>
                            <input
                                name="pilotStartDate"
                                type="date"
                                value={form.pilotStartDate}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pilot End Date</label>
                            <input
                                name="pilotEndDate"
                                type="date"
                                value={form.pilotEndDate}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center p-3 bg-green-100 text-green-700 rounded-lg text-sm">
                            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span>{success}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2 border-t">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            Create School
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
