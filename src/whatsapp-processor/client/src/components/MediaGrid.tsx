import { makeStyles, tokens, Dialog, DialogSurface, DialogBody, Button } from '@fluentui/react-components';
import { Dismiss24Regular, ChevronLeft24Regular, ChevronRight24Regular } from '@fluentui/react-icons';
import { useState } from 'react';

const useStyles = makeStyles({
    mediaGrid: {
        display: 'grid',
        gap: '2px',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '4px',
        maxWidth: '400px',
    },
    mediaGrid2: {
        gridTemplateColumns: 'repeat(2, 1fr)',
    },
    mediaGrid3: {
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'auto auto',
    },
    mediaGrid4Plus: {
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
    },
    mediaGridItem: {
        position: 'relative',
        aspectRatio: '1',
        overflow: 'hidden',
        backgroundColor: tokens.colorNeutralBackground3,
        cursor: 'pointer',
        ':hover': {
            opacity: 0.9,
        },
    },
    mediaGridItem3First: {
        gridColumn: '1 / -1',
        aspectRatio: '16 / 9',
    },
    mediaGridImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    mediaOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: '32px',
        fontWeight: 700,
        cursor: 'pointer',
        ':hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
        },
    },
    modalContent: {
        position: 'relative',
        width: '90vw',
        height: '90vh',
        maxWidth: '1200px',
        backgroundColor: tokens.colorNeutralBackground1,
        display: 'flex',
        flexDirection: 'column',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    modalBody: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: tokens.colorNeutralBackground2,
    },
    modalImage: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    },
    modalVideo: {
        maxWidth: '100%',
        maxHeight: '100%',
    },
    navButton: {
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10,
    },
    navButtonLeft: {
        left: '16px',
    },
    navButtonRight: {
        right: '16px',
    },
    thumbnailStrip: {
        display: 'flex',
        gap: '8px',
        padding: '16px',
        overflowX: 'auto',
        backgroundColor: tokens.colorNeutralBackground1,
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    thumbnail: {
        width: '80px',
        height: '80px',
        objectFit: 'cover',
        borderRadius: '4px',
        cursor: 'pointer',
        border: `2px solid transparent`,
        ':hover': {
            opacity: 0.8,
        },
    },
    thumbnailActive: {
        border: `2px solid ${tokens.colorBrandForeground1}`,
    },
});

interface MediaGridProps {
    messages: any[];
}

export default function MediaGrid({ messages }: MediaGridProps) {
    const styles = useStyles();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const count = messages.length;
    const displayCount = Math.min(count, 4);
    const remaining = count - displayCount;

    let gridClass = styles.mediaGrid;
    if (count === 2) gridClass += ` ${styles.mediaGrid2}`;
    else if (count === 3) gridClass += ` ${styles.mediaGrid3}`;
    else gridClass += ` ${styles.mediaGrid4Plus}`;

    const openModal = (index: number) => {
        setCurrentIndex(index);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : messages.length - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev < messages.length - 1 ? prev + 1 : 0));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowLeft') goToPrevious();
        if (e.key === 'ArrowRight') goToNext();
        if (e.key === 'Escape') closeModal();
    };

    return (
        <>
            <div className={gridClass}>
                {messages.slice(0, displayCount).map((msg, idx) => (
                    <div
                        key={msg.message_id}
                        className={`${styles.mediaGridItem} ${count === 3 && idx === 0 ? styles.mediaGridItem3First : ''}`}
                        onClick={() => openModal(idx)}
                    >
                        {msg.media_type === 'photo' ? (
                            <img
                                src={msg.media_url}
                                alt="Photo"
                                className={styles.mediaGridImage}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <video
                                src={msg.media_url}
                                className={styles.mediaGridImage}
                                style={{ objectFit: 'cover' }}
                            />
                        )}
                        {idx === displayCount - 1 && remaining > 0 && (
                            <div className={styles.mediaOverlay}>
                                +{remaining}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Modal Gallery */}
            <Dialog open={isModalOpen} onOpenChange={(_, data) => setIsModalOpen(data.open)}>
                <DialogSurface style={{ maxWidth: '95vw', maxHeight: '95vh', padding: 0 }}>
                    <div className={styles.modalContent} onKeyDown={handleKeyDown} tabIndex={0}>
                        <div className={styles.modalHeader}>
                            <span style={{ fontSize: '16px', fontWeight: 600 }}>
                                {currentIndex + 1} / {messages.length}
                            </span>
                            <Button
                                appearance="subtle"
                                icon={<Dismiss24Regular />}
                                onClick={closeModal}
                            />
                        </div>

                        <div className={styles.modalBody}>
                            {messages.length > 1 && (
                                <>
                                    <Button
                                        appearance="subtle"
                                        icon={<ChevronLeft24Regular />}
                                        onClick={goToPrevious}
                                        className={`${styles.navButton} ${styles.navButtonLeft}`}
                                        size="large"
                                    />
                                    <Button
                                        appearance="subtle"
                                        icon={<ChevronRight24Regular />}
                                        onClick={goToNext}
                                        className={`${styles.navButton} ${styles.navButtonRight}`}
                                        size="large"
                                    />
                                </>
                            )}

                            {messages[currentIndex]?.media_type === 'photo' ? (
                                <img
                                    src={messages[currentIndex]?.media_url}
                                    alt="Photo"
                                    className={styles.modalImage}
                                />
                            ) : (
                                <video
                                    src={messages[currentIndex]?.media_url}
                                    controls
                                    autoPlay
                                    className={styles.modalVideo}
                                />
                            )}
                        </div>

                        {/* Thumbnail Strip */}
                        {messages.length > 1 && (
                            <div className={styles.thumbnailStrip}>
                                {messages.map((msg, idx) => (
                                    <img
                                        key={msg.message_id}
                                        src={msg.media_url}
                                        alt={`Thumbnail ${idx + 1}`}
                                        className={`${styles.thumbnail} ${idx === currentIndex ? styles.thumbnailActive : ''}`}
                                        onClick={() => setCurrentIndex(idx)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </DialogSurface>
            </Dialog>
        </>
    );
}

// Helper function to group consecutive media messages
export function groupMediaMessages(messages: any[]) {
    const groups: any[][] = [];
    let currentGroup: any[] = [];
    let lastSender: string | null = null;
    let lastTimestamp: number | null = null;

    messages.forEach((msg) => {
        const isMedia = msg.media_url && (msg.media_type === 'photo' || msg.media_type === 'video');
        const isSameSender = msg.sender === lastSender;
        const isWithin5Minutes = lastTimestamp ? Math.abs(msg.timestamp - lastTimestamp) < 300 : true;

        if (isMedia && isSameSender && isWithin5Minutes) {
            currentGroup.push(msg);
        } else {
            if (currentGroup.length >= 2) {
                groups.push([...currentGroup]);
            }
            currentGroup = isMedia ? [msg] : [];
            lastSender = msg.sender;
            lastTimestamp = msg.timestamp;
        }
    });

    if (currentGroup.length >= 2) {
        groups.push(currentGroup);
    }

    return groups;
}
