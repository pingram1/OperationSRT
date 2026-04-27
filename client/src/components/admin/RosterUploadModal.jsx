import React, { useEffect, useMemo, useState } from 'react';
import {
    Upload,
    ClipboardPaste,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle,
    XCircle,
    Loader2,
    Mail,
    UserPlus,
    SkipForward,
} from 'lucide-react';
import Button from '../common/Button.jsx';
import Dialog from '../common/Dialog.jsx';
import { rosterUpload } from '../../api/schools.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse a single CSV line, supporting double-quoted fields with embedded
 * commas/quotes. Returns an array of trimmed cell strings.
 */
const parseCsvLine = (line) => {
    const cells = [];
    let buffer = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];

        if (inQuotes) {
            if (ch === '"') {
                if (line[i + 1] === '"') {
                    buffer += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                buffer += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',' || ch === ';' || ch === '\t') {
            cells.push(buffer.trim());
            buffer = '';
        } else {
            buffer += ch;
        }
    }

    cells.push(buffer.trim());
    return cells;
};

/**
 * Convert raw CSV text into structured rows:
 *   { students: [{ name, email }, ...], invalid: [{ line, reason }, ...] }
 *
 * Behavior:
 * - Skips blank lines.
 * - Detects and skips a header row whose first/second cells contain
 *   "name"/"email" (case-insensitive).
 * - Heuristically chooses which column is the email when only two cells
 *   are present (the cell that matches an email regex wins).
 */
export const parseRoster = (rawText) => {
    const students = [];
    const invalid = [];

    if (!rawText || typeof rawText !== 'string') {
        return { students, invalid };
    }

    const lines = rawText
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    let headerSkipped = false;

    lines.forEach((line, idx) => {
        const cells = parseCsvLine(line).filter((cell) => cell.length > 0);

        if (cells.length === 0) {
            return;
        }

        if (!headerSkipped && idx === 0) {
            const lower = cells.map((c) => c.toLowerCase());
            const looksLikeHeader =
                lower.some((c) => c === 'name' || c === 'full name' || c === 'student name')
                && lower.some((c) => c === 'email' || c === 'email address');
            if (looksLikeHeader) {
                headerSkipped = true;
                return;
            }
        }

        if (cells.length < 2) {
            invalid.push({ line: idx + 1, reason: 'Expected "Name, Email" — found a single value.' });
            return;
        }

        let name = cells[0];
        let email = cells[1];

        if (cells.length >= 2) {
            const firstIsEmail = EMAIL_REGEX.test(cells[0]);
            const secondIsEmail = EMAIL_REGEX.test(cells[1]);
            if (firstIsEmail && !secondIsEmail) {
                name = cells[1];
                email = cells[0];
            }
        }

        if (!name) {
            invalid.push({ line: idx + 1, reason: 'Missing student name.' });
            return;
        }
        if (!EMAIL_REGEX.test(email)) {
            invalid.push({ line: idx + 1, reason: `Invalid email "${email}".` });
            return;
        }

        students.push({ name, email: email.toLowerCase() });
    });

    return { students, invalid };
};

