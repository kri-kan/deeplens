import { Box, Typography, Card, CardContent } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const SettingsPage = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Email: {user?.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Role: {user?.role}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tenant ID: {user?.tenantId}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SettingsPage;
