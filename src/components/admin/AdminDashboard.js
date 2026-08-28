import React, { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Avatar,
  Badge,
  Button,
  Input,
  Select,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Textarea,
  Flex,
  Spinner,
  Tag,
  Tooltip,
} from "@chakra-ui/react";
import {
  RepeatIcon,
  CheckIcon,
  CloseIcon,
  DeleteIcon,
  LockIcon,
  UnlockIcon,
} from "@chakra-ui/icons";
import VerifiedBadge from "../common/VerifiedBadge";
import {
  getAdminStatsAsync,
  getAllUsersAdminAsync,
  updateUserRoleAdminAsync,
  toggleUserBanAdminAsync,
  deleteUserAdminAsync,
  getAdminVerificationsAsync,
  getAdminReportsAsync,
  updateReportStatusAsync,
  sendAdminBroadcastAsync,
  reviewVerificationApplicationAsync,
} from "../../data/fireStorage";

const AdminDashboard = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [reports, setReports] = useState([]);

  // Search & Filters for Users Tab
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");

  // Selected Item for Modals
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Disclosure controls for modals
  const {
    isOpen: isVerifyModalOpen,
    onOpen: onOpenVerifyModal,
    onClose: onCloseVerifyModal,
  } = useDisclosure();

  // Load all Admin Dashboard Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, verifRes, reportsRes] = await Promise.all([
        getAdminStatsAsync(),
        getAllUsersAdminAsync(),
        getAdminVerificationsAsync(),
        getAdminReportsAsync(),
      ]);
      setStats(statsRes);
      setUsers(usersRes);
      setVerifications(verifRes);
      setReports(reportsRes);
    } catch (err) {
      toast({
        title: "Failed to load admin data",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler: Toggle Admin Role
  const handleToggleRole = async (user) => {
    try {
      const updated = await updateUserRoleAdminAsync(user._id, !user.isAdmin);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
      toast({
        title: `Role Updated`,
        description: `${user.name} is now ${!user.isAdmin ? "an Admin ⚡" : "a Regular User"}.`,
        status: "success",
        duration: 3000,
      });
      loadData();
    } catch (err) {
      toast({ title: "Error updating role", description: err.message, status: "error" });
    }
  };

  // Handler: Toggle Ban Account
  const handleToggleBan = async (user) => {
    try {
      const updated = await toggleUserBanAdminAsync(user._id, !user.isBanned);
      setUsers((prev) => prev.map((u) => (u._id === user._id ? updated : u)));
      toast({
        title: `Account Status Changed`,
        description: `${user.name} account is now ${!user.isBanned ? "Banned 🚫" : "Active ✅"}.`,
        status: !user.isBanned ? "warning" : "success",
        duration: 3000,
      });
      loadData();
    } catch (err) {
      toast({ title: "Error updating ban status", description: err.message, status: "error" });
    }
  };

  // Handler: Delete User
  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete user ${name}? This action cannot be undone.`)) return;
    try {
      await deleteUserAdminAsync(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast({ title: "User Account Removed", description: `${name} has been deleted.`, status: "info" });
      loadData();
    } catch (err) {
      toast({ title: "Error deleting user", description: err.message, status: "error" });
    }
  };

  // Handler: Review Identity Verification (Approve or Reject)
  const handleReviewVerification = async (userId, status) => {
    try {
      await reviewVerificationApplicationAsync(
        userId,
        status,
        status === "rejected" ? rejectionReason : null
      );
      toast({
        title: `Verification ${status === "verified" ? "Approved 🎉" : "Rejected"}`,
        description: `Identity status updated for user.`,
        status: status === "verified" ? "success" : "warning",
        duration: 3000,
      });
      onCloseVerifyModal();
      setRejectionReason("");
      loadData();
    } catch (err) {
      toast({ title: "Verification update failed", description: err.message, status: "error" });
    }
  };

  // Handler: Update Report Status
  const handleReportAction = async (reportId, status) => {
    try {
      await updateReportStatusAsync(reportId, status, "Reviewed by System Admin");
      setReports((prev) => prev.map((r) => (r._id === reportId ? { ...r, status } : r)));
      toast({
        title: `Report Ticket ${status.toUpperCase()}`,
        status: status === "resolved" ? "success" : "info",
        duration: 3000,
      });
      loadData();
    } catch (err) {
      toast({ title: "Failed to update report ticket", description: err.message, status: "error" });
    }
  };

  // Handler: Dispatch System Broadcast
  const handleSendBroadcast = async () => {
    if (!broadcastContent.trim()) {
      toast({ title: "Please enter broadcast message text", status: "warning" });
      return;
    }
    setSendingBroadcast(true);
    try {
      const res = await sendAdminBroadcastAsync(broadcastContent.trim());
      toast({
        title: "Broadcast Dispatched! 📢",
        description: `Successfully broadcasted to ${res.result?.count || 0} active conversation rooms.`,
        status: "success",
        duration: 5000,
      });
      setBroadcastContent("");
      loadData();
    } catch (err) {
      toast({ title: "Broadcast failed", description: err.message, status: "error" });
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u._id?.toLowerCase().includes(userSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (userFilter === "verified") return u.isVerified || u.verificationStatus === "verified";
    if (userFilter === "unverified") return !u.isVerified && u.verificationStatus !== "verified";
    if (userFilter === "admin") return u.isAdmin;
    if (userFilter === "banned") return u.isBanned;

    return true;
  });

  return (
    <Box w="100%" p={{ base: 3, md: 6 }} color="var(--text-primary)">
      {/* Top Title & Refresh Bar */}
      <Flex justifyContent="space-between" alignItems="center" mb={6} flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg" display="flex" alignItems="center" gap={2}>
            ⚡ Admin Control Center
            <Badge colorScheme="red" fontSize="0.75em" borderRadius="md">
              Super Admin Mode
            </Badge>
          </Heading>
          <Text fontSize="sm" color="var(--text-secondary)" mt={1}>
            Monitor system analytics, verify user credentials, moderate content reports, and issue global announcements.
          </Text>
        </Box>

        <Button
          leftIcon={<RepeatIcon />}
          colorScheme="teal"
          variant="outline"
          size="sm"
          onClick={loadData}
          isLoading={loading}
        >
          Refresh Data
        </Button>
      </Flex>

      {/* Main Tabbed Interface */}
      <Tabs variant="soft-rounded" colorScheme="teal">
        <TabList overflowX="auto" pb={2} mb={4} borderBottom="1px solid var(--color-border)">
          <Tab fontWeight="bold">📊 Overview</Tab>
          <Tab fontWeight="bold">
            👥 Users ({users.length})
          </Tab>
          <Tab fontWeight="bold">
            🛡️ Identity Verifications
            {stats?.pendingVerifications > 0 && (
              <Badge ml={2} colorScheme="orange" borderRadius="full">
                {stats.pendingVerifications}
              </Badge>
            )}
          </Tab>
          <Tab fontWeight="bold">
            🚩 Moderation Reports
            {stats?.pendingReports > 0 && (
              <Badge ml={2} colorScheme="red" borderRadius="full">
                {stats.pendingReports}
              </Badge>
            )}
          </Tab>
          <Tab fontWeight="bold">📢 System Broadcast</Tab>
        </TabList>

        <TabPanels>
          {/* TAB 1: OVERVIEW STATS */}
          <TabPanel px={0}>
            {loading && !stats ? (
              <Flex justify="center" py={12}>
                <Spinner size="xl" color="teal.500" />
              </Flex>
            ) : (
              <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={5}>
                <Stat
                  p={4}
                  bg="var(--bg-card)"
                  borderRadius="xl"
                  border="1px solid var(--color-border)"
                  boxShadow="var(--shadow-sm)"
                >
                  <StatLabel color="var(--text-secondary)">Total Users</StatLabel>
                  <StatNumber fontSize="3xl" color="#00a884">
                    {stats?.totalUsers || 0}
                  </StatNumber>
                  <StatHelpText>Registered Accounts</StatHelpText>
                </Stat>

                <Stat
                  p={4}
                  bg="var(--bg-card)"
                  borderRadius="xl"
                  border="1px solid var(--color-border)"
                  boxShadow="var(--shadow-sm)"
                >
                  <StatLabel color="var(--text-secondary)">Verified Identities</StatLabel>
                  <StatNumber fontSize="3xl" color="#3182ce">
                    {stats?.verifiedUsers || 0}
                  </StatNumber>
                  <StatHelpText>
                    {stats?.totalUsers
                      ? `${Math.round(((stats.verifiedUsers || 0) / stats.totalUsers) * 100)}% Verification Rate`
                      : "0%"}
                  </StatHelpText>
                </Stat>

                <Stat
                  p={4}
                  bg="var(--bg-card)"
                  borderRadius="xl"
                  border="1px solid var(--color-border)"
                  boxShadow="var(--shadow-sm)"
                >
                  <StatLabel color="var(--text-secondary)">Pending Verifications</StatLabel>
                  <StatNumber fontSize="3xl" color="#dd6b20">
                    {stats?.pendingVerifications || 0}
                  </StatNumber>
                  <StatHelpText>Awaiting Admin Review</StatHelpText>
                </Stat>

                <Stat
                  p={4}
                  bg="var(--bg-card)"
                  borderRadius="xl"
                  border="1px solid var(--color-border)"
                  boxShadow="var(--shadow-sm)"
                >
                  <StatLabel color="var(--text-secondary)">Active Conversations</StatLabel>
                  <StatNumber fontSize="3xl" color="#805ad5">
                    {stats?.totalChats || 0}
                  </StatNumber>
                  <StatHelpText>Total Chat Rooms</StatHelpText>
                </Stat>

                <Stat
                  p={4}
                  bg="var(--bg-card)"
                  borderRadius="xl"
                  border="1px solid var(--color-border)"
                  boxShadow="var(--shadow-sm)"
                >
                  <StatLabel color="var(--text-secondary)">Total Messages</StatLabel>
                  <StatNumber fontSize="3xl" color="#d69e2e">
                    {stats?.totalMessages || 0}
                  </StatNumber>
                  <StatHelpText>Persistent Messages Logged</StatHelpText>
                </Stat>

                <Stat
                  p={4}
                  bg="var(--bg-card)"
                  borderRadius="xl"
                  border="1px solid var(--color-border)"
                  boxShadow="var(--shadow-sm)"
                >
                  <StatLabel color="var(--text-secondary)">Flagged Reports</StatLabel>
                  <StatNumber fontSize="3xl" color="#e53e3e">
                    {stats?.pendingReports || 0}
                  </StatNumber>
                  <StatHelpText>Unresolved Report Tickets</StatHelpText>
                </Stat>
              </SimpleGrid>
            )}
          </TabPanel>

          {/* TAB 2: USER DIRECTORY & MANAGEMENT */}
          <TabPanel px={0}>
            {/* Search and Filters */}
            <Flex gap={4} mb={4} flexWrap="wrap">
              <Input
                placeholder="Search users by name, email, or ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                maxW="350px"
                bg="var(--bg-input)"
              />

              <Select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                maxW="200px"
                bg="var(--bg-input)"
              >
                <option value="all">All Users</option>
                <option value="verified">Verified Only</option>
                <option value="unverified">Unverified Only</option>
                <option value="admin">Admins Only</option>
                <option value="banned">Banned Only</option>
              </Select>
            </Flex>

            {/* Users Table */}
            <Box overflowX="auto" bg="var(--bg-card)" borderRadius="xl" border="1px solid var(--color-border)">
              <Table variant="simple" size="sm">
                <Thead bg="rgba(0,0,0,0.05)">
                  <Tr>
                    <Th color="var(--text-secondary)">User</Th>
                    <Th color="var(--text-secondary)">Email</Th>
                    <Th color="var(--text-secondary)">Verification</Th>
                    <Th color="var(--text-secondary)">Role</Th>
                    <Th color="var(--text-secondary)">Status</Th>
                    <Th color="var(--text-secondary)" textAlign="right">
                      Actions
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredUsers.length === 0 ? (
                    <Tr>
                      <Td colSpan={6} textAlign="center" py={6} color="var(--text-secondary)">
                        No users match the selected criteria.
                      </Td>
                    </Tr>
                  ) : (
                    filteredUsers.map((userItem) => (
                      <Tr key={userItem._id} _hover={{ bg: "var(--bg-hover)" }}>
                        <Td>
                          <Flex alignItems="center" gap={3}>
                            <Avatar size="sm" name={userItem.name} src={userItem.pic} />
                            <Box>
                              <Text fontWeight="bold" fontSize="sm">
                                {userItem.name}
                              </Text>
                              <Text fontSize="xs" color="var(--text-secondary)">
                                ID: {userItem._id}
                              </Text>
                            </Box>
                          </Flex>
                        </Td>
                        <Td fontSize="sm">{userItem.email}</Td>
                        <Td>
                          <VerifiedBadge user={userItem} size="sm" />
                        </Td>
                        <Td>
                          {userItem.isAdmin ? (
                            <Tag colorScheme="purple" size="sm">
                              Admin ⚡
                            </Tag>
                          ) : (
                            <Tag colorScheme="gray" size="sm">
                              User
                            </Tag>
                          )}
                        </Td>
                        <Td>
                          {userItem.isBanned ? (
                            <Tag colorScheme="red" size="sm">
                              Banned 🚫
                            </Tag>
                          ) : (
                            <Tag colorScheme="green" size="sm">
                              Active ✅
                            </Tag>
                          )}
                        </Td>
                        <Td textAlign="right">
                          <Flex justify="flex-end" gap={2}>
                            <Tooltip label={userItem.isAdmin ? "Revoke Admin" : "Make Admin"}>
                              <Button
                                size="xs"
                                colorScheme={userItem.isAdmin ? "purple" : "gray"}
                                onClick={() => handleToggleRole(userItem)}
                              >
                                {userItem.isAdmin ? "Admin" : "+ Admin"}
                              </Button>
                            </Tooltip>

                            <Tooltip label={userItem.isBanned ? "Unban Account" : "Ban Account"}>
                              <IconButton
                                size="xs"
                                icon={userItem.isBanned ? <UnlockIcon /> : <LockIcon />}
                                colorScheme={userItem.isBanned ? "green" : "orange"}
                                onClick={() => handleToggleBan(userItem)}
                                aria-label="Toggle Ban"
                              />
                            </Tooltip>

                            <Tooltip label="Delete Account">
                              <IconButton
                                size="xs"
                                icon={<DeleteIcon />}
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => handleDeleteUser(userItem._id, userItem.name)}
                                aria-label="Delete User"
                              />
                            </Tooltip>
                          </Flex>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </Box>
          </TabPanel>

          {/* TAB 3: IDENTITY VERIFICATION DESK */}
          <TabPanel px={0}>
            <Heading size="md" mb={4}>
              🛡️ Verification Approval Queue
            </Heading>
            {verifications.length === 0 ? (
              <Box p={8} textAlign="center" bg="var(--bg-card)" borderRadius="xl" border="1px solid var(--color-border)">
                <Text color="var(--text-secondary)">No pending or historical identity verification requests found.</Text>
              </Box>
            ) : (
              <Box overflowX="auto" bg="var(--bg-card)" borderRadius="xl" border="1px solid var(--color-border)">
                <Table variant="simple" size="sm">
                  <Thead bg="rgba(0,0,0,0.05)">
                    <Tr>
                      <Th color="var(--text-secondary)">Applicant</Th>
                      <Th color="var(--text-secondary)">Type</Th>
                      <Th color="var(--text-secondary)">Document Details</Th>
                      <Th color="var(--text-secondary)">Submitted At</Th>
                      <Th color="var(--text-secondary)">Status</Th>
                      <Th color="var(--text-secondary)" textAlign="right">
                        Review Action
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {verifications.map((item) => (
                      <Tr key={item._id} _hover={{ bg: "var(--bg-hover)" }}>
                        <Td>
                          <Flex alignItems="center" gap={3}>
                            <Avatar size="sm" name={item.name} src={item.pic} />
                            <Box>
                              <Text fontWeight="bold">{item.name}</Text>
                              <Text fontSize="xs" color="var(--text-secondary)">
                                {item.email}
                              </Text>
                            </Box>
                          </Flex>
                        </Td>
                        <Td>
                          <Tag size="sm" colorScheme={item.verificationType === "business" ? "blue" : "teal"}>
                            {(item.verificationType || "individual").toUpperCase()}
                          </Tag>
                        </Td>
                        <Td fontSize="xs">
                          {item.verificationDetails?.aadhaarMasked && (
                            <Text>Aadhaar: {item.verificationDetails.aadhaarMasked}</Text>
                          )}
                          {item.verificationDetails?.panMasked && <Text>PAN: {item.verificationDetails.panMasked}</Text>}
                          {item.verificationDetails?.gstinMasked && (
                            <Text>GSTIN: {item.verificationDetails.gstinMasked}</Text>
                          )}
                          {item.verificationDetails?.businessName && (
                            <Text fontWeight="bold">Org: {item.verificationDetails.businessName}</Text>
                          )}
                        </Td>
                        <Td fontSize="xs">
                          {item.verificationDetails?.submittedAt
                            ? new Date(item.verificationDetails.submittedAt).toLocaleString()
                            : "N/A"}
                        </Td>
                        <Td>
                          <Tag
                            size="sm"
                            colorScheme={
                              item.verificationStatus === "verified"
                                ? "green"
                                : item.verificationStatus === "rejected"
                                ? "red"
                                : "orange"
                            }
                          >
                            {(item.verificationStatus || "pending").toUpperCase()}
                          </Tag>
                        </Td>
                        <Td textAlign="right">
                          <Flex justify="flex-end" gap={2}>
                            <Button
                              size="xs"
                              colorScheme="green"
                              leftIcon={<CheckIcon />}
                              onClick={() => handleReviewVerification(item._id, "verified")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              colorScheme="red"
                              variant="outline"
                              leftIcon={<CloseIcon />}
                              onClick={() => {
                                setSelectedVerification(item);
                                onOpenVerifyModal();
                              }}
                            >
                              Reject
                            </Button>
                          </Flex>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </TabPanel>

          {/* TAB 4: MODERATION & REPORTS */}
          <TabPanel px={0}>
            <Heading size="md" mb={4}>
              🚩 Moderation Tickets & Content Reports
            </Heading>
            {reports.length === 0 ? (
              <Box p={8} textAlign="center" bg="var(--bg-card)" borderRadius="xl" border="1px solid var(--color-border)">
                <Text color="var(--text-secondary)">No user reports filed.</Text>
              </Box>
            ) : (
              <Box overflowX="auto" bg="var(--bg-card)" borderRadius="xl" border="1px solid var(--color-border)">
                <Table variant="simple" size="sm">
                  <Thead bg="rgba(0,0,0,0.05)">
                    <Tr>
                      <Th color="var(--text-secondary)">Ticket ID</Th>
                      <Th color="var(--text-secondary)">Reporter</Th>
                      <Th color="var(--text-secondary)">Target Content / User</Th>
                      <Th color="var(--text-secondary)">Reason</Th>
                      <Th color="var(--text-secondary)">Status</Th>
                      <Th color="var(--text-secondary)" textAlign="right">
                        Resolution
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {reports.map((rep) => (
                      <Tr key={rep._id} _hover={{ bg: "var(--bg-hover)" }}>
                        <Td fontSize="xs" fontWeight="bold">
                          {rep._id}
                        </Td>
                        <Td fontSize="xs">
                          {rep.reporterUser?.name || rep.reporterUser?.email || "Anonymous"}
                        </Td>
                        <Td fontSize="xs">
                          <Text fontWeight="bold">{rep.targetObj?.name || rep.targetObj?.type || "Content"}</Text>
                          <Text color="var(--text-secondary)" noOfLines={1}>
                            {rep.details || "No extra details provided."}
                          </Text>
                        </Td>
                        <Td fontSize="xs">
                          <Tag size="sm" colorScheme="orange">
                            {rep.reason || "General Violation"}
                          </Tag>
                        </Td>
                        <Td>
                          <Tag
                            size="sm"
                            colorScheme={
                              rep.status === "resolved" ? "green" : rep.status === "dismissed" ? "gray" : "red"
                            }
                          >
                            {(rep.status || "pending").toUpperCase()}
                          </Tag>
                        </Td>
                        <Td textAlign="right">
                          <Flex justify="flex-end" gap={2}>
                            <Button
                              size="xs"
                              colorScheme="green"
                              onClick={() => handleReportAction(rep._id, "resolved")}
                            >
                              Resolve
                            </Button>
                            <Button
                              size="xs"
                              colorScheme="gray"
                              onClick={() => handleReportAction(rep._id, "dismissed")}
                            >
                              Dismiss
                            </Button>
                          </Flex>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </TabPanel>

          {/* TAB 5: SYSTEM BROADCAST */}
          <TabPanel px={0}>
            <Box
              maxW="650px"
              p={6}
              bg="var(--bg-card)"
              borderRadius="xl"
              border="1px solid var(--color-border)"
              boxShadow="var(--shadow-sm)"
            >
              <Heading size="md" mb={2}>
                📢 Send Official System Broadcast
              </Heading>
              <Text fontSize="sm" color="var(--text-secondary)" mb={4}>
                Draft an official announcement message. It will be dispatched from **Agni Bot 🔥** to all active conversation rooms across the network.
              </Text>

              <Textarea
                placeholder="Type your official announcement or release notes here..."
                rows={5}
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                bg="var(--bg-input)"
                mb={4}
              />

              <Flex justify="flex-end" gap={3}>
                <Button
                  colorScheme="teal"
                  onClick={handleSendBroadcast}
                  isLoading={sendingBroadcast}
                  leftIcon={<span>📢</span>}
                >
                  Send Global Announcement
                </Button>
              </Flex>
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* REJECTION MODAL */}
      <Modal isOpen={isVerifyModalOpen} onClose={onCloseVerifyModal}>
        <ModalOverlay />
        <ModalContent bg="var(--bg-card)" color="var(--text-primary)">
          <ModalHeader>Reject Verification Application</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={3} fontSize="sm">
              Please provide a reason for rejecting {selectedVerification?.name}'s identity verification application:
            </Text>
            <Textarea
              placeholder="e.g. Document image blurry or Aadhaar name does not match profile name."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onCloseVerifyModal}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={() => handleReviewVerification(selectedVerification?._id, "rejected")}
            >
              Confirm Rejection
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AdminDashboard;
