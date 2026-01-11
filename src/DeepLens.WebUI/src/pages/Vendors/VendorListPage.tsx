import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    TextField,
    InputAdornment,
    Pagination,
    CircularProgress,
    Alert,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import vendorService, { Vendor } from '../../services/vendorService';

const VendorListPage: React.FC = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 20;

    useEffect(() => {
        loadVendors();
    }, [page]);

    const loadVendors = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await vendorService.listVendors(page, pageSize, true);
            setVendors(response.vendors);
            setTotalPages(response.totalPages);
            setTotalCount(response.totalCount);
        } catch (err: any) {
            setError(err.message || 'Failed to load vendors');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (vendorId: string) => {
        if (!window.confirm('Are you sure you want to delete this vendor?')) {
            return;
        }

        try {
            await vendorService.deleteVendor(vendorId);
            loadVendors();
        } catch (err: any) {
            alert('Failed to delete vendor: ' + err.message);
        }
    };

    const filteredVendors = vendors.filter((vendor) =>
        vendor.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.vendorCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Vendor Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage manufacturers and suppliers
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/vendors/new')}
                >
                    Add Vendor
                </Button>
            </Box>

            {/* Stats */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                            Total Vendors
                        </Typography>
                        <Typography variant="h4">{totalCount}</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: 1 }}>
                    <CardContent>
                        <Typography color="text.secondary" gutterBottom>
                            Active Vendors
                        </Typography>
                        <Typography variant="h4">{vendors.filter(v => v.isActive).length}</Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Search */}
            <TextField
                fullWidth
                placeholder="Search vendors by name, code, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 3 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
            />

            {/* Error */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Vendor Name</TableCell>
                                    <TableCell>Code</TableCell>
                                    <TableCell>City</TableCell>
                                    <TableCell>Contact</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredVendors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <Typography color="text.secondary" sx={{ py: 4 }}>
                                                No vendors found
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredVendors.map((vendor) => (
                                        <TableRow key={vendor.id} hover>
                                            <TableCell>
                                                <Typography variant="body1" fontWeight={500}>
                                                    {vendor.vendorName}
                                                </Typography>
                                                {vendor.email && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {vendor.email}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {vendor.vendorCode && (
                                                    <Chip label={vendor.vendorCode} size="small" />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {vendor.city && (
                                                    <Typography variant="body2">
                                                        {vendor.city}, {vendor.state}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {vendor.contacts && vendor.contacts.length > 0 && (
                                                    <Box>
                                                        <Typography variant="body2">
                                                            {vendor.contacts[0].contactName}
                                                        </Typography>
                                                        {vendor.contacts[0].phoneNumber && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {vendor.contacts[0].phoneNumber}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={vendor.isActive ? 'Active' : 'Inactive'}
                                                    color={vendor.isActive ? 'success' : 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => navigate(`/vendors/${vendor.id}`)}
                                                    title="View Details"
                                                >
                                                    <ViewIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
                                                    title="Edit"
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDelete(vendor.id!)}
                                                    title="Delete"
                                                    color="error"
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, value) => setPage(value)}
                                color="primary"
                            />
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
};

export default VendorListPage;
