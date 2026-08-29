import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  Text,
  Avatar,
  IconButton,
  Button,
  Flex,
  Badge,
  Spinner,
  Tooltip,
} from "@chakra-ui/react";
import {
  PhoneIcon,
  CloseIcon,
  CheckIcon,
  DownloadIcon,
} from "@chakra-ui/icons";

// Web Audio API Ringtone & Call Tone Synthesizer
class CallToneGenerator {
  constructor() {
    this.ctx = null;
    this.timer = null;
    this.activeNodes = [];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.activeNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {}
    });
    this.activeNodes = [];
  }

  playCallingTone() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const playPulse = () => {
      if (!this.ctx || this.ctx.state === "closed") return;
      try {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.frequency.value = 440; // A4
        osc2.frequency.value = 480; // Standard ringback tone frequency
        osc1.type = "sine";
        osc2.type = "sine";

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain.gain.setValueAtTime(0.12, now + 1.2);
        gain.gain.linearRampToValueAtTime(0, now + 1.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);

        this.activeNodes.push(osc1, osc2, gain);
      } catch (e) {
        console.warn("Call tone pulse error:", e);
      }
    };

    playPulse();
    this.timer = setInterval(playPulse, 3500);
  }

  playIncomingRingtone() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const notes = [
      { freq: 523.25, dur: 0.18, delay: 0 },
      { freq: 659.25, dur: 0.18, delay: 0.2 },
      { freq: 783.99, dur: 0.25, delay: 0.4 },
      { freq: 1046.5, dur: 0.4, delay: 0.7 },
    ];

    const playChime = () => {
      if (!this.ctx || this.ctx.state === "closed") return;
      try {
        const now = this.ctx.currentTime;
        notes.forEach(({ freq, dur, delay }) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = "sine";
          osc.frequency.value = freq;

          const start = now + delay;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.15, start + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(start);
          osc.stop(start + dur);
          this.activeNodes.push(osc, gain);
        });
      } catch (e) {
        console.warn("Incoming ringtone chime error:", e);
      }
    };

    playChime();
    this.timer = setInterval(playChime, 2500);
  }
}

const toneGenerator = new CallToneGenerator();

