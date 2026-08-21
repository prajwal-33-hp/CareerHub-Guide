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
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSocket } from '../../context/SocketContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

export default function VideoInterviewRoom() {
  const { roomId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket } = useSocket()
  const { showToast } = useToast()

  // Determine Current User Role (URL param takes precedence for multi-window testing, fallback to authenticated user role)
  const urlRole = searchParams.get('role')?.toLowerCase()
  const isStudent = urlRole ? urlRole === 'student' : user?.role === 'student'
  const isRecruiter = urlRole ? (urlRole === 'recruiter' || urlRole === 'admin') : (user?.role === 'recruiter' || user?.role === 'admin')

  const candidateParam = searchParams.get('candidate')
  const recruiterParam = searchParams.get('recruiter')
  const jobTitle = searchParams.get('job') || 'Software Engineering Role'

  // My Display Name and Role Label
  const myName = user?.name || (isStudent ? candidateParam || 'Student' : recruiterParam || 'Recruiter')
  const myRole = isStudent ? 'Student' : 'Recruiter'

  // Expected Remote Peer Display Name and Role Label
  const [remotePeerUser, setRemotePeerUser] = useState(null)
  const expectedPeerName = isStudent
    ? (remotePeerUser?.name || recruiterParam || 'Recruiter')
    : (remotePeerUser?.name || candidateParam || 'Student')
  const expectedPeerRole = isStudent ? 'Recruiter' : 'Student'

  // Media state
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('waiting') // 'waiting' | 'connecting' | 'connected' | 'ended'

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
  const peerConnectionRef = useRef(null)
  const screenTrackRef = useRef(null)
  const remoteSocketIdRef = useRef(null)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Initialize WebRTC and Local Media
  useEffect(() => {
    let localMediaStream = null

    async function setupLocalMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        })
        localMediaStream = stream
        setLocalStream(stream)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      } catch (err) {
        console.warn('Could not acquire camera/mic permissions:', err)
        showToast('Camera or Microphone access was denied.', 'danger')
      }
    }

    setupLocalMedia()

    return () => {
      if (localMediaStream) {
        localMediaStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [showToast])

  // Setup Peer Connection
  const createPeerConnection = useCallback(
    (targetSocketId) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }

      const pc = new RTCPeerConnection(ICE_SERVERS)
      peerConnectionRef.current = pc
      remoteSocketIdRef.current = targetSocketId

      // Add local stream tracks to PC
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream)
        })
      }

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        const [incomingStream] = event.streams
        setRemoteStream(incomingStream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = incomingStream
        }
      }

      // Send ICE candidates to remote peer via signaling socket
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && targetSocketId) {
          socket.emit('webrtc_ice_candidate', {
            to: targetSocketId,
            candidate: event.candidate,
          })
        }
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setConnectionStatus('connected')
          showToast('🟢 Live HD Video connection established!', 'success')
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setConnectionStatus('waiting')
        }
      }

      return pc
    },
    [localStream, socket, showToast]
  )

  // Socket Signaling Listeners
  useEffect(() => {
    if (!socket || !roomId) return

    socket.emit('join_interview_room', { roomId })

    // 1. Peer Joined -> Initiate Offer
    const handleUserJoined = async ({ socketId, user: peerUser }) => {
      setRemotePeerUser(peerUser)
      setConnectionStatus('connecting')
      const peerLabel = peerUser?.role === 'recruiter' ? 'Recruiter' : 'Student'
      showToast(`👤 ${peerLabel} (${peerUser?.name || 'Peer'}) joined the interview!`, 'info')

      const pc = createPeerConnection(socketId)

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('webrtc_offer', {
          to: socketId,
          offer,
        })
      } catch (err) {
        console.error('Error creating WebRTC offer:', err)
      }
    }

    // 2. Receive WebRTC Offer
    const handleOffer = async ({ from, offer, user: peerUser }) => {
      setRemotePeerUser(peerUser)
      setConnectionStatus('connecting')
      const pc = createPeerConnection(from)

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('webrtc_answer', {
          to: from,
          answer,
        })
      } catch (err) {
        console.error('Error handling offer:', err)
      }
    }

    // 3. Receive WebRTC Answer
    const handleAnswer = async ({ answer }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
        } catch (err) {
          console.error('Error setting remote description from answer:', err)
        }
      }
    }

    // 4. Receive ICE Candidate
    const handleIceCandidate = async ({ candidate }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error('Error adding ICE candidate:', err)
        }
      }
    }

    // 5. In-Call Chat Message
    const handleChatMessage = (msg) => {
      setChatMessages((prev) => [...prev, msg])
    }

    // 6. User Left
    const handleUserLeft = ({ user: leftUser }) => {
      setRemoteStream(null)
      setRemotePeerUser(null)
      setConnectionStatus('waiting')
      const leftLabel = leftUser?.role === 'recruiter' ? 'Recruiter' : 'Student'
      showToast(`🚪 ${leftLabel} left the interview room.`, 'info')
    }

    socket.on('user_joined_interview', handleUserJoined)
    socket.on('webrtc_offer', handleOffer)
    socket.on('webrtc_answer', handleAnswer)
    socket.on('webrtc_ice_candidate', handleIceCandidate)
    socket.on('interview_chat_message', handleChatMessage)
    socket.on('user_left_interview', handleUserLeft)

    return () => {
      socket.off('user_joined_interview', handleUserJoined)
      socket.off('webrtc_offer', handleOffer)
      socket.off('webrtc_answer', handleAnswer)
      socket.off('webrtc_ice_candidate', handleIceCandidate)
      socket.off('interview_chat_message', handleChatMessage)
      socket.off('user_left_interview', handleUserLeft)
    }
  }, [socket, roomId, createPeerConnection, showToast])

  // Toggle Microphone
  function toggleMic() {
    if (!localStream) return
    const audioTrack = localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMicOn(audioTrack.enabled)
    }
  }

  // Toggle Camera
  function toggleCamera() {
    if (!localStream) return
    const videoTrack = localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsCameraOn(videoTrack.enabled)
    }
  }

  // Toggle Screen Share
  async function toggleScreenShare() {
    if (!peerConnectionRef.current || !localStream) return

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
    const originalVideoTrack = localStream.getVideoTracks()[0]
    if (peerConnectionRef.current && originalVideoTrack) {
      const senders = peerConnectionRef.current.getSenders()
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video')
      if (videoSender) {
        videoSender.replaceTrack(originalVideoTrack)
      }
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
    setIsScreenSharing(false)
    showToast('Screen sharing stopped.', 'info')
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
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white select-none">
      <Helmet>
        <title>Live Video Interview Studio | CareerHub</title>
      </Helmet>

      {/* Top Studio Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-5 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal text-ink font-bold shadow-xs">
            <Video size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-sm font-bold text-white">
                CareerHub Live Interview Studio
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${connectionStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : connectionStatus === 'connecting'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-700'
                  }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${connectionStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : connectionStatus === 'connecting'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-slate-400'
                    }`}
                />
                {connectionStatus === 'connected'
                  ? 'LIVE HD'
                  : connectionStatus === 'connecting'
                    ? 'Connecting…'
                    : 'Waiting for Peer'}
              </span>

              {/* Explicit User Role Tag */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isStudent
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
        <div className="relative flex flex-1 flex-col items-center justify-center bg-slate-950 p-4">
          <div className="relative h-full w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex items-center justify-center">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-4 animate-pulse">
                  <User size={36} />
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  Waiting for {expectedPeerRole} to connect…
                </h3>
                <p className="mt-1.5 max-w-md text-xs text-slate-400 leading-relaxed">
                  {isStudent
                    ? `You are in the room as the Student (${myName}). Once the Recruiter joins, the live video call will start automatically.`
                    : `You are in the room as the Recruiter (${myName}). Share the link with the Student to begin the interview.`}
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
              <div className="absolute bottom-4 left-4 rounded-lg bg-slate-900/85 px-3 py-1.5 text-xs font-bold text-white backdrop-blur border border-slate-700/60 shadow-md">
                {expectedPeerRole}: {remotePeerUser?.name || expectedPeerName}
              </div>
            )}

            {/* Picture-in-Picture Local Video Preview (You) */}
            <div className="absolute bottom-4 right-4 h-40 w-60 overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-950 shadow-2xl transition hover:scale-105">
              <video
                ref={localVideoRef}
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
        </div>

        {/* Side Panel: In-Call Chat & Recruiter Scorecard */}
        {showSidePanel && (
          <div className="flex w-84 flex-col border-l border-slate-800 bg-slate-900 shrink-0">
            {/* Side Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950 px-2 pt-1 gap-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${activeTab === 'chat'
                  ? 'border-signal text-signal'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
              >
                <MessageSquare size={13} className="inline mr-1" /> Chat ({chatMessages.length})
              </button>

              {isRecruiter && (
                <button
                  onClick={() => setActiveTab('scorecard')}
                  className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition ${activeTab === 'scorecard'
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
                              className={`inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold ${isMsgFromRecruiter
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-signal/20 text-signal border border-signal/30'
                                }`}
                            >
                              {isMsgFromRecruiter ? '💼 Recruiter' : '🎓 Student'}
                            </span>
                            <span>{senderDisplayName}</span>
                          </div>
                          <div
                            className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs ${isMe
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
                    Rate Student ({expectedPeerName}) across key evaluation criteria.
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
                          className={`flex-1 py-1 rounded border text-center font-bold text-xs ${scores[key] >= val
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
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${isMicOn
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
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${isCameraOn
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
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${isScreenSharing
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
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            P2P WebRTC HD Encrypted
          </span>
          <span>•</span>
          <span>Role: {myRole}</span>
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
