import { useState, useEffect } from 'react';
import {
    makeStyles,
    tokens,
    TableBody,
    TableCell,
    TableRow,
    Table,
    TableHeader,
    TableHeaderCell,
    Switch,
    Spinner,
    Input,
    Field,
} from '@fluentui/react-components';
import { Search24Regular, Organization24Regular } from '@fluentui/react-icons';
import { fetchStatus, excludeChat, includeChat } from '../services/api.service';

const useStyles = makeStyles({
    container: {
        padding: '24px',
        backgroundColor: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusLarge,
    },
    header: {
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: '24px',
        fontWeight: 600,
        margin: 0,
    },
    searchContainer: {
        marginBottom: '20px',
    },
    table: {
        backgroundColor: tokens.colorNeutralBackground1,
    },
    jidCell: {
        color: tokens.colorNeutralForeground4,
        fontSize: '12px',
    },
    loading: {
        display: 'flex',
        justifyContent: 'center',
        padding: '40px',
    },
});

interface Community {
    id: string;
    name: string;
    isExcluded: boolean;
}

export default function CommunitiesAdminPage() {
    const styles = useStyles();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadCommunities();
    }, []);

    const loadCommunities = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/communities'); // Uses the same logic as groups but filtered
            const data = await response.json();

            // Get exclusion list to mark isExcluded
            const statusRes = await fetch('/api/tracking-states');
            const trackingStates = await statusRes.json();

            const mapped = data.map((c: any) => ({
                id: c.jid,
                name: c.name,
                isExcluded: trackingStates[c.jid]?.isExcluded || false
            }));

            setCommunities(mapped);
        } catch (err) {
            console.error('Failed to load communities admin:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleTracking = async (jid: string, isCurrentlyExcluded: boolean) => {
        try {
            if (isCurrentlyExcluded) {
                await includeChat(jid, 'from_now');
            } else {
                await excludeChat(jid);
            }
            // Optimistic update
            setCommunities(prev => prev.map(c =>
                c.id === jid ? { ...c, isExcluded: !isCurrentlyExcluded } : c
            ));
        } catch (err) {
            console.error('Failed to toggle tracking:', err);
        }
    };

    const filteredCommunities = communities.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>🏢 Communities Administration</h1>
            </div>

            <p style={{ color: tokens.colorNeutralForeground3, marginBottom: '24px' }}>
                Manage WhatsApp Communities. Enabling tracking will allow the system to process messages from all announcement groups within the community.
            </p>

            <div className={styles.searchContainer}>
                <Field label="Search Communities">
                    <Input
                        contentBefore={<Search24Regular />}
                        placeholder="Filter by name or JID..."
                        value={searchTerm}
                        onChange={(e, data) => setSearchTerm(data.value)}
                        style={{ width: '100%' }}
                    />
                </Field>
            </div>

            {loading ? (
                <div className={styles.loading}>
                    <Spinner label="Loading communities..." />
                </div>
            ) : (
                <Table className={styles.table}>
                    <TableHeader>
                        <TableRow>
                            <TableHeaderCell>Community Name</TableHeaderCell>
                            <TableHeaderCell>JID</TableHeaderCell>
                            <TableHeaderCell>Tracking</TableHeaderCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCommunities.map((community) => (
                            <TableRow key={community.id}>
                                <TableCell>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Organization24Regular />
                                        <strong>{community.name}</strong>
                                    </div>
                                </TableCell>
                                <TableCell className={styles.jidCell}>
                                    {community.id}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={!community.isExcluded}
                                        label={community.isExcluded ? 'Disabled' : 'Enabled'}
                                        onChange={() => handleToggleTracking(community.id, community.isExcluded)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {!loading && filteredCommunities.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: tokens.colorNeutralForeground4 }}>
                    No communities found.
                </div>
            )}
        </div>
    );
}
