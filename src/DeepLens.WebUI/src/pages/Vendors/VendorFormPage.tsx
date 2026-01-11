import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    TextField,
    Grid,
    IconButton,
    Divider,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import vendorService, { CreateVendorRequest, VendorContact } from '../../services/vendorService';

const VendorFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<CreateVendorRequest>({
        vendorName: '',
        vendorCode: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        postalCode: '',
        email: '',
        website: '',
        notes: '',
        contacts: [],
    });

    useEffect(() => {
        if (isEditMode && id) {
            loadVendor(id);
        }
    }, [id]);

    const loadVendor = async (vendorId: string) => {
        try {
            setLoading(true);
            const vendor = await vendorService.getVendor(vendorId);
            setFormData({
                vendorName: vendor.vendorName,
                vendorCode: vendor.vendorCode || '',
                address: vendor.address || '',
                city: vendor.city || '',
                state: vendor.state || '',
                country: vendor.country || 'India',
                postalCode: vendor.postalCode || '',
                email: vendor.email || '',
                website: vendor.website || '',
                notes: vendor.notes || '',
                contacts: vendor.contacts?.map(c => ({
                    contactName: c.contactName,
                    contactRole: c.contactRole || '',
                    phoneNumber: c.phoneNumber || '',
                    alternatePhone: c.alternatePhone || '',
                    email: c.email || '',
                    isPrimary: c.isPrimary,
                })) || [],
            });
        } catch (err: any) {
            setError(err.message || 'Failed to load vendor');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        try {
            setLoading(true);
            if (isEditMode && id) {
                await vendorService.updateVendor(id, formData);
            } else {
                await vendorService.createVendor(formData);
            }
            setSuccess(true);
            setTimeout(() => navigate('/vendors'), 1500);
        } catch (err: any) {
            setError(err.message || 'Failed to save vendor');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof CreateVendorRequest, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addContact = () => {
        setFormData(prev => ({
            ...prev,
            contacts: [
                ...(prev.contacts || []),
                {
                    contactName: '',
                    contactRole: '',
                    phoneNumber: '',
                    alternatePhone: '',
                    email: '',
                    isPrimary: (prev.contacts?.length || 0) === 0,
                },
            ],
        }));
    };

    const removeContact = (index: number) => {
        setFormData(prev => ({
            ...prev,
            contacts: prev.contacts?.filter((_, i) => i !== index),
        }));
    };

    const updateContact = (index: number, field: keyof VendorContact, value: any) => {
        setFormData(prev => ({
            ...prev,
            contacts: prev.contacts?.map((contact, i) =>
                i === index ? { ...contact, [field]: value } : contact
            ),
        }));
    };

    if (loading && isEditMode) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <IconButton onClick={() => navigate('/vendors')} sx={{ mr: 2 }}>
                    <BackIcon />
                </IconButton>
                <Box>
                    <Typography variant="h4">
                        {isEditMode ? 'Edit Vendor' : 'Add New Vendor'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {isEditMode ? 'Update vendor information' : 'Create a new vendor/manufacturer'}
                    </Typography>
                </Box>
            </Box>

            {/* Success/Error Messages */}
            {success && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    Vendor {isEditMode ? 'updated' : 'created'} successfully! Redirecting...
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Basic Information
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={8}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Vendor Name"
                                    value={formData.vendorName}
                                    onChange={(e) => handleChange('vendorName', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Vendor Code"
                                    placeholder="e.g., VAY-001"
                                    value={formData.vendorCode}
                                    onChange={(e) => handleChange('vendorCode', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="email"
                                    label="Email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Website"
                                    placeholder="https://example.com"
                                    value={formData.website}
                                    onChange={(e) => handleChange('website', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Address
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Street Address"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="City"
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="State"
                                    value={formData.state}
                                    onChange={(e) => handleChange('state', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <TextField
                                    fullWidth
                                    label="Postal Code"
                                    value={formData.postalCode}
                                    onChange={(e) => handleChange('postalCode', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Country"
                                    value={formData.country}
                                    onChange={(e) => handleChange('country', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>

                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                Contact Persons
                            </Typography>
                            <Button
                                startIcon={<AddIcon />}
                                onClick={addContact}
                                variant="outlined"
                                size="small"
                            >
                                Add Contact
                            </Button>
                        </Box>

                        {formData.contacts && formData.contacts.length > 0 ? (
                            formData.contacts.map((contact, index) => (
                                <Box key={index} sx={{ mb: 3 }}>
                                    {index > 0 && <Divider sx={{ my: 2 }} />}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                            Contact {index + 1} {contact.isPrimary && '(Primary)'}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => removeContact(index)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                required
                                                label="Contact Name"
                                                value={contact.contactName}
                                                onChange={(e) => updateContact(index, 'contactName', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="Role/Designation"
                                                placeholder="e.g., Owner, Sales Manager"
                                                value={contact.contactRole}
                                                onChange={(e) => updateContact(index, 'contactRole', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField
                                                fullWidth
                                                label="Phone Number"
                                                value={contact.phoneNumber}
                                                onChange={(e) => updateContact(index, 'phoneNumber', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField
                                                fullWidth
                                                label="Alternate Phone"
                                                value={contact.alternatePhone}
                                                onChange={(e) => updateContact(index, 'alternatePhone', e.target.value)}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <TextField
                                                fullWidth
                                                type="email"
                                                label="Email"
                                                value={contact.email}
                                                onChange={(e) => updateContact(index, 'email', e.target.value)}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>
                            ))
                        ) : (
                            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                                No contacts added yet. Click "Add Contact" to add one.
                            </Typography>
                        )}
                    </CardContent>
                </Card>

                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Additional Notes
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Notes"
                            placeholder="Any additional information about this vendor..."
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                        />
                    </CardContent>
                </Card>

                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/vendors')}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : (isEditMode ? 'Update Vendor' : 'Create Vendor')}
                    </Button>
                </Box>
            </form>
        </Box>
    );
};

export default VendorFormPage;
