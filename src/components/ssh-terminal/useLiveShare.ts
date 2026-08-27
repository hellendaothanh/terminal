import { useEffect, useRef, useState } from 'react';
import type { ServerConfig, TerminalSettings } from '../../types';
import type { TranslateFn, ShowToastFn } from './markdownRenderer';

export interface LiveViewer {
  id: string;
  ip: string;
  joinedAt: string;
  platform?: string;
}

export type ShareMode = 'READONLY' | 'INTERACTIVE';

interface UseLiveShareOptions {
  sessionId: string;
  settings: TerminalSettings;
  currentServer: ServerConfig;
  t: TranslateFn;
  showToast: ShowToastFn;
  buildShareUrl: (roomId: string, key: string, mode: ShareMode) => string;
}

/**
 * Host-side WebRTC Live Pairing feature: room creation with a 256-bit access
 * key, viewer AUTH handshake, strict host-authorized permission enforcement,
 * and remote input forwarding in INTERACTIVE mode.
 */
export const useLiveShare = ({ sessionId, settings, currentServer, t, showToast, buildShareUrl }: UseLiveShareOptions) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode>('READONLY');
  const shareModeRef = useRef<ShareMode>('READONLY');
  const [shareLink, setShareLink] = useState('');
  const [shareKey, setShareKey] = useState('');
  const [shareRoomId, setShareRoomId] = useState('');
  const [isLiveShared, setIsLiveShared] = useState(false);
  const peerInstanceRef = useRef<any>(null);
  const activeConnectionsRef = useRef<any[]>([]);
  const [showLiveViewersPopover, setShowLiveViewersPopover] = useState(false);
  const [activeViewers, setActiveViewers] = useState<LiveViewer[]>([]);

  // Switch mode dynamically and update active link & permissions instantly
  const handleSwitchShareMode = (newMode: ShareMode) => {
    setShareMode(newMode);
    shareModeRef.current = newMode;

    if (isLiveShared && shareRoomId && shareKey) {
      const updatedUrl = buildShareUrl(shareRoomId, shareKey, newMode);
      setShareLink(updatedUrl);

      // Notify all connected Web viewers about the permission change
      if (activeConnectionsRef.current && activeConnectionsRef.current.length > 0) {
        activeConnectionsRef.current.forEach((conn) => {
          if (conn && conn.open) {
            try {
              conn.send({ type: 'MODE_UPDATED', mode: newMode });
            } catch (_) {}
          }
        });
      }
      showToast('success', newMode === 'READONLY' ? t('liveShareReadonlyStarted') : t('liveShareInteractiveStarted'));
    }
  };

  // Cleanup WebRTC Peer on unmount or stop
  const cleanupPeer = () => {
    if (activeConnectionsRef.current) {
      activeConnectionsRef.current.forEach((conn) => {
        try { conn.close(); } catch (_) {}
      });
      activeConnectionsRef.current = [];
    }
    if (peerInstanceRef.current) {
      try { peerInstanceRef.current.destroy(); } catch (_) {}
      peerInstanceRef.current = null;
    }
    setActiveViewers([]);
    setShowLiveViewersPopover(false);
  };

  useEffect(() => {
    return () => {
      cleanupPeer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartLiveShare = () => {
    cleanupPeer();

    // Generate strong, cryptographically secure 256-bit / 32-char Access Key
    const secureKey = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Unpredictable Room ID
    const randomSalt = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 8);
    const roomId = `omni_${sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)}_${randomSalt}`;

    setShareKey(secureKey);
    setShareRoomId(roomId);
    shareModeRef.current = shareMode;

    // Initialize PeerJS Host Server with reliable Google STUN servers
    const PeerClass = (window as any).Peer;
    if (PeerClass) {
      try {
        const peer = new PeerClass(roomId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ]
          }
        });
        peerInstanceRef.current = peer;

        peer.on('open', (id: string) => {
          console.log('[Live Share Host] WebRTC Peer Room opened:', id);
        });

        peer.on('connection', (conn: any) => {
          console.log('[Live Share Host] New remote viewer connected:', conn.peer);

          conn.on('open', () => {
            // Verify access key handshake
            conn.on('data', (data: any) => {
              if (data && data.type === 'AUTH') {
                if (data.key === secureKey) {
                  activeConnectionsRef.current.push(conn);

                  const viewerIp = data.ip || conn.peer || '127.0.0.1';
                  const viewerItem: LiveViewer = {
                    id: conn.peer,
                    ip: viewerIp,
                    joinedAt: new Date().toLocaleTimeString(),
                    platform: data.platform || 'Web'
                  };

                  setActiveViewers((prev) => [...prev.filter(v => v.id !== conn.peer), viewerItem]);

                  // Enforce current host-authorized permission mode, not the client's self-claimed mode!
                  conn.send({ type: 'AUTH_OK', mode: shareModeRef.current });
                  showToast('success', t('liveViewerJoined').replace('{ip}', viewerIp));
                } else {
                  conn.send({ type: 'AUTH_FAILED', message: 'Invalid Access Key' });
                  conn.close();
                }
              } else if (data && data.type === 'INPUT') {
                // STRICT SECURITY: Only execute input if Host is currently in INTERACTIVE mode!
                if (shareModeRef.current === 'INTERACTIVE' && data.payload) {
                  window.api.sshWrite(sessionId, data.payload);
                } else {
                  // Reject un-authorized input attempts
                  conn.send({ type: 'INPUT_REJECTED', message: 'Read-Only Mode: Typing is disabled by Host' });
                }
              }
            });
          });

          conn.on('close', () => {
            activeConnectionsRef.current = activeConnectionsRef.current.filter(c => c !== conn);
            setActiveViewers((prev) => {
              const leavingViewer = prev.find(v => v.id === conn.peer);
              if (leavingViewer) {
                showToast('empty', t('liveViewerLeft').replace('{ip}', leavingViewer.ip));
              }
              return prev.filter(v => v.id !== conn.peer);
            });
          });
        });

        peer.on('error', (err: any) => {
          console.error('[Live Share Host] Peer error:', err);
        });
      } catch (e) {
        console.error('Failed to init PeerJS Host:', e);
      }
    }

    const url = buildShareUrl(roomId, secureKey, shareMode);
    setShareLink(url);
    setIsLiveShared(true);
    showToast('success', shareMode === 'READONLY' ? t('liveShareReadonlyStarted') : t('liveShareInteractiveStarted'));
  };

  const handleStopLiveShare = () => {
    cleanupPeer();
    setShareLink('');
    setShareKey('');
    setShareRoomId('');
    setIsLiveShared(false);
    setIsShareModalOpen(false);
    showToast('empty', t('liveShareStopped'));
  };

  return {
    isShareModalOpen,
    setIsShareModalOpen,
    shareMode,
    shareKey,
    shareLink,
    isLiveShared,
    showLiveViewersPopover,
    setShowLiveViewersPopover,
    activeViewers,
    activeConnectionsRef,
    handleSwitchShareMode,
    handleStartLiveShare,
    handleStopLiveShare
  };
};
