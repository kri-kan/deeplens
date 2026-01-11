import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Grid,
    IconButton,
    Chip,
    Divider,
    Alert,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Language as WebsiteIcon,
    LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import vendorService, { Vendor } from '../../services/vendorService';

const VendorDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadVendor(id);
        }
    }, [id]);

    const loadVendor = async (vendorId: string) => {
        try {
            setLoading(true);
            setError(null);
            const data = await vendorService.getVendor(vendorId);
            setVendor(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load vendor');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this vendor?')) {
            return;
        }

        try {
            await vendorService.deleteVendor(id!);
            navigate('/vendors');
        } catch (err: any) {
            alert('Failed to delete vendor: ' + err.message);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !vendor) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error || 'Vendor not found'}</Alert>
                <Button onClick={() => navigate('/vendors')} sx={{ mt: 2 }}>
                    Back to Vendors
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={() => navigate('/vendors')} sx={{ mr: 2 }}>
                        <BackIcon />
                    </IconButton>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h4">
                                {vendor.vendorName}
                            </Typography>
                            {vendor.vendorCode && (
                                <Chip label={vendor.vendorCode} color="primary" />
                            )}
                            <Chip
                                label={vendor.isActive ? 'Active' : 'Inactive'}
                                color={vendor.isActive ? 'success' : 'default'}
                                size="small"
                            />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            Created: {new Date(vendor.createdAt!).toLocaleDateString()}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/vendors/${id}/edit`)}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleDelete}
                    >
                        Delete
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Contact Information */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Contact Information
                            </Typography>
                            <List>
                                {vendor.email && (
                                    <ListItem>
                                        <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
                                        <ListItemText
                                            primary="Email"
                                            secondary={
                                                <a href={`mailto:${vendor.email}`} style={{ color: 'inherit' }}>
                                                    {vendor.email}
                                                </a>
                                            }
                                        />
                                    </ListItem>
                                )}
                                {vendor.website && (
                                    <ListItem>
                                        <WebsiteIcon sx={{ mr: 2, color: 'text.secondary' }} />
                                        <ListItemText
                                            primary="Website"
                                            secondary={
                                                <a href={vendor.website} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                                                    {vendor.website}
                                                </a>
                                            }
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Address */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Address
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                <LocationIcon sx={{ mr: 2, mt: 0.5, color: 'text.secondary' }} />
                                <Box>
                                    {vendor.address && (
                                        <Typography variant="body2">{vendor.address}</Typography>
                                    )}
                                    <Typography variant="body2">
                                        {[vendor.city, vendor.state, vendor.postalCode].filter(Boolean).join(', ')}
                                    </Typography>
                                    {vendor.country && (
                                        <Typography variant="body2">{vendor.country}</Typography>
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Contact Persons */}
                {vendor.contacts && vendor.contacts.length > 0 && (
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Contact Persons
                                </Typography>
                                <Grid container spacing={2}>
                                    {vendor.contacts.map((contact, index) => (
                                        <Grid item xs={12} md={6} key={contact.id || index}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                        <Typography variant="subtitle1" fontWeight={600}>
                                                            {contact.contactName}
                                                        </Typography>
                                                        {contact.isPrimary && (
                                                            <Chip label="Primary" size="small" color="primary" />
                                                        )}
                                                    </Box>
                                                    {contact.contactRole && (
                                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                                            {contact.contactRole}
                                                        </Typography>
                                                    )}
                                                    <Divider sx={{ my: 1 }} />
                                                    {contact.phoneNumber && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                                            <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                                            <Typography variant="body2">
                                                                <a href={`tel:${contact.phoneNumber}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                                                    {contact.phoneNumber}
                                                                </a>
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {contact.alternatePhone && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                                            <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                                            <Typography variant="body2">
                                                                <a href={`tel:${contact.alternatePhone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                                                    {contact.alternatePhone}
                                                                </a>
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    {contact.email && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                                            <Typography variant="body2">
                                                                <a href={`mailto:${contact.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                                                    {contact.email}
                                                                </a>
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* Notes */}
                {vendor.notes && (
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Notes
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                    {vendor.notes}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default VendorDetailPage;
