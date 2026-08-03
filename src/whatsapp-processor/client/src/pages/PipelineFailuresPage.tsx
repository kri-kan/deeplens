import React, { useState, useEffect } from 'react';
import { getPipelineFailures, retryPipelineFailures, autoFixPipelineFailures } from '../services/api.service';

export default function PipelineFailuresPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [actionLoading, setActionLoading] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'stuck' | 'errored' | 'unassigned' | 'autoprocess' | 'media'>('stuck');
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const loadFailures = async () => {
        try {
            setLoading(true);
            const res = await getPipelineFailures();
            if (res.success) {
                setData(res);
            } else {
                setMessage({ text: res.message || 'Failed to load pipeline failures', type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFailures();
        const interval = setInterval(loadFailures, 15000); // Auto-refresh every 15s
        return () => clearInterval(interval);
    }, []);

    const handleRetryGroup = async (groupId: string) => {
        try {
            setActionLoading(true);
            const res = await retryPipelineFailures([groupId]);
            if (res.success) {
                setMessage({ text: `Queued 1 group for processing`, type: 'success' });
                await loadFailures();
            } else {
                setMessage({ text: res.message, type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRetryAll = async () => {
        try {
            setActionLoading(true);
            const res = await retryPipelineFailures(undefined, 'all');
            if (res.success) {
                setMessage({ text: res.message, type: 'success' });
                await loadFailures();
            } else {
                setMessage({ text: res.message, type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleAutoFix = async () => {
        try {
            setActionLoading(true);
            const res = await autoFixPipelineFailures(true);
            if (res.success) {
                setMessage({ text: `Auto-fix completed: ${res.recoveredStuckSent} stuck events re-queued, ${res.recoveredVendorErrors} vendor errors recovered, ${res.autoProcessUpdatedCount} chats auto-process enabled.`, type: 'success' });
                await loadFailures();
            } else {
                setMessage({ text: res.message, type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const summary = data?.summary || {
        stuckSentCount: 0,
        erroredCount: 0,
        missingVendorChatsCount: 0,
        disabledAutoProcessCount: 0,
        pendingMediaCount: 0,
        totalActionRequired: 0
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        Pipeline Failures & Catalog Ingestion Health
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>
                        Monitor and resolve failure modes, stuck events, and missing vendor linkages across WhatsApp channels.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={loadFailures}
                        disabled={loading || actionLoading}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        🔄 Refresh
                    </button>
                    <button
                        onClick={handleRetryAll}
                        disabled={actionLoading || summary.totalActionRequired === 0}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontWeight: '600',
                            cursor: summary.totalActionRequired > 0 ? 'pointer' : 'not-allowed',
                            opacity: summary.totalActionRequired > 0 ? 1 : 0.6
                        }}
                    >
                        ⚡ Retry All Failed ({summary.totalActionRequired})
                    </button>
                    <button
                        onClick={handleAutoFix}
                        disabled={actionLoading}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        🛠️ 1-Click Auto-Fix & Re-process
                    </button>
                </div>
            </div>

            {/* Alert Banner */}
            {message && (
                <div
                    style={{
                        padding: '12px 16px',
                        borderRadius: '6px',
                        marginBottom: '20px',
                        backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: message.type === 'success' ? '#065f46' : '#991b1b',
                        border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <span>{message.text}</span>
                    <button
                        onClick={() => setMessage(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Action Required</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: summary.totalActionRequired > 0 ? '#dc2626' : '#16a34a', marginTop: '4px' }}>
                        {summary.totalActionRequired}
                    </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Stuck Events (&gt;5m)</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: summary.stuckSentCount > 0 ? '#d97706' : '#1e293b', marginTop: '4px' }}>
                        {summary.stuckSentCount}
                    </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>AI / Pipeline Errors</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: summary.erroredCount > 0 ? '#dc2626' : '#1e293b', marginTop: '4px' }}>
                        {summary.erroredCount}
                    </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Unassigned Vendor Chats</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: summary.missingVendorChatsCount > 0 ? '#ea580c' : '#1e293b', marginTop: '4px' }}>
                        {summary.missingVendorChatsCount}
                    </div>
                </div>

                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Auto-Process Disabled</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#475569', marginTop: '4px' }}>
                        {summary.disabledAutoProcessCount}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <button
                    onClick={() => setActiveTab('stuck')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderBottom: activeTab === 'stuck' ? '2px solid #2563eb' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        fontWeight: activeTab === 'stuck' ? '600' : '500',
                        color: activeTab === 'stuck' ? '#2563eb' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    Stuck Events ({summary.stuckSentCount})
                </button>
                <button
                    onClick={() => setActiveTab('errored')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderBottom: activeTab === 'errored' ? '2px solid #2563eb' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        fontWeight: activeTab === 'errored' ? '600' : '500',
                        color: activeTab === 'errored' ? '#2563eb' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    Pipeline Errors ({summary.erroredCount})
                </button>
                <button
                    onClick={() => setActiveTab('unassigned')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderBottom: activeTab === 'unassigned' ? '2px solid #2563eb' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        fontWeight: activeTab === 'unassigned' ? '600' : '500',
                        color: activeTab === 'unassigned' ? '#2563eb' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    Unassigned Vendor Chats ({summary.missingVendorChatsCount})
                </button>
                <button
                    onClick={() => setActiveTab('autoprocess')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderBottom: activeTab === 'autoprocess' ? '2px solid #2563eb' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        fontWeight: activeTab === 'autoprocess' ? '600' : '500',
                        color: activeTab === 'autoprocess' ? '#2563eb' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    Auto-Process Disabled ({summary.disabledAutoProcessCount})
                </button>
                <button
                    onClick={() => setActiveTab('media')}
                    style={{
                        padding: '10px 20px',
                        border: 'none',
                        borderBottom: activeTab === 'media' ? '2px solid #2563eb' : '2px solid transparent',
                        backgroundColor: 'transparent',
                        fontWeight: activeTab === 'media' ? '600' : '500',
                        color: activeTab === 'media' ? '#2563eb' : '#64748b',
                        cursor: 'pointer'
                    }}
                >
                    Stalled Media ({summary.pendingMediaCount})
                </button>
            </div>

            {/* Tab Content Table */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading pipeline state...</div>
                ) : (
                    <>
                        {/* Tab 1: Stuck Events */}
                        {activeTab === 'stuck' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                        <th style={{ padding: '12px 16px' }}>Group ID</th>
                                        <th style={{ padding: '12px 16px' }}>Chat Channel</th>
                                        <th style={{ padding: '12px 16px' }}>Vendor</th>
                                        <th style={{ padding: '12px 16px' }}>Media / Text</th>
                                        <th style={{ padding: '12px 16px' }}>Last Updated</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.stuckSent?.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                                ✅ No stuck events found! Pipeline is running cleanly.
                                            </td>
                                        </tr>
                                    ) : (
                                        data?.stuckSent?.map((row: any) => (
                                            <tr key={row.groupId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{row.groupId}</td>
                                                <td style={{ padding: '12px 16px', fontWeight: '500' }}>{row.chatName || row.jid}</td>
                                                <td style={{ padding: '12px 16px' }}>{row.vendorName || <span style={{ color: '#94a3b8' }}>Unassigned</span>}</td>
                                                <td style={{ padding: '12px 16px' }}>📷 {row.mediaCount} | 📝 {row.textCount}</td>
                                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(row.updatedAt).toLocaleString()}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleRetryGroup(row.groupId)}
                                                        disabled={actionLoading}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '4px',
                                                            border: '1px solid #2563eb',
                                                            backgroundColor: '#eff6ff',
                                                            color: '#2563eb',
                                                            fontWeight: '600',
                                                            fontSize: '12px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Retry Now
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* Tab 2: Errored */}
                        {activeTab === 'errored' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                        <th style={{ padding: '12px 16px' }}>Group ID</th>
                                        <th style={{ padding: '12px 16px' }}>Chat Channel</th>
                                        <th style={{ padding: '12px 16px' }}>Status</th>
                                        <th style={{ padding: '12px 16px' }}>Error Details</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.errored?.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                                ✅ No pipeline errors found!
                                            </td>
                                        </tr>
                                    ) : (
                                        data?.errored?.map((row: any) => (
                                            <tr key={row.groupId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{row.groupId}</td>
                                                <td style={{ padding: '12px 16px', fontWeight: '500' }}>{row.chatName || row.jid}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '12px', fontWeight: '600' }}>
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>{row.errorDetail || 'Unknown error'}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleRetryGroup(row.groupId)}
                                                        disabled={actionLoading}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '4px',
                                                            border: '1px solid #dc2626',
                                                            backgroundColor: '#fef2f2',
                                                            color: '#dc2626',
                                                            fontWeight: '600',
                                                            fontSize: '12px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Retry Group
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* Tab 3: Unassigned Vendor Chats */}
                        {activeTab === 'unassigned' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                        <th style={{ padding: '12px 16px' }}>Chat Channel Name</th>
                                        <th style={{ padding: '12px 16px' }}>Chat JID</th>
                                        <th style={{ padding: '12px 16px' }}>Staged Product Groups</th>
                                        <th style={{ padding: '12px 16px' }}>Last Message Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.missingVendorChats?.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                                ✅ All active product chats have vendors assigned!
                                            </td>
                                        </tr>
                                    ) : (
                                        data?.missingVendorChats?.map((row: any) => (
                                            <tr key={row.jid} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: '600' }}>{row.chatName}</td>
                                                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{row.jid}</td>
                                                <td style={{ padding: '12px 16px', fontWeight: '700', color: '#ea580c' }}>{row.stagedGroupsCount} groups</td>
                                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(row.lastMessageAt).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* Tab 4: Auto-Process Disabled */}
                        {activeTab === 'autoprocess' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                        <th style={{ padding: '12px 16px' }}>Group ID</th>
                                        <th style={{ padding: '12px 16px' }}>Chat Channel</th>
                                        <th style={{ padding: '12px 16px' }}>Vendor</th>
                                        <th style={{ padding: '12px 16px' }}>Media / Text</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.disabledAutoProcess?.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                                ✅ All assigned vendor chats have auto-processing enabled!
                                            </td>
                                        </tr>
                                    ) : (
                                        data?.disabledAutoProcess?.map((row: any) => (
                                            <tr key={row.groupId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{row.groupId}</td>
                                                <td style={{ padding: '12px 16px', fontWeight: '500' }}>{row.chatName || row.jid}</td>
                                                <td style={{ padding: '12px 16px' }}>{row.vendorName}</td>
                                                <td style={{ padding: '12px 16px' }}>📷 {row.mediaCount} | 📝 {row.textCount}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleRetryGroup(row.groupId)}
                                                        disabled={actionLoading}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '4px',
                                                            border: '1px solid #059669',
                                                            backgroundColor: '#ecfdf5',
                                                            color: '#059669',
                                                            fontWeight: '600',
                                                            fontSize: '12px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Publish Product
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* Tab 5: Pending Media */}
                        {activeTab === 'media' && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                        <th style={{ padding: '12px 16px' }}>Message ID</th>
                                        <th style={{ padding: '12px 16px' }}>Chat Channel</th>
                                        <th style={{ padding: '12px 16px' }}>Media Type</th>
                                        <th style={{ padding: '12px 16px' }}>Status</th>
                                        <th style={{ padding: '12px 16px' }}>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.pendingMedia?.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                                ✅ No stalled media downloads found!
                                            </td>
                                        </tr>
                                    ) : (
                                        data?.pendingMedia?.map((row: any) => (
                                            <tr key={row.messageId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px' }}>{row.messageId}</td>
                                                <td style={{ padding: '12px 16px', fontWeight: '500' }}>{row.chatName || row.jid}</td>
                                                <td style={{ padding: '12px 16px' }}>{row.mediaType}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: '600' }}>
                                                        {row.processingStatus}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(Number(row.timestamp) * 1000).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
