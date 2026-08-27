import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Switch,
  VStack,
  HStack,
  IconButton,
  Text,
  Box,
  Badge,
  Select,
  Collapse,
  useToast,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon, CheckIcon } from "@chakra-ui/icons";

const PollComposerModal = ({ isOpen, onClose, onSendPoll, isGroupChat = false }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctOptionIdx, setCorrectOptionIdx] = useState(null);
  const [quizExplanation, setQuizExplanation] = useState("");

  // Detailed Settings States
  const [showWhoVoted, setShowWhoVoted] = useState(true);
  const [voterPrivacyMode, setVoterPrivacyMode] = useState("public"); // "public" | "anonymous" | "creator_only"

  const [allowMultiple, setAllowMultiple] = useState(false);
  const [maxChoices, setMaxChoices] = useState("unlimited"); // "unlimited" | "2" | "3" | "4"

  const [allowAddingOptions, setAllowAddingOptions] = useState(false);
  const [whoCanAddOptions, setWhoCanAddOptions] = useState("everyone"); // "everyone" | "admins"

  const [allowRevoting, setAllowRevoting] = useState(true);
  const [revotingMode, setRevotingMode] = useState("unlimited"); // "unlimited" | "locked" | "5min"

  const [shuffleOptions, setShuffleOptions] = useState(false);

  const [isQuizMode, setIsQuizMode] = useState(false);

  const [limitDuration, setLimitDuration] = useState(false);
  const [durationPreset, setDurationPreset] = useState("24h"); // "15m" | "1h" | "24h" | "3d" | "7d" | "custom"
  const [expiresAtDate, setExpiresAtDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    return tomorrow.toISOString().slice(0, 16);
  });

  const [hideResults, setHideResults] = useState(false);
  const [resultsRevealMode, setResultsRevealMode] = useState("until_voted"); // "until_voted" | "until_closed" | "always_hidden"

  const toast = useToast();

  const handleAddOption = () => {
    if (options.length >= 8) {
      toast({
        title: "Maximum options reached",
        description: "You can add up to 8 poll options.",
        status: "info",
        duration: 2000,
      });
      return;
    }
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      toast({
        title: "Minimum options required",
        description: "A poll must have at least 2 options.",
        status: "warning",
        duration: 2000,
      });
      return;
    }
    const newOpts = options.filter((_, i) => i !== index);
    setOptions(newOpts);
    if (correctOptionIdx === index) {
      setCorrectOptionIdx(null);
    } else if (correctOptionIdx > index) {
      setCorrectOptionIdx(correctOptionIdx - 1);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const applyDurationPreset = (preset) => {
    setDurationPreset(preset);
    const now = Date.now();
    let target = now + 24 * 3600 * 1000;
    if (preset === "15m") target = now + 15 * 60 * 1000;
    else if (preset === "1h") target = now + 3600 * 1000;
    else if (preset === "24h") target = now + 24 * 3600 * 1000;
    else if (preset === "3d") target = now + 3 * 24 * 3600 * 1000;
    else if (preset === "7d") target = now + 7 * 24 * 3600 * 1000;

    if (preset !== "custom") {
      setExpiresAtDate(new Date(target).toISOString().slice(0, 16));
    }
  };

  const handleSubmit = () => {
    if (!question.trim()) {
      toast({
        title: "Poll question required",
        description: "Please enter a question for your poll.",
        status: "warning",
        duration: 2500,
      });
      return;
    }

    const cleanOptions = options.map((opt) => opt.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      toast({
        title: "At least 2 options required",
        description: "Please fill in at least two non-empty options.",
        status: "warning",
        duration: 2500,
      });
      return;
    }

    if (isQuizMode && correctOptionIdx === null) {
      toast({
        title: "Correct answer required",
        description: "Please select which option is the correct answer for your Quiz.",
        status: "warning",
        duration: 2500,
      });
      return;
    }

    let computedExpiresAt = null;
    if (limitDuration) {
      computedExpiresAt = new Date(expiresAtDate).toISOString();
    }

    const formattedOptions = cleanOptions.map((text, idx) => ({
      id: `opt_${Date.now()}_${idx}`,
      text,
      voters: [],
      isCorrect: isQuizMode ? idx === correctOptionIdx : false,
    }));

    const pollData = {
      question: question.trim(),
      options: formattedOptions,
      settings: {
        showWhoVoted: isGroupChat ? voterPrivacyMode !== "anonymous" : true,
        voterPrivacyMode: isGroupChat ? voterPrivacyMode : "public",
        allowMultiple,
        maxChoices: allowMultiple ? maxChoices : "1",
        allowAddingOptions: isGroupChat ? allowAddingOptions : false,
        whoCanAddOptions: isGroupChat ? whoCanAddOptions : "everyone",
        allowRevoting: revotingMode !== "locked",
        revotingMode,
        shuffleOptions: isGroupChat ? shuffleOptions : false,
        isQuizMode,
        quizExplanation: isQuizMode ? quizExplanation.trim() : "",
        limitDuration,
        expiresAt: computedExpiresAt,
        hideResults: isGroupChat ? hideResults : false,
        resultsRevealMode: (isGroupChat && hideResults) ? resultsRevealMode : "always_visible",
      },
      isClosed: false,
    };

    onSendPoll(pollData);
    resetAndClose();
  };

  const resetAndClose = () => {
    setQuestion("");
    setOptions(["", ""]);
    setCorrectOptionIdx(null);
    setQuizExplanation("");
    setShowWhoVoted(true);
    setVoterPrivacyMode("public");
    setAllowMultiple(false);
    setMaxChoices("unlimited");
    setAllowAddingOptions(false);
    setWhoCanAddOptions("everyone");
    setAllowRevoting(true);
    setRevotingMode("unlimited");
    setShuffleOptions(false);
    setIsQuizMode(false);
    setLimitDuration(false);
    setDurationPreset("24h");
    setHideResults(false);
    setResultsRevealMode("until_voted");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} isCentered size="md" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(6px)" />
      <ModalContent bg="var(--bg-card)" color="var(--text-primary)" borderRadius="20px" border="1px solid var(--color-border)" maxH="90vh">
        <ModalHeader borderBottom="1px solid var(--color-border)" fontSize="lg" fontWeight="bold" display="flex" alignItems="center" justifyContent="space-between" pr={10}>
          <HStack spacing={2}>
            <span>📊</span>
            <span>{isGroupChat ? "Create Group Poll" : "Create Poll"}</span>
          </HStack>
          <Badge colorScheme={isGroupChat ? "purple" : "teal"} borderRadius="8px" px={2.5} py={0.5} fontSize="11px" fontWeight="600">
            {isGroupChat ? "Group Chat" : "Direct Message"}
          </Badge>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody p={5}>
          <VStack spacing={4} align="stretch">
            {/* Poll Question Input */}
            <FormControl isRequired>
              <FormLabel fontWeight="600" fontSize="sm">
                Poll Question
              </FormLabel>
              <Input
                placeholder="Ask a question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                bg="var(--bg-search)"
                border="none"
                borderRadius="14px"
                _placeholder={{ color: "var(--text-secondary)" }}
              />
            </FormControl>

            {/* Poll Options List */}
            <FormControl isRequired>
              <FormLabel fontWeight="600" fontSize="sm" display="flex" justifyContent="space-between" alignItems="center">
                <span>Options</span>
                {isQuizMode && (
                  <Badge colorScheme="green" fontSize="10px" borderRadius="6px" px={2}>
                    Quiz Mode: Click ✔️ next to correct answer
                  </Badge>
                )}
              </FormLabel>

              <VStack spacing={2} align="stretch">
                {options.map((opt, idx) => (
                  <HStack key={idx} spacing={2}>
                    {isQuizMode && (
                      <IconButton
                        icon={<CheckIcon fontSize="12px" />}
                        aria-label="Set correct answer"
                        size="sm"
                        borderRadius="50%"
                        colorScheme={correctOptionIdx === idx ? "green" : "gray"}
                        variant={correctOptionIdx === idx ? "solid" : "outline"}
                        onClick={() => setCorrectOptionIdx(idx)}
                      />
                    )}
                    <Input
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      bg="var(--bg-search)"
                      border="none"
                      borderRadius="12px"
                      _placeholder={{ color: "var(--text-secondary)" }}
                    />
                    {options.length > 2 && (
                      <IconButton
                        icon={<DeleteIcon />}
                        aria-label="Remove option"
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleRemoveOption(idx)}
                      />
                    )}
                  </HStack>
                ))}
              </VStack>

              {options.length < 8 && (
                <Button
                  leftIcon={<AddIcon fontSize="12px" />}
                  size="sm"
                  variant="ghost"
                  color="var(--color-primary)"
                  mt={2}
                  onClick={handleAddOption}
                >
                  Add Option
                </Button>
              )}
            </FormControl>

            {/* Settings Section */}
            <Box mt={2}>
              <Text fontWeight="bold" fontSize="sm" mb={3} color="var(--text-header)">
                {isGroupChat ? "Advanced Group Configuration" : "Poll Settings"}
              </Text>

              <VStack spacing={3} align="stretch">
                {/* 1. Allow Multiple Answers */}
                <Box p={3} borderRadius="14px" bg="var(--bg-search)" border="1px solid var(--color-border)">
                  <HStack justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Box w="34px" h="34px" borderRadius="10px" bg="rgba(249, 115, 22, 0.12)" display="flex" alignItems="center" justifyContent="center" fontSize="16px">
                        🎛️
                      </Box>
                      <Box maxW="220px">
                        <Text fontWeight="600" fontSize="xs">
                          Allow Multiple Answers
                        </Text>
                        <Text fontSize="11px" color="var(--text-secondary)">
                          Voters can select more than one option.
                        </Text>
                      </Box>
                    </HStack>
                    <Switch
                      isChecked={allowMultiple}
                      onChange={(e) => setAllowMultiple(e.target.checked)}
                      colorScheme="orange"
                    />
                  </HStack>

                  <Collapse in={allowMultiple} animateOpacity>
                    <Box mt={3} pt={2} borderTop="1px solid var(--color-border)">
                      <FormLabel fontSize="11px" fontWeight="600" color="var(--text-secondary)" mb={1}>
                        Max Choices Allowed
                      </FormLabel>
                      <Select
                        size="xs"
                        borderRadius="10px"
                        bg="var(--bg-card)"
                        value={maxChoices}
                        onChange={(e) => setMaxChoices(e.target.value)}
                      >
                        <option value="unlimited">♾️ Unlimited choices</option>
                        <option value="2">2 Choices max</option>
                        <option value="3">3 Choices max</option>
                        <option value="4">4 Choices max</option>
                      </Select>
                    </Box>
                  </Collapse>
                </Box>

                {/* 2. Set Correct Answer (Quiz Mode) */}
                <Box p={3} borderRadius="14px" bg="var(--bg-search)" border="1px solid var(--color-border)">
                  <HStack justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Box w="34px" h="34px" borderRadius="10px" bg="rgba(249, 115, 22, 0.12)" display="flex" alignItems="center" justifyContent="center" fontSize="16px">
                        ✅
                      </Box>
                      <Box maxW="220px">
                        <Text fontWeight="600" fontSize="xs">
                          Set Correct Answer (Quiz Mode)
                        </Text>
                        <Text fontSize="11px" color="var(--text-secondary)">
                          Mark the right choice & add explanation.
                        </Text>
                      </Box>
                    </HStack>
                    <Switch
                      isChecked={isQuizMode}
                      onChange={(e) => setIsQuizMode(e.target.checked)}
                      colorScheme="orange"
                    />
                  </HStack>

                  <Collapse in={isQuizMode} animateOpacity>
                    <Box mt={3} pt={2} borderTop="1px solid var(--color-border)">
                      <FormLabel fontSize="11px" fontWeight="600" color="var(--text-secondary)" mb={1}>
                        Optional Answer Explanation
                      </FormLabel>
                      <Textarea
                        placeholder="Add an explanation shown after answering..."
                        value={quizExplanation}
                        onChange={(e) => setQuizExplanation(e.target.value)}
                        size="xs"
                        rows={2}
                        borderRadius="10px"
                        bg="var(--bg-card)"
                        border="none"
                      />
                    </Box>
                  </Collapse>
                </Box>

                {/* 3. Allow Revoting */}
                <Box p={3} borderRadius="14px" bg="var(--bg-search)" border="1px solid var(--color-border)">
                  <HStack justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Box w="34px" h="34px" borderRadius="10px" bg="rgba(249, 115, 22, 0.12)" display="flex" alignItems="center" justifyContent="center" fontSize="16px">
                        🔄
                      </Box>
                      <Box maxW="220px">
                        <Text fontWeight="600" fontSize="xs">
                          Allow Revoting
                        </Text>
                        <Text fontSize="11px" color="var(--text-secondary)">
                          Voters can change their vote.
                        </Text>
                      </Box>
                    </HStack>
                    <Switch
                      isChecked={allowRevoting}
                      onChange={(e) => {
                        setAllowRevoting(e.target.checked);
                        if (!e.target.checked) setRevotingMode("locked");
                        else setRevotingMode("unlimited");
                      }}
                      colorScheme="orange"
                    />
                  </HStack>

                  <Collapse in={allowRevoting} animateOpacity>
                    <Box mt={3} pt={2} borderTop="1px solid var(--color-border)">
                      <FormLabel fontSize="11px" fontWeight="600" color="var(--text-secondary)" mb={1}>
                        Revoting Rule
                      </FormLabel>
                      <Select
                        size="xs"
                        borderRadius="10px"
                        bg="var(--bg-card)"
                        value={revotingMode}
                        onChange={(e) => setRevotingMode(e.target.value)}
                      >
                        <option value="unlimited">🔄 Unlimited vote changes anytime</option>
                        <option value="5min">⏱️ 5-minute window after voting</option>
                        <option value="locked">🔒 Lock vote immediately (No changes)</option>
                      </Select>
                    </Box>
                  </Collapse>
                </Box>

                {/* 4. Limit Duration */}
                <Box p={3} borderRadius="14px" bg="var(--bg-search)" border="1px solid var(--color-border)">
                  <HStack justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Box w="34px" h="34px" borderRadius="10px" bg="rgba(249, 115, 22, 0.12)" display="flex" alignItems="center" justifyContent="center" fontSize="16px">
                        ⏱️
                      </Box>
                      <Box maxW="220px">
                        <Text fontWeight="600" fontSize="xs">
                          Limit Duration
                        </Text>
                        <Text fontSize="11px" color="var(--text-secondary)">
                          Automatically close the poll at a set time.
                        </Text>
                      </Box>
                    </HStack>
                    <Switch
                      isChecked={limitDuration}
                      onChange={(e) => setLimitDuration(e.target.checked)}
                      colorScheme="orange"
                    />
                  </HStack>

                  <Collapse in={limitDuration} animateOpacity>
                    <Box mt={3} pt={2} borderTop="1px solid var(--color-border)">
                      <FormLabel fontSize="11px" fontWeight="600" color="var(--text-secondary)" mb={2}>
                        Quick Presets
                      </FormLabel>
                      <HStack spacing={1.5} flexWrap="wrap" mb={3}>
                        {["15m", "1h", "24h", "3d", "7d", "custom"].map((p) => (
                          <Button
                            key={p}
                            size="xs"
                            borderRadius="8px"
                            colorScheme={durationPreset === p ? "orange" : "gray"}
                            variant={durationPreset === p ? "solid" : "outline"}
                            onClick={() => applyDurationPreset(p)}
                          >
                            {p.toUpperCase()}
                          </Button>
                        ))}
                      </HStack>

                      {durationPreset === "custom" && (
                        <Input
                          type="datetime-local"
                          value={expiresAtDate}
                          onChange={(e) => setExpiresAtDate(e.target.value)}
                          size="xs"
                          borderRadius="10px"
                          bg="var(--bg-card)"
                        />
                      )}
                    </Box>
                  </Collapse>
                </Box>

                {/* GROUP-ONLY ADVANCED SETTINGS */}
                {isGroupChat && (
                  <>
                    {/* Show Who Voted (Voter Privacy) */}
                    <Box p={3} borderRadius="14px" bg="var(--bg-search)" border="1px solid var(--color-border)">
                      <HStack justify="space-between" align="center">
                        <HStack spacing={3}>
                          <Box w="34px" h="34px" borderRadius="10px" bg="rgba(249, 115, 22, 0.12)" display="flex" alignItems="center" justifyContent="center" fontSize="16px">
                            👁️
                          </Box>
                          <Box maxW="220px">
                            <Text fontWeight="600" fontSize="xs">
                              Show Who Voted
                            </Text>
                            <Text fontSize="11px" color="var(--text-secondary)">
                              Control voter visibility & privacy in group.
                            </Text>
                          </Box>
                        </HStack>
                        <Switch
                          isChecked={showWhoVoted}
                          onChange={(e) => {
                            setShowWhoVoted(e.target.checked);
                            if (!e.target.checked) setVoterPrivacyMode("anonymous");
                            else setVoterPrivacyMode("public");
                          }}
                          colorScheme="orange"
                        />
                      </HStack>

                      <Collapse in={showWhoVoted} animateOpacity>
                        <Box mt={3} pt={2} borderTop="1px solid var(--color-border)">
                          <FormLabel fontSize="11px" fontWeight="600" color="var(--text-secondary)" mb={1}>
                            Privacy Mode
                          </FormLabel>
                          <Select
                            size="xs"
                            borderRadius="10px"
                            bg="var(--bg-card)"
                            value={voterPrivacyMode}
                            onChange={(e) => setVoterPrivacyMode(e.target.value)}
                          >
                            <option value="public">🌐 Public (Everyone can see voters)</option>
                            <option value="creator_only">🔒 Creator Only (Only you see voter names)</option>
                            <option value="anonymous">🙈 Anonymous (All votes completely secret)</option>
                          </Select>
                        </Box>
                      </Collapse>
                    </Box>

                    {/* Allow Adding Options */}
                    <Box p={3} borderRadius="14px" bg="var(--bg-search)" border="1px solid var(--color-border)">
                      <HStack justify="space-between" align="center">
                        <HStack spacing={3}>
                          <Box w="34px" h="34px" borderRadius="10px" bg="rgba(249, 115, 22, 0.12)" display="flex" alignItems="center" justifyContent="center" fontSize="16px">
                            ➕
                          </Box>
                          <Box maxW="220px">
                            <Text fontWeight="600" fontSize="xs">
                              Allow Adding Options
                            </Text>
                            <Text fontSize="11px" color="var(--text-secondary)">
                              Participants can suggest new options.
                            </Text>
                          </Box>
                        </HStack>
                        <Switch
                          isChecked={allowAddingOptions}
                          onChange={(e) => setAllowAddingOptions(e.target.checked)}
                          colorScheme="orange"
                        />
                      </HStack>

                      <Collapse in={allowAddingOptions} animateOpacity>
                        <Box mt={3} pt={2} borderTop="1px solid var(--color-border)">
                          <FormLabel fontSize="11px" fontWeight="600" color="var(--text-secondary)" mb={1}>
                            Who Can Suggest Options?
                          </FormLabel>
                          <Select
                            size="xs"
                            borderRadius="10px"
                            bg="var(--bg-card)"
                            value={whoCanAddOptions}
                            onChange={(e) => setWhoCanAddOptions(e.target.value)}
                          >
                            <option value="everyone">👥 Everyone in chat</option>
                            <option value="admins">⭐ Group Admins & Creator only</option>
                          </Select>
                        </Box>
                      </Collapse>
                    </Box>

                    {/* Shuffle Options */}
                    <Box p={3} borderRadius="14px" bg="var(--bg-search)" border="1px solid var(--color-border)">
                      <HStack justify="space-between" align="center">
                        <HStack spacing={3}>
                          <Box w="34px" h="34px" borderRadius="10px" bg="rgba(249, 115, 22, 0.12)" display="flex" alignItems="center" justifyContent="center" fontSize="16px">
                            🔀
                          </Box>
                          <Box maxW="220px">
                            <Text fontWeight="600" fontSize="xs">
                              Shuffle Options
                            </Text>
                            <Text fontSize="11px" color="var(--text-secondary)">
                              Randomize answer order for each voter to prevent bias.
                            </Text>
                          </Box>
                        </HStack>
                        <Switch
                          isChecked={shuffleOptions}
                          onChange={(e) => setShuffleOptions(e.target.checked)}
                          colorScheme="orange"
                        />
                      </HStack>
                    </Box>

                    {/* Hide Results */}
                    <Box p={3} borderRadius="14px" bg="var(--bg-search)" border="1px solid var(--color-border)">
                      <HStack justify="space-between" align="center">
                        <HStack spacing={3}>
                          <Box w="34px" h="34px" borderRadius="10px" bg="rgba(249, 115, 22, 0.12)" display="flex" alignItems="center" justifyContent="center" fontSize="16px">
                            🙈
                          </Box>
                          <Box maxW="220px">
                            <Text fontWeight="600" fontSize="xs">
                              Hide Results
                            </Text>
                            <Text fontSize="11px" color="var(--text-secondary)">
                              Hide percentages until condition is met.
                            </Text>
                          </Box>
                        </HStack>
                        <Switch
                          isChecked={hideResults}
                          onChange={(e) => setHideResults(e.target.checked)}
                          colorScheme="orange"
                        />
                      </HStack>

                      <Collapse in={hideResults} animateOpacity>
                        <Box mt={3} pt={2} borderTop="1px solid var(--color-border)">
                          <FormLabel fontSize="11px" fontWeight="600" color="var(--text-secondary)" mb={1}>
                            Reveal Mode
                          </FormLabel>
                          <Select
                            size="xs"
                            borderRadius="10px"
                            bg="var(--bg-card)"
                            value={resultsRevealMode}
                            onChange={(e) => setResultsRevealMode(e.target.value)}
                          >
                            <option value="until_voted">📩 Reveal results after user votes</option>
                            <option value="until_closed">⏱️ Reveal results ONLY when poll closes</option>
                            <option value="always_hidden">🔒 Always hidden (Survey Ballot mode)</option>
                          </Select>
                        </Box>
                      </Collapse>
                    </Box>
                  </>
                )}
              </VStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter borderTop="1px solid var(--color-border)" gap={3}>
          <Button variant="ghost" color="var(--text-secondary)" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            bg="var(--color-primary)"
            color="white"
            _hover={{ bg: "var(--color-primary-hover)" }}
            onClick={handleSubmit}
            px={6}
          >
            Create Poll
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PollComposerModal;
