import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import GigReview from '../components/GigReview';
import EditGigModal from '../components/EditGigModal';

const buttonClass = 'ui-button ui-button-primary';
const secondaryClass = 'ui-button ui-button-secondary';

function getStatusBadge(status) {
  switch (status) {
    case 'open':
      return 'ui-badge ui-badge-indigo';
    case 'in progress':
      return 'ui-badge ui-badge-warning';
    case 'completed':
      return 'ui-badge ui-badge-success';
    case 'cancelled':
      return 'ui-badge ui-badge-danger';
    case 'accepted':
      return 'ui-badge ui-badge-success';
    case 'rejected':
      return 'ui-badge ui-badge-danger';
    case 'pending':
    default:
      return 'ui-badge ui-badge-neutral';
  }
}

export default function Dashboard() {
  const [gigs, setGigs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedGigId, setSelectedGigId] = useState('');
  const [proposals, setProposals] = useState([]);
  const [editingGig, setEditingGig] = useState(null);

  const [loading, setLoading] = useState(true);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');
  const [proposalError, setProposalError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadDashboard = useCallback(async (signal) => {
    const [gigResponse, applicationResponse] = await Promise.all([
      api.get('/gigs/my-posted', { signal }),
      api.get('/applications/my-applications', { signal }),
    ]);

    return {
      gigs: gigResponse.data,
      applications: applicationResponse.data,
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboard() {
      try {
        const data = await loadDashboard(controller.signal);

        if (!controller.signal.aborted) {
          setGigs(data.gigs);
          setApplications(data.applications);
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.error || 'Failed to load your dashboard.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => controller.abort();
  }, [loadDashboard, reloadKey]);

  useEffect(() => {
    if (!selectedGigId) return undefined;

    const controller = new AbortController();

    async function fetchProposals() {
      try {
        const response = await api.get(
          `/applications/gig/${selectedGigId}`,
          { signal: controller.signal }
        );

        if (!controller.signal.aborted) {
          setProposals(response.data);
          setProposalError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setProposalError(
            err.response?.data?.error || 'Failed to load proposals.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setProposalLoading(false);
        }
      }
    }

    fetchProposals();

    return () => controller.abort();
  }, [selectedGigId, reloadKey]);

  const refresh = () => {
    setLoading(true);
    setError('');

    if (selectedGigId) {
      setProposalLoading(true);
      setProposalError('');
    }

    setReloadKey((value) => value + 1);
  };

  const openProposals = (gigId) => {
    if (selectedGigId === gigId) {
      setSelectedGigId('');
      setProposals([]);
      setProposalError('');
      return;
    }

    setProposals([]);
    setProposalError('');
    setProposalLoading(true);
    setSelectedGigId(gigId);
  };

  const runAction = async (request, successMessage) => {
    if (busy) return;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      await request();
      setNotice(successMessage);
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'The action failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const decideProposal = (applicationId, status) => {
    const question =
      status === 'accepted'
        ? 'Hire this applicant? Other pending proposals will be rejected.'
        : 'Reject this proposal?';

    if (!window.confirm(question)) return;

    runAction(
      () => api.put(`/applications/${applicationId}/status`, { status }),
      status === 'accepted'
        ? 'Applicant hired. The gig is now in progress.'
        : 'Proposal rejected.'
    );
  };

  const changeGigStatus = (gigId, status) => {
    if (!window.confirm(`Mark this gig as ${status}?`)) return;

    runAction(
      () => api.put(`/gigs/${gigId}/status`, { status }),
      `Gig ${status} successfully.`
    );
  };

  const deleteGig = (gig) => {
    if (
      !window.confirm(
        `Permanently delete "${gig.title}" and any associated proposals? This action cannot be undone.`
      )
    )
      return;

    runAction(
      () => api.delete(`/gigs/${gig._id}`),
      'Gig deleted successfully.'
    );
  };

  const withdrawApplication = (applicationId) => {
    if (!window.confirm('Withdraw this pending proposal?')) return;

    runAction(
      () => api.delete(`/applications/${applicationId}`),
      'Proposal withdrawn.'
    );
  };

  const actionsDisabled = busy || loading || proposalLoading;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My activity</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your posted gigs, review incoming proposals, and track your applications.
          </p>
        </div>

        <div className="flex gap-3">
          <Link to="/post-gig" className="ui-button ui-button-primary">
            + Post a gig
          </Link>

          <button
            type="button"
            onClick={refresh}
            disabled={actionsDisabled}
            className="ui-button ui-button-secondary"
          >
            Refresh
          </button>
        </div>
      </header>

      {notice && (
        <p role="status" className="ui-notice">
          {notice}
        </p>
      )}

      {error && (
        <div role="alert" className="ui-error">
          <p>{error}</p>
          <button
            type="button"
            onClick={refresh}
            disabled={actionsDisabled}
            className="mt-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="ui-card p-8 text-center text-slate-600">
          Loading your dashboard...
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">My posted gigs</h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {gigs.length} {gigs.length === 1 ? 'gig' : 'gigs'}
          </span>
        </div>

        {!loading && !error && gigs.length === 0 && (
          <div className="ui-card p-8 text-center text-slate-600">
            You have not posted any gigs yet.{' '}
            <Link to="/post-gig" className="font-semibold text-indigo-600 hover:underline">
              Create your first gig
            </Link>
          </div>
        )}

        {gigs.map((gig) => (
          <article
            key={gig._id}
            className="ui-card space-y-4 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{gig.title}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {gig.category}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
                  LKR {Number(gig.budget).toLocaleString()}
                </span>
                <span className={getStatusBadge(gig.status)}>
                  {gig.status}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span>Proposals received: <strong>{gig.applicationsCount ?? 0}</strong></span>
              {gig.assignedFreelancer && (
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  Assigned: {gig.assignedFreelancer.name || 'Student freelancer'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => openProposals(gig._id)}
                disabled={busy || loading}
                className={secondaryClass}
              >
                {selectedGigId === gig._id
                  ? 'Hide proposals'
                  : `View proposals (${gig.applicationsCount ?? 0})`}
              </button>

              {['open', 'in progress'].includes(gig.status) && (
                <button
                  type="button"
                  onClick={() => setEditingGig(gig)}
                  disabled={actionsDisabled}
                  className="ui-button ui-button-secondary"
                >
                  Edit gig
                </button>
              )}

              {gig.status === 'in progress' && (
                <button
                  type="button"
                  onClick={() => changeGigStatus(gig._id, 'completed')}
                  disabled={actionsDisabled}
                  className={buttonClass}
                >
                  Mark completed
                </button>
              )}

              {['open', 'in progress'].includes(gig.status) && (
                <button
                  type="button"
                  onClick={() => changeGigStatus(gig._id, 'cancelled')}
                  disabled={actionsDisabled}
                  className="ui-button ui-button-danger"
                >
                  Cancel gig
                </button>
              )}

              <button
                type="button"
                onClick={() => deleteGig(gig)}
                disabled={actionsDisabled}
                className="ui-button ui-button-danger"
              >
                Delete gig
              </button>
            </div>

            {selectedGigId === gig._id && (
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Submitted proposals
                </h4>

                {proposalLoading ? (
                  <p role="status" className="text-sm text-slate-500">Loading proposals...</p>
                ) : proposalError ? (
                  <p role="alert" className="ui-error text-sm">
                    {proposalError}
                  </p>
                ) : proposals.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No proposals have been submitted for this gig yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {proposals.map((proposal) => (
                      <div
                        key={proposal._id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-slate-900">
                              {proposal.applicantId?.name || 'Unavailable account'}
                            </h5>
                            <p className="text-xs text-slate-500">
                              {proposal.applicantId?.faculty || 'Faculty not specified'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-800 text-sm">
                              Bid: LKR {Number(proposal.bidAmount).toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({proposal.estimatedDays} days)
                            </span>
                            <span className={getStatusBadge(proposal.status)}>
                              {proposal.status}
                            </span>
                          </div>
                        </div>

                        <p className="whitespace-pre-wrap break-words text-sm text-slate-700 leading-relaxed">
                          {proposal.pitch}
                        </p>

                        {proposal.applicantId?.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {proposal.applicantId.skills.map((skill, idx) => (
                              <span key={`${skill}-${idx}`} className="ui-skill text-xs">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {gig.status === 'open' &&
                          proposal.status === 'pending' && (
                            <div className="flex gap-2 pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() =>
                                  decideProposal(proposal._id, 'accepted')
                                }
                                disabled={
                                  actionsDisabled || !proposal.applicantId
                                }
                                className={buttonClass}
                              >
                                Accept proposal
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  decideProposal(proposal._id, 'rejected')
                                }
                                disabled={actionsDisabled}
                                className={secondaryClass}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {gig.status === 'completed' && gig.assignedFreelancer && (
              <div className="border-t border-slate-100 pt-4">
                <GigReview
                  key={`${gig._id}-${reloadKey}`}
                  gigId={gig._id}
                />
              </div>
            )}
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">My applications</h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {applications.length} {applications.length === 1 ? 'application' : 'applications'}
          </span>
        </div>

        {!loading && !error && applications.length === 0 && (
          <div className="ui-card p-8 text-center text-slate-600">
            You have not submitted any proposals yet.{' '}
            <Link to="/" className="font-semibold text-indigo-600 hover:underline">
              Explore open gigs
            </Link>
          </div>
        )}

        {applications.map((application) => (
          <article
            key={application._id}
            className="ui-card space-y-4 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {application.gigId?.title || 'Gig no longer available'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Posted by: {application.gigId?.posterId?.name || 'Unavailable'} · Gig status: <span className="capitalize">{application.gigId?.status || 'N/A'}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
                  Bid: LKR {Number(application.bidAmount).toLocaleString()}
                </span>
                <span className={getStatusBadge(application.status)}>
                  Proposal: {application.status}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Estimated delivery: <strong>{application.estimatedDays} days</strong>
            </p>

            <p className="whitespace-pre-wrap break-words text-sm text-slate-600 leading-relaxed">
              {application.pitch}
            </p>

            {application.status === 'pending' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => withdrawApplication(application._id)}
                  disabled={actionsDisabled}
                  className="ui-button ui-button-danger"
                >
                  Withdraw proposal
                </button>
              </div>
            )}

            {application.status === 'accepted' &&
              application.gigId?.status === 'completed' && (
                <div className="border-t border-slate-100 pt-4">
                  <GigReview
                    key={`${application.gigId._id}-${reloadKey}`}
                    gigId={application.gigId._id}
                  />
                </div>
              )}
          </article>
        ))}
      </section>

      {editingGig && (
        <EditGigModal
          gig={editingGig}
          onClose={() => setEditingGig(null)}
          onUpdated={() => {
            setEditingGig(null);
            setNotice('Gig updated successfully.');
            refresh();
          }}
        />
      )}
    </div>
  );
}