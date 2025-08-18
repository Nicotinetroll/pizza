import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, TextField, Button, Flex, Text, Box, Heading } from '@radix-ui/themes';
import { LockClosedIcon, EnvelopeClosedIcon, RocketIcon } from '@radix-ui/react-icons';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0a0a0b 50%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
      />
      
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -100, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card
          size="4"
          style={{
            maxWidth: 420,
            width: '90vw',
            background: 'rgba(20, 20, 25, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Flex direction="column" gap="6">
            {/* Logo and Title */}
            <Flex direction="column" align="center" gap="3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Box
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                    boxShadow: '0 10px 40px rgba(139, 92, 246, 0.4)',
                  }}
                >
                  🍕
                </Box>
              </motion.div>
              
              <Heading size="8" style={{ 
                background: 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700
              }}>
                Quatroformaggi
              </Heading>
              
              <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Admin Dashboard
              </Text>
            </Flex>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <Flex direction="column" gap="4">
                <Box>
                  <TextField.Root
                    size="3"
                    placeholder="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <TextField.Slot>
                      <EnvelopeClosedIcon height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                <Box>
                  <TextField.Root
                    size="3"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <TextField.Slot>
                      <LockClosedIcon height="16" width="16" />
                    </TextField.Slot>
                  </TextField.Root>
                </Box>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '12px',
                    }}>
                      <Text size="2" style={{ color: '#ef4444' }}>
                        {error}
                      </Text>
                    </Card>
                  </motion.div>
                )}

                <motion.div
                  whileHover={!isLoading ? { scale: 1.02 } : {}}
                  whileTap={!isLoading ? { scale: 0.98 } : {}}
                >
                  <Button
                    size="3"
                    type="submit"
                    disabled={isLoading}
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                      fontWeight: 600,
                      height: '48px',
                      fontSize: '16px',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      width: '100%',
                      boxShadow: !isLoading ? '0 4px 20px rgba(139, 92, 246, 0.3)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.boxShadow = '0 6px 30px rgba(139, 92, 246, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.3)';
                      }
                    }}
                  >
                    <Flex align="center" gap="2" justify="center">
                      {isLoading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <RocketIcon width="18" height="18" />
                          </motion.div>
                          <Text>Authenticating...</Text>
                        </>
                      ) : (
                        <>
                          <RocketIcon width="18" height="18" />
                          <Text>Sign In</Text>
                        </>
                      )}
                    </Flex>
                  </Button>
                </motion.div>
              </Flex>
            </form>

            {/* Footer */}
            <Flex align="center" justify="center">
              <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                Secure Admin Access • 256-bit Encryption
              </Text>
            </Flex>
          </Flex>
        </Card>
      </motion.div>
    </Box>
  );
};

export default Login;