const CallModal = ({
  isOpen,
  onClose,
  callData, // { caller, callType, status: 'calling' | 'incoming' | 'connected', isVideo }
  localStream,
  remoteStream,
  currentUser,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  isScreenSharing,
  onToggleScreenShare,
  onSendRecordedCall,
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [hasRemoteVideoTrack, setHasRemoteVideoTrack] = useState(false);
  const [hasLocalVideoTrack, setHasLocalVideoTrack] = useState(false);

  // Call Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsMuted(false);
      setIsVideoOff(false);
      setCallDuration(0);
      setIsRecording(false);
      setRecordedBlob(null);
      setRecordedUrl(null);
      setHasRemoteVideoTrack(false);
      setHasLocalVideoTrack(false);
      toneGenerator.stop();
    }
  }, [isOpen]);

  // Manage Call Ringtones based on Call Status
  useEffect(() => {
    if (!isOpen || !callData) {
      toneGenerator.stop();
      return;
    }

    if (callData.status === "calling") {
      toneGenerator.playCallingTone();
    } else if (callData.status === "incoming") {
      toneGenerator.playIncomingRingtone();
    } else if (callData.status === "connected") {
      toneGenerator.stop();
    }

    return () => {
      toneGenerator.stop();
    };
  }, [isOpen, callData?.status, callData]);

  // Timer for connected call duration
  useEffect(() => {
    let timer;
    if (callData?.status === "connected") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [callData?.status]);

  // Timer for active recording duration
  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Track local video stream active tracks
  useEffect(() => {
    if (!localStream) {
      setHasLocalVideoTrack(false);
      return;
    }

    const checkLocalVideo = () => {
      if (!localStream) {
        setHasLocalVideoTrack(false);
        return;
      }
      const vTracks = localStream.getVideoTracks();
      const hasLive = vTracks.some((t) => t.readyState === "live" && t.enabled);
      setHasLocalVideoTrack(hasLive);
    };

    checkLocalVideo();

    const vTracks = localStream.getVideoTracks();
    vTracks.forEach((t) => {
      t.onunmute = checkLocalVideo;
      t.onmute = checkLocalVideo;
      t.onended = checkLocalVideo;
    });

    localStream.onaddtrack = checkLocalVideo;
    localStream.onremovetrack = checkLocalVideo;

    return () => {
      vTracks.forEach((t) => {
        t.onunmute = null;
        t.onmute = null;
        t.onended = null;
      });
      if (localStream) {
        localStream.onaddtrack = null;
        localStream.onremovetrack = null;
      }
    };
  }, [localStream, isVideoOff, isOpen]);

  // Callback ref to bind and play local self-preview immediately when DOM node mounts
  const bindLocalVideo = useCallback(
    (videoEl) => {
      localVideoRef.current = videoEl;
      if (videoEl && localStream) {
        if (videoEl.srcObject !== localStream) {
          videoEl.srcObject = localStream;
        }
        videoEl.muted = true;
        videoEl.defaultMuted = true;
        videoEl.playsInline = true;
        videoEl.setAttribute("playsinline", "true");
        videoEl.setAttribute("webkit-playsinline", "true");
        videoEl.setAttribute("muted", "true");
        videoEl.setAttribute("autoplay", "true");
        videoEl.play().catch((e) => console.warn("Local video play notice:", e));
      }
    },
    [localStream]
  );

  // Callback ref to bind and play remote video immediately when DOM node mounts
  const bindRemoteVideo = useCallback(
    (videoEl) => {
      remoteVideoRef.current = videoEl;
      if (videoEl && remoteStream) {
        if (videoEl.srcObject !== remoteStream) {
          videoEl.srcObject = remoteStream;
        }
        videoEl.muted = true;
        videoEl.defaultMuted = true;
        videoEl.playsInline = true;
        videoEl.setAttribute("playsinline", "true");
        videoEl.setAttribute("webkit-playsinline", "true");
        videoEl.setAttribute("muted", "true");
        videoEl.setAttribute("autoplay", "true");
        videoEl.play().catch((e) => console.warn("Remote video play notice:", e));
      }
    },
    [remoteStream]
  );

  // Callback ref to bind and play remote audio immediately when DOM node mounts
  const bindRemoteAudio = useCallback(
    (audioEl) => {
      remoteAudioRef.current = audioEl;
      if (audioEl && remoteStream) {
        if (audioEl.srcObject !== remoteStream) {
          audioEl.srcObject = remoteStream;
        }
        audioEl.playsInline = true;
        audioEl.setAttribute("playsinline", "true");
        audioEl.setAttribute("autoplay", "true");
        audioEl.play().catch((e) => console.warn("Remote audio play notice:", e));
      }
    },
    [remoteStream]
  );

  // Synchronize local stream changes to self-preview video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      const el = localVideoRef.current;
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.muted = true;
      el.defaultMuted = true;
      el.playsInline = true;
      el.setAttribute("playsinline", "true");
      el.setAttribute("webkit-playsinline", "true");
      el.setAttribute("muted", "true");
      el.setAttribute("autoplay", "true");
      el.play().catch((e) => console.warn("Local video play notice:", e));
    }
  }, [localStream, isOpen, callData?.callType, callData?.status]);

  // Synchronize remote stream changes to remote audio and remote video elements
  useEffect(() => {
    if (!remoteStream) {
      setHasRemoteVideoTrack(false);
      return;
    }

    const checkVideoTracks = () => {
      if (!remoteStream) {
        setHasRemoteVideoTrack(false);
        return;
      }
      const videoTracks = remoteStream.getVideoTracks();
      const hasLiveVideo = videoTracks.some(
        (t) => t.readyState === "live" && t.enabled
      );
      setHasRemoteVideoTrack(hasLiveVideo);
    };

    checkVideoTracks();

    const videoTracks = remoteStream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.onunmute = checkVideoTracks;
      track.onmute = checkVideoTracks;
      track.onended = checkVideoTracks;
    });

    remoteStream.onaddtrack = () => {
      checkVideoTracks();
      if (remoteVideoRef.current && remoteStream) {
        const el = remoteVideoRef.current;
        el.srcObject = remoteStream;
        el.muted = true;
        el.defaultMuted = true;
        el.playsInline = true;
        el.setAttribute("playsinline", "true");
        el.setAttribute("webkit-playsinline", "true");
        el.setAttribute("muted", "true");
        el.setAttribute("autoplay", "true");
        el.play().catch(() => {});
      }
    };
    remoteStream.onremovetrack = checkVideoTracks;

    // Play remote audio via dedicated audio element
    if (remoteAudioRef.current) {
      const el = remoteAudioRef.current;
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.playsInline = true;
      el.setAttribute("playsinline", "true");
      el.setAttribute("autoplay", "true");
      el.play().catch((e) => console.warn("Remote audio play notice:", e));
    }

    // Play remote video via muted video element
    if (remoteVideoRef.current) {
      const el = remoteVideoRef.current;
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.muted = true;
      el.defaultMuted = true;
      el.playsInline = true;
      el.setAttribute("playsinline", "true");
      el.setAttribute("webkit-playsinline", "true");
      el.setAttribute("muted", "true");
      el.setAttribute("autoplay", "true");
      el.play().catch((e) => console.warn("Remote video play notice:", e));
    }

    return () => {
      videoTracks.forEach((track) => {
        track.onunmute = null;
        track.onmute = null;
        track.onended = null;
      });
      if (remoteStream) {
        remoteStream.onaddtrack = null;
        remoteStream.onremovetrack = null;
      }
    };
  }, [remoteStream, isOpen, callData?.callType, callData?.status]);

  const toggleMute = () => {
    if (localStream) {
      const newMuted = !isMuted;
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
      setIsMuted(newMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const newVideoOff = !isVideoOff;
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !newVideoOff;
      });
      setIsVideoOff(newVideoOff);
    }
  };

  const handleAccept = () => {
    toneGenerator.stop();
    toneGenerator.init(); // Prime audio context on click
    if (onAcceptCall) onAcceptCall();
  };

  const handleReject = () => {
    toneGenerator.stop();
    if (onRejectCall) onRejectCall();
  };

  const handleEnd = () => {
    toneGenerator.stop();
    if (isRecording) stopRecording();
    if (onEndCall) onEndCall();
  };

  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "";
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
      "audio/webm",
      "audio/ogg",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  };

  const startRecording = () => {
    const streamToRecord = remoteStream || localStream;
    if (!streamToRecord) {
      alert("No active media stream to record.");
      return;
    }

    try {
      recordedChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(streamToRecord, options);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = mimeType || (callData?.callType === "video" ? "video/webm" : "audio/webm");
        const blob = new Blob(recordedChunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setShowPreviewModal(true);
        setIsRecording(false);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleDownloadRecording = () => {
    if (!recordedUrl) return;
    const a = document.createElement("a");
    a.href = recordedUrl;
    const ext = recordedBlob?.type?.includes("video") ? "webm" : "webm";
    a.download = `call-recording-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendRecordingToChat = () => {
    if (!recordedBlob || !onSendRecordedCall) return;

    const reader = new FileReader();
    reader.readAsDataURL(recordedBlob);
    reader.onloadend = () => {
      const base64Data = reader.result;
      const isVideo = recordedBlob.type.includes("video");

      const attachment = {
        type: isVideo ? "video" : "audio",
        url: base64Data,
        fileName: `Call-Recording-${new Date().toLocaleTimeString()}.${isVideo ? "webm" : "webm"}`,
        fileSize: recordedBlob.size,
      };

      onSendRecordedCall({
        attachment,
        content: `🎙️ Shared a Call Recording (${formatDuration(recordingTime || callDuration)})`,
      });

      setShowPreviewModal(false);
    };
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!isOpen || !callData) return null;

  const isVideoCall = callData.callType === "video";
  const user = callData.caller || { name: "User", pic: "" };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} isCentered size={isVideoCall ? "2xl" : "md"} closeOnOverlayClick={false}>
        <ModalOverlay backdropFilter="blur(8px)" bg="rgba(0, 0, 0, 0.75)" />
        <ModalContent
          bg="var(--bg-card)"
          color="var(--text-primary)"
          borderRadius="24px"
          border="1px solid var(--color-border)"
          overflow="hidden"
          boxShadow="var(--shadow-xl)"
        >
          {/* Dedicated Off-Screen Remote Audio Receiver (Non display:none so browser audio engine never sleeps) */}
          <audio
            ref={bindRemoteAudio}
            autoPlay
            playsInline
            style={{
              position: "fixed",
              top: "-9999px",
              left: "-9999px",
              width: "1px",
              height: "1px",
              opacity: 0.01,
              pointerEvents: "none",
            }}
          />

          <ModalBody
            p={6}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            position="relative"
            minH={isVideoCall ? "480px" : "360px"}
          >
            {/* Top Status Header */}
            <Flex direction="column" align="center" mb={4} zIndex={2}>
              <Flex gap={2} align="center" mb={2}>
                <Badge
                  colorScheme={
                    callData.status === "connected"
                      ? "green"
                      : callData.status === "incoming"
                      ? "blue"
                      : "orange"
                  }
                  px={3}
                  py={1}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="bold"
                >
                  {callData.status === "connected"
                    ? `CONNECTED • ${formatDuration(callDuration)}`
                    : callData.status === "incoming"
                    ? "INCOMING CALL..."
                    : "RINGING..."}
                </Badge>

                {isRecording && (
                  <Badge colorScheme="red" px={3} py={1} borderRadius="full" fontSize="xs" display="flex" align="center" gap={1}>
                    <Box w="8px" h="8px" bg="red.500" borderRadius="50%" />
                    REC {formatDuration(recordingTime)}
                  </Badge>
                )}
              </Flex>

              <Text fontWeight="bold" fontSize="xl" color="var(--text-primary)">
                {user.name}
              </Text>
              <Text fontSize="xs" color="var(--text-secondary)">
                {isVideoCall ? "Agni Messenger HD Video Call 📹" : "Agni Messenger HD Voice Call 🎤"}
              </Text>
            </Flex>

            {/* Video or Audio Visual Area */}
            {isVideoCall ? (
              <Box
                position="relative"
                w="100%"
                h="320px"
                bg="#050505"
                borderRadius="16px"
                overflow="hidden"
                display="flex"
                alignItems="center"
                justifyContent="center"
                border="1px solid var(--color-border)"
              >
                {isScreenSharing && (
                  <Badge position="absolute" top="12px" left="12px" colorScheme="purple" px={3} py={1} borderRadius="full" zIndex={5} fontSize="xs" boxShadow="md">
                    🖥️ SCREEN SHARING ACTIVE
                  </Badge>
                )}

                {/* Remote Video Stream (Always mounted in DOM, muted so browser never blocks video frame rendering; audio plays through remoteAudioRef) */}
                <video
                  ref={bindRemoteVideo}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(e) => {
                    e.target.muted = true;
                    e.target.play().catch(() => {});
                  }}
                  onCanPlay={(e) => {
                    e.target.muted = true;
                    e.target.play().catch(() => {});
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: remoteStream && hasRemoteVideoTrack ? 1 : 0,
                    transition: "opacity 0.3s ease-in-out",
                    zIndex: 1,
                  }}
                />

                {/* Fallback Display if Remote Video is not yet received / Audio Only */}
                <Box
                  position="absolute"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  gap={3}
                  zIndex={2}
                  pointerEvents={hasRemoteVideoTrack ? "none" : "auto"}
                  opacity={remoteStream && hasRemoteVideoTrack ? 0 : 1}
                  transition="opacity 0.3s ease-in-out"
                >
                  <Avatar size="2xl" name={user.name} src={user.pic} border="3px solid var(--color-primary)" />
                  {callData.status === "connected" ? (
                    <Flex align="center" gap={2}>
                      <Box w="10px" h="10px" bg="green.400" borderRadius="50%" />
                      <Text fontSize="sm" color="whiteAlpha.900" fontWeight="medium">
                        Audio Connected (Camera Off)
                      </Text>
                    </Flex>
                  ) : (
                    <Flex align="center" gap={2}>
                      <Spinner size="sm" color="var(--color-primary)" />
                      <Text fontSize="sm" color="whiteAlpha.800">
                        {callData.status === "incoming" ? "Incoming Video Call..." : "Connecting Video Stream..."}
                      </Text>
                    </Flex>
                  )}
                </Box>

                {/* Local Self-Preview Video */}
                <Box
                  position="absolute"
                  bottom="14px"
                  right="14px"
                  w="110px"
                  h="145px"
                  bg="#111827"
                  borderRadius="12px"
                  overflow="hidden"
                  border="2px solid var(--color-primary)"
                  boxShadow="0 6px 16px rgba(0,0,0,0.6)"
                  zIndex={4}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <video
                    ref={bindLocalVideo}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => {
                      e.target.muted = true;
                      e.target.play().catch(() => {});
                    }}
                    onCanPlay={(e) => {
                      e.target.muted = true;
                      e.target.play().catch(() => {});
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: isScreenSharing ? "none" : "scaleX(-1)",
                      opacity: !isVideoOff && hasLocalVideoTrack ? 1 : 0,
                      transition: "opacity 0.2s ease-in-out",
                      zIndex: 1,
                    }}
                  />
                  {(!hasLocalVideoTrack || isVideoOff) && (
                    <Flex direction="column" align="center" justify="center" p={2} textAlign="center" zIndex={2}>
                      <Avatar size="sm" name={currentUser?.name || "You"} src={currentUser?.pic} mb={1} />
                      <Text fontSize="10px" color="whiteAlpha.700">{isVideoOff ? "📷 Off" : "Loading..."}</Text>
                    </Flex>
                  )}
                </Box>
              </Box>
            ) : (
              /* Audio Call Avatar & Pulsing Ring Visualizer */
              <Flex direction="column" align="center" justify="center" py={6} position="relative">
                <Box position="relative" display="flex" alignItems="center" justifyContent="center">
                  <Box
                    w="140px"
                    h="140px"
                    borderRadius="50%"
                    bg="var(--color-primary)"
                    opacity={callData.status === "connected" ? 0.3 : 0.15}
                    position="absolute"
                    className="pulse-ring"
                  />
                  <Avatar
                    size="2xl"
                    name={user.name}
                    src={user.pic}
                    border="4px solid var(--color-primary)"
                    boxShadow="var(--shadow-md)"
                  />
                </Box>
                {callData.status !== "connected" && (
                  <Flex align="center" gap={2} mt={5}>
                    <Spinner size="sm" color="var(--color-primary)" />
                    <Text fontSize="sm" color="var(--text-secondary)">
                      {callData.status === "incoming" ? "Incoming Voice Call..." : "Connecting HD Audio Channel..."}
                    </Text>
                  </Flex>
                )}
                {callData.status === "connected" && (
                  <Flex align="center" gap={2} mt={5}>
                    <Box w="8px" h="8px" bg="green.400" borderRadius="50%" />
                    <Text fontSize="sm" color="green.400" fontWeight="bold">
                      HD Audio Stream Live
                    </Text>
                  </Flex>
                )}
              </Flex>
            )}

            {/* Bottom Action Controls */}
            <Flex gap={3} mt={6} justify="center" align="center" zIndex={2} wrap="wrap">
              {callData.status === "incoming" ? (
                <>
                  <IconButton
                    icon={<CheckIcon fontSize="20px" />}
                    colorScheme="green"
                    aria-label="Accept Call"
                    size="lg"
                    isRound
                    w="60px"
                    h="60px"
                    boxShadow="0 4px 15px rgba(34, 197, 94, 0.4)"
                    onClick={handleAccept}
                  />
                  <IconButton
                    icon={<CloseIcon fontSize="18px" />}
                    colorScheme="red"
                    aria-label="Reject Call"
                    size="lg"
                    isRound
                    w="60px"
                    h="60px"
                    boxShadow="0 4px 15px rgba(239, 68, 68, 0.4)"
                    onClick={handleReject}
                  />
                </>
              ) : (
                <>
                  <Tooltip label={isMuted ? "Unmute Microphone" : "Mute Microphone"} hasArrow placement="top">
                    <IconButton
                      icon={<span style={{ fontSize: "20px" }}>{isMuted ? "🔇" : "🎙️"}</span>}
                      bg={isMuted ? "#ef4444" : "rgba(255,255,255,0.15)"}
                      color="white"
                      aria-label="Mute Audio"
                      size="md"
                      isRound
                      _hover={{ bg: isMuted ? "#dc2626" : "rgba(255,255,255,0.25)" }}
                      onClick={toggleMute}
                    />
                  </Tooltip>

                  {isVideoCall && (
                    <Tooltip label={isVideoOff ? "Turn Camera On" : "Turn Camera Off"} hasArrow placement="top">
                      <IconButton
                        icon={<span style={{ fontSize: "20px" }}>{isVideoOff ? "📷" : "📹"}</span>}
                        bg={isVideoOff ? "#ef4444" : "rgba(255,255,255,0.15)"}
                        color="white"
                        aria-label="Toggle Camera"
                        size="md"
                        isRound
                        _hover={{ bg: isVideoOff ? "#dc2626" : "rgba(255,255,255,0.25)" }}
                        onClick={toggleVideo}
                      />
                    </Tooltip>
                  )}

                  {/* Screen Share Button */}
                  {callData.status === "connected" && onToggleScreenShare && (
                    <Tooltip label={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"} hasArrow placement="top">
                      <IconButton
                        icon={<span style={{ fontSize: "20px" }}>🖥️</span>}
                        bg={isScreenSharing ? "#8b5cf6" : "rgba(255,255,255,0.15)"}
                        color="white"
                        aria-label="Toggle Screen Share"
                        size="md"
                        isRound
                        _hover={{ bg: isScreenSharing ? "#7c3aed" : "rgba(255,255,255,0.25)" }}
                        onClick={onToggleScreenShare}
                      />
                    </Tooltip>
                  )}

                  {/* Call Recording Button */}
                  {callData.status === "connected" && (
                    <Tooltip label={isRecording ? "Stop Recording Call" : "Record Call"} hasArrow placement="top">
                      <IconButton
                        icon={<span style={{ fontSize: "20px" }}>{isRecording ? "⏹️" : "🔴"}</span>}
                        bg={isRecording ? "#ef4444" : "rgba(255,255,255,0.15)"}
                        color="white"
                        aria-label="Toggle Call Recording"
                        size="md"
                        isRound
                        _hover={{ bg: isRecording ? "#dc2626" : "rgba(255,255,255,0.25)" }}
                        onClick={isRecording ? stopRecording : startRecording}
                      />
                    </Tooltip>
                  )}

                  <Tooltip label="End Call" hasArrow placement="top">
                    <IconButton
                      icon={<PhoneIcon transform="rotate(135deg)" fontSize="20px" />}
                      colorScheme="red"
                      aria-label="End Call"
                      size="lg"
                      isRound
                      w="60px"
                      h="60px"
                      boxShadow="0 4px 15px rgba(239, 68, 68, 0.4)"
                      onClick={handleEnd}
                    />
                  </Tooltip>
                </>
              )}
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Post-Call Recording Preview & Actions Modal */}
      <Modal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} isCentered size="lg">
        <ModalOverlay backdropFilter="blur(6px)" bg="rgba(0,0,0,0.8)" />
        <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="20px" border="1px solid var(--color-border)">
          <ModalHeader fontSize="lg" fontWeight="bold">
            📹 Call Recording Ready
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" flexDirection="column" align="center" gap={4}>
            <Text fontSize="sm" color="var(--text-secondary)">
              Your live call recording has been processed. Preview, download, or share it into your conversation.
            </Text>

            {recordedUrl && (
              <Box w="100%" maxH="280px" borderRadius="12px" overflow="hidden" bg="#000" border="1px solid var(--color-border)">
                {recordedBlob?.type?.includes("video") ? (
                  <video src={recordedUrl} controls style={{ width: "100%", maxHeight: "280px" }} />
                ) : (
                  <audio src={recordedUrl} controls style={{ width: "100%", padding: "16px" }} />
                )}
              </Box>
            )}
          </ModalBody>
          <ModalFooter gap={3}>
            <Button leftIcon={<DownloadIcon />} colorScheme="blue" variant="solid" onClick={handleDownloadRecording}>
              Download Recording
            </Button>

            {onSendRecordedCall && (
              <Button colorScheme="purple" variant="solid" onClick={handleSendRecordingToChat}>
                💬 Send to Chat
              </Button>
            )}

            <Button variant="ghost" onClick={() => setShowPreviewModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CallModal;
