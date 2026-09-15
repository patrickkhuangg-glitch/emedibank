'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CAPTURE_CONSTRAINTS } from '@/lib/interviews/recording'
import type { LiveSignalKind } from '@/lib/interviews/live-practice'

type Signal = { id: number; sender_id: string; kind: LiveSignalKind; payload: Record<string, unknown> }

export function useLivePeer({ roomId, participantId, peerId, initiator }: { roomId: string; participantId: string; peerId?: string; initiator: boolean }) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<'idle' | 'preparing' | 'connecting' | 'connected' | 'interrupted'>('idle')
  const [error, setError] = useState('')
  const [microphoneOff, setMicrophoneOff] = useState(false), [cameraOff, setCameraOff] = useState(false)
  const localVideo = useRef<HTMLVideoElement | null>(null), remoteVideo = useRef<HTMLVideoElement | null>(null)
  const connection = useRef<RTCPeerConnection | null>(null), lastSignal = useRef(0), queuedIce = useRef<RTCIceCandidateInit[]>([])
  const offerPeer = useRef<string | undefined>(undefined)

  const attachLocalVideo = useCallback((node: HTMLVideoElement | null) => { localVideo.current = node; if (node) node.srcObject = localStream }, [localStream])
  const attachRemoteVideo = useCallback((node: HTMLVideoElement | null) => { remoteVideo.current = node; if (node) node.srcObject = remoteStream }, [remoteStream])
  useEffect(() => { if (localVideo.current) localVideo.current.srcObject = localStream }, [localStream])
  useEffect(() => { if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream }, [remoteStream])

  const prepare = useCallback(async () => {
    setError(''); setStatus('preparing')
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setStatus('idle'); setError('Camera and microphone need a secure page in a current browser.'); return false }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAPTURE_CONSTRAINTS)
      setLocalStream(previous => { previous?.getTracks().forEach(track => track.stop()); return stream })
      setMicrophoneOff(false); setCameraOff(false); setStatus(peerId ? 'connecting' : 'idle')
      return true
    } catch (caught) {
      setStatus('idle')
      setError(caught instanceof DOMException && caught.name === 'NotAllowedError' ? 'Camera or microphone is blocked. Allow both in your browser’s site controls, then try again.' : 'Camera and microphone could not start. Check your devices and try again.')
      return false
    }
  }, [peerId])

  const send = useCallback(async (kind: LiveSignalKind, payload: Record<string, unknown>, recipientId = peerId) => {
    if (!recipientId) return
    const response = await fetch(`/api/interviews/live-rooms/${encodeURIComponent(roomId)}/signals`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, payload, recipientId }) })
    if (!response.ok) throw new Error('Live connection update failed.')
  }, [peerId, roomId])

  useEffect(() => {
    if (!localStream || !peerId) return
    const stream = localStream
    let cancelled = false, timer: ReturnType<typeof setTimeout> | undefined, peer: RTCPeerConnection | null = null

    async function connect() {
      try {
        const iceResponse = await fetch(`/api/interviews/live-rooms/${encodeURIComponent(roomId)}/ice`, { cache: 'no-store' })
        const iceConfig = await iceResponse.json() as { iceServers?: RTCIceServer[] }
        if (!iceResponse.ok || !Array.isArray(iceConfig.iceServers)) throw new Error('ice_unavailable')
        if (cancelled) return
        peer = new RTCPeerConnection({ iceServers: iceConfig.iceServers, iceCandidatePoolSize: 4 })
        const activePeer = peer
        connection.current?.close(); connection.current = activePeer; queuedIce.current = []
        stream.getTracks().forEach(track => activePeer.addTrack(track, stream))
        activePeer.ontrack = event => { if (cancelled) return; const stream = event.streams[0] ?? new MediaStream([event.track]); setRemoteStream(stream) }
        activePeer.onicecandidate = event => { if (event.candidate) void send('ice', event.candidate.toJSON() as unknown as Record<string, unknown>).catch(() => setStatus('interrupted')) }
        activePeer.onconnectionstatechange = () => {
          if (cancelled) return
          if (activePeer.connectionState === 'connected') setStatus('connected')
          else if (['failed', 'disconnected', 'closed'].includes(activePeer.connectionState)) {
            setStatus('interrupted')
            if (initiator && activePeer.connectionState === 'failed' && activePeer.signalingState === 'stable') void (async () => { const offer = await activePeer.createOffer({ iceRestart: true }); await activePeer.setLocalDescription(offer); await send('offer', offer as unknown as Record<string, unknown>) })().catch(() => undefined)
          } else setStatus('connecting')
        }

        async function addQueuedIce() {
          for (const candidate of queuedIce.current.splice(0)) await activePeer.addIceCandidate(candidate).catch(() => undefined)
        }
        async function handle(signal: Signal) {
          if (signal.kind === 'offer') {
            await activePeer.setRemoteDescription(signal.payload as unknown as RTCSessionDescriptionInit)
            await addQueuedIce()
            const answer = await activePeer.createAnswer(); await activePeer.setLocalDescription(answer)
            await send('answer', answer as unknown as Record<string, unknown>, signal.sender_id)
          } else if (signal.kind === 'answer' && activePeer.signalingState === 'have-local-offer') {
            await activePeer.setRemoteDescription(signal.payload as unknown as RTCSessionDescriptionInit); await addQueuedIce()
          } else if (signal.kind === 'ice') {
            if (activePeer.remoteDescription) await activePeer.addIceCandidate(signal.payload as RTCIceCandidateInit).catch(() => undefined)
            else queuedIce.current.push(signal.payload as RTCIceCandidateInit)
          } else if (signal.kind === 'renegotiate' && initiator && activePeer.signalingState === 'stable') {
            const offer = await activePeer.createOffer(); await activePeer.setLocalDescription(offer); await send('offer', offer as unknown as Record<string, unknown>)
          }
        }
        async function poll() {
          if (cancelled) return
          try {
            const response = await fetch(`/api/interviews/live-rooms/${encodeURIComponent(roomId)}/signals?after=${lastSignal.current}`, { cache: 'no-store' })
            const result = await response.json()
            if (response.ok) for (const signal of result.signals as Signal[]) { lastSignal.current = Math.max(lastSignal.current, signal.id); await handle(signal) }
          } catch { if (!cancelled) setStatus('interrupted') }
          if (!cancelled) timer = setTimeout(poll, 700)
        }
        void poll()
        if (initiator && offerPeer.current !== peerId) {
          offerPeer.current = peerId
          const offer = await activePeer.createOffer(); await activePeer.setLocalDescription(offer); await send('offer', offer as unknown as Record<string, unknown>)
        } else if (!initiator) await send('renegotiate', {})
      } catch {
        if (!cancelled) { setStatus('interrupted'); setError('The secure live connection could not start. Please try the media check again.') }
      }
    }
    void connect()
    return () => { cancelled = true; clearTimeout(timer); if (peer) { peer.ontrack = null; peer.onicecandidate = null; peer.close(); if (connection.current === peer) connection.current = null }; setRemoteStream(null) }
  }, [initiator, localStream, participantId, peerId, roomId, send])

  useEffect(() => () => { connection.current?.close(); localStream?.getTracks().forEach(track => track.stop()) }, [localStream])
  function toggleMicrophone() { setMicrophoneOff(value => { localStream?.getAudioTracks().forEach(track => { track.enabled = value }); return !value }) }
  function toggleCamera() { setCameraOff(value => { localStream?.getVideoTracks().forEach(track => { track.enabled = value }); return !value }) }
  return { localStream, remoteStream, status, error, prepare, attachLocalVideo, attachRemoteVideo, microphoneOff, cameraOff, toggleMicrophone, toggleCamera }
}
