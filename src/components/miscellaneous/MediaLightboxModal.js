import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  IconButton,
  Flex,
  Box,
  Image,
  Text,
  Button,
} from "@chakra-ui/react";
import { CloseIcon, DownloadIcon } from "@chakra-ui/icons";

const ZoomInIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const RotateIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const MediaLightboxModal = ({ isOpen, onClose, mediaUrl, mediaType = "image", mediaName = "media" }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!mediaUrl) return;
    const a = document.createElement("a");
    a.href = mediaUrl;
    a.download = mediaName || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" isCentered>
      <ModalOverlay bg="rgba(0, 0, 0, 0.88)" backdropFilter="blur(12px)" />
      <ModalContent bg="transparent" boxShadow="none" p={0} m={0} overflow="hidden">
        {/* Top Control Bar */}
        <Flex
          position="absolute"
          top={0}
          left={0}
          right={0}
          p={4}
          justify="space-between"
          align="center"
          zIndex={20}
          bg="linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)"
        >
          <Text color="white" fontWeight="600" fontSize="sm" noOfLines={1}>
            {mediaName || "Media Preview"}
          </Text>

          <Flex align="center" gap={2}>
            {mediaType === "image" && (
              <>
                <IconButton
                  icon={<ZoomInIcon />}
                  aria-label="Zoom In"
                  size="sm"
                  colorScheme="whiteAlpha"
                  onClick={handleZoomIn}
                />
                <IconButton
                  icon={<ZoomOutIcon />}
                  aria-label="Zoom Out"
                  size="sm"
                  colorScheme="whiteAlpha"
                  onClick={handleZoomOut}
                />
                <IconButton
                  icon={<RotateIcon />}
                  aria-label="Rotate"
                  size="sm"
                  colorScheme="whiteAlpha"
                  onClick={handleRotate}
                />
                <Button size="xs" colorScheme="whiteAlpha" onClick={handleReset}>
                  Reset
                </Button>
              </>
            )}
            <IconButton
              icon={<DownloadIcon />}
              aria-label="Download"
              size="sm"
              colorScheme="teal"
              onClick={handleDownload}
            />
            <IconButton
              icon={<CloseIcon />}
              aria-label="Close"
              size="sm"
              colorScheme="red"
              onClick={onClose}
            />
          </Flex>
        </Flex>

        {/* Media Container */}
        <ModalBody
          display="flex"
          alignItems="center"
          justifyContent="center"
          p={0}
          h="100vh"
          w="100vw"
          overflow="auto"
          onClick={onClose}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              maxWidth: "90vw",
              maxHeight: "85vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mediaType === "video" ? (
              <video
                src={mediaUrl}
                controls
                autoPlay
                style={{
                  maxWidth: "90vw",
                  maxHeight: "85vh",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                }}
              />
            ) : (
              <Image
                src={mediaUrl}
                alt="Fullscreen Preview"
                maxW="90vw"
                maxH="85vh"
                objectFit="contain"
                borderRadius="8px"
                boxShadow="0 8px 32px rgba(0,0,0,0.6)"
              />
            )}
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default MediaLightboxModal;
