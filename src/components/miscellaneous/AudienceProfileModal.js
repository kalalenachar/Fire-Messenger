import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Text,
  Input,
  Stack,
  Flex,
  Avatar,
  Checkbox,
  Badge,
  IconButton,
  useToast,
  Divider,
  RadioGroup,
  Radio,
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon, AddIcon, CheckIcon, ArrowBackIcon, RepeatIcon } from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";
import { searchUsersAsync } from "../../data/fireStorage";

const AudienceProfileModal = ({ isOpen, onClose }) => {
  const { user, audienceProfiles, saveAudienceProfile, removeAudienceProfile } = ChatState();
  const toast = useToast();

  const [activeView, setActiveView] = useState("list"); // 'list' | 'edit'
  const [editingProfile, setEditingProfile] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profileMode, setProfileMode] = useState("whitelist"); // 'whitelist' (Include) | 'blacklist' (Exclude / Hide from)
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      setActiveView("list");
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const users = await searchUsersAsync("", user?._id);
      setAllUsersList(users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartCreate = () => {
    setEditingProfile(null);
    setProfileName("");
    setProfileMode("whitelist");
    setSelectedMemberIds([]);
    setActiveView("edit");
  };

  const handleStartEdit = (prof) => {
    setEditingProfile(prof);
    setProfileName(prof.name);
    setProfileMode(prof.mode || "whitelist");
    setSelectedMemberIds(prof.memberIds || []);
    setActiveView("edit");
  };

  const handleToggleMember = (userId) => {
    if (selectedMemberIds.includes(userId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
    }
  };

  // Quick Action Handlers
  const handleSelectAll = () => {
    setSelectedMemberIds(allUsersList.map((u) => u._id));
  };

  const handleDeselectAll = () => {
    setSelectedMemberIds([]);
  };

  const handleInvertSelection = () => {
    const inverted = allUsersList
      .filter((u) => !selectedMemberIds.includes(u._id))
      .map((u) => u._id);
    setSelectedMemberIds(inverted);
  };

  const handleSave = async () => {
    if (!profileName.trim()) {
      toast({ title: "Please enter a profile name", status: "warning", duration: 2000 });
      return;
    }
    try {
      await saveAudienceProfile({
        _id: editingProfile?._id,
        name: profileName.trim(),
        mode: profileMode,
        memberIds: selectedMemberIds,
      });
      toast({ title: "Audience Profile saved successfully!", status: "success", duration: 2000 });
      setActiveView("list");
    } catch (err) {
      toast({ title: "Error saving profile", status: "error", duration: 2000 });
    }
  };

  const handleDelete = async (profId) => {
    try {
      await removeAudienceProfile(profId);
      toast({ title: "Profile removed", status: "info", duration: 2000 });
    } catch (err) {
      toast({ title: "Error removing profile", status: "error", duration: 2000 });
    }
  };

  const filteredUsers = allUsersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay backdropFilter="blur(5px)" />
      <ModalContent bg="var(--bg-card)" color="var(--text-main)" borderRadius="xl" border="1px solid var(--border-color)">
        <ModalHeader borderBottom="1px solid var(--border-color)">
          <Flex align="center" justify="space-between">
            {activeView === "edit" ? (
              <Flex align="center" gap={2}>
                <IconButton
                  icon={<ArrowBackIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveView("list")}
                  aria-label="Back"
                />
                <Text fontSize="lg" fontWeight="bold">
                  {editingProfile ? `Edit: ${editingProfile.name}` : "Create Audience Profile"}
                </Text>
              </Flex>
            ) : (
              <Flex align="center" gap={2}>
                <Text fontSize="lg" fontWeight="bold">
                  Status Privacy Profiles
                </Text>
              </Flex>
            )}
            <ModalCloseButton position="relative" top={0} right={0} />
          </Flex>
        </ModalHeader>

        <ModalBody py={4}>
          {activeView === "list" ? (
            <Stack spacing={4}>
              <Text fontSize="sm" color="var(--text-muted)">
                Create custom privacy groups with easy <strong>Whitelist (Include)</strong> or <strong>Blacklist (Exclude)</strong> rules.
              </Text>

              <Button
                leftIcon={<AddIcon />}
                colorScheme="orange"
                variant="solid"
                onClick={handleStartCreate}
                borderRadius="lg"
                w="100%"
              >
                Create New Privacy Profile
              </Button>

              <Divider />

              <Stack spacing={3} maxH="350px" overflowY="auto" pr={1}>
                {audienceProfiles.map((prof) => (
                  <Flex
                    key={prof._id}
                    p={3}
                    borderRadius="lg"
                    bg="var(--bg-hover)"
                    align="center"
                    justify="space-between"
                    border="1px solid var(--border-color)"
                  >
                    <Box>
                      <Flex align="center" gap={2} mb={1}>
                        <Text fontWeight="bold" fontSize="md">
                          {prof.name}
                        </Text>
                        {prof.isDefault ? (
                          <Badge colorScheme="blue" fontSize="xs">
                            Default
                          </Badge>
                        ) : prof.mode === "blacklist" ? (
                          <Badge colorScheme="red" fontSize="xs" borderRadius="md">
                            🔴 Blacklist (Exclude)
                          </Badge>
                        ) : (
                          <Badge colorScheme="green" fontSize="xs" borderRadius="md">
                            🟢 Whitelist (Include)
                          </Badge>
                        )}
                      </Flex>
                      <Text fontSize="xs" color="var(--text-muted)">
                        {prof.isDefault
                          ? "Visible to all contacts"
                          : prof.mode === "blacklist"
                          ? `Hides status from ${prof.memberIds?.length || 0} selected contacts`
                          : `Shows status ONLY to ${prof.memberIds?.length || 0} selected contacts`}
                      </Text>
                    </Box>

                    {!prof.isDefault && (
                      <Flex gap={2}>
                        <IconButton
                          icon={<EditIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="blue"
                          onClick={() => handleStartEdit(prof)}
                          aria-label="Edit Profile"
                        />
                        <IconButton
                          icon={<DeleteIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDelete(prof._id)}
                          aria-label="Delete Profile"
                        />
                      </Flex>
                    )}
                  </Flex>
                ))}
              </Stack>
            </Stack>
          ) : (
            /* EDIT / CREATE VIEW WITH EASY WHITELIST / BLACKLIST TOGGLE */
            <Stack spacing={4}>
              {/* PROFILE NAME INPUT */}
              <Box>
                <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)" mb={1}>
                  PROFILE NAME
                </Text>
                <Input
                  placeholder="e.g. School Friends, No Office People"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  bg="var(--bg-input)"
                  borderColor="var(--border-color)"
                />
              </Box>

              {/* WHITELIST VS BLACKLIST MODE SELECTOR */}
              <Box bg="var(--bg-hover)" p={3} borderRadius="lg" border="1px solid var(--border-color)">
                <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)" mb={2}>
                  RULE TYPE (WHITELIST OR BLACKLIST)
                </Text>
                <RadioGroup value={profileMode} onChange={setProfileMode}>
                  <Stack direction="column" spacing={2}>
                    <Radio value="whitelist" colorScheme="green">
                      <Box>
                        <Text fontSize="sm" fontWeight="bold" color="green.400">
                          🟢 Whitelist (Include Only)
                        </Text>
                        <Text fontSize="xs" color="var(--text-muted)">
                          Only selected contacts CAN see your status.
                        </Text>
                      </Box>
                    </Radio>
                    <Radio value="blacklist" colorScheme="red">
                      <Box>
                        <Text fontSize="sm" fontWeight="bold" color="red.400">
                          🔴 Blacklist (Exclude / Hide From)
                        </Text>
                        <Text fontSize="xs" color="var(--text-muted)">
                          Share with all contacts EXCEPT the selected contacts below.
                        </Text>
                      </Box>
                    </Radio>
                  </Stack>
                </RadioGroup>
              </Box>

              {/* QUICK BULK ACTIONS & SEARCH */}
              <Box>
                <Flex align="center" justify="space-between" mb={2} flexWrap="wrap" gap={2}>
                  <Text fontSize="xs" fontWeight="bold" color="var(--text-muted)">
                    {profileMode === "blacklist" ? "EXCLUDED CONTACTS" : "INCLUDED CONTACTS"} ({selectedMemberIds.length})
                  </Text>
                  <Input
                    placeholder="Search contacts..."
                    size="xs"
                    w="150px"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    borderRadius="md"
                  />
                </Flex>

                {/* BULK ACTION BUTTONS */}
                <Flex gap={2} mb={3}>
                  <Button size="xs" colorScheme="blue" variant="soft" onClick={handleSelectAll}>
                    ⚡ Select All ({allUsersList.length})
                  </Button>
                  <Button size="xs" colorScheme="gray" variant="soft" onClick={handleDeselectAll}>
                    🧹 Clear All
                  </Button>
                  <Button size="xs" colorScheme="purple" variant="soft" leftIcon={<RepeatIcon />} onClick={handleInvertSelection}>
                    Invert Selection
                  </Button>
                </Flex>

                {/* CONTACTS CHECKLIST */}
                <Stack spacing={2} maxH="220px" overflowY="auto" pr={1}>
                  {filteredUsers.map((u) => {
                    const isSelected = selectedMemberIds.includes(u._id);
                    return (
                      <Flex
                        key={u._id}
                        p={2}
                        borderRadius="md"
                        bg={isSelected ? (profileMode === "blacklist" ? "rgba(255,0,0,0.1)" : "rgba(0,255,0,0.1)") : "transparent"}
                        align="center"
                        justify="space-between"
                        cursor="pointer"
                        onClick={() => handleToggleMember(u._id)}
                        _hover={{ bg: "var(--bg-hover)" }}
                      >
                        <Flex align="center" gap={3}>
                          <Avatar size="sm" name={u.name} src={u.pic} />
                          <Box>
                            <Text fontSize="sm" fontWeight="bold">
                              {u.name}
                            </Text>
                            <Text fontSize="xs" color="var(--text-muted)">
                              {u.email}
                            </Text>
                          </Box>
                        </Flex>
                        <Checkbox
                          colorScheme={profileMode === "blacklist" ? "red" : "green"}
                          isChecked={isSelected}
                          onChange={() => handleToggleMember(u._id)}
                        />
                      </Flex>
                    );
                  })}
                </Stack>
              </Box>
            </Stack>
          )}
        </ModalBody>

        <ModalFooter borderTop="1px solid var(--border-color)">
          {activeView === "edit" ? (
            <Flex justify="flex-end" gap={2} w="100%">
              <Button variant="ghost" onClick={() => setActiveView("list")}>
                Cancel
              </Button>
              <Button colorScheme="orange" leftIcon={<CheckIcon />} onClick={handleSave}>
                Save Profile
              </Button>
            </Flex>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Done
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AudienceProfileModal;
