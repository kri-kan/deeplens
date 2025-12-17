import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { tenantService } from '../../services/tenantService';

const TenantDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: tenant, isLoading, error } = useQuery(
    ['tenant', id],
    () => tenantService.getTenantById(id!),
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !tenant) {
    return (
      <Alert severity="error">
        Failed to load tenant details. Please try again later.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          fontSize: { xs: '1.75rem', sm: '2.125rem' },
          wordBreak: 'break-word'
        }}>
          {tenant.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={tenant.tier} color="primary" />
          <Chip label={tenant.status} color={tenant.status === 'Active' ? 'success' : 'default'} />
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                <ListItem>
                  <ListItemText primary="ID" secondary={tenant.id} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Slug" secondary={tenant.slug} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Description" secondary={tenant.description || 'N/A'} />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Created" 
                    secondary={new Date(tenant.createdAt).toLocaleString()} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Infrastructure
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                <ListItem>
                  <ListItemText primary="Database" secondary={tenant.databaseName} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Qdrant Container" secondary={tenant.qdrantContainerName} />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Qdrant Ports" 
                    secondary={`HTTP: ${tenant.qdrantHttpPort}, gRPC: ${tenant.qdrantGrpcPort}`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="MinIO Endpoint" secondary={tenant.minioEndpoint} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="MinIO Bucket" secondary={tenant.minioBucketName} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resource Limits
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" color="primary">
                      {(tenant.maxStorageBytes / (1024 * 1024 * 1024)).toFixed(0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      GB Storage
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" color="primary">
                      {tenant.maxUsers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Max Users
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" color="primary">
                      {(tenant.maxApiCallsPerDay / 1000).toFixed(0)}K
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      API Calls/Day
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TenantDetailPage;
