import React, { useEffect, useRef, useState } from 'react';
import {
    ArrowLeft,
    Users,
    Upload,
    KeyRound,
    Calendar,
    Mail,
    User as UserIcon,
    Loader2,
    AlertCircle,
    Copy,
    CheckCircle,
    BarChart3,
    GraduationCap,
    CalendarCheck,
    CalendarClock,
    BookOpen,
    Download,
    ChevronDown,
    FileText,
    FileType2,
} from 'lucide-react';
import Button from '../common/Button.jsx';
import { getSchoolMetrics, getStudentsBySchool } from '../../api/schools.js';
import RosterUploadModal from './RosterUploadModal.jsx';
import { generateSchoolCSV, generateSchoolPDF } from '../../utils/exportUtils.js';

const STATUS_TONE = {
    pending: 'bg-amber-100 text-amber-800',
    active_pilot: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    inactive: 'bg-gray-200 text-gray-700',
};

const formatDate = (value) => {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return '—';
    }
};

export default function SchoolDetail({ school, onBack }) {
    const schoolId = school?._id || school?.id;
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [metrics, setMetrics] = useState(null);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [metricsError, setMetricsError] = useState('');
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const exportMenuRef = useRef(null);

    const fetchStudents = async () => {
        if (!schoolId) return;
        setIsLoading(true);
        setError('');
        try {
            const data = await getStudentsBySchool(schoolId);
            setStudents(Array.isArray(data) ? data : data?.students || []);
        } catch (err) {
            setError(err && err.message ? err.message : 'Could not load students.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMetrics = async () => {
        if (!schoolId) return;
        setMetricsLoading(true);
        setMetricsError('');
        try {
            const data = await getSchoolMetrics(schoolId);
            setMetrics(data);
        } catch (err) {
            setMetricsError(err && err.message ? err.message : 'Could not load metrics.');
            setMetrics(null);
        } finally {
            setMetricsLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
        fetchMetrics();
        setCodeCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schoolId]);

    useEffect(() => {
        if (!exportMenuOpen) return;
        const close = (e) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
                setExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [exportMenuOpen]);

    const isExportLoading = metricsLoading || isLoading;

    if (!school) return null;

    const handleCopyCode = async () => {
        if (!school.registrationCode) return;
        try {
            await navigator.clipboard.writeText(school.registrationCode);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 1500);
        } catch {
            // Clipboard API can fail in some browser contexts; fall back silently.
        }
    };

    const handleUploaded = () => {
        fetchStudents();
        fetchMetrics();
    };

    const statusBadgeClass = STATUS_TONE[school.status] || 'bg-gray-100 text-gray-800';

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center mb-2"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back to all schools
                        </button>
                    )}
                    <h2 className="text-2xl font-bold text-gray-800">{school.name}</h2>
                    <p className="text-sm text-gray-500">
                        {school.district ? `${school.district} • ` : ''}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadgeClass}`}>
                            {String(school.status || 'pending').replace('_', ' ')}
                        </span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative" ref={exportMenuRef}>
                        <button
                            type="button"
                            disabled={isExportLoading}
                            onClick={() => !isExportLoading && setExportMenuOpen((o) => !o)}
                            className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 bg-white text-gray-800 shadow-sm transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            aria-haspopup="menu"
                            aria-expanded={exportMenuOpen}
                        >
                            {isExportLoading ? (
                                <Loader2 className="w-4 h-4 shrink-0 animate-spin text-blue-600" />
                            ) : (
                                <Download className="w-4 h-4 shrink-0" />
                            )}
                            <span>Download report</span>
                            <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
                        </button>
                        {exportMenuOpen && !isExportLoading && (
                            <ul
                                className="absolute right-0 z-30 mt-1 min-w-[12rem] py-1 rounded-lg border border-gray-200 bg-white shadow-lg"
                                role="menu"
                            >
                                <li role="none">
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            generateSchoolCSV(school, metrics, students);
                                            setExportMenuOpen(false);
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
                                    >
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        Export as CSV
                                    </button>
                                </li>
                                <li role="none">
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            generateSchoolPDF(school, metrics, students);
                                            setExportMenuOpen(false);
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
                                    >
                                        <FileType2 className="w-4 h-4 text-gray-500" />
                                        Export as PDF
                                    </button>
                                </li>
                            </ul>
                        )}
                    </div>
                    <Button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        Icon={Upload}
                    >
                        Upload Roster
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard icon={KeyRound} label="Registration Code">
                    {school.registrationCode ? (
                        <button
                            type="button"
                            onClick={handleCopyCode}
                            className="inline-flex items-center gap-2 font-mono tracking-widest text-lg font-bold text-gray-800 hover:text-blue-700"
                            title="Copy code"
                        >
                            {school.registrationCode}
                            {codeCopied ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                                <Copy className="w-4 h-4 text-gray-400" />
                            )}
                        </button>
                    ) : (
                        <span className="text-sm text-gray-500">Not assigned</span>
                    )}
                </InfoCard>
                <InfoCard icon={Calendar} label="Pilot Window">
                    <span className="text-sm font-medium text-gray-800">
                        {formatDate(school.pilotStartDate)} – {formatDate(school.pilotEndDate)}
                    </span>
                </InfoCard>
                <InfoCard icon={UserIcon} label="Primary Contact">
                    <span className="text-sm font-medium text-gray-800">
                        {school.primaryContactName || '—'}
                    </span>
                </InfoCard>
                <InfoCard icon={Mail} label="Contact Email">
                    {school.primaryContactEmail ? (
                        <a
                            href={`mailto:${school.primaryContactEmail}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 break-all"
                        >
                            {school.primaryContactEmail}
                        </a>
                    ) : (
                        <span className="text-sm text-gray-500">—</span>
                    )}
                </InfoCard>
            </div>

            <PilotSnapshotPanel
                metrics={metrics}
                isLoading={metricsLoading}
                error={metricsError}
                onRetry={fetchMetrics}
            />

            <div className="bg-white rounded-xl shadow-md">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Linked Students
                        <span className="ml-1 text-sm font-normal text-gray-500">
                            ({students.length})
                        </span>
                    </h3>
                </div>

                {error && (
                    <div className="m-4 flex items-center p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-10 text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        Loading students…
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-500">
                        No students linked yet. Use <span className="font-semibold">Upload Roster</span> to onboard students in bulk,
                        or share the registration code so they can self-register.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-sm text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {students.map((student) => (
                                    <tr key={student._id || student.id || student.email} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-gray-800">{student.name || '—'}</td>
                                        <td className="px-6 py-3 text-gray-600">{student.email || '—'}</td>
                                        <td className="px-6 py-3">
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                                {student.role || 'student'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">{formatDate(student.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <RosterUploadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                school={school}
                onUploaded={handleUploaded}
            />
        </div>
    );
}

const InfoCard = ({ icon: Icon, label, children }) => (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            {Icon && <Icon className="w-4 h-4 text-gray-400" />}
            {label}
        </div>
        <div>{children}</div>
    </div>
);

const formatGeneratedAt = (iso) => {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch {
        return null;
    }
};

const PilotSnapshotPanel = ({ metrics, isLoading, error, onRetry }) => {
    const generatedAt = formatGeneratedAt(metrics?.generatedAt);

    return (
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Pilot Snapshot
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Live metrics for this cohort{generatedAt ? ` • updated ${generatedAt}` : ''}.
                    </p>
                </div>
                {!isLoading && !error && metrics && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                        Refresh
                    </button>
                )}
            </div>

            {error ? (
                <div className="flex items-center justify-between p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="text-xs font-semibold underline hover:no-underline"
                        >
                            Retry
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <MetricCard
                            icon={GraduationCap}
                            label="Active Students"
                            value={metrics?.totalActiveStudents}
                            isLoading={isLoading}
                            tone="blue"
                        />
                        <MetricCard
                            icon={CalendarCheck}
                            label="Completed Sessions"
                            value={metrics?.totalSessionsCompleted}
                            isLoading={isLoading}
                            tone="green"
                        />
                        <MetricCard
                            icon={CalendarClock}
                            label="Upcoming Sessions"
                            value={metrics?.totalUpcomingSessions}
                            isLoading={isLoading}
                            tone="amber"
                        />
                    </div>

                    <SubjectDistribution
                        subjects={metrics?.subjectsRanked || []}
                        isLoading={isLoading}
                    />
                </>
            )}
        </section>
    );
};

const TONE_CLASSES = {
    blue: { iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
    green: { iconBg: 'bg-green-100', iconText: 'text-green-600' },
    amber: { iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
};

const MetricCard = ({ icon: Icon, label, value, isLoading, tone = 'blue' }) => {
    const toneClasses = TONE_CLASSES[tone] || TONE_CLASSES.blue;
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${toneClasses.iconBg}`}>
                {Icon && <Icon className={`w-6 h-6 ${toneClasses.iconText}`} />}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                {isLoading ? (
                    <div className="mt-1 flex items-center text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                ) : (
                    <p className="text-2xl font-bold text-gray-800 mt-0.5">
                        {Number.isFinite(value) ? value.toLocaleString() : '—'}
                    </p>
                )}
            </div>
        </div>
    );
};

const SUBJECT_BAR_PALETTE = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-purple-500',
    'bg-orange-500',
];

const SubjectDistribution = ({ subjects, isLoading }) => {
    const totalLessons = subjects.reduce((acc, row) => acc + (row.count || 0), 0);
    const topSubjects = subjects.slice(0, 8);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Subject Distribution
                </h4>
                {!isLoading && totalLessons > 0 && (
                    <span className="text-xs text-gray-500">
                        {totalLessons.toLocaleString()} session{totalLessons === 1 ? '' : 's'} tracked
                    </span>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-6 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading subject breakdown…
                </div>
            ) : topSubjects.length === 0 ? (
                <p className="text-sm text-gray-500 py-3">
                    No tutoring sessions on record yet for this cohort.
                </p>
            ) : (
                <ul className="space-y-3">
                    {topSubjects.map((row, idx) => {
                        const percent = totalLessons > 0
                            ? Math.max(2, Math.round((row.count / totalLessons) * 100))
                            : 0;
                        const barColor = SUBJECT_BAR_PALETTE[idx % SUBJECT_BAR_PALETTE.length];
                        return (
                            <li key={`${row.subject}-${idx}`}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700 truncate pr-2">
                                        {row.subject}
                                    </span>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {row.count.toLocaleString()} • {percent}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${barColor} transition-all`}
                                        style={{ width: `${percent}%` }}
                                        role="progressbar"
                                        aria-valuenow={percent}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-label={`${row.subject} share of sessions`}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {!isLoading && subjects.length > topSubjects.length && (
                <p className="text-xs text-gray-500 mt-3">
                    Showing top {topSubjects.length} of {subjects.length} subjects.
                </p>
            )}
        </div>
    );
};
