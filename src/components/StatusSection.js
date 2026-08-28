import React from "react";
import {
  Box,
  Flex,
  Text,
  Avatar,
  IconButton,
  Stack,
  Badge,
  Tooltip,
  Divider,
} from "@chakra-ui/react";
import { AddIcon, SettingsIcon } from "@chakra-ui/icons";
import { ChatState } from "../Context/ChatProvider";
import VerifiedBadge from "./common/VerifiedBadge";

const StatusSection = ({ onOpenComposer, onOpenAudienceManager }) => {
  const { user, statusFeed, setActiveStatusUser } = ChatState();

  const ownStatusStack = statusFeed.find((s) => s.isOwn);
  const otherStatusStacks = statusFeed.filter((s) => !s.isOwn);

  const unviewedStacks = otherStatusStacks.filter((s) => s.hasUnviewed);
  const viewedStacks = otherStatusStacks.filter((s) => !s.hasUnviewed);

  // Calculate total views across own status posts
  const ownPosts = ownStatusStack?.posts || [];
  const totalOwnViews = ownPosts.reduce((acc, p) => acc + (p.viewers?.length || 0), 0);

  const formatRelativeTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <Box w="100%" h="100%" display="flex" flexDirection="column" bg="var(--bg-sidebar)" color="var(--text-main)" p={3}>
      {/* HEADER BAR */}
      <Flex align="center" justify="space-between" mb={4} px={1}>
        <Flex align="center" gap={2}>
          <Text fontSize="xl" fontWeight="bold">
            Status
          </Text>
        </Flex>

        <Flex align="center" gap={1}>
          <Tooltip label="Status Privacy & Audience Profiles">
            <IconButton
              icon={<SettingsIcon />}
              size="sm"
              variant="ghost"
              colorScheme="orange"
              onClick={onOpenAudienceManager}
              aria-label="Privacy Profiles"
            />
          </Tooltip>

          <Tooltip label="Add Status">
            <IconButton
              icon={<AddIcon />}
              size="sm"
              colorScheme="orange"
              borderRadius="full"
              onClick={onOpenComposer}
              aria-label="Add Status"
            />
          </Tooltip>
        </Flex>
      </Flex>

      <Stack spacing={4} overflowY="auto" flex={1} pr={1}>
        {/* MY STATUS CARD */}
        <Box>
          <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)" mb={2} px={1}>
            MY STATUS
          </Text>

          <Flex
            p={3}
            borderRadius="xl"
            bg="var(--bg-card)"
            border="1px solid var(--border-color)"
            align="center"
            justify="space-between"
            cursor="pointer"
            _hover={{ bg: "var(--bg-hover)" }}
            onClick={() => {
              if (ownPosts.length > 0) {
                setActiveStatusUser(ownStatusStack);
              } else {
                onOpenComposer();
              }
            }}
          >
            <Flex align="center" gap={3}>
              <Box position="relative">
                <Avatar
                  size="md"
                  name={user?.name}
                  src={user?.pic}
                  border={ownPosts.length > 0 ? "3px solid #FF4500" : "none"}
                  p={ownPosts.length > 0 ? "2px" : 0}
                />
                <Flex
                  position="absolute"
                  bottom="-2px"
                  right="-2px"
                  bg="orange.500"
                  color="white"
                  borderRadius="full"
                  w="20px"
                  h="20px"
                  align="center"
                  justify="center"
                  border="2px solid var(--bg-sidebar)"
                >
                  <AddIcon boxSize={2.5} />
                </Flex>
              </Box>

              <Box>
                <Text fontWeight="bold" fontSize="md">
                  My Status
                </Text>
                <Text fontSize="xs" color="var(--text-muted)">
                  {ownPosts.length > 0
                    ? `${ownPosts.length} update${ownPosts.length > 1 ? "s" : ""} • ${formatRelativeTime(
                        ownStatusStack.latestUpdatedAt
                      )}`
                    : "Tap to add status update"}
                </Text>
              </Box>
            </Flex>

            {/* EXPLICIT USER REQUIREMENT: OWN STATUS VIEW COUNT BADGE */}
            {ownPosts.length > 0 && (
              <Badge colorScheme="orange" px={2.5} py={1} borderRadius="full" fontSize="xs">
                👁️ {totalOwnViews} views
              </Badge>
            )}
          </Flex>
        </Box>

        <Divider />

        {/* RECENT UPDATES (UNVIEWED) */}
        {unviewedStacks.length > 0 && (
          <Box>
            <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)" mb={2} px={1}>
              RECENT UPDATES ({unviewedStacks.length})
            </Text>
            <Stack spacing={2}>
              {unviewedStacks.map((stack) => (
                <Flex
                  key={stack.user?._id}
                  p={2.5}
                  borderRadius="xl"
                  bg="var(--bg-card)"
                  align="center"
                  justify="space-between"
                  cursor="pointer"
                  _hover={{ bg: "var(--bg-hover)" }}
                  onClick={() => setActiveStatusUser(stack)}
                >
                  <Flex align="center" gap={3}>
                    <Box
                      borderRadius="full"
                      p="2.5px"
                      bgGradient="linear(to-tr, #FF416C, #FF4B2B)"
                      boxShadow="0 0 8px rgba(255, 65, 108, 0.4)"
                    >
                      <Avatar size="sm" name={stack.user?.name} src={stack.user?.pic} />
                    </Box>
                    <Box>
                      <Flex align="center">
                        <Text fontWeight="bold" fontSize="sm">
                          {stack.user?.name}
                        </Text>
                        <VerifiedBadge user={stack.user} size="xs" />
                      </Flex>
                      <Text fontSize="xs" color="var(--text-muted)">
                        {formatRelativeTime(stack.latestUpdatedAt)}
                      </Text>
                    </Box>
                  </Flex>
                  <Badge colorScheme="orange" variant="solid" borderRadius="full" fontSize="xs">
                    New
                  </Badge>
                </Flex>
              ))}
            </Stack>
          </Box>
        )}

        {/* VIEWED UPDATES */}
        {viewedStacks.length > 0 && (
          <Box>
            <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)" mb={2} px={1}>
              VIEWED UPDATES ({viewedStacks.length})
            </Text>
            <Stack spacing={2}>
              {viewedStacks.map((stack) => (
                <Flex
                  key={stack.user?._id}
                  p={2.5}
                  borderRadius="xl"
                  bg="transparent"
                  align="center"
                  justify="space-between"
                  cursor="pointer"
                  _hover={{ bg: "var(--bg-hover)" }}
                  onClick={() => setActiveStatusUser(stack)}
                >
                  <Flex align="center" gap={3}>
                    <Avatar
                      size="sm"
                      name={stack.user?.name}
                      src={stack.user?.pic}
                      border="2px solid var(--border-color)"
                      p="1px"
                    />
                    <Box>
                      <Text fontWeight="medium" fontSize="sm" color="var(--text-muted)">
                        {stack.user?.name}
                      </Text>
                      <Text fontSize="xs" color="var(--text-muted)">
                        {formatRelativeTime(stack.latestUpdatedAt)}
                      </Text>
                    </Box>
                  </Flex>
                </Flex>
              ))}
            </Stack>
          </Box>
        )}

        {/* EMPTY STATE FALLBACK */}
        {otherStatusStacks.length === 0 && (
          <Box textStyle="center" py={8} textAlign="center">
            <Text fontSize="2xl" mb={1}>
              🔥
            </Text>
            <Text fontSize="sm" fontWeight="bold">
              No recent updates
            </Text>
            <Text fontSize="xs" color="var(--text-muted)">
              Status updates from your contacts will appear here.
            </Text>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default StatusSection;
