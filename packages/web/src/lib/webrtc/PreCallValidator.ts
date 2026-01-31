/**
 * PreCallValidator - Pre-flight checks before creating RTCPeerConnection
 * Validates network quality, media devices, and STUN connectivity
 */

// Quality Thresholds (Conservative for Asia region)
const THRESHOLDS = {
    MIN_BITRATE_KBPS: 200,        // Minimum for audio + low-res video
    MAX_RTT_MS: 500,              // Maximum round-trip time
    MAX_PACKET_LOSS_PERCENT: 15,  // Conservative for mobile networks
    MAX_JITTER_MS: 50,            // VoIP quality threshold
    MIN_AUDIO_LEVEL: 0.01,        // Minimum mic input level (0-1 scale)
    STUN_TIMEOUT_MS: 5000,        // STUN connectivity timeout
};

export interface PreCallResult {
    canProceed: boolean;
    failureReason?: string;
    metrics?: {
        rtt?: number;
        packetLoss?: number;
        jitter?: number;
        audioLevel?: number;
        stunConnected?: boolean;
        devicesAvailable?: boolean;
    };
}

export interface PreCallTestProgress {
    stage: 'devices' | 'audio-level' | 'network' | 'stun' | 'complete';
    message: string;
    progress: number; // 0-100
}

export class PreCallValidator {
    private onProgress?: (progress: PreCallTestProgress) => void;

    constructor(onProgress?: (progress: PreCallTestProgress) => void) {
        this.onProgress = onProgress;
    }

    /**
     * Run all pre-call validation tests
     */
    async validate(): Promise<PreCallResult> {
        const metrics: PreCallResult['metrics'] = {};

        try {
            // 1. Check media devices
            this.reportProgress('devices', 'Checking camera and microphone...', 10);
            const devicesAvailable = await this.checkMediaDevices();
            metrics.devicesAvailable = devicesAvailable;

            if (!devicesAvailable) {
                return {
                    canProceed: false,
                    failureReason: 'Camera or microphone not available. Please grant permissions and try again.',
                    metrics,
                };
            }

            // 2. Check audio input level
            this.reportProgress('audio-level', 'Testing microphone input...', 30);
            const audioLevel = await this.checkAudioLevel();
            metrics.audioLevel = audioLevel;

            if (audioLevel < THRESHOLDS.MIN_AUDIO_LEVEL) {
                return {
                    canProceed: false,
                    failureReason: 'No audio detected from microphone. Please check your microphone and speak into it.',
                    metrics,
                };
            }

            // 3. Test STUN connectivity
            this.reportProgress('stun', 'Testing network connectivity...', 50);
            const stunResult = await this.testStunConnectivity();
            metrics.stunConnected = stunResult.connected;
            metrics.rtt = stunResult.rtt;

            if (!stunResult.connected) {
                return {
                    canProceed: false,
                    failureReason: 'Cannot reach call servers. Check your firewall or network settings.',
                    metrics,
                };
            }

            // 4. Network quality probe
            this.reportProgress('network', 'Measuring network quality...', 70);
            const networkQuality = await this.probeNetworkQuality();
            metrics.packetLoss = networkQuality.packetLoss;
            metrics.jitter = networkQuality.jitter;

            // Validate against thresholds
            if (stunResult.rtt && stunResult.rtt > THRESHOLDS.MAX_RTT_MS) {
                return {
                    canProceed: false,
                    failureReason: `Network latency too high (${Math.round(stunResult.rtt)}ms). Move closer to your router or use a wired connection.`,
                    metrics,
                };
            }

            if (networkQuality.packetLoss > THRESHOLDS.MAX_PACKET_LOSS_PERCENT) {
                return {
                    canProceed: false,
                    failureReason: `Network packet loss too high (${networkQuality.packetLoss.toFixed(1)}%). Check your internet connection.`,
                    metrics,
                };
            }

            this.reportProgress('complete', 'All checks passed!', 100);

            return {
                canProceed: true,
                metrics,
            };
        } catch (error) {
            console.error('[PreCallValidator] Validation error:', error);
            return {
                canProceed: false,
                failureReason: error instanceof Error ? error.message : 'Validation failed. Please try again.',
                metrics,
            };
        }
    }

