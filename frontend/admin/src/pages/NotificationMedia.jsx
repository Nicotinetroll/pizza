import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box, Flex, Grid, Text, Card, Badge, Button, Heading,
    Dialog, ScrollArea, IconButton, Switch
} from '@radix-ui/themes';
import {
    ImageIcon, TrashIcon, UploadIcon, CheckCircledIcon,
    CrossCircledIcon, EyeOpenIcon, EyeNoneIcon
} from '@radix-ui/react-icons';
import { notificationsAPI } from '../services/api';

const NotificationMedia = () => {
    const [mediaList, setMediaList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [selectedType, setSelectedType] = useState('image');
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        try {
            const data = await notificationsAPI.getMedia();
            setMediaList(data.media || []);
        } catch (error) {
            console.error('Error fetching media:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Automaticky detekuj typ súboru
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension === 'gif') {
        setSelectedType('gif');
    } else {
        setSelectedType('image');
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setShowUploadDialog(true);
    };
    reader.readAsDataURL(file);
};

    const handleUpload = async () => {
        const file = fileInputRef.current?.files[0];
        if (!file) return;

        setUploading(true);
        try {
            await notificationsAPI.uploadMedia(file, selectedType);
            alert('✅ Media uploaded successfully!');
            setShowUploadDialog(false);
            setPreviewUrl(null);
            fileInputRef.current.value = '';
            fetchMedia();
        } catch (error) {
            alert('❌ Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (mediaId) => {
        if (!confirm('Delete this media?')) return;

        try {
            await notificationsAPI.deleteMedia(mediaId);
            alert('✅ Media deleted!');
            fetchMedia();
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const handleToggle = async (mediaId) => {
        try {
            const result = await notificationsAPI.toggleMedia(mediaId);
            setMediaList(mediaList.map(m => 
                m._id === mediaId ? {...m, enabled: result.enabled} : m
            ));
        } catch (error) {
            alert('❌ Error: ' + error.message);
        }
    };

    const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '');

    return (
        <Box>
            <Flex align="center" justify="between" mb="6">
                <Box>
                    <Heading size="8" weight="bold" style={{ marginBottom: '8px' }}>
                        Notification Media
                    </Heading>
                    <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        Images and GIFs for order notifications
                    </Text>
                </Box>

                <Button
                    size="3"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        cursor: 'pointer'
                    }}
                >
                    <UploadIcon width="18" height="18" />
                    Upload Media
                </Button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.gif"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            </Flex>

            <Grid columns={{ initial: '2', sm: '3', lg: '4' }} gap="4">
                {mediaList.map((media) => (
                    <motion.div
                        key={media._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -4 }}
                    >
                        <Card style={{
                            background: 'rgba(20, 20, 25, 0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            overflow: 'hidden'
                        }}>
                            <Box style={{
                                position: 'relative',
                                width: '100%',
                                paddingBottom: '100%',
                                background: 'rgba(255, 255, 255, 0.03)'
                            }}>
                                <img
                                    src={`${BASE_URL}${media.url}`}
                                    alt={media.original_name}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                                
                                {!media.enabled && (
                                    <Box style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'rgba(0, 0, 0, 0.7)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Badge size="2" color="red">Disabled</Badge>
                                    </Box>
                                )}
                            </Box>

                            <Box style={{ padding: '12px' }}>
                                <Flex align="center" justify="between" mb="2">
                                    <Badge color={media.type === 'gif' ? 'purple' : 'blue'}>
                                        {media.type.toUpperCase()}
                                    </Badge>
                                    
                                    <Switch
                                        checked={media.enabled}
                                        onCheckedChange={() => handleToggle(media._id)}
                                        size="1"
                                    />
                                </Flex>

                                <Text size="1" style={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    display: 'block',
                                    marginBottom: '8px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {media.original_name}
                                </Text>

                                <Flex gap="2">
                                    <Button
                                        size="2"
                                        variant="soft"
                                        color="red"
                                        onClick={() => handleDelete(media._id)}
                                        style={{ flex: 1 }}
                                    >
                                        <TrashIcon width="14" height="14" />
                                        Delete
                                    </Button>
                                </Flex>
                            </Box>
                        </Card>
                    </motion.div>
                ))}
            </Grid>

            <Dialog.Root open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <Dialog.Content style={{ maxWidth: 500 }}>
                    <Dialog.Title>Upload Media</Dialog.Title>
                    <Dialog.Description>Choose an image or GIF for notifications</Dialog.Description>
                    
                    {previewUrl && (
                        <Box mb="4" style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '8px',
                            padding: '16px'
                        }}>
                            <img
                                src={previewUrl}
                                alt="Preview"
                                style={{
                                    width: '100%',
                                    maxHeight: '300px',
                                    objectFit: 'contain',
                                    borderRadius: '4px'
                                }}
                            />
                        </Box>
                    )}

                    <Flex gap="3" mb="4">
                        <Button
                            size="3"
                            variant={selectedType === 'image' ? 'solid' : 'soft'}
                            onClick={() => setSelectedType('image')}
                        >
                            Image
                        </Button>
                        <Button
                            size="3"
                            variant={selectedType === 'gif' ? 'solid' : 'soft'}
                            onClick={() => setSelectedType('gif')}
                        >
                            GIF
                        </Button>
                    </Flex>

                    <Flex gap="3" justify="end">
                        <Dialog.Close>
                            <Button variant="soft">Cancel</Button>
                        </Dialog.Close>
                        <Button
                            onClick={handleUpload}
                            disabled={uploading}
                            style={{
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                            }}
                        >
                            {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>

            {mediaList.length === 0 && !loading && (
                <Card style={{
                    background: 'rgba(20, 20, 25, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '60px',
                    textAlign: 'center'
                }}>
                    <ImageIcon
                        width="48"
                        height="48"
                        style={{
                            margin: '0 auto 16px',
                            opacity: 0.3
                        }}
                    />
                    <Text size="3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        No media uploaded yet. Upload images or GIFs to use in notifications.
                    </Text>
                </Card>
            )}
        </Box>
    );
};

export default NotificationMedia;
