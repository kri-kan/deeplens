import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
} from "@mui/material";
import {
  TrendingUp,
  Business,
  People,
  Image as ImageIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";

const DashboardPage = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: "Total Tenants",
      value: "12",
      icon: <Business />,
      color: "#1976d2",
    },
    { title: "Active Users", value: "248", icon: <People />, color: "#2e7d32" },
    {
      title: "Images Indexed",
      value: "15,432",
      icon: <ImageIcon />,
      color: "#ed6c02",
    },
    {
      title: "API Calls Today",
      value: "3,247",
      icon: <TrendingUp />,
      color: "#9c27b0",
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontSize: { xs: "1.75rem", sm: "2.125rem" } }}
        >
          Welcome back, {user?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's what's happening with your DeepLens platform today.
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Box
                    sx={{
                      bgcolor: `${stat.color}20`,
                      color: stat.color,
                      p: 1,
                      borderRadius: 2,
                      display: "flex",
                      mr: 2,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm="auto">
            <Button variant="contained" startIcon={<Business />} fullWidth>
              Create New Tenant
            </Button>
          </Grid>
          <Grid item xs={12} sm="auto">
            <Button variant="outlined" startIcon={<People />} fullWidth>
              Manage Users
            </Button>
          </Grid>
          <Grid item xs={12} sm="auto">
            <Button variant="outlined" startIcon={<ImageIcon />} fullWidth>
              View Images
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default DashboardPage;
