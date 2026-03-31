import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  Wallet,
  Trophy,
  CalendarCheck,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { updateUserProfile } from '../api/users.js';
import {
  getScholarshipConfig,
  getScholarshipWallet,
  getScholarshipLedger,
  getScholarshipPayoutRequests,
  postScholarshipPayoutRequest,
} from '../api/scholarship.js';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-md p-6 ${className}`}>{children}</div>
);

function formatUsd(cents) {
  const n = Number(cents) || 0;
  return (n / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function bpsToLabel(bps) {
  return `${(bps / 10000).toFixed(2).replace(/\.?0+$/, '')}×`;
}

/** Match server tier resolution: highest minXp threshold the user has reached. */
function tierForXp(xp, tiers) {
  const sorted = [...(tiers || [])].sort((a, b) => b.minXp - a.minXp);
  for (const t of sorted) {
    if (xp >= t.minXp) return t;
  }
  return { minXp: 0, multiplierBps: 10000 };
}

function nextTier(xp, tiers) {
  const asc = [...(tiers || [])].sort((a, b) => a.minXp - b.minXp);
  return asc.find((t) => t.minXp > xp) || null;
}

function sourceLabel(source) {
  switch (source) {
    case 'challenge_xp':
      return 'Challenge';
    case 'tutoring_session':
      return 'Tutoring session';
    case 'payout_request':
      return 'Payout request';
    case 'payout_reversal':
      return 'Payout returned';
    case 'adjustment':
      return 'Adjustment';
    default:
      return source;
  }
}

export default function ScholarshipFundPage() {
  const { user, refreshUser } = useAuth();
  const [config, setConfig] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState({ items: [], total: 0 });
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dobInput, setDobInput] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [selectedCents, setSelectedCents] = useState(null);
  const [consentCheck, setConsentCheck] = useState(false);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState({ type: '', text: '' });

  const [instName, setInstName] = useState('');
  const [instType, setInstType] = useState('');
  const [instSector, setInstSector] = useState('');
  const [instSaving, setInstSaving] = useState(false);
  const [instMessage, setInstMessage] = useState('');

  const loadAll = useCallback(async () => {
    setError('');
    try {
      const [cfg, w, led, pr] = await Promise.all([
        getScholarshipConfig(),
        getScholarshipWallet(),
        getScholarshipLedger({ limit: 50 }),
        getScholarshipPayoutRequests(),
      ]);
      setConfig(cfg);
      setWallet(w);
      setLedger(led);
      setPayouts(pr);
    } catch (e) {
      setError(e.message || 'Could not load scholarship data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'student') {
      loadAll();
    }
  }, [user?.role, loadAll]);

  useEffect(() => {
    if (!user?.dateOfBirth) return;
    const d = new Date(user.dateOfBirth);
    if (!Number.isNaN(d.getTime())) {
      setDobInput(d.toISOString().slice(0, 10));
    }
  }, [user?.dateOfBirth]);

  useEffect(() => {
    if (user?.scholarshipPayout) {
      setParentName(user.scholarshipPayout.parentGuardianName || '');
      setParentEmail(user.scholarshipPayout.parentGuardianEmail || '');
    }
  }, [user?.scholarshipPayout]);

  useEffect(() => {
    if (user?.studentInstitution) {
      setInstName(user.studentInstitution.name || '');
      setInstType(user.studentInstitution.type || '');
      setInstSector(user.studentInstitution.sector || '');
    }
  }, [user?.studentInstitution]);

  const xp = user?.xp ?? 0;
  const currentTier = useMemo(() => tierForXp(xp, config?.tierThresholds), [xp, config]);
  const next = useMemo(() => nextTier(xp, config?.tierThresholds), [xp, config]);

  const sortedTiersAsc = useMemo(() => {
    return [...(config?.tierThresholds || [])].sort((a, b) => a.minXp - b.minXp);
  }, [config]);

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user.role !== 'student') {
    return <Navigate to="/dashboard" replace />;
  }

  const eligible = Boolean(wallet?.learnToEarnEligible);
  const gated = Boolean(!loading && wallet && wallet.learnToEarnEligible === false);

  const saveSchoolAffiliation = async (e) => {
    e.preventDefault();
    setInstSaving(true);
    setInstMessage('');
    try {
      await updateUserProfile({
        studentInstitution: {
          name: instName.trim(),
          type: instType || null,
          sector: instSector || null,
        },
      });
      await refreshUser();
      setInstMessage('Saved. You can earn scholarship credits on your next qualifying activity.');
      await loadAll();
    } catch (err) {
      setInstMessage(err.message || 'Could not save.');
    } finally {
      setInstSaving(false);
    }
  };

  const saveProfileSection = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const payload = {
        scholarshipPayout: {
          parentGuardianName: parentName.trim(),
          parentGuardianEmail: parentEmail.trim(),
        },
      };
      if (dobInput) {
        payload.dateOfBirth = dobInput;
      }
      await updateUserProfile(payload);
      await refreshUser();
      setProfileMessage('Profile updated.');
    } catch (err) {
      setProfileMessage(err.message || 'Could not save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const submitPayout = async (e) => {
    e.preventDefault();
    if (selectedCents == null) {
      setPayoutMessage({ type: 'err', text: 'Choose a payout amount.' });
      return;
    }
    if (wallet?.requiresParentalConsentForPayout && !consentCheck) {
      setPayoutMessage({
        type: 'err',
        text: 'Confirm parent/guardian consent for learners age 17 and under.',
      });
      return;
    }
    setPayoutSubmitting(true);
    setPayoutMessage({ type: '', text: '' });
    try {
      await postScholarshipPayoutRequest({
        amountCents: selectedCents,
        parentConsentAttested: wallet?.requiresParentalConsentForPayout ? consentCheck : false,
      });
      setPayoutMessage({ type: 'ok', text: 'Payout request submitted. Our team will process it.' });
      setConsentCheck(false);
      setSelectedCents(null);
      await loadAll();
      await refreshUser();
    } catch (err) {
      setPayoutMessage({ type: 'err', text: err.message || 'Request failed.' });
    } finally {
      setPayoutSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Wallet className="w-9 h-9 text-blue-600" />
          Learn-to-earn scholarship
        </h1>
        <p className="text-gray-600 mt-2 max-w-2xl">
          Track XP, tutoring sessions, and credits toward your scholarship balance. Learn-to-earn is
          only for students affiliated with a <strong>public or private</strong> high school, college,
          or technical/trade school. Credits use your tier multiplier when you earn them.
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-3" />
          Loading your scholarship data…
        </div>
      )}

      {!loading && error && (
        <Card className="border border-red-200 bg-red-50">
          <p className="text-red-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </p>
        </Card>
      )}

      {!loading && !error && (
        <>
          {gated && (
            <Card className="mb-8 border-2 border-amber-200 bg-amber-50/80">
              <div className="flex items-start gap-3 mb-4">
                <Building2 className="w-8 h-8 text-amber-700 flex-shrink-0" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">School affiliation required</h2>
                  <p className="text-sm text-gray-700 mt-1">
                    Add the school you attend so we can enable scholarship credits from challenges and
                    tutoring. Homeschooled or non-institution students are not eligible for this program.
                  </p>
                </div>
              </div>
              <form onSubmit={saveSchoolAffiliation} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    School name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    placeholder="e.g. Lincoln High School, State University, Metro Tech Institute"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                    required
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Institution type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={instType}
                      onChange={(e) => setInstType(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white"
                      required
                    >
                      <option value="">Select…</option>
                      <option value="high_school">High school</option>
                      <option value="college">College / university</option>
                      <option value="technical_trade">Technical / trade school</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Public or private <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={instSector}
                      onChange={(e) => setInstSector(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 bg-white"
                      required
                    >
                      <option value="">Select…</option>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={instSaving}
                  className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
                >
                  {instSaving ? 'Saving…' : 'Save school affiliation'}
                </button>
                {instMessage && <p className="text-sm text-gray-700">{instMessage}</p>}
              </form>
            </Card>
          )}

          {eligible && (
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-lg">
              <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Balance</p>
              <p className="text-4xl font-bold mt-1">{formatUsd(wallet?.balanceCents)}</p>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-200">Lifetime earned</p>
                  <p className="font-semibold text-lg">{formatUsd(wallet?.lifetimeEarnedCents)}</p>
                </div>
                <div>
                  <p className="text-blue-200">Paid out</p>
                  <p className="font-semibold text-lg">{formatUsd(wallet?.lifetimePaidOutCents)}</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-300" />
                  <span className="text-blue-100">Your XP</span>
                </div>
                <span className="text-2xl font-bold">{xp.toLocaleString()}</span>
              </div>
              <Link
                to="/challenges"
                className="mt-4 inline-flex items-center text-sm font-medium text-white hover:underline"
              >
                Earn more in challenges
                <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Tier multiplier
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Each credit (from challenges or completed tutoring) is multiplied by your tier at the
                time you earn it. Higher lifetime XP unlocks higher tiers for future credits.
              </p>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 mb-4">
                <p className="text-sm text-gray-500">Your active tier</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bpsToLabel(currentTier.multiplierBps)}
                  <span className="text-base font-normal text-gray-500 ml-2">
                    (at {xp.toLocaleString()} XP)
                  </span>
                </p>
                {next ? (
                  <p className="text-sm text-gray-600 mt-2">
                    Next: <strong>{bpsToLabel(next.multiplierBps)}</strong> starting at{' '}
                    <strong>{next.minXp.toLocaleString()} XP</strong>
                    <span className="text-gray-500">
                      {' '}
                      — {(next.minXp - xp).toLocaleString()} XP to go
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-emerald-700 mt-2 font-medium">
                    You are at the highest configured tier.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">All tiers</p>
                <ul className="space-y-2">
                  {sortedTiersAsc.map((t) => {
                    const active = xp >= t.minXp;
                    const isCurrent =
                      t.minXp === currentTier.minXp && t.multiplierBps === currentTier.multiplierBps;
                    return (
                      <li
                        key={`${t.minXp}-${t.multiplierBps}`}
                        className={`flex justify-between items-center text-sm rounded-lg px-3 py-2 border ${
                          isCurrent
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : active
                              ? 'border-gray-200 bg-white text-gray-700'
                              : 'border-dashed border-gray-200 text-gray-400'
                        }`}
                      >
                        <span>
                          {t.minXp.toLocaleString()}+ XP
                          {isCurrent && (
                            <span className="ml-2 text-xs font-semibold text-blue-600">(you)</span>
                          )}
                        </span>
                        <span className="font-semibold">{bpsToLabel(t.multiplierBps)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Card>
          </div>
          )}

          {gated && config && (
            <Card className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Tier preview (when eligible)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Your lifetime XP still updates from challenges. After you add your school, new credits
                will use the tier you have earned. At <strong>{xp.toLocaleString()} XP</strong> you
                would be at <strong>{bpsToLabel(tierForXp(xp, config.tierThresholds).multiplierBps)}</strong>{' '}
                on the next qualifying credit.
              </p>
              <ul className="space-y-2">
                {sortedTiersAsc.map((t) => (
                  <li
                    key={`prev-${t.minXp}-${t.multiplierBps}`}
                    className="flex justify-between text-sm rounded-lg px-3 py-2 border border-gray-200"
                  >
                    <span>{t.minXp.toLocaleString()}+ XP</span>
                    <span className="font-semibold">{bpsToLabel(t.multiplierBps)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3 mb-8">
            <Card className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">How you earn</h2>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Challenge XP</p>
                    <p className="text-sm text-gray-600">
                      <strong>Institution students only:</strong> base scholarship cents from XP rewards
                      scale with <strong>{config?.xpRequiredForOneCent || 10} XP per cent</strong> before
                      your tier multiplier (e.g. 1,000 XP ≈{' '}
                      {formatUsd(1000 / (config?.xpRequiredForOneCent || 10))} base before multiplier).
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Completed tutoring sessions</p>
                    <p className="text-sm text-gray-600">
                      Each completed session credits approximately{' '}
                      <strong>{formatUsd(config?.tutoringSessionCreditCents ?? 500)}</strong> base (before
                      your tier multiplier) when your tutor marks the booking complete—only when your
                      school affiliation is on file.
                    </p>
                  </div>
                </li>
              </ul>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Activity</h2>
              <p className="text-sm text-gray-600 mb-2">
                {eligible ? (
                  <>
                    <strong>{ledger.total}</strong> ledger entries
                  </>
                ) : (
                  <span className="text-amber-800">Complete school affiliation to track scholarship activity.</span>
                )}
              </p>
              {eligible && (
                <p className="text-xs text-gray-500">
                  Newest credits and payouts appear in the table below.
                </p>
              )}
            </Card>
          </div>

          {eligible && (
          <Card className="mb-8 overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Scholarship ledger</h2>
            <div className="overflow-x-auto -mx-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="px-6 py-2 font-medium">Date</th>
                    <th className="px-6 py-2 font-medium">Type</th>
                    <th className="px-6 py-2 font-medium">Source</th>
                    <th className="px-6 py-2 font-medium text-right">Amount</th>
                    <th className="px-6 py-2 font-medium text-right">Balance after</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.items?.length ? (
                    ledger.items.map((row) => (
                      <tr key={row._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-700 whitespace-nowrap">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </td>
                        <td className="px-6 py-3 capitalize text-gray-800">{row.type}</td>
                        <td className="px-6 py-3 text-gray-600">{sourceLabel(row.source)}</td>
                        <td
                          className={`px-6 py-3 text-right font-medium ${
                            row.type === 'credit' ? 'text-emerald-600' : 'text-amber-700'
                          }`}
                        >
                          {row.type === 'credit' ? '+' : '−'}
                          {formatUsd(row.amountCents)}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-700">
                          {formatUsd(row.balanceAfterCents)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No entries yet. Complete a challenge or tutoring session to start earning.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          )}

          {eligible && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Payout eligibility</h2>
              <p className="text-sm text-gray-600 mb-4">
                Add your date of birth. Learners age 17 and under need a parent/guardian on file and
                staff verification before funds can be disbursed.
              </p>
              {!wallet?.dateOfBirthSet && (
                <div className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  Add your date of birth before you can request a payout.
                </div>
              )}
              {wallet?.requiresParentalConsentForPayout && !wallet?.parentConsentVerified && (
                <div className="flex items-start gap-2 text-blue-900 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  Parent/guardian details are on file, but consent must be verified by Start Right
                  before disbursement.
                </div>
              )}
              {wallet?.requiresParentalConsentForPayout && wallet?.parentConsentVerified && (
                <div className="flex items-start gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm mb-4">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  Parental consent verified — you can request payouts when your balance allows.
                </div>
              )}
              <form onSubmit={saveProfileSection} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    value={dobInput}
                    onChange={(e) => setDobInput(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent / guardian name
                  </label>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Required for minors"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent / guardian email
                  </label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {profileSaving ? 'Saving…' : 'Save profile details'}
                </button>
                {profileMessage && (
                  <p className="text-sm text-gray-600">{profileMessage}</p>
                )}
              </form>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Request disbursement</h2>
              <p className="text-sm text-gray-600 mb-4">
                Choose an amount. Your balance must cover the full amount; funds are reserved when you
                submit.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {(config?.payoutAmountsCents || []).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCents(c)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selectedCents === c
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 text-gray-800 hover:border-blue-400'
                    }`}
                  >
                    {formatUsd(c)}
                  </button>
                ))}
              </div>
              {wallet?.requiresParentalConsentForPayout && (
                <label className="flex items-start gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentCheck}
                    onChange={(e) => setConsentCheck(e.target.checked)}
                    className="mt-1 rounded border-gray-300"
                  />
                  <span>
                    I confirm that my parent or guardian agrees to this scholarship disbursement
                    request.
                  </span>
                </label>
              )}
              {payoutMessage.text && (
                <p
                  className={`text-sm mb-3 ${
                    payoutMessage.type === 'ok' ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {payoutMessage.text}
                </p>
              )}
              <button
                type="button"
                onClick={submitPayout}
                disabled={payoutSubmitting || selectedCents == null}
                className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {payoutSubmitting ? 'Submitting…' : 'Submit payout request'}
              </button>
            </Card>
          </div>
          )}

          {eligible && (
          <Card className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout request history</h2>
            {payouts?.length ? (
              <ul className="divide-y divide-gray-100">
                {payouts.map((p) => (
                  <li key={p._id} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-gray-600">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : ''}
                    </span>
                    <span className="font-medium text-gray-900">{formatUsd(p.amountCents)}</span>
                    <span
                      className={`capitalize font-medium ${
                        p.status === 'paid'
                          ? 'text-emerald-600'
                          : p.status === 'rejected' || p.status === 'cancelled'
                            ? 'text-red-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {p.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No payout requests yet.</p>
            )}
          </Card>
          )}
        </>
      )}
    </div>
  );
}
