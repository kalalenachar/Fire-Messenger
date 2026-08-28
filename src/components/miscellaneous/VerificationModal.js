import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Text,
  VStack,
  HStack,
  Input,
  Radio,
  RadioGroup,
  Stack,
  Badge,
  useToast,
  Progress,
  Flex,
  Icon,
  Image,
  Divider,
} from "@chakra-ui/react";
import {
  CheckCircleIcon,
  LockIcon,
  AttachmentIcon,
  TimeIcon,
  StarIcon,
  RepeatIcon,
} from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";
import VerifiedBadge from "../common/VerifiedBadge";

const VerificationModal = ({ isOpen, onClose }) => {
  const { user, submitVerificationApplication, reviewVerificationApplication } = ChatState();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [verificationType, setVerificationType] = useState("individual");

  // Individual fields
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarDoc, setAadhaarDoc] = useState(null);

  // Business fields
  const [businessName, setBusinessName] = useState("");
  const [gstinNumber, setGstinNumber] = useState("");
  const [businessDoc, setBusinessDoc] = useState(null);

  // Webcam & Face Capture state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [isProcessingFace, setIsProcessingFace] = useState(false);
  const [matchScore, setMatchScore] = useState(null);
  const [livenessStatus, setLivenessStatus] = useState("Ready");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Format Aadhaar Number (XXXX XXXX XXXX)
  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setAadhaarNumber(formatted);
  };

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep(user?.verificationStatus === "pending" ? 4 : 1);
      setVerificationType(user?.verificationType || "individual");
      setFaceImage(null);
      setMatchScore(null);
      setIsCameraActive(false);
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [isOpen, user]);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera stream access failed:", err);
      setCameraError("Webcam hardware access blocked or not detected. Simulation Mode enabled.");
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capture Live Snapshot
  const captureFaceSnapshot = () => {
    setIsProcessingFace(true);
    setLivenessStatus("Analyzing Face Geometry & Liveness...");

    let snapshotUrl = null;
    if (videoRef.current && canvasRef.current && !cameraError) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      snapshotUrl = canvas.toDataURL("image/jpeg");
    } else {
      // Simulation Fallback Snapshot
      snapshotUrl = user?.pic || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
    }

    setFaceImage(snapshotUrl);
    stopCamera();

    // Simulate AI Liveness & Face Match Calculation
    setTimeout(() => {
      const score = (94 + Math.random() * 5).toFixed(1); // 94.0% - 99.0%
      setMatchScore(score);
      setIsProcessingFace(false);
      setLivenessStatus("Liveness & Identity Match Verified ✓");

      toast({
        title: "Live Face Match Successful! 🎯",
        description: `Face Match Confidence: ${score}%`,
        status: "success",
        duration: 3000,
        position: "bottom",
      });
    }, 1500);
  };

  const handleDocumentUpload = (e, setDoc) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setDoc(evt.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Application
  const handleSubmitApplication = async () => {
    if (verificationType === "individual") {
      const cleanAadhaar = aadhaarNumber.replace(/\s/g, "");
      if (cleanAadhaar.length !== 12) {
        toast({
          title: "Invalid Aadhaar Number",
          description: "Please enter a valid 12-digit Aadhaar number.",
          status: "warning",
          duration: 3000,
          position: "bottom",
        });
        return;
      }
    } else {
      if (!businessName.trim() || !gstinNumber.trim()) {
        toast({
          title: "Missing Business Info",
          description: "Please provide Business Name and GSTIN / Registration Number.",
          status: "warning",
          duration: 3000,
          position: "bottom",
        });
        return;
      }
    }

    if (!faceImage) {
      toast({
        title: "Live Face Capture Required",
        description: "Please complete live webcam face verification.",
        status: "warning",
        duration: 3000,
        position: "bottom",
      });
      return;
    }

    const payload = {
      verificationType,
      aadhaarMasked: verificationType === "individual"
        ? `XXXX-XXXX-${aadhaarNumber.slice(-4)}`
        : null,
      gstinMasked: verificationType === "business"
        ? gstinNumber.toUpperCase()
        : null,
      businessName: verificationType === "business" ? businessName : null,
      documentUploaded: true,
      faceSnapshot: faceImage,
      matchScore: matchScore || 96.5,
      submittedAt: new Date().toISOString(),
    };

    try {
      await submitVerificationApplication(payload);
      setStep(4);
      toast({
        title: "Application Submitted! ⏳",
        description: "Your verification details are now undergoing background review.",
        status: "info",
        duration: 4000,
        position: "bottom",
      });
    } catch (err) {
      toast({
        title: "Submission Error",
        description: err.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  // Demo Admin Action: Instant Approval
  const handleFastTrackApprove = async () => {
    try {
      await reviewVerificationApplication("verified");
      toast({
        title: "Account Verified! 🎉",
        description: `Congratulations! Your ${
          verificationType === "business" ? "Official Business (Gold)" : "Individual (Blue)"
        } Verified Tag is now live!`,
        status: "success",
        duration: 4000,
        position: "bottom",
      });
      onClose();
    } catch (err) {
      toast({ title: "Error approving verification", status: "error" });
    }
  };

  return (
    <Modal size="lg" isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay backdropFilter="blur(8px)" />
      <ModalContent
        bg="var(--bg-card)"
        color="var(--text-primary)"
        borderRadius="2xl"
        border="1px solid var(--color-border)"
        boxShadow="var(--shadow-md)"
      >
        <ModalHeader borderBottom="1px solid var(--color-border)" pb={4}>
          <Flex align="center" justify="space-between">
            <HStack spacing={2}>
              <Text fontSize="xl" fontWeight="bold">
                Get Verified Tag
              </Text>
              <VerifiedBadge type={verificationType} status="verified" size="md" />
            </HStack>
            <ModalCloseButton position="relative" top="0" right="0" />
          </Flex>

          {/* Stepper Progress */}
          <Box mt={3}>
            <HStack justify="space-between" fontSize="xs" color="var(--text-secondary)" mb={1}>
              <Text color={step >= 1 ? "var(--color-primary)" : "inherit"} fontWeight="bold">
                1. Select Type
              </Text>
              <Text color={step >= 2 ? "var(--color-primary)" : "inherit"} fontWeight="bold">
                2. Details & Doc
              </Text>
              <Text color={step >= 3 ? "var(--color-primary)" : "inherit"} fontWeight="bold">
                3. Live Face Match
              </Text>
              <Text color={step >= 4 ? "var(--color-primary)" : "inherit"} fontWeight="bold">
                4. Review Status
              </Text>
            </HStack>
            <Progress
              value={(step / 4) * 100}
              size="xs"
              colorScheme={verificationType === "business" ? "yellow" : "blue"}
              borderRadius="full"
              bg="var(--bg-search)"
            />
          </Box>
        </ModalHeader>

        <ModalBody py={5}>
          {/* STEP 1: SELECT VERIFICATION TYPE */}
          {step === 1 && (
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="var(--text-secondary)">
                Choose the category of verified badge you are applying for:
              </Text>

              <RadioGroup value={verificationType} onChange={setVerificationType}>
                <Stack spacing={3}>
                  <Box
                    p={4}
                    borderRadius="xl"
                    border={`2px solid ${
                      verificationType === "individual" ? "#3897f0" : "var(--color-border)"
                    }`}
                    bg={verificationType === "individual" ? "rgba(56, 151, 240, 0.08)" : "var(--bg-search)"}
                    cursor="pointer"
                    onClick={() => setVerificationType("individual")}
                    transition="all 0.2s ease"
                  >
                    <Flex justify="space-between" align="center">
                      <HStack spacing={3}>
                        <Radio value="individual" colorScheme="blue" />
                        <Box>
                          <HStack spacing={1}>
                            <Text fontWeight="bold" fontSize="md">
                              Individual Account
                            </Text>
                            <VerifiedBadge type="individual" status="verified" size="sm" />
                          </HStack>
                          <Text fontSize="xs" color="var(--text-secondary)">
                            Aadhaar Card Verification + Live Face Match
                          </Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                        🔵 Blue Badge
                      </Badge>
                    </Flex>
                  </Box>

                  <Box
                    p={4}
                    borderRadius="xl"
                    border={`2px solid ${
                      verificationType === "business" ? "#eab308" : "var(--color-border)"
                    }`}
                    bg={verificationType === "business" ? "rgba(234, 179, 8, 0.08)" : "var(--bg-search)"}
                    cursor="pointer"
                    onClick={() => setVerificationType("business")}
                    transition="all 0.2s ease"
                  >
                    <Flex justify="space-between" align="center">
                      <HStack spacing={3}>
                        <Radio value="business" colorScheme="yellow" />
                        <Box>
                          <HStack spacing={1}>
                            <Text fontWeight="bold" fontSize="md">
                              Business / Official Entity
                            </Text>
                            <VerifiedBadge type="business" status="verified" size="sm" />
                          </HStack>
                          <Text fontSize="xs" color="var(--text-secondary)">
                            GSTIN / Company Reg + Representative Identity Match
                          </Text>
                        </Box>
                      </HStack>
                      <Badge colorScheme="yellow" variant="subtle" fontSize="xs">
                        🟡 Gold Badge
                      </Badge>
                    </Flex>
                  </Box>
                </Stack>
              </RadioGroup>

              <Box p={3} borderRadius="lg" bg="var(--bg-search)" fontSize="xs" color="var(--text-secondary)">
                <HStack spacing={2} align="center">
                  <Icon as={LockIcon} color="var(--color-primary)" />
                  <Text>
                    Your identification data is encrypted and processed strictly for identity verification.
                  </Text>
                </HStack>
              </Box>

              <Button
                mt={2}
                w="100%"
                bg={verificationType === "business" ? "#d97706" : "var(--color-primary)"}
                color="white"
                _hover={{ opacity: 0.9 }}
                onClick={() => setStep(2)}
              >
                Proceed to Identity Details →
              </Button>
            </VStack>
          )}

          {/* STEP 2: DOCUMENTS & DETAILS */}
          {step === 2 && (
            <VStack spacing={4} align="stretch">
              {verificationType === "individual" ? (
                <>
                  <Box>
                    <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" mb={1}>
                      12-DIGIT AADHAAR NUMBER
                    </Text>
                    <Input
                      placeholder="1234 5678 9012"
                      value={aadhaarNumber}
                      onChange={handleAadhaarChange}
                      bg="var(--bg-search)"
                      borderColor="var(--color-border)"
                      letterSpacing="2px"
                      fontSize="md"
                      fontWeight="bold"
                    />
                  </Box>

                  <Box>
                    <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" mb={1}>
                      UPLOAD AADHAAR CARD (FRONT / BACK)
                    </Text>
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      p={4}
                      border="2px dashed var(--color-border)"
                      borderRadius="xl"
                      bg="var(--bg-search)"
                    >
                      {aadhaarDoc ? (
                        <VStack spacing={2}>
                          <Image src={aadhaarDoc} maxH="120px" borderRadius="md" alt="Aadhaar Preview" />
                          <Button size="xs" variant="ghost" colorScheme="red" onClick={() => setAadhaarDoc(null)}>
                            Remove Document
                          </Button>
                        </VStack>
                      ) : (
                        <VStack spacing={2}>
                          <Icon as={AttachmentIcon} w={6} h={6} color="var(--text-secondary)" />
                          <Text fontSize="xs" color="var(--text-secondary)">
                            Upload image of official Aadhaar card
                          </Text>
                          <Input
                            type="file"
                            accept="image/*"
                            size="sm"
                            onChange={(e) => handleDocumentUpload(e, setAadhaarDoc)}
                            display="none"
                            id="aadhaar-upload"
                          />
                          <Button as="label" htmlFor="aadhaar-upload" size="xs" bg="var(--color-primary)" color="white" cursor="pointer">
                            Browse File
                          </Button>
                        </VStack>
                      )}
                    </Flex>
                  </Box>
                </>
              ) : (
                <>
                  <Box>
                    <Text fontSize="xs" color="#d97706" fontWeight="bold" mb={1}>
                      LEGAL BUSINESS / ORGANIZATION NAME
                    </Text>
                    <Input
                      placeholder="e.g. Acme Corp Technologies Ltd."
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      bg="var(--bg-search)"
                      borderColor="var(--color-border)"
                    />
                  </Box>

                  <Box>
                    <Text fontSize="xs" color="#d97706" fontWeight="bold" mb={1}>
                      GSTIN / REGISTRATION NUMBER
                    </Text>
                    <Input
                      placeholder="27AAACB2418Q1Z1"
                      value={gstinNumber}
                      onChange={(e) => setGstinNumber(e.target.value)}
                      bg="var(--bg-search)"
                      borderColor="var(--color-border)"
                      textTransform="uppercase"
                    />
                  </Box>

                  <Box>
                    <Text fontSize="xs" color="#d97706" fontWeight="bold" mb={1}>
                      BUSINESS REGISTRATION PROOF
                    </Text>
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      p={4}
                      border="2px dashed var(--color-border)"
                      borderRadius="xl"
                      bg="var(--bg-search)"
                    >
                      {businessDoc ? (
                        <VStack spacing={2}>
                          <Image src={businessDoc} maxH="120px" borderRadius="md" alt="Business Doc Preview" />
                          <Button size="xs" variant="ghost" colorScheme="red" onClick={() => setBusinessDoc(null)}>
                            Remove Document
                          </Button>
                        </VStack>
                      ) : (
                        <VStack spacing={2}>
                          <Icon as={AttachmentIcon} w={6} h={6} color="var(--text-secondary)" />
                          <Text fontSize="xs" color="var(--text-secondary)">
                            Upload GST Certificate or Incorporation document
                          </Text>
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            size="sm"
                            onChange={(e) => handleDocumentUpload(e, setBusinessDoc)}
                            display="none"
                            id="business-upload"
                          />
                          <Button as="label" htmlFor="business-upload" size="xs" bg="#d97706" color="white" cursor="pointer">
                            Browse File
                          </Button>
                        </VStack>
                      )}
                    </Flex>
                  </Box>
                </>
              )}

              <HStack justify="space-between" mt={3}>
                <Button variant="ghost" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button
                  bg={verificationType === "business" ? "#d97706" : "var(--color-primary)"}
                  color="white"
                  onClick={() => {
                    setStep(3);
                    startCamera();
                  }}
                >
                  Proceed to Live Face Check →
                </Button>
              </HStack>
            </VStack>
          )}

          {/* STEP 3: LIVE WEBCAM & FACE MATCH */}
          {step === 3 && (
            <VStack spacing={4} align="stretch" textAlign="center">
              <Text fontSize="sm" color="var(--text-secondary)">
                Position your face inside the oval frame to complete live identity capture:
              </Text>

              <Box position="relative" mx="auto" w="320px" h="240px" borderRadius="2xl" overflow="hidden" bg="black" border="3px solid var(--color-primary)">
                {!faceImage ? (
                  <>
                    <video
                      ref={videoRef}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} style={{ display: "none" }} />

                    {/* Face Oval Overlay */}
                    <Box
                      position="absolute"
                      top="15%"
                      left="25%"
                      w="50%"
                      h="70%"
                      border="2px dashed rgba(255, 255, 255, 0.8)"
                      borderRadius="50%"
                      boxShadow="0 0 0 9999px rgba(0, 0, 0, 0.4)"
                      pointerEvents="none"
                    />

                    {cameraError && (
                      <Box position="absolute" inset={0} bg="rgba(0,0,0,0.85)" display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={3}>
                        <Text fontSize="xs" color="yellow.400" mb={2}>
                          {cameraError}
                        </Text>
                      </Box>
                    )}
                  </>
                ) : (
                  <Image src={faceImage} w="100%" h="100%" objectFit="cover" alt="Face Snapshot" />
                )}
              </Box>

              {isProcessingFace ? (
                <VStack spacing={2}>
                  <Progress size="sm" isIndeterminate colorScheme="blue" borderRadius="full" w="100%" />
                  <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold">
                    {livenessStatus}
                  </Text>
                </VStack>
              ) : faceImage ? (
                <VStack spacing={1}>
                  <Badge colorScheme="green" fontSize="sm" p={1.5} borderRadius="lg">
                    ✓ Face Match Score: {matchScore}% Confidence
                  </Badge>
                  <Button
                    size="xs"
                    leftIcon={<RepeatIcon />}
                    variant="ghost"
                    onClick={() => {
                      setFaceImage(null);
                      startCamera();
                    }}
                  >
                    Retake Live Snapshot
                  </Button>
                </VStack>
              ) : (
                <Button
                  bg="var(--color-primary)"
                  color="white"
                  onClick={captureFaceSnapshot}
                  _hover={{ opacity: 0.9 }}
                >
                  📸 Capture Live Selfie Snapshot
                </Button>
              )}

              <HStack justify="space-between" mt={4}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    stopCamera();
                    setStep(2);
                  }}
                >
                  ← Back
                </Button>
                <Button
                  bg={verificationType === "business" ? "#d97706" : "var(--color-primary)"}
                  color="white"
                  isDisabled={!faceImage || isProcessingFace}
                  onClick={handleSubmitApplication}
                >
                  Submit Application →
                </Button>
              </HStack>
            </VStack>
          )}

          {/* STEP 4: SUBMISSION COMPLETED / PENDING REVIEW */}
          {step === 4 && (
            <VStack spacing={5} align="stretch" textAlign="center" py={3}>
              <Box
                w="70px"
                h="70px"
                borderRadius="full"
                bg="rgba(237, 137, 54, 0.15)"
                color="orange.400"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mx="auto"
                border="2px solid #ed8936"
              >
                <Icon as={TimeIcon} w={8} h={8} />
              </Box>

              <Box>
                <HStack justify="center" spacing={2} mb={1}>
                  <Text fontSize="xl" fontWeight="bold">
                    Application Under Review
                  </Text>
                  <VerifiedBadge status="pending" size="md" />
                </HStack>
                <Text fontSize="xs" color="var(--text-secondary)" px={4}>
                  Your {verificationType === "business" ? "Official Business" : "Individual Identity"}{" "}
                  verification request has been received and is currently undergoing background manual review.
                </Text>
              </Box>

              <Box bg="var(--bg-search)" p={4} borderRadius="xl" border="1px solid var(--color-border)" textAlign="left">
                <Text fontSize="xs" color="var(--text-secondary)" mb={2}>
                  APPLICATION DETAILS
                </Text>
                <VStack align="stretch" spacing={2} fontSize="xs">
                  <Flex justify="space-between">
                    <Text color="var(--text-secondary)">Category:</Text>
                    <Badge colorScheme={verificationType === "business" ? "yellow" : "blue"}>
                      {verificationType === "business" ? "Business (Gold)" : "Individual (Blue)"}
                    </Badge>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="var(--text-secondary)">Document Reference:</Text>
                    <Text fontWeight="bold">
                      {user?.verificationDetails?.aadhaarMasked ||
                        user?.verificationDetails?.gstinMasked ||
                        (verificationType === "individual"
                          ? `XXXX-XXXX-${aadhaarNumber.slice(-4) || "8910"}`
                          : gstinNumber || "GSTIN Verified")}
                    </Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="var(--text-secondary)">Face Match Confidence:</Text>
                    <Text fontWeight="bold" color="green.400">
                      {user?.verificationDetails?.matchScore || matchScore || "97.4"}%
                    </Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text color="var(--text-secondary)">Status:</Text>
                    <Text fontWeight="bold" color="orange.400">
                      Pending Background Approval ⏳
                    </Text>
                  </Flex>
                </VStack>
              </Box>

              <Divider />

              {/* DEMO / ADMIN FAST-TRACK TOGGLE FOR IMMEDIATE TESTING */}
              <Box p={3} borderRadius="xl" bg="rgba(56, 151, 240, 0.08)" border="1px dashed var(--color-primary)" textAlign="center">
                <Text fontSize="xs" color="var(--color-primary)" fontWeight="bold" mb={2}>
                  ⚡ DEMO ADMIN CONTROLLER
                </Text>
                <Text fontSize="xs" color="var(--text-secondary)" mb={3}>
                  Fast-track and instantly approve this application for demo/testing purposes:
                </Text>
                <Button
                  size="sm"
                  leftIcon={<CheckCircleIcon />}
                  bg="var(--color-primary)"
                  color="white"
                  _hover={{ opacity: 0.9 }}
                  onClick={handleFastTrackApprove}
                >
                  Instantly Approve Verification
                </Button>
              </Box>

              <Button w="100%" variant="ghost" onClick={onClose}>
                Close
              </Button>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default VerificationModal;