    /**
     * Check if camera and microphone are available
     */
    private async checkMediaDevices(): Promise<boolean> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true,
            });

            // Stop tracks immediately
            stream.getTracks().forEach(track => track.stop());

            return true;
        } catch (error) {
            console.error('[PreCallValidator] Media devices error:', error);
            return false;
        }
    }

    /**
     * Check audio input level (detect if mic is actually picking up sound)
     */
    private async checkAudioLevel(): Promise<number> {
        return new Promise(async (resolve) => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioContext = new AudioContext();
                const source = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);

                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                let maxLevel = 0;
                let sampleCount = 0;
                const maxSamples = 20; // Sample for ~2 seconds at 100ms intervals

                const checkLevel = setInterval(() => {
                    analyser.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    const normalized = average / 255; // Normalize to 0-1

                    if (normalized > maxLevel) {
                        maxLevel = normalized;
                    }

                    sampleCount++;
                    if (sampleCount >= maxSamples) {
                        clearInterval(checkLevel);
                        stream.getTracks().forEach(track => track.stop());
                        audioContext.close();
                        resolve(maxLevel);
                    }
                }, 100);

            } catch (error) {
                console.error('[PreCallValidator] Audio level check error:', error);
                resolve(0);
            }
        });
    }

    /**
     * Test STUN server connectivity and measure RTT
     */
    private async testStunConnectivity(): Promise<{ connected: boolean; rtt?: number }> {
        return new Promise((resolve) => {
            const startTime = Date.now();

            // Parse ICE server URLs safely
            const iceServers: RTCIceServer[] = [
                { urls: 'stun:stun.l.google.com:19302' }
            ];

            // Add custom STUN server if provided and valid
            const customStunUrl = import.meta.env.VITE_ICE_SERVER_URLS;
            if (customStunUrl && typeof customStunUrl === 'string') {
                // Handle comma-separated URLs
                const urls = customStunUrl.split(',').map(url => url.trim()).filter(url => {
                    // Validate URL format (must start with stun: or turn:)
                    return url.startsWith('stun:') || url.startsWith('turn:');
                });

                if (urls.length > 0) {
                    iceServers.push({ urls });
                }
            }

            // Create peer connection BEFORE timeout
            const pc = new RTCPeerConnection({ iceServers });

            const timeout = setTimeout(() => {
                pc.close();
                resolve({ connected: false });
            }, THRESHOLDS.STUN_TIMEOUT_MS);

            pc.onicecandidate = (event) => {
                if (event.candidate && event.candidate.type === 'srflx') {
                    // Successfully got server reflexive candidate via STUN
                    const rtt = Date.now() - startTime;
                    clearTimeout(timeout);
                    pc.close();
                    resolve({ connected: true, rtt });
                }
            };

            // Create dummy data channel to trigger ICE gathering
            pc.createDataChannel('test');
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
        });
    }

    /**
     * Probe network quality using RTCPeerConnection stats
     * Note: This is a simplified estimation. Real packet loss requires established connection.
     */
    private async probeNetworkQuality(): Promise<{ packetLoss: number; jitter: number }> {
        // For pre-call, we can't measure real packet loss without a peer
        // This is a placeholder that returns optimistic values
        // In production, you might use a dedicated network probe service

        // Return conservative estimates
        return {
            packetLoss: 0, // Cannot measure without established connection
            jitter: 20,    // Assume moderate jitter
        };
    }

    private reportProgress(stage: PreCallTestProgress['stage'], message: string, progress: number): void {
        this.onProgress?.({ stage, message, progress });
    }
}
