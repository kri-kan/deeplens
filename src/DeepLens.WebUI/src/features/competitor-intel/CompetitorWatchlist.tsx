import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress
} from '@mui/material';
import { Refresh as RefreshIcon, Add as AddIcon, Instagram } from '@mui/icons-material';
import { competitorService, Competitor } from '../../services/competitorService';

export const CompetitorWatchlistComp = () => {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [scraping, setScraping] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await competitorService.getWatchlist();
            setCompetitors(data);
        } catch (error) {
            console.error("Failed to load watchlist", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleScrape = async (username: string) => {
        setScraping(username);
        try {
            await competitorService.triggerScrape(username, 'instagram');
            // Wait a bit then reload (naive update)
            setTimeout(loadData, 5000);
        } catch (error) {
            console.error("Failed to trigger scrape", error);
        } finally {
            setScraping(null);
        }
    };

    const handleAdd = async () => {
        setDialogOpen(false);
        await handleScrape(newUsername);
        setNewUsername('');
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Competitor Intelligence</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setDialogOpen(true)}
                >
                    Add Competitor
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Platform</TableCell>
                            <TableCell>Account</TableCell>
                            <TableCell align="right">Followers</TableCell>
                            <TableCell align="right">Following</TableCell>
                            <TableCell>Last Scraped</TableCell>
                            <TableCell align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {competitors.map((comp) => (
                            <TableRow key={comp.id}>
                                <TableCell>
                                    <Chip
                                        icon={<Instagram />}
                                        label={comp.platform}
                                        size="small"
                                        color={comp.platform === 'instagram' ? 'secondary' : 'default'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2">@{comp.username}</Typography>
                                    <Typography variant="caption" color="textSecondary">{comp.displayName}</Typography>
                                </TableCell>
                                <TableCell align="right">
                                    {comp.followerCount?.toLocaleString() ?? '-'}
                                </TableCell>
                                <TableCell align="right">
                                    {comp.followingCount?.toLocaleString() ?? '-'}
                                </TableCell>
                                <TableCell>
                                    {comp.lastScrapedAt ? new Date(comp.lastScrapedAt).toLocaleString() : 'Never'}
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton
                                        onClick={() => handleScrape(comp.username)}
                                        disabled={scraping === comp.username}
                                    >
                                        {scraping === comp.username ? <CircularProgress size={24} /> : <RefreshIcon />}
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {competitors.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    No competitors tracked. Add one to start.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                <DialogTitle>Track New Competitor</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Instagram Username"
                        fullWidth
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAdd} variant="contained">Track & Scrape</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
