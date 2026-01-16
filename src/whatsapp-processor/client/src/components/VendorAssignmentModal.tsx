import React, { useState, useEffect } from 'react';
import './VendorAssignmentModal.css';

interface VendorAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    chat: {
        jid: string;
        name: string;
        vendor_id?: string;
        vendor_name?: string;
    };
    onAssignSuccess: () => void;
}

interface VendorInfo {
    vendorId: string;
    vendorName: string;
    assignedAt?: string;
    assignedBy?: string;
}

const VendorAssignmentModal: React.FC<VendorAssignmentModalProps> = ({
    isOpen,
    onClose,
    chat,
    onAssignSuccess
}) => {
    const [vendorId, setVendorId] = useState('');
    const [vendorName, setVendorName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentVendor, setCurrentVendor] = useState<VendorInfo | null>(null);
    const [loadingCurrent, setLoadingCurrent] = useState(false);

    useEffect(() => {
        if (isOpen && chat.jid) {
            fetchCurrentVendor();
        }
    }, [isOpen, chat.jid]);

    const fetchCurrentVendor = async () => {
        setLoadingCurrent(true);
        try {
            const response = await fetch(`/api/chats/${encodeURIComponent(chat.jid)}/vendor`);
            const data = await response.json();

            if (data.hasVendor && data.vendor) {
                setCurrentVendor(data.vendor);
                setVendorId(data.vendor.vendorId);
                setVendorName(data.vendor.vendorName);
            } else {
                setCurrentVendor(null);
                setVendorId('');
                setVendorName('');
            }
        } catch (err: any) {
            console.error('Failed to fetch current vendor:', err);
        } finally {
            setLoadingCurrent(false);
        }
    };

    const handleAssign = async () => {
        if (!vendorId.trim() || !vendorName.trim()) {
            setError('Both Vendor ID and Vendor Name are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/chats/${encodeURIComponent(chat.jid)}/vendor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    vendorId: vendorId.trim(),
                    vendorName: vendorName.trim(),
                    assignedBy: 'admin'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to assign vendor');
            }

            onAssignSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to assign vendor');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm('Are you sure you want to remove the vendor assignment?')) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/chats/${encodeURIComponent(chat.jid)}/vendor`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to remove vendor');
            }

            onAssignSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to remove vendor');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Assign Vendor</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="chat-info">
                        <strong>Chat:</strong> {chat.name}
                    </div>

                    {loadingCurrent ? (
                        <div className="loading-indicator">Loading current vendor...</div>
                    ) : currentVendor ? (
                        <div className="current-vendor">
                            <div className="vendor-badge">
                                <span className="vendor-icon">🏪</span>
                                <div className="vendor-details">
                                    <div className="vendor-name">{currentVendor.vendorName}</div>
                                    <div className="vendor-meta">
                                        ID: {currentVendor.vendorId}
                                    </div>
                                    {currentVendor.assignedAt && (
                                        <div className="vendor-meta">
                                            Assigned: {new Date(currentVendor.assignedAt).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="no-vendor">
                            <span className="info-icon">ℹ️</span>
                            No vendor currently assigned
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="vendorId">
                            Vendor ID <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            id="vendorId"
                            value={vendorId}
                            onChange={(e) => setVendorId(e.target.value)}
                            placeholder="e.g., a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                            disabled={loading}
                        />
                        <small className="help-text">
                            UUID from DeepLens vendors table
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="vendorName">
                            Vendor Name <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            id="vendorName"
                            value={vendorName}
                            onChange={(e) => setVendorName(e.target.value)}
                            placeholder="e.g., ABC Textiles"
                            disabled={loading}
                        />
                        <small className="help-text">
                            Display name for the vendor
                        </small>
                    </div>

                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {currentVendor && (
                        <button
                            className="button button-danger"
                            onClick={handleRemove}
                            disabled={loading}
                        >
                            {loading ? 'Removing...' : 'Remove Vendor'}
                        </button>
                    )}
                    <button
                        className="button button-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="button button-primary"
                        onClick={handleAssign}
                        disabled={loading || !vendorId.trim() || !vendorName.trim()}
                    >
                        {loading ? 'Assigning...' : currentVendor ? 'Update Vendor' : 'Assign Vendor'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VendorAssignmentModal;
