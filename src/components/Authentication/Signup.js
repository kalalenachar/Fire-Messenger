import React, { useState } from "react";
import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack, Box, Wrap, WrapItem } from "@chakra-ui/layout";
import { Avatar, useToast } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import { registerUser, setCurrentSessionUser } from "../../data/fireStorage";
import { ChatState } from "../../Context/ChatProvider";

const defaultAvatarPresets = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
];

const Signup = () => {
  const [show, setShow] = useState(false);
  const handleClick = () => setShow(!show);
  const toast = useToast();
  const history = useHistory();
  const { setUser } = ChatState();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmpassword] = useState("");
  const [status, setStatus] = useState("Available | 🔥 Fire Messenger");
  const [pic, setPic] = useState(defaultAvatarPresets[0]);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please choose an image under 2MB.",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPic(reader.result);
      toast({
        title: "Avatar Uploaded! 📸",
        status: "success",
        duration: 2000,
        position: "bottom",
      });
    };
    reader.readAsDataURL(file);
  };

  const submitHandler = async () => {
    setLoading(true);

    if (!name.trim() || !email.trim() || !password || !confirmpassword) {
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
        email,
        password,
        pic,
        status,
      });

      setCurrentSessionUser(newUser);
      setUser(newUser); // Update context state immediately!

      toast({
        title: "Account Created Successfully! 🔥",
        description: `Welcome to Fire Messenger, ${newUser.name}!`,
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

      <FormControl id="signup-email" isRequired>
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)">
          Email Address
        </FormLabel>
        <Input
          type="email"
          placeholder="e.g. alex@firemessenger.io"
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

      <FormControl id="signup-status">
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)">
          Status / Tagline
        </FormLabel>
        <Input
          placeholder="e.g. 🔥 Burning with Passion"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          bg="var(--bg-search)"
          color="var(--text-primary)"
          borderColor="var(--color-border)"
        />
      </FormControl>

      {/* Avatar Picker & File Upload */}
      <Box pt={2}>
        <FormLabel fontSize="sm" fontWeight="600" color="var(--text-primary)" mb={2}>
          Choose Avatar or Upload Photo
        </FormLabel>
        <Box display="flex" alignItems="center" gap={3}>
          <Avatar size="lg" src={pic} name={name || "User"} border="2px solid var(--color-primary)" />
          <Box flex="1">
            <Wrap spacing={2} mb={2}>
              {defaultAvatarPresets.map((img, idx) => (
                <WrapItem key={idx}>
                  <Avatar
                    size="sm"
                    src={img}
                    cursor="pointer"
                    border={pic === img ? "2px solid var(--color-primary)" : "none"}
                    onClick={() => setPic(img)}
                  />
                </WrapItem>
              ))}
            </Wrap>
            <Input type="file" accept="image/*" size="xs" onChange={handleImageUpload} color="var(--text-secondary)" />
          </Box>
        </Box>
      </Box>

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
