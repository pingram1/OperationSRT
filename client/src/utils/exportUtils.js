// `jspdf` and `jspdf-autotable` are loaded on demand inside generateSchoolPDF
// so the ~350 KB of PDF/canvas tooling does not ship with the admin chunk.

/**
 * Escapes a value for a CSV cell (RFC 4180). Commas, quotes, and newlines
 * in names/emails are wrapped in double quotes with internal " doubled.
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
function escapeCsvCell(value) {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function formatDate(value) {
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
}

/**
 * @param {string} name
 * @returns {string}
 */
function safeReportBaseName(name) {
    // Intentionally strip ASCII control chars (U+0000–U+001F) from filenames
    // so the OS download dialog never sees them. ESLint's no-control-regex
    // is overly cautious here.
    // eslint-disable-next-line no-control-regex
    const illegal = /[<>:"/\\|?*\u0000-\u001f]/g;
    const base = String(name || 'school')
        .trim()
        .replace(illegal, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    return base.slice(0, 80) || 'school';
}

function triggerBlobDownload(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Builds a CSV and triggers a browser download.
 * @param {object} school
 * @param {object|null|undefined} metrics
 * @param {object[]} students
 */
export function generateSchoolCSV(school, metrics, students) {
    const name = school?.name ?? '';
    const rows = [
        `School Name,${escapeCsvCell(name)}`,
        `Pilot Start,${escapeCsvCell(formatDate(school?.pilotStartDate))}`,
        `Pilot End,${escapeCsvCell(formatDate(school?.pilotEndDate))}`,
        `Active Students,${escapeCsvCell(
            Number.isFinite(metrics?.totalActiveStudents) ? metrics.totalActiveStudents : '—',
        )}`,
        `Completed Sessions,${escapeCsvCell(
            Number.isFinite(metrics?.totalSessionsCompleted) ? metrics.totalSessionsCompleted : '—',
        )}`,
        `Upcoming Sessions,${escapeCsvCell(
            Number.isFinite(metrics?.totalUpcomingSessions) ? metrics.totalUpcomingSessions : '—',
        )}`,
        '',
        'Name,Email',
    ];
    for (const s of students || []) {
        const row = [escapeCsvCell(s?.name || '—'), escapeCsvCell(s?.email || '—')].join(',');
        rows.push(row);
    }
    const csv = `\uFEFF${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const fname = `school-report-${safeReportBaseName(name)}.csv`;
    triggerBlobDownload(fname, blob);
}

/**
 * Builds a PDF and triggers a browser download.
 * Loads jspdf and jspdf-autotable lazily so they are not in the initial bundle.
 * @param {object} school
 * @param {object|null|undefined} metrics
 * @param {object[]} students
 * @returns {Promise<void>}
 */
export async function generateSchoolPDF(school, metrics, students) {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ]);
    const autoTable = autoTableModule.default || autoTableModule;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 18;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Start Right Tutoring', margin, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Pilot school partner report', margin, 20);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(school?.name || 'School', margin, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y = 46;
    doc.setTextColor(100, 116, 139);
    doc.text(
        `Pilot window: ${formatDate(school?.pilotStartDate)} – ${formatDate(school?.pilotEndDate)}`,
        margin,
        y,
    );
    y += 10;

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Summary', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const a = Number.isFinite(metrics?.totalActiveStudents) ? String(metrics.totalActiveStudents) : '—';
    const c = Number.isFinite(metrics?.totalSessionsCompleted) ? String(metrics.totalSessionsCompleted) : '—';
    const u = Number.isFinite(metrics?.totalUpcomingSessions) ? String(metrics.totalUpcomingSessions) : '—';
    doc.text(`Total Students: ${a}`, margin, y);
    y += 5;
    doc.text(`Completed Sessions: ${c}`, margin, y);
    y += 5;
    doc.text(`Upcoming Sessions: ${u}`, margin, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Linked students', margin, y);
    y += 2;

    const list = Array.isArray(students) ? students : [];
    const tableBody = list.map((s) => [s?.name || '—', s?.email || '—']);

    autoTable(doc, {
        startY: y,
        head: [['Name', 'Email']],
        body: tableBody.length > 0 ? tableBody : [['—', 'No students linked yet']],
        margin: { left: margin, right: margin },
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 9, cellPadding: 3 },
    });

    const finalY = doc.lastAutoTable?.finalY ?? y + 20;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
        `Generated ${new Date().toLocaleString('en-US')}`,
        margin,
        Math.min(finalY + 10, doc.internal.pageSize.getHeight() - 10),
    );

    const fname = `school-report-${safeReportBaseName(school?.name)}.pdf`;
    doc.save(fname);
}
