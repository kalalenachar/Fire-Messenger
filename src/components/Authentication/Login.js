import React, { useState } from "react";
import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack, Box, Text, Badge, Wrap, WrapItem } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import { loginUser, defaultUsersList, setCurrentSessionUser } from "../../data/fireStorage";
import { ChatState } from "../../Context/ChatProvider";

const Login = () => {
  const [show, setShow] = useState(false);
  const handleClick = () => setShow(!show);
  const toast = useToast();
  const history = useHistory();
  const { setUser } = ChatState();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submitHandler = () => {
    setLoading(true);
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please fill in both email and password.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }

    try {
      const loggedInUser = loginUser(email, password);
      setCurrentSessionUser(loggedInUser);
      setUser(loggedInUser); // Update Context state immediately!

      toast({
        title: `Welcome back, ${loggedInUser.name}! 🔥`,
        description: "Logged in successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });

      setLoading(false);
      history.push("/chats");
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };

  const fillQuickUser = (userEmail, userPassword) => {
    setEmail(userEmail);
    setPassword(userPassword);
  };

  return (
    <VStack spacing="12px" align="stretch">
      <FormControl id="login-email" isRequired>
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)">
          Email Address
        </FormLabel>
        <Input
          value={email}
          type="email"
          placeholder="e.g. alex@firemessenger.io"
          onChange={(e) => setEmail(e.target.value)}
          bg="var(--bg-search)"
          color="var(--text-primary)"
          borderColor="var(--color-border)"
          _focus={{ borderColor: "var(--color-primary)", boxShadow: "0 0 0 1px var(--color-primary)" }}
        />
      </FormControl>

      <FormControl id="login-password" isRequired>
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)">
          Password
        </FormLabel>
        <InputGroup size="md">
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? "text" : "password"}
            placeholder="Enter password"
            bg="var(--bg-search)"
            color="var(--text-primary)"
            borderColor="var(--color-border)"
            _focus={{ borderColor: "var(--color-primary)", boxShadow: "0 0 0 1px var(--color-primary)" }}
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
        mt={2}
        onClick={submitHandler}
        isLoading={loading}
        size="lg"
        fontSize="md"
        fontWeight="bold"
        borderRadius="lg"
      >
        Sign In 🔥
      </Button>

      {/* Quick Test Login Accounts */}
      <Box pt={3} borderTop="1px border var(--color-border)">
        <Text fontSize="xs" color="var(--text-muted)" fontWeight="bold" mb={2}>
          QUICK ONE-CLICK TEST ACCOUNTS (Password: 123):
        </Text>
        <Wrap spacing={2}>
          {defaultUsersList.map((u) => (
            <WrapItem key={u._id}>
              <Badge
                px={2.5}
                py={1}
                borderRadius="full"
                cursor="pointer"
                bg="var(--bg-search)"
                color="var(--text-primary)"
                border="1px solid var(--color-border)"
                _hover={{ bg: "var(--color-primary)", color: "white" }}
                onClick={() => fillQuickUser(u.email, u.password)}
              >
                👤 {u.name.split(" ")[0]}
              </Badge>
            </WrapItem>
          ))}
        </Wrap>
      </Box>
    </VStack>
  );
};

export default Login;
