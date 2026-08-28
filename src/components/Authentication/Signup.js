import React, { useState, useEffect } from "react";
import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputLeftElement, InputRightElement } from "@chakra-ui/input";
import { VStack, Text } from "@chakra-ui/layout";
import { Spinner, useToast } from "@chakra-ui/react";
import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";
import { useHistory } from "react-router-dom";
import { registerUser, checkUsernameAvailabilityAsync, setCurrentSessionUser } from "../../data/fireStorage";
import { ChatState } from "../../Context/ChatProvider";

const Signup = () => {
  const [show, setShow] = useState(false);
  const handleClick = () => setShow(!show);
  const toast = useToast();
  const history = useHistory();
  const { setUser } = ChatState();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ available: null, message: "" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmpassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Debounced Username availability check
  useEffect(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) {
      setUsernameStatus({ available: null, message: "" });
      setIsCheckingUsername(false);
      return;
    }

    const regex = /^[a-z0-9_.]{3,20}$/;
    if (!regex.test(clean)) {
      setUsernameStatus({
        available: false,
        message: "Must be 3-20 characters: letters, numbers, dots & underscores.",
      });
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameStatus({ available: null, message: "Checking availability..." });

    const timer = setTimeout(async () => {
      try {
        const res = await checkUsernameAvailabilityAsync(clean);
        setIsCheckingUsername(false);
        if (res.serverError) {
          // Server unreachable — don't block the user, just warn
          setUsernameStatus({ available: null, serverError: true, message: "⚠️ Server unreachable — username check skipped." });
        } else if (res.available === true) {
          setUsernameStatus({ available: true, serverError: false, message: "Username is available! ✓" });
        } else {
          setUsernameStatus({ available: false, serverError: false, message: res.message || "Username is already taken." });
        }
      } catch (err) {
        setIsCheckingUsername(false);
        // Network error — don't block with red; show neutral warning
        setUsernameStatus({ available: null, serverError: true, message: "⚠️ Could not verify username — will be checked on submit." });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  const submitHandler = async () => {
    setLoading(true);

    if (!name.trim() || !username.trim() || !email.trim() || !password || !confirmpassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }

    // Only hard-block if we KNOW username is taken/invalid (available === false)
    // If server was unreachable (available === null), let submit proceed — server validates
    if (usernameStatus.available === false) {
      toast({
        title: "Username Unavailable",
        description: usernameStatus.message || "Please choose a different username.",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }

    if (password !== confirmpassword) {
      toast({
        title: "Passwords Do Not Match",
        description: "Please ensure both password fields match.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }

    try {
      const newUser = await registerUser({
        name,
        username: username.trim().toLowerCase(),
        email,
        password,
      });

      setCurrentSessionUser(newUser);
      setUser(newUser); // Update context state immediately!

      toast({
        title: "Account Created Successfully! 🔥",
        description: `Welcome to Agni Messenger, ${newUser.name}!`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });

      setLoading(false);
      history.push("/chats");
    } catch (error) {
      toast({
        title: "Registration Error",
        description: error.message || "Failed to create account.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };

  return (
    <VStack spacing="12px" align="stretch">
      <FormControl id="signup-name" isRequired>
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)">
          Full Name
        </FormLabel>
        <Input
          placeholder="e.g. Alex Rivers"
          value={name}
          onChange={(e) => setName(e.target.value)}
          bg="var(--bg-search)"
          color="var(--text-primary)"
          borderColor="var(--color-border)"
        />
      </FormControl>

      <FormControl id="signup-username" isRequired isInvalid={usernameStatus.available === false}>
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)">
          Username
        </FormLabel>
        <InputGroup size="md">
          <InputLeftElement pointerEvents="none" color="var(--text-secondary)" fontSize="sm">
            @
          </InputLeftElement>
          <Input
            placeholder="alex_rivers"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            bg="var(--bg-search)"
            color="var(--text-primary)"
            borderColor={
              usernameStatus.available === true
                ? "green.400"
                : usernameStatus.available === false
                ? "red.400"
                : usernameStatus.serverError
                ? "orange.400"
                : "var(--color-border)"
            }
            _focus={{
              borderColor:
                usernameStatus.available === true
                  ? "green.400"
                  : usernameStatus.available === false
                  ? "red.400"
                  : usernameStatus.serverError
                  ? "orange.400"
                  : "var(--color-primary)",
            }}
          />
          <InputRightElement>
            {isCheckingUsername ? (
              <Spinner size="sm" color="var(--color-primary)" />
            ) : usernameStatus.available === true ? (
              <CheckCircleIcon color="green.400" />
            ) : usernameStatus.available === false ? (
              <WarningIcon color="red.400" />
            ) : usernameStatus.serverError ? (
              <WarningIcon color="orange.400" />
            ) : null}
          </InputRightElement>
        </InputGroup>
        {usernameStatus.message && (
          <Text
            fontSize="xs"
            mt={1}
            color={
              usernameStatus.available === true
                ? "green.400"
                : usernameStatus.available === false
                ? "red.400"
                : usernameStatus.serverError
                ? "orange.400"
                : "var(--text-secondary)"
            }
            fontWeight="500"
          >
            {usernameStatus.message}
          </Text>
        )}
      </FormControl>

      <FormControl id="signup-email" isRequired>
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)">
          Email Address
        </FormLabel>
        <Input
          type="email"
          placeholder="e.g. alex@agnimessenger.io"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          bg="var(--bg-search)"
          color="var(--text-primary)"
          borderColor="var(--color-border)"
        />
      </FormControl>

      <FormControl id="signup-password" isRequired>
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)">
          Password
        </FormLabel>
        <InputGroup size="md">
          <Input
            type={show ? "text" : "password"}
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            bg="var(--bg-search)"
            color="var(--text-primary)"
            borderColor="var(--color-border)"
          />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={handleClick} variant="ghost" color="var(--text-secondary)">
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <FormControl id="signup-confirm-password" isRequired>
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)">
          Confirm Password
        </FormLabel>
        <InputGroup size="md">
          <Input
            type={show ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmpassword}
            onChange={(e) => setConfirmpassword(e.target.value)}
            bg="var(--bg-search)"
            color="var(--text-primary)"
            borderColor="var(--color-border)"
          />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={handleClick} variant="ghost" color="var(--text-secondary)">
              {show ? "Hide" : "Show"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>

      <Button
        bg="var(--color-primary)"
        color="white"
        _hover={{ bg: "var(--color-primary-hover)" }}
        width="100%"
        mt={3}
        onClick={submitHandler}
        isLoading={loading}
        size="lg"
        fontSize="md"
        fontWeight="bold"
        borderRadius="lg"
      >
        Create Account 🔥
      </Button>
    </VStack>
  );
};

export default Signup;
