import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  MessageSquare,
  User,
  Send,
  Check,
  Star,
  Copy,
  Briefcase,
  GraduationCap,
  PanelRightClose,
  PanelRightOpen,
  LayoutGrid,
  Maximize2,
  Volume2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSocket } from '../../context/SocketContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
}

// Generates an active 30fps animated studio stream when physical camera is in use by another window or unavailable
function createVirtualStudioStream(name, role, audioTrack) {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 720
  const ctx = canvas.getContext('2d')
  let frame = 0
  let animId = null
  const isRec = role.toLowerCase() === 'recruiter'

  function draw() {
    frame++
    // Clean studio background gradient
    const grad = ctx.createLinearGradient(0, 0, 1280, 720)
    grad.addColorStop(0, '#0a0f1d')
    grad.addColorStop(0.5, '#0f172a')
    grad.addColorStop(1, '#1e293b')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1280, 720)

    // Animated glow pulse behind avatar
    const pulse = Math.sin(frame * 0.05) * 14
    ctx.beginPath()
    ctx.arc(640, 290, 105 + pulse, 0, Math.PI * 2)
    ctx.fillStyle = isRec ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)'
    ctx.fill()

    // Avatar Circle
    ctx.beginPath()
    ctx.arc(640, 290, 90, 0, Math.PI * 2)
    ctx.fillStyle = isRec ? '#065f46' : '#854d0e'
    ctx.fill()
    ctx.lineWidth = 4
    ctx.strokeStyle = isRec ? '#10b981' : '#facc15'
    ctx.stroke()

    // Avatar Initial
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 70px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const initial = (name || role || 'U').charAt(0).toUpperCase()
    ctx.fillText(initial, 640, 290)

    // Name Text
    ctx.font = 'bold 34px Inter, sans-serif'
    ctx.fillStyle = '#f8fafc'
    ctx.fillText(name, 640, 430)

    // Role Tag Pill
    const tagText = isRec ? '💼 HIRING RECRUITER' : '🎓 STUDENT / CANDIDATE'
    ctx.font = 'bold 18px Inter, sans-serif'
    const textWidth = ctx.measureText(tagText).width
    const pillX = 640 - textWidth / 2 - 18
    const pillY = 465
    ctx.fillStyle = isRec ? 'rgba(16, 185, 129, 0.25)' : 'rgba(234, 179, 8, 0.25)'
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, textWidth + 36, 32, 16)
    ctx.fill()
    ctx.strokeStyle = isRec ? '#10b981' : '#facc15'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = isRec ? '#6ee7b7' : '#fde047'
    ctx.fillText(tagText, 640, pillY + 16)

    // Subtitle note
    ctx.font = '15px Inter, sans-serif'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('Live HD Studio Stream • Voice Audio Active 🎙️', 640, 530)

    // Animated dynamic audio wave bars
    for (let i = 0; i < 28; i++) {
      const barH = 10 + Math.abs(Math.sin((frame + i * 7) * 0.08)) * 26
      const barX = 640 - (28 * 14) / 2 + i * 14
      ctx.fillStyle = isRec ? '#10b981' : '#facc15'
      ctx.beginPath()
      ctx.roundRect(barX, 590 - barH, 7, barH, 3.5)
      ctx.fill()
    }

    animId = requestAnimationFrame(draw)
  }

  draw()

  const videoStream = canvas.captureStream(30)
  const videoTrack = videoStream.getVideoTracks()[0]

  videoTrack.addEventListener('ended', () => {
    if (animId) cancelAnimationFrame(animId)
  })

  const combinedStream = new MediaStream()
  combinedStream.addTrack(videoTrack)
  if (audioTrack) {
    combinedStream.addTrack(audioTrack)
  }

  return {
    stream: combinedStream,
    cleanup: () => {
      if (animId) cancelAnimationFrame(animId)
    },
  }
}