const Pill = ({ tone, icon: Icon, label, value }) => {
    const tones = {
        blue: 'bg-blue-50 text-blue-700 border-blue-100',
        green: 'bg-green-50 text-green-700 border-green-100',
        amber: 'bg-amber-50 text-amber-700 border-amber-100',
        red: 'bg-red-50 text-red-700 border-red-100',
    };
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${tones[tone] || tones.blue}`}>
            {Icon && <Icon className="w-4 h-4" />}
            <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            <span className="ml-auto text-base font-bold">{value}</span>
        </div>
    );
};

export default function RosterUploadModal({ isOpen, onClose, school, onUploaded }) {
    const [mode, setMode] = useState('paste'); // 'paste' | 'file'
    const [csvText, setCsvText] = useState('');
    const [fileName, setFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setMode('paste');
            setCsvText('');
            setFileName('');
            setIsUploading(false);
            setError('');
            setResult(null);
        }
    }, [isOpen]);

    const { students, invalid } = useMemo(() => parseRoster(csvText), [csvText]);

    if (!school) return null;

    const schoolId = school._id || school.id;

    const handleFile = (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        setFileName(file.name);
        setError('');
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = String(e.target?.result || '');
            setCsvText(text);
        };
        reader.onerror = () => {
            setError('Could not read the selected file. Please try again.');
        };
        reader.readAsText(file);
    };

    const handleSubmit = async () => {
        setError('');
        setResult(null);

        if (students.length === 0) {
            setError('Add at least one valid "Name, Email" row before submitting.');
            return;
        }

        try {
            setIsUploading(true);
            const response = await rosterUpload(schoolId, students);
            setResult(response);
            if (typeof onUploaded === 'function') {
                onUploaded(response);
            }
        } catch (err) {
            setError(err && err.message ? err.message : 'Roster upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    const description = (
        <>
            Add students to <span className="font-medium text-gray-700">{school.name}</span>{' '}
            in bulk. We&apos;ll create shell accounts and email each student a welcome link.
        </>
    );

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Upload Roster"
            description={description}
            size="xl"
            backdropClose={!isUploading}
            escapeClose={!isUploading}
        >
            <div className="space-y-5">
                {!result && (
                        <>
                            <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl" role="tablist" aria-label="Roster input mode">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === 'paste'}
                                    onClick={() => setMode('paste')}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                        mode === 'paste' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                >
                                    <ClipboardPaste className="w-4 h-4" />
                                    Paste CSV
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === 'file'}
                                    onClick={() => setMode('file')}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                        mode === 'file' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                                    }`}
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload .csv File
                                </button>
                            </div>

                            <div className="bg-blue-50 text-blue-800 border border-blue-100 rounded-lg p-3 text-xs">
                                <p className="font-semibold mb-1">Expected format</p>
                                <p>Two columns per row: <span className="font-mono">Name, Email</span>. A header row is optional.</p>
                                <pre className="mt-2 bg-white text-gray-700 rounded-md p-2 font-mono text-[11px] leading-snug border border-blue-100">
{`Name, Email
Jane Doe, jane@example.com
John Smith, john@example.com`}
                                </pre>
                            </div>

                            {mode === 'paste' ? (
                                <div>
                                    <label htmlFor="roster-textarea" className="block text-sm font-medium text-gray-700 mb-1">
                                        Paste roster (CSV)
                                    </label>
                                    <textarea
                                        id="roster-textarea"
                                        value={csvText}
                                        onChange={(e) => setCsvText(e.target.value)}
                                        rows={10}
                                        spellCheck={false}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={'Jane Doe, jane@example.com\nJohn Smith, john@example.com'}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="roster-file" className="block text-sm font-medium text-gray-700 mb-1">
                                        Choose a .csv file
                                    </label>
                                    <input
                                        id="roster-file"
                                        type="file"
                                        accept=".csv,text/csv"
                                        onChange={handleFile}
                                        className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-dashed border-gray-300 rounded-lg p-4"
                                    />
                                    {fileName && (
                                        <p className="text-xs text-gray-500 mt-2">Loaded: <span className="font-medium text-gray-700">{fileName}</span></p>
                                    )}
                                    {csvText && (
                                        <details className="mt-3">
                                            <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-700">
                                                Preview parsed text
                                            </summary>
                                            <pre className="mt-2 bg-gray-50 border border-gray-200 rounded-md p-3 text-[11px] font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                                                {csvText}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <Pill tone="green" icon={UserPlus} label="Valid rows" value={students.length} />
                                <Pill tone="amber" icon={AlertCircle} label="Skipped lines" value={invalid.length} />
                            </div>

                            {invalid.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-amber-800 mb-2">
                                        {invalid.length} line{invalid.length === 1 ? '' : 's'} could not be parsed:
                                    </p>
                                    <ul className="text-xs text-amber-800 space-y-1 max-h-32 overflow-auto">
                                        {invalid.map((row) => (
                                            <li key={`invalid-${row.line}`} className="flex items-start gap-2">
                                                <span className="font-mono text-amber-700">L{row.line}</span>
                                                <span>{row.reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        {error && (
                            <div className="flex items-center p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </>
                )}

                {result && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                                <CheckCircle className="w-5 h-5" />
                                Roster processed for <span className="font-semibold">{school.name}</span>.
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <Pill tone="blue" icon={FileSpreadsheet} label="Received" value={result.counts?.received ?? 0} />
                                <Pill tone="green" icon={UserPlus} label="Created" value={result.counts?.created ?? 0} />
                                <Pill tone="amber" icon={SkipForward} label="Skipped" value={result.counts?.skipped ?? 0} />
                                <Pill tone="red" icon={XCircle} label="Errors" value={result.counts?.errors ?? 0} />
                            </div>

                            {Array.isArray(result.created) && result.created.length > 0 && (
                                <ResultTable
                                    title="Created accounts"
                                    icon={UserPlus}
                                    tone="green"
                                    rows={result.created.map((row) => ({
                                        primary: row.email,
                                        secondary: row.welcomeEmailSent ? 'Welcome email sent' : 'Welcome email pending',
                                        secondaryIcon: row.welcomeEmailSent ? Mail : AlertCircle,
                                    }))}
                                />
                            )}

                            {Array.isArray(result.skipped) && result.skipped.length > 0 && (
                                <ResultTable
                                    title="Skipped"
                                    icon={SkipForward}
                                    tone="amber"
                                    rows={result.skipped.map((row) => ({
                                        primary: row.email || `Row ${row.index + 1}`,
                                        secondary: row.reason || 'Skipped',
                                    }))}
                                />
                            )}

                        {Array.isArray(result.errors) && result.errors.length > 0 && (
                            <ResultTable
                                title="Errors"
                                icon={XCircle}
                                tone="red"
                                rows={result.errors.map((row) => ({
                                    primary: row.email || `Row ${row.index + 1}`,
                                    secondary: row.message || 'Error',
                                }))}
                            />
                        )}
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 -mx-6 px-6 -mb-6 pb-6 bg-gray-50 sticky bottom-0 mt-2 rounded-b-xl">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isUploading}
                    >
                        {result ? 'Close' : 'Cancel'}
                    </Button>
                    {!result && (
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            isLoading={isUploading}
                            disabled={students.length === 0}
                        >
                            {isUploading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Uploading…
                                </span>
                            ) : (
                                `Submit Roster (${students.length})`
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </Dialog>
    );
}

const ResultTable = ({ title, icon: Icon, tone, rows }) => {
    const tones = {
        green: 'border-green-200',
        amber: 'border-amber-200',
        red: 'border-red-200',
        blue: 'border-blue-200',
    };
    return (
        <div className={`border rounded-lg ${tones[tone] || tones.blue}`}>
            <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-2 text-sm font-semibold text-gray-700">
                {Icon && <Icon className="w-4 h-4" />}
                {title}
                <span className="ml-auto text-xs text-gray-500">{rows.length}</span>
            </div>
            <ul className="divide-y max-h-48 overflow-auto">
                {rows.map((row, idx) => {
                    const Secondary = row.secondaryIcon;
                    return (
                        <li key={`${title}-${idx}`} className="px-4 py-2 text-sm flex items-center gap-3">
                            <span className="font-medium text-gray-800 truncate">{row.primary}</span>
                            <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">
                                {Secondary && <Secondary className="w-3.5 h-3.5" />}
                                {row.secondary}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
