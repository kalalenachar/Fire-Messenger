import React, { useState } from "react";
import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack } from "@chakra-ui/layout";
import { useToast } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import { loginUser, setCurrentSessionUser } from "../../data/fireStorage";
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

  const submitHandler = async () => {
    setLoading(true);
    if (!email || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter your username or email address and password.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }

    try {
      const loggedInUser = await loginUser(email, password);
      setCurrentSessionUser(loggedInUser);
      setUser(loggedInUser);

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

  return (
    <VStack spacing="14px" align="stretch">
      <FormControl id="login-email" isRequired>
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)">
          Email Address or Username
        </FormLabel>
        <Input
          value={email}
          placeholder="Enter registered email or username"
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
        mt={3}
        onClick={submitHandler}
        isLoading={loading}
        size="lg"
        fontSize="md"
        fontWeight="bold"
        borderRadius="lg"
      >
        Sign In 🔥
      </Button>
    </VStack>
  );
};

export default Login;
