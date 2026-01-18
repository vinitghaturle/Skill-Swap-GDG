/**
 * QualityMonitor - Monitors WebRTC connection quality
 * Tracks bitrate, packet loss, latency, and resolution
 */

import type { CallQualityMetrics } from './types';

export class QualityMonitor {
    private peerConnection: RTCPeerConnection | null = null;
    private monitoringInterval: number | null = null;
    private lastBytesReceived = 0;
    private lastBytesSent = 0;
    private lastTimestamp = 0;

    private onQualityUpdate: (metrics: CallQualityMetrics) => void;
    private updateIntervalMs: number;

    constructor(
        onQualityUpdate: (metrics: CallQualityMetrics) => void,
        updateIntervalMs = 5000 // Update every 5 seconds
    ) {
        this.onQualityUpdate = onQualityUpdate;
        this.updateIntervalMs = updateIntervalMs;
    }

    /**
     * Start monitoring a peer connection
     */
    start(peerConnection: RTCPeerConnection): void {
        this.peerConnection = peerConnection;
        this.lastTimestamp = Date.now();

        // Start monitoring loop
        this.monitoringInterval = window.setInterval(() => {
            this.collectMetrics();
        }, this.updateIntervalMs);

        console.log('[QualityMonitor] Started monitoring');
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.peerConnection = null;
        this.lastBytesReceived = 0;
        this.lastBytesSent = 0;
        this.lastTimestamp = 0;

        console.log('[QualityMonitor] Stopped monitoring');
    }

    /**
     * Collect quality metrics from peer connection
     */
    private async collectMetrics(): Promise<void> {
        if (!this.peerConnection) return;

        try {
            const stats = await this.peerConnection.getStats();
            const metrics = this.parseStats(stats);

            if (metrics) {
                this.onQualityUpdate(metrics);
            }
        } catch (error) {
            console.error('[QualityMonitor] Error collecting metrics:', error);
        }
    }

    /**
     * Parse RTCStatsReport into quality metrics
     */
    private parseStats(stats: RTCStatsReport): CallQualityMetrics | null {
        let bitrate = 0;
        let packetLoss = 0;
        let latency = 0;
        let resolution = '';

        const now = Date.now();
        const timeDelta = (now - this.lastTimestamp) / 1000; // seconds

        stats.forEach((report) => {
            // Inbound RTP (receiving video/audio)
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
                const bytesReceived = report.bytesReceived || 0;
                const bytesDelta = bytesReceived - this.lastBytesReceived;

                if (timeDelta > 0 && this.lastBytesReceived > 0) {
                    bitrate = Math.round((bytesDelta * 8) / timeDelta / 1000); // kbps
                }

                this.lastBytesReceived = bytesReceived;

                // Packet loss
                const packetsLost = report.packetsLost || 0;
                const packetsReceived = report.packetsReceived || 0;
                const totalPackets = packetsLost + packetsReceived;

                if (totalPackets > 0) {
                    packetLoss = Math.round((packetsLost / totalPackets) * 100 * 10) / 10; // percentage
                }

                // Resolution
                const frameWidth = report.frameWidth || 0;
                const frameHeight = report.frameHeight || 0;
                if (frameWidth && frameHeight) {
                    resolution = `${frameWidth}x${frameHeight}`;
                }
            }

            // Outbound RTP (sending video/audio)
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
                const bytesSent = report.bytesSent || 0;
                const bytesDelta = bytesSent - this.lastBytesSent;

                if (timeDelta > 0 && this.lastBytesSent > 0 && bitrate === 0) {
                    bitrate = Math.round((bytesDelta * 8) / timeDelta / 1000); // kbps
                }

                this.lastBytesSent = bytesSent;
            }

            // Candidate pair (for latency/RTT)
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                latency = Math.round(report.currentRoundTripTime * 1000) || 0; // ms
            }
        });

        this.lastTimestamp = now;

        // Only return if we have meaningful data
        if (bitrate === 0 && packetLoss === 0 && latency === 0) {
            return null;
        }

        const metrics: CallQualityMetrics = {
            bitrate,
            packetLoss,
            latency,
            resolution,
            lastUpdated: now,
        };

        console.log('[QualityMonitor] Metrics:', metrics);
        return metrics;
    }

    /**
     * Get current connection quality rating
     */
    getQualityRating(metrics: CallQualityMetrics): 'excellent' | 'good' | 'fair' | 'poor' {
        // Rating based on packet loss and latency
        if (metrics.packetLoss > 5 || metrics.latency > 300) {
            return 'poor';
        } else if (metrics.packetLoss > 2 || metrics.latency > 200) {
            return 'fair';
        } else if (metrics.packetLoss > 0.5 || metrics.latency > 100) {
            return 'good';
        } else {
            return 'excellent';
        }
    }

    /**
     * Check if connection is using relay (TURN)
     */
    async isUsingRelay(): Promise<boolean> {
        if (!this.peerConnection) return false;

        try {
            const stats = await this.peerConnection.getStats();

            for (const [, report] of stats) {
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    // Check local and remote candidates
                    const localCandidate = stats.get(report.localCandidateId);
                    const remoteCandidate = stats.get(report.remoteCandidateId);

                    if (localCandidate?.candidateType === 'relay' ||
                        remoteCandidate?.candidateType === 'relay') {
                        console.log('[QualityMonitor] Using TURN relay');
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error('[QualityMonitor] Error checking relay usage:', error);
        }

        return false;
    }

    /**
     * Get detailed connection statistics
     */
    async getDetailedStats(): Promise<any> {
        if (!this.peerConnection) return null;

        try {
            const stats = await this.peerConnection.getStats();
            const detailedStats: any = {
                candidates: [],
                inbound: [],
                outbound: [],
            };

            stats.forEach((report) => {
                if (report.type === 'candidate-pair') {
                    detailedStats.candidates.push({
                        state: report.state,
                        priority: report.priority,
                        nominated: report.nominated,
                        bytesSent: report.bytesSent,
                        bytesReceived: report.bytesReceived,
                    });
                } else if (report.type === 'inbound-rtp') {
                    detailedStats.inbound.push({
                        kind: report.kind,
                        bytesReceived: report.bytesReceived,
                        packetsReceived: report.packetsReceived,
                        packetsLost: report.packetsLost,
                    });
                } else if (report.type === 'outbound-rtp') {
                    detailedStats.outbound.push({
                        kind: report.kind,
                        bytesSent: report.bytesSent,
                        packetsSent: report.packetsSent,
                    });
                }
            });

            return detailedStats;
        } catch (error) {
            console.error('[QualityMonitor] Error getting detailed stats:', error);
            return null;
        }
    }
}
