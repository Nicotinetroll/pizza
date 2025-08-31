// Dashboard_Loading.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Card, Flex, Text } from '@radix-ui/themes';
import { ReloadIcon } from '@radix-ui/react-icons';

const LoadingOverlay = ({ loadingState }) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(loadingState.progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [loadingState.progress]);
  
  const showProgress = loadingState.progress > 0 && loadingState.progress < 100;
  
  return (
    <AnimatePresence mode="wait">
      {showProgress && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card style={{
            background: 'rgba(20, 20, 25, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            padding: '20px',
            marginBottom: '24px',
            position: 'sticky',
            top: '0',
            zIndex: 1000,
            overflow: 'hidden'
          }}>
            <Flex align="center" justify="between" mb="3">
              <Flex align="center" gap="2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <ReloadIcon width="20" height="20" style={{ color: '#8b5cf6' }} />
                </motion.div>
                <Text size="3" weight="medium">{loadingState.message || 'Loading...'}</Text>
              </Flex>
              <Text size="3" weight="bold" style={{ color: '#8b5cf6' }}>
                {Math.round(displayProgress)}%
              </Text>
            </Flex>
            <Box style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${displayProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                  borderRadius: '4px',
                  boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
                }}
              />
            </Box>
            <Text size="1" style={{ 
              color: 'rgba(255, 255, 255, 0.5)', 
              marginTop: '8px',
              display: 'block',
              textAlign: 'center'
            }}>
              {displayProgress > 75 ? 'Almost done...' : 
               displayProgress > 50 ? 'Processing your data...' :
               displayProgress > 25 ? 'Loading order history...' :
               'Initializing...'}
            </Text>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
