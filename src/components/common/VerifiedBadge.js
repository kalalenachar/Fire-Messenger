import React from "react";
import { Box, Tooltip, Icon, Flex, Text } from "@chakra-ui/react";
import { CheckCircleIcon, StarIcon, TimeIcon } from "@chakra-ui/icons";

/**
 * VerifiedBadge Component
 * Displays verified badges based on user verification status and type:
 * - Individual (Blue Badge 🔵): Aadhaar & Live Face Verified
 * - Business (Gold Badge 🟡): GSTIN / Registration & Official Entity Verified
 * - Pending (Amber Badge ⏳): Verification Under Review
 */
const VerifiedBadge = ({
  user,
  type,
  status,
  size = "sm",
  showText = false,
  mx = 1,
}) => {
  // Extract parameters from user object if provided
  const verifyStatus = status || user?.verificationStatus || (user?.isVerified ? "verified" : "none");
  const verifyType = type || user?.verificationType || (user?._id === "bot_fire_ai" || user?.name?.includes("Fire Bot") || user?.name?.includes("Agni Bot") ? "business" : "individual");

  if (verifyStatus === "none" || !verifyStatus) {
    return null;
  }

  let bgGradient = "linear-gradient(135deg, #3897f0 0%, #0066ff 100%)";
  let iconComponent = CheckCircleIcon;
  let label = "Verified Individual";
  let tooltipText = "Identity Verified via Aadhaar & Live Face Match";

  if (verifyStatus === "pending") {
    bgGradient = "linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)";
    iconComponent = TimeIcon;
    label = "Under Review";
    tooltipText = "Verification Application is Currently Under Background Review ⏳";
  } else if (verifyType === "business" || user?._id === "bot_fire_ai") {
    bgGradient = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
    iconComponent = StarIcon;
    label = "Official Business";
    tooltipText = "Verified Official Business & Legal Entity via GSTIN Registration";
  }

  // Size mapping
  const sizeMap = {
    xs: { iconSize: "10px", badgeSize: "14px", fontSize: "10px" },
    sm: { iconSize: "12px", badgeSize: "16px", fontSize: "11px" },
    md: { iconSize: "14px", badgeSize: "20px", fontSize: "12px" },
    lg: { iconSize: "18px", badgeSize: "24px", fontSize: "14px" },
  };

  const currentSize = sizeMap[size] || sizeMap.sm;

  return (
    <Tooltip label={tooltipText} placement="top" hasArrow openDelay={200}>
      <Flex
        as="span"
        alignItems="center"
        display="inline-flex"
        mx={mx}
        verticalAlign="middle"
      >
        <Box
          as="span"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          w={currentSize.badgeSize}
          h={currentSize.badgeSize}
          borderRadius="full"
          background={bgGradient}
          color="white"
          boxShadow={
            verifyType === "business"
              ? "0 0 8px rgba(245, 158, 11, 0.5)"
              : verifyStatus === "pending"
              ? "0 0 8px rgba(237, 137, 54, 0.4)"
              : "0 0 8px rgba(56, 151, 240, 0.5)"
          }
          transition="transform 0.2s ease"
          _hover={{ transform: "scale(1.15)" }}
        >
          <Icon as={iconComponent} w={currentSize.iconSize} h={currentSize.iconSize} color="white" />
        </Box>
        {showText && (
          <Text
            as="span"
            ml={1.5}
            fontSize={currentSize.fontSize}
            fontWeight="bold"
            color={
              verifyStatus === "pending"
                ? "orange.400"
                : verifyType === "business"
                ? "yellow.400"
                : "blue.400"
            }
          >
            {label}
          </Text>
        )}
      </Flex>
    </Tooltip>
  );
};

export default VerifiedBadge;
