import { useState } from 'react';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add, Edit, Visibility, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { tenantService, CreateTenantRequest } from '../../services/tenantService';

const TenantsPage = () => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<CreateTenantRequest>({
    name: '',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
    tier: 'Free',
    description: '',
  });

  const { data: tenants, isLoading, error, refetch } = useQuery(
    'tenants',
    () => tenantService.getAllTenants()
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Free': return 'default';
      case 'Professional': return 'primary';
      case 'Enterprise': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Suspended': return 'error';
      case 'PendingSetup': return 'warning';
      case 'Deleted': return 'default';
      default: return 'default';
    }
  };

  const handleCreateTenant = async () => {
    try {
      await tenantService.createTenant(formData);
      setOpenDialog(false);
      refetch();
      // Reset form
      setFormData({
        name: '',
        adminEmail: '',
        adminPassword: '',
        adminFirstName: '',
        adminLastName: '',
        tier: 'Free',
        description: '',
      });
    } catch (error) {
      console.error('Failed to create tenant:', error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load tenants. Please try again later.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" gutterBottom>
            Tenants
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all tenant organizations and their configurations
          </Typography>
        </div>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Create Tenant
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Tier</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Users</TableCell>
                <TableCell>Storage</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants?.map((tenant) => (
                <TableRow key={tenant.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {tenant.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <code>{tenant.slug}</code>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tenant.tier}
                      color={getTierColor(tenant.tier) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tenant.status}
                      color={getStatusColor(tenant.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{tenant.maxUsers}</TableCell>
                  <TableCell>
                    {(tenant.maxStorageBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
                  </TableCell>
                  <TableCell>
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/tenants/${tenant.id}`)}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                    <IconButton size="small">
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Tenant Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Tenant</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Organization Name"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <TextField
              select
              label="Tier"
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
              fullWidth
            >
              <MenuItem value="Free">Free</MenuItem>
              <MenuItem value="Professional">Professional</MenuItem>
              <MenuItem value="Enterprise">Enterprise</MenuItem>
            </TextField>

            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Admin User Details
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="First Name"
                required
                fullWidth
                value={formData.adminFirstName}
                onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
              />
              <TextField
                label="Last Name"
                required
                fullWidth
                value={formData.adminLastName}
                onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
              />
            </Box>

            <TextField
              label="Admin Email"
              type="email"
              required
              fullWidth
              value={formData.adminEmail}
              onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
            />

            <TextField
              label="Admin Password"
              type="password"
              required
              fullWidth
              value={formData.adminPassword}
              onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateTenant} variant="contained">
            Create Tenant
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantsPage;
