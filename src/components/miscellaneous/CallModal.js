import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  Box,
  Text,
  Avatar,
  IconButton,
  Flex,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  PhoneIcon,
  CloseIcon,
  CheckIcon,
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
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

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

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!isOpen || !callData) return null;

  const isVideoCall = callData.callType === "video";
  const user = callData.caller || { name: "User", pic: "" };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size={isVideoCall ? "2xl" : "md"} closeOnOverlayClick={false}>
      <ModalOverlay backdropFilter="blur(8px)" bg="rgba(0, 0, 0, 0.75)" />
      <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="24px" border="1px solid var(--color-border)" overflow="hidden" boxShadow="var(--shadow-xl)">
        <ModalBody p={6} display="flex" flexDirection="column" alignItems="center" justifyContent="center" position="relative" minH={isVideoCall ? "480px" : "360px"}>
          
          {/* Top Status Header */}
          <Flex direction="column" align="center" mb={4} zIndex={2}>
            <Badge colorScheme={callData.status === "connected" ? "green" : "orange"} px={3} py={1} borderRadius="full" fontSize="xs" mb={2}>
              {callData.status === "connected"
                ? `CONNECTED • ${formatDuration(callDuration)}`
                : callData.status === "incoming"
                ? "INCOMING CALL..."
                : "RINGING..."}
            </Badge>
            <Text fontWeight="bold" fontSize="xl" color="var(--text-primary)">
              {user.name}
            </Text>
            <Text fontSize="xs" color="var(--text-secondary)">
              {isVideoCall ? "Fire Messenger Video Call 📹" : "Fire Messenger HD Voice Call 🎤"}
            </Text>
          </Flex>

          {/* Video or Audio Visual Area */}
          {isVideoCall ? (
            <Box position="relative" w="100%" h="320px" bg="#000" borderRadius="16px" overflow="hidden" display="flex" alignItems="center" justifyContent="center">
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
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
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
          <Flex gap={4} mt={6} justify="center" align="center" zIndex={2}>
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

                {isVideoCall && (
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
                )}

                <IconButton
                  icon={<PhoneIcon transform="rotate(135deg)" fontSize="20px" />}
                  colorScheme="red"
                  aria-label="End Call"
                  size="lg"
                  isRound
                  w="60px"
                  h="60px"
                  boxShadow="0 4px 15px rgba(239, 68, 68, 0.4)"
                  onClick={onEndCall}
                />
              </>
            )}
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CallModal;