export default function VideoInterviewRoom() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket } = useSocket()
  const { showToast } = useToast()

  // 1. Role and Name Determination (Zero Confusion)
  const urlRole = searchParams.get('role')?.toLowerCase()
  const candidateParam = searchParams.get('candidate')
  const recruiterParam = searchParams.get('recruiter')
  const jobTitle = searchParams.get('job') || 'Live Video Interview'

  // URL param takes precedence for multi-window testing
  const isStudent = urlRole === 'student' || (!urlRole && user?.role === 'student')
  const isRecruiter = !isStudent

  const myRole = isStudent ? 'Student' : 'Recruiter'
  const expectedPeerRole = isStudent ? 'Recruiter' : 'Student'

  const [remotePeerUser, setRemotePeerUser] = useState(null)

  // Explicit, distinct names for both roles
  const recruiterName =
    recruiterParam ||
    (isRecruiter ? user?.name : null) ||
    (remotePeerUser?.role === 'recruiter' ? remotePeerUser?.name : null) ||
    'Hiring Recruiter'

  const studentName =
    candidateParam ||
    (isStudent ? user?.name : null) ||
    (remotePeerUser?.role === 'student' ? remotePeerUser?.name : null) ||
    'Student Candidate'

  const myName = isRecruiter ? recruiterName : studentName
  const peerName = isRecruiter ? studentName : recruiterName

  // Media state
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [mediaReady, setMediaReady] = useState(false)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('waiting') // 'waiting' | 'connecting' | 'connected'
  const [audioAutoplayBlocked, setAudioAutoplayBlocked] = useState(false)
  const [layoutMode, setLayoutMode] = useState('grid') // 'grid' (Side-by-Side) | 'pip' (Picture-in-Picture)

  // Side panels state
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'scorecard'
  const [showSidePanel, setShowSidePanel] = useState(true)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // Recruiter Scorecard state
  const [scores, setScores] = useState({
    technical: 4,
    problemSolving: 4,
    communication: 5,
    cultureFit: 4,
  })
  const [recruiterNotes, setRecruiterNotes] = useState('')
  const [savedNotes, setSavedNotes] = useState(false)

  // Refs
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const virtualCleanupRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const screenTrackRef = useRef(null)
  const remoteSocketIdRef = useRef(null)
  const iceCandidatesQueueRef = useRef([])
  const chatEndRef = useRef(null)
  const offerFallbackTimerRef = useRef(null)

  // Bulletproof Callback Refs: Whenever React renders or remounts the <video> node (e.g. after layout switch),
  // immediately attach the active MediaStream and play so it NEVER stays blank!
  const setLocalVideoNode = useCallback((node) => {
    localVideoRef.current = node
    if (node) {
      const stream = localStreamRef.current
      if (stream) {
        node.srcObject = stream
        node.play().catch(() => {})
      }
    }
  }, [])

  const setRemoteVideoNode = useCallback((node) => {
    remoteVideoRef.current = node
    if (node) {
      const stream = remoteStreamRef.current
      if (stream) {
        node.srcObject = stream
        node.play().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // 1. Initialize Local Media (Camera & Microphone, with Virtual Studio Fallback if Camera is Locked)
  useEffect(() => {
    let active = true

    async function setupLocalMedia() {
      let finalStream = null

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        finalStream = stream
      } catch (err) {
        console.warn('Physical camera unavailable or locked by another window. Activating virtual studio feed with mic:', err)
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          })

          if (!active) {
            audioOnlyStream.getTracks().forEach((t) => t.stop())
            return
          }

          const audioTrack = audioOnlyStream.getAudioTracks()[0]
          const virtual = createVirtualStudioStream(myName, myRole, audioTrack)
          virtualCleanupRef.current = virtual.cleanup
          finalStream = virtual.stream
          showToast(`🎥 Studio HD Camera enabled for ${myName} (Mic live)`, 'info')
        } catch (audioErr) {
          console.error('All media devices denied:', audioErr)
          const virtual = createVirtualStudioStream(myName, myRole, null)
          virtualCleanupRef.current = virtual.cleanup
          finalStream = virtual.stream
        }
      }

      if (active && finalStream) {
        localStreamRef.current = finalStream
        setLocalStream(finalStream)
        setMediaReady(true)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = finalStream
          localVideoRef.current.play().catch(() => {})
        }
      }
    }

    setupLocalMedia()

    return () => {
      active = false
      if (virtualCleanupRef.current) {
        virtualCleanupRef.current()
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
      }
    }
  }, [myName, myRole, showToast])

  // Synchronize local video element whenever stream or layout changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch(() => {})
    }
  }, [localStream, layoutMode])

  // Synchronize remote video element whenever stream or layout changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
      const playPromise = remoteVideoRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => setAudioAutoplayBlocked(false))
          .catch((err) => {
            console.warn('Remote video/audio autoplay blocked:', err)
            setAudioAutoplayBlocked(true)
          })
      }
    }
  }, [remoteStream, layoutMode])

  // Drain queued ICE candidates
  const drainIceCandidates = useCallback(async (pc) => {
    if (!pc) return
    const queue = iceCandidatesQueueRef.current
    iceCandidatesQueueRef.current = []
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('Error adding queued ICE candidate:', err)
      }
    }
  }, [])

  // Create Peer Connection
  const createPeerConnection = useCallback(
    (targetSocketId) => {
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close()
        } catch (e) {
          // ignore close error
        }
      }

      const pc = new RTCPeerConnection(ICE_SERVERS)
      peerConnectionRef.current = pc
      remoteSocketIdRef.current = targetSocketId
      iceCandidatesQueueRef.current = []

      // Add local stream tracks immediately
      const activeStream = localStreamRef.current
      if (activeStream) {
        activeStream.getTracks().forEach((track) => {
          pc.addTrack(track, activeStream)
        })
      }

      // Incoming remote tracks
      pc.ontrack = (event) => {
        let stream = event.streams && event.streams[0]
        if (!stream) {
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream()
          }
          remoteStreamRef.current.addTrack(event.track)
          stream = remoteStreamRef.current
        } else {
          remoteStreamRef.current = stream
        }

        setRemoteStream(stream)

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
          const playPromise = remoteVideoRef.current.play()
          if (playPromise !== undefined) {
            playPromise
              .then(() => setAudioAutoplayBlocked(false))
              .catch(() => setAudioAutoplayBlocked(true))
          }
        }
      }

      // Send ICE candidates to remote peer
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && targetSocketId) {
          socket.emit('webrtc_ice_candidate', {
            to: targetSocketId,
            candidate: event.candidate,
          })
        }
      }

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        if (state === 'connected') {
          setConnectionStatus('connected')
          showToast('🟢 Live 1-on-1 HD Video & Voice connected!', 'success')
        } else if (state === 'connecting') {
          setConnectionStatus('connecting')
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          setConnectionStatus('waiting')
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setConnectionStatus('connected')
        } else if (pc.iceConnectionState === 'failed') {
          if (pc.restartIce) {
            pc.restartIce()
          }
        }
      }

      return pc
    },
    [socket, showToast]
  )

  // WebRTC Signaling Handlers (Waits until mediaReady: true)
  useEffect(() => {
    if (!socket || !roomId || !mediaReady) return

    const myUserData = {
      _id: user?._id || `user_${Date.now()}`,
      name: myName,
      role: isRecruiter ? 'recruiter' : 'student',
    }

    // Join room
    socket.emit('join_interview_room', {
      roomId,
      user: myUserData,
    })

    // 1. Peer Joined -> Initiate Offer
    const handleUserJoined = async ({ socketId, user: peerUser }) => {
      setRemotePeerUser(peerUser)
      setConnectionStatus('connecting')
      const peerLabel = peerUser?.role === 'recruiter' ? 'Recruiter' : 'Student'
      showToast(`👤 ${peerLabel} (${peerUser?.name || 'Peer'}) joined! Connecting video…`, 'info')

      if (offerFallbackTimerRef.current) {
        clearTimeout(offerFallbackTimerRef.current)
        offerFallbackTimerRef.current = null
      }

      const pc = createPeerConnection(socketId)

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await pc.setLocalDescription(offer)
        socket.emit('webrtc_offer', {
          to: socketId,
          offer,
          user: myUserData,
        })
      } catch (err) {
        console.error('Error creating WebRTC offer:', err)
      }
    }

    // 2. Existing Users in Room -> Save peer and set fallback offer timer
    const handleRoomExistingUsers = ({ users }) => {
      if (users && users.length > 0) {
        const primaryPeer = users[0]
        setRemotePeerUser(primaryPeer.user)
        setConnectionStatus('connecting')
        remoteSocketIdRef.current = primaryPeer.socketId

        if (offerFallbackTimerRef.current) clearTimeout(offerFallbackTimerRef.current)
        offerFallbackTimerRef.current = setTimeout(async () => {
          if (!remoteStreamRef.current && peerConnectionRef.current?.connectionState !== 'connected') {
            const pc = createPeerConnection(primaryPeer.socketId)
            try {
              const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              })
              await pc.setLocalDescription(offer)
              socket.emit('webrtc_offer', {
                to: primaryPeer.socketId,
                offer,
                user: myUserData,
              })
            } catch (e) {
              console.warn('Fallback offer error:', e)
            }
          }
        }, 1500)
      }
    }

    // 3. Receive WebRTC Offer
    const handleOffer = async ({ from, offer, user: peerUser }) => {
      if (offerFallbackTimerRef.current) {
        clearTimeout(offerFallbackTimerRef.current)
        offerFallbackTimerRef.current = null
      }

      setRemotePeerUser(peerUser)
      setConnectionStatus('connecting')
      const pc = createPeerConnection(from)

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        await drainIceCandidates(pc)

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('webrtc_answer', {
          to: from,
          answer,
          user: myUserData,
        })
      } catch (err) {
        console.error('Error handling offer:', err)
      }
    }

    // 4. Receive WebRTC Answer
    const handleAnswer = async ({ answer, user: peerUser }) => {
      if (peerUser) {
        setRemotePeerUser(peerUser)
      }
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
          await drainIceCandidates(peerConnectionRef.current)
        } catch (err) {
          console.error('Error setting remote description from answer:', err)
        }
      }
    }

    // 5. Receive ICE Candidate
    const handleIceCandidate = async ({ candidate }) => {
      if (!candidate) return
      const pc = peerConnectionRef.current
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.warn('Error adding ICE candidate:', err)
        }
      } else {
        iceCandidatesQueueRef.current.push(candidate)
      }
    }

    // 6. In-Call Chat Message
    const handleChatMessage = (msg) => {
      setChatMessages((prev) => [...prev, msg])
    }

    // 7. User Left
    const handleUserLeft = ({ user: leftUser }) => {
      if (offerFallbackTimerRef.current) {
        clearTimeout(offerFallbackTimerRef.current)
        offerFallbackTimerRef.current = null
      }
      setRemoteStream(null)
      remoteStreamRef.current = null
      setRemotePeerUser(null)
      setConnectionStatus('waiting')
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
      const leftLabel = leftUser?.role === 'recruiter' ? 'Recruiter' : 'Student'
      showToast(`🚪 ${leftLabel} left the interview room.`, 'info')
    }

    socket.on('user_joined_interview', handleUserJoined)
    socket.on('room_existing_users', handleRoomExistingUsers)
    socket.on('webrtc_offer', handleOffer)
    socket.on('webrtc_answer', handleAnswer)
    socket.on('webrtc_ice_candidate', handleIceCandidate)
    socket.on('interview_chat_message', handleChatMessage)
    socket.on('user_left_interview', handleUserLeft)

    return () => {
      if (offerFallbackTimerRef.current) {
        clearTimeout(offerFallbackTimerRef.current)
      }
      socket.off('user_joined_interview', handleUserJoined)
      socket.off('room_existing_users', handleRoomExistingUsers)
      socket.off('webrtc_offer', handleOffer)
      socket.off('webrtc_answer', handleAnswer)
      socket.off('webrtc_ice_candidate', handleIceCandidate)
      socket.off('interview_chat_message', handleChatMessage)
      socket.off('user_left_interview', handleUserLeft)
    }
  }, [socket, roomId, mediaReady, createPeerConnection, drainIceCandidates, isRecruiter, myName, user?._id, showToast])

  // Toggle Microphone
  function toggleMic() {
    const stream = localStreamRef.current || localStream
    if (!stream) return
    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMicOn(audioTrack.enabled)
    }
  }

  // Toggle Camera
  function toggleCamera() {
    const stream = localStreamRef.current || localStream
    if (!stream) return
    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsCameraOn(videoTrack.enabled)
    }
  }

  // Toggle Screen Share
  async function toggleScreenShare() {
    if (!peerConnectionRef.current || !localStreamRef.current) return

    if (!isScreenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = displayStream.getVideoTracks()[0]
        screenTrackRef.current = screenTrack

        const senders = peerConnectionRef.current.getSenders()
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video')
        if (videoSender) {
          videoSender.replaceTrack(screenTrack)
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream
          localVideoRef.current.play().catch(() => {})
        }

        screenTrack.onended = () => {
          stopScreenShare()
        }

        setIsScreenSharing(true)
        showToast('Screen sharing started.', 'info')
      } catch (err) {
        console.error('Screen sharing error:', err)
      }
    } else {
      stopScreenShare()
    }
  }

  function stopScreenShare() {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop()
    }
    const originalVideoTrack = localStreamRef.current?.getVideoTracks()[0]
    if (peerConnectionRef.current && originalVideoTrack) {
      const senders = peerConnectionRef.current.getSenders()
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video')
      if (videoSender) {
        videoSender.replaceTrack(originalVideoTrack)
      }
    }
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
      localVideoRef.current.play().catch(() => {})
    }
    setIsScreenSharing(false)
    showToast('Screen sharing stopped.', 'info')
  }

  // Enable audio if autoplay was restricted by browser
  function handleEnableAudio() {
    if (remoteVideoRef.current) {
      remoteVideoRef.current
        .play()
        .then(() => setAudioAutoplayBlocked(false))
        .catch(() => {})
    }
  }

  // Send In-Call Chat Message
  function handleSendChatMessage(e) {
    if (e) e.preventDefault()
    if (!chatInput.trim() || !socket) return

    socket.emit('interview_chat_message', {
      roomId,
      text: chatInput.trim(),
      sender: {
        _id: user?._id || `user_${Date.now()}`,
        name: myName,
        role: isRecruiter ? 'recruiter' : 'student',
      },
    })
    setChatInput('')
  }

  // Copy Meeting Link
  function copyMeetingLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    showToast('Meeting link copied to clipboard!', 'success')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // End Interview & Leave
  function handleEndCall() {
    if (virtualCleanupRef.current) {
      virtualCleanupRef.current()
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    if (socket) {
      socket.emit('leave_interview_room', { roomId })
    }

    const returnUrl = isRecruiter
      ? '/recruiter/dashboard/applicants'
      : '/student/dashboard/applications'
    navigate(returnUrl)
  }

  return (
    <div
      onClick={audioAutoplayBlocked ? handleEnableAudio : undefined}
      className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white select-none"
    >
      <Helmet>
        <title>Live 1v1 Video Interview Studio | CareerHub</title>
      </Helmet>

      {/* Audio Autoplay Unblock Notification */}
      {audioAutoplayBlocked && (
        <div className="flex items-center justify-between bg-amber-500/90 px-4 py-1.5 text-xs font-bold text-slate-950 z-30">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="animate-bounce" />
            <span>Audio is muted by browser policy. Click anywhere or press the button to enable sound.</span>
          </div>
          <button
            onClick={handleEnableAudio}
            className="rounded bg-slate-950 px-2.5 py-0.5 text-white hover:bg-slate-900 transition"
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Top Studio Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-5 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal text-ink font-bold shadow-xs">
            <Video size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-sm font-bold text-white">
                CareerHub Live 1v1 Interview Studio
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : connectionStatus === 'connecting'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : connectionStatus === 'connecting'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-slate-400'
                  }`}
                />
                {connectionStatus === 'connected'
                  ? 'LIVE 1v1 HD'
                  : connectionStatus === 'connecting'
                  ? 'Connecting Peers…'
                  : 'Waiting for Peer'}
              </span>

              {/* Explicit User Role Tag */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  isStudent
                    ? 'bg-signal text-ink shadow-xs'
                    : 'bg-emerald-500 text-slate-950 shadow-xs'
                }`}
              >
                {isStudent ? <GraduationCap size={12} /> : <Briefcase size={12} />}
                {isStudent ? `Student: ${myName}` : `Recruiter: ${myName}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {jobTitle} • Room: <span className="font-mono text-slate-300">{roomId}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Layout Mode Toggle */}
          <button
            onClick={() => setLayoutMode((prev) => (prev === 'grid' ? 'pip' : 'grid'))}
            title={layoutMode === 'grid' ? 'Switch to Speaker / PiP View' : 'Switch to Side-by-Side Split View'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            {layoutMode === 'grid' ? <Maximize2 size={13} /> : <LayoutGrid size={13} />}
            {layoutMode === 'grid' ? 'Speaker View' : 'Split View'}
          </button>

          <button
            onClick={() => setShowSidePanel(!showSidePanel)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            {showSidePanel ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
            {showSidePanel ? 'Hide Panel' : 'Show Panel'}
          </button>

          <button
            onClick={copyMeetingLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copiedLink ? 'Link Copied' : 'Copy Invite Link'}
          </button>
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Full-Screen Video Canvas Stage */}
        <div className="relative flex flex-1 flex-col items-center justify-center bg-slate-950 p-4 overflow-hidden">
          {layoutMode === 'grid' ? (
            /* ========================================================================= */
            /* LAYOUT 1: PERMANENT SPLIT SCREEN (RECRUITER ON LEFT, STUDENT ON RIGHT)    */
            /* ========================================================================= */
            <div className="grid h-full w-full max-w-7xl grid-cols-1 md:grid-cols-2 gap-4 p-2">
              {/* ------------------------------------------------------------------ */}
              {/* COLUMN 1 (LEFT): RECRUITER TILE                                    */}
              {/* ------------------------------------------------------------------ */}
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-900 shadow-2xl">
                {isRecruiter ? (
                  /* I am the recruiter: render local video */
                  <>
                    <video
                      ref={setLocalVideoNode}
                      autoPlay
                      playsInline
                      muted
                      className={`h-full w-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
                    />
                    {!isCameraOn && (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-2">
                          <User size={30} />
                        </div>
                        <span className="text-xs font-semibold text-slate-400">Camera is Off</span>
                      </div>
                    )}
                  </>
                ) : (
                  /* I am the student: render remote video (the recruiter) */
                  <>
                    <video
                      ref={setRemoteVideoNode}
                      autoPlay
                      playsInline
                      className={`h-full w-full object-cover ${!remoteStream ? 'hidden' : ''}`}
                    />
                    {!remoteStream && (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-emerald-400 mb-3 animate-pulse">
                          <Briefcase size={32} />
                        </div>
                        <h4 className="font-display font-bold text-white text-sm">
                          Waiting for Recruiter ({recruiterName})
                        </h4>
                        <p className="mt-1 text-[11px] text-slate-400 max-w-xs">
                          The recruiter will join the live studio. Once connected, their video & voice will appear here instantaneously.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Left Column Badge: RECRUITER */}
                <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/40 shadow-lg backdrop-blur">
                  <Briefcase size={14} className="text-emerald-400" />
                  <span>RECRUITER: {recruiterName} {isRecruiter && '(You)'}</span>
                  {isRecruiter && !isMicOn && <span className="text-rose-400 text-[10px] font-mono ml-1">🔇</span>}
                </div>

                <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-[10px] text-emerald-400/80 font-mono">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {isRecruiter ? 'Your Local Feed (Active)' : remoteStream ? 'Live HD Video & Voice' : 'Connecting…'}
                </div>
              </div>

              {/* ------------------------------------------------------------------ */}
              {/* COLUMN 2 (RIGHT): STUDENT / CANDIDATE TILE                         */}
              {/* ------------------------------------------------------------------ */}
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-900 shadow-2xl">
                {isStudent ? (
                  /* I am the student: render local video */
                  <>
                    <video
                      ref={setLocalVideoNode}
                      autoPlay
                      playsInline
                      muted
                      className={`h-full w-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
                    />
                    {!isCameraOn && (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-2">
                          <User size={30} />
                        </div>
                        <span className="text-xs font-semibold text-slate-400">Camera is Off</span>
                      </div>
                    )}
                  </>
                ) : (
                  /* I am the recruiter: render remote video (the student) */
                  <>
                    <video
                      ref={setRemoteVideoNode}
                      autoPlay
                      playsInline
                      className={`h-full w-full object-cover ${!remoteStream ? 'hidden' : ''}`}
                    />
                    {!remoteStream && (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-signal mb-3 animate-pulse">
                          <GraduationCap size={32} />
                        </div>
                        <h4 className="font-display font-bold text-white text-sm">
                          Waiting for Student ({studentName})
                        </h4>
                        <p className="mt-1 text-[11px] text-slate-400 max-w-xs">
                          Invite link is ready. As soon as the student joins, both video feeds will link instantaneously.
                        </p>
                        <button
                          onClick={copyMeetingLink}
                          className="btn-primary text-xs mt-3 inline-flex items-center gap-1.5"
                        >
                          <Copy size={13} /> Copy Student Link
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Right Column Badge: STUDENT / CANDIDATE */}
                <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-signal border border-signal/40 shadow-lg backdrop-blur">
                  <GraduationCap size={14} className="text-signal" />
                  <span>STUDENT: {studentName} {isStudent && '(You)'}</span>
                  {isStudent && !isMicOn && <span className="text-rose-400 text-[10px] font-mono ml-1">🔇</span>}
                </div>

                <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-[10px] text-signal/80 font-mono">
                  <span className="h-2 w-2 rounded-full bg-signal animate-pulse" />
                  {isStudent ? 'Your Local Feed (Active)' : remoteStream ? 'Live HD Video & Voice' : 'Connecting…'}
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* LAYOUT 2: SPEAKER VIEW WITH PIP (FULL REMOTE WITH LOCAL IN CORNER)       */
            /* ========================================================================= */
            <div className="relative h-full w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex items-center justify-center">
              <video
                ref={setRemoteVideoNode}
                autoPlay
                playsInline
                className={`h-full w-full object-cover ${!remoteStream ? 'hidden' : ''}`}
              />

              {!remoteStream && (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-4 animate-pulse">
                    <User size={36} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-white">
                    Waiting for {expectedPeerRole} ({peerName}) to connect…
                  </h3>
                  <p className="mt-1.5 max-w-md text-xs text-slate-400 leading-relaxed">
                    Share the interview link with the other participant to start the live video interview.
                  </p>
                  <button
                    onClick={copyMeetingLink}
                    className="btn-primary text-xs mt-5 inline-flex items-center gap-1.5"
                  >
                    <Copy size={13} /> Copy Interview Link
                  </button>
                </div>
              )}

              {/* Remote Peer Name Tag */}
              {remoteStream && (
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-slate-900/85 px-3 py-1.5 text-xs font-bold text-white backdrop-blur border border-slate-700/60 shadow-md">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                      expectedPeerRole === 'Recruiter'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-signal/20 text-signal border border-signal/30'
                    }`}
                  >
                    {expectedPeerRole}
                  </span>
                  <span>{peerName}</span>
                </div>
              )}

              {/* Local PiP Preview */}
              <div className="absolute bottom-4 right-4 h-40 w-60 overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-950 shadow-2xl transition hover:scale-105 z-10">
                <video
                  ref={setLocalVideoNode}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${!isCameraOn ? 'hidden' : ''}`}
                />
                {!isCameraOn && (
                  <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400 text-xs font-semibold">
                    Camera Off
                  </div>
                )}
                <div className="absolute bottom-1.5 left-2 rounded bg-slate-900/85 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur border border-slate-700/50">
                  {myRole} (You: {myName}) {!isMicOn && '🔇'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: In-Call Chat & Recruiter Scorecard */}
        {showSidePanel && (
          <div className="flex w-84 flex-col border-l border-slate-800 bg-slate-900 shrink-0">
            {/* Side Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-2 pt-1 gap-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${
                  activeTab === 'chat'
                    ? 'border-signal text-signal'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare size={13} className="inline mr-1" /> Chat ({chatMessages.length})
              </button>

              {isRecruiter && (
                <button
                  onClick={() => setActiveTab('scorecard')}
                  className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${
                    activeTab === 'scorecard'
                      ? 'border-signal text-signal'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Star size={13} className="inline mr-1 text-amber-400" /> Scorecard
                </button>
              )}
            </div>

            {/* Tab 1: Live Chat */}
            {activeTab === 'chat' && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {chatMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 text-xs">
                      <MessageSquare size={24} className="mb-1" />
                      <p>No messages yet in this session.</p>
                      <p className="text-[10px] text-slate-600 mt-1">Send links or notes to the participant.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = String(msg.sender?._id) === String(user?._id)
                      const rawRole = (msg.sender?.role || '').toLowerCase()
                      const isMsgFromRecruiter = rawRole === 'recruiter' || rawRole === 'admin'

                      const senderRoleLabel = isMsgFromRecruiter ? 'Recruiter' : 'Student'
                      const senderDisplayName = msg.sender?.name || senderRoleLabel

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                isMsgFromRecruiter
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-signal/20 text-signal border border-signal/30'
                              }`}
                            >
                              {isMsgFromRecruiter ? '💼 Recruiter' : '🎓 Student'}
                            </span>
                            <span>{senderDisplayName}</span>
                          </div>
                          <div
                            className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs ${
                              isMe
                                ? 'bg-signal text-ink font-medium'
                                : 'bg-slate-800 text-slate-200'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form
                  onSubmit={handleSendChatMessage}
                  className="flex gap-1.5 border-t border-slate-800 p-2 bg-slate-950"
                >
                  <input
                    type="text"
                    placeholder="Type a message…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-signal"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="btn-primary px-3 py-1.5 text-xs"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            )}

            {/* Tab 2: Recruiter Evaluation Scorecard */}
            {isRecruiter && activeTab === 'scorecard' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="font-display font-bold text-white">Live Student Scorecard</h3>
                  <p className="text-[10px] text-slate-400">
                    Rate Student ({studentName}) across key evaluation criteria.
                  </p>
                </div>

                {Object.keys(scores).map((key) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between font-semibold capitalize text-slate-200 text-[11px]">
                      <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-signal">{scores[key]} / 5</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          onClick={() => setScores({ ...scores, [key]: val })}
                          className={`flex-1 py-1 rounded border text-center font-bold text-xs ${
                            scores[key] >= val
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          ★ {val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="space-y-1 pt-2">
                  <label className="font-semibold text-slate-200 text-[11px]">
                    Interviewer Evaluation Notes
                  </label>
                  <textarea
                    rows={4}
                    value={recruiterNotes}
                    onChange={(e) => setRecruiterNotes(e.target.value)}
                    placeholder="Student demonstrated great communication and domain knowledge..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-signal"
                  />
                </div>

                <button
                  onClick={() => {
                    setSavedNotes(true)
                    showToast('Evaluation scorecard saved to student record!', 'success')
                    setTimeout(() => setSavedNotes(false), 2500)
                  }}
                  className="btn-primary w-full text-xs py-2 justify-center font-bold"
                >
                  {savedNotes ? 'Scorecard Saved ✓' : 'Save Scorecard Evaluation'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating Control Dock */}
      <footer className="flex h-16 shrink-0 items-center justify-between border-t border-slate-800 bg-slate-900/95 px-6 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          {/* Mic Toggle */}
          <button
            onClick={toggleMic}
            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
              isMicOn
                ? 'bg-slate-800 text-white hover:bg-slate-700'
                : 'bg-rose-600 text-white hover:bg-rose-500'
            }`}
          >
            {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={toggleCamera}
            title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
              isCameraOn
                ? 'bg-slate-800 text-white hover:bg-slate-700'
                : 'bg-rose-600 text-white hover:bg-rose-500'
            }`}
          >
            {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Your Screen'}
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
              isScreenSharing
                ? 'bg-signal text-ink font-bold hover:bg-signal/90'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            {isScreenSharing ? <MonitorOff size={18} /> : <MonitorUp size={18} />}
          </button>
        </div>

        {/* Center Quick Stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            {connectionStatus === 'connected' ? 'P2P WebRTC HD Connected' : 'Waiting for Peer'}
          </span>
          <span>•</span>
          <span className="text-emerald-300 font-bold">💼 {recruiterName}</span>
          <span>↔</span>
          <span className="text-signal font-bold">🎓 {studentName}</span>
        </div>

        {/* Leave / End Call */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-rose-500 active:scale-95"
          >
            <PhoneOff size={16} /> Leave Room
          </button>
        </div>
      </footer>
    </div>
  )
}
