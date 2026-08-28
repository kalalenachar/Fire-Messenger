import React, { useEffect, useRef, useState } from "react";
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

const CallModal = ({
  isOpen,
  onClose,
  callData, // { caller, callType, status: 'calling' | 'incoming' | 'connected', isVideo }
  localStream,
  remoteStream,
  onAcceptCall,
  onRejectCall,
  onEndCall,
  isScreenSharing,
  onToggleScreenShare,
  onSendRecordedCall,
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Call Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

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

  // Bind streams to video tags
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isOpen]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isOpen]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
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
        <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="24px" border="1px solid var(--color-border)" overflow="hidden" boxShadow="var(--shadow-xl)">
          <ModalBody p={6} display="flex" flexDirection="column" alignItems="center" justifyContent="center" position="relative" minH={isVideoCall ? "480px" : "360px"}>
            
            {/* Top Status Header */}
            <Flex direction="column" align="center" mb={4} zIndex={2}>
              <Flex gap={2} align="center" mb={2}>
                <Badge colorScheme={callData.status === "connected" ? "green" : "orange"} px={3} py={1} borderRadius="full" fontSize="xs">
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
                {isVideoCall ? "Agni Messenger Video Call 📹" : "Agni Messenger HD Voice Call 🎤"}
              </Text>
            </Flex>

            {/* Video or Audio Visual Area */}
            {isVideoCall ? (
              <Box position="relative" w="100%" h="320px" bg="#000" borderRadius="16px" overflow="hidden" display="flex" alignItems="center" justifyContent="center">
                {isScreenSharing && (
                  <Badge position="absolute" top="12px" left="12px" colorScheme="purple" px={3} py={1} borderRadius="full" zIndex={4} fontSize="xs" boxShadow="md">
                    🖥️ SCREEN SHARING ACTIVE
                  </Badge>
                )}

                {/* Remote Video Stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />

                {!remoteStream && (
                  <Box position="absolute" display="flex" flexDirection="column" alignItems="center" gap={3}>
                    <Avatar size="2xl" name={user.name} src={user.pic} />
                    <Spinner size="lg" color="var(--color-primary)" />
                    <Text fontSize="sm" color="whiteAlpha.800">Waiting for video stream...</Text>
                  </Box>
                )}

                {/* Local Self-Preview Video */}
                <Box
                  position="absolute"
                  bottom="16px"
                  right="16px"
                  w="110px"
                  h="150px"
                  bg="#1e293b"
                  borderRadius="12px"
                  overflow="hidden"
                  border="2px solid var(--color-primary)"
                  boxShadow="0 4px 12px rgba(0,0,0,0.5)"
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: isScreenSharing ? "none" : "scaleX(-1)",
                    }}
                  />
                </Box>
              </Box>
            ) : (
              /* Audio Call Avatar & Pulsing Ring Visualizer */
              <Flex direction="column" align="center" justify="center" py={6} position="relative">
                <Box position="relative" display="flex" alignItems="center" justifyContent="center">
                  <Box
                    w="130px"
                    h="130px"
                    borderRadius="50%"
                    bg="var(--color-primary)"
                    opacity={0.2}
                    position="absolute"
                    className="pulse-ring"
                  />
                  <Avatar size="2xl" name={user.name} src={user.pic} border="4px solid var(--color-primary)" boxShadow="var(--shadow-md)" />
                </Box>
                {callData.status !== "connected" && (
                  <Flex align="center" gap={2} mt={4}>
                    <Spinner size="sm" color="var(--color-primary)" />
                    <Text fontSize="sm" color="var(--text-secondary)">Connecting audio channel...</Text>
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
                    onClick={onAcceptCall}
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
                    onClick={onRejectCall}
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
                      onClick={() => {
                        if (isRecording) stopRecording();
                        onEndCall();
                      }}
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
